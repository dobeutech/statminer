import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { z } from 'zod';
import { WebhookEvent, WebhookEndpoint } from '@/types';

const ALLOWED_URL_PATTERNS = [
  /^https:\/\//,
];

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^metadata\.google\.internal$/i,
  /^169\.254\.\d+\.\d+$/,
];

function isUrlAllowed(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname;
    if (BLOCKED_HOST_PATTERNS.some(pattern => pattern.test(hostname))) return false;
    return true;
  } catch {
    return false;
  }
}

async function requireAuth(request: NextRequest): Promise<boolean> {
  const session = await getServerSession();
  return !!session?.user;
}

// Webhook event schema
const WebhookEventSchema = z.object({
  event: z.string(),
  payload: z.any(),
  timestamp: z.string().optional(),
  signature: z.string().optional(),
});

// Webhook endpoint registry (in production, store in database)
const webhookEndpoints: Map<string, WebhookEndpoint> = new Map();

// Verify webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${digest}`)
  );
}

// GET: List registered webhooks
export async function GET(request: NextRequest) {
  try {
    if (!(await requireAuth(request))) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const webhooks = Array.from(webhookEndpoints.values()).map(webhook => ({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
    }));

    return NextResponse.json({
      success: true,
      webhooks,
      count: webhooks.length,
    });
  } catch (error) {
    console.error('Webhook GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve webhooks' },
      { status: 500 }
    );
  }
}

// POST: Register a new webhook or trigger webhook events
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    const webhookAction = request.headers.get('x-webhook-action');

    // Register new webhook endpoint
    if (webhookAction === 'register') {
      if (!(await requireAuth(request))) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      const body = await request.json();
      
      const RegisterSchema = z.object({
        url: z.string().url(),
        events: z.array(z.string()).min(1),
        secret: z.string().min(16),
      });

      const { url, events, secret } = RegisterSchema.parse(body);

      if (!isUrlAllowed(url)) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook URL. Only HTTPS URLs to public hosts are allowed.' },
          { status: 400 }
        );
      }
      
      const webhookId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const webhook: WebhookEndpoint = {
        id: webhookId,
        url,
        events,
        secret,
        isActive: true,
        createdAt: new Date(),
      };

      webhookEndpoints.set(webhookId, webhook);

      return NextResponse.json({
        success: true,
        webhook: {
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          isActive: webhook.isActive,
        },
        message: 'Webhook registered successfully',
      });
    }

    // Trigger webhook event
    if (webhookAction === 'trigger') {
      if (!(await requireAuth(request))) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      const body = await request.json();
      const event = WebhookEventSchema.parse(body);
      
      // Find all webhooks subscribed to this event
      const subscribedWebhooks = Array.from(webhookEndpoints.values()).filter(
        webhook => webhook.isActive && webhook.events.includes(event.event)
      );

      const results = await Promise.allSettled(
        subscribedWebhooks.map(async webhook => {
          const payload = JSON.stringify({
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            event: event.event,
            payload: event.payload,
            timestamp: new Date().toISOString(),
            source: 'statminer',
          });

          const signature = crypto
            .createHmac('sha256', webhook.secret)
            .update(payload)
            .digest('hex');

          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': `sha256=${signature}`,
              'X-Webhook-Event': event.event,
              'X-Webhook-Id': webhook.id,
            },
            body: payload,
          });

          return {
            webhookId: webhook.id,
            status: response.status,
            success: response.ok,
          };
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failureCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

      return NextResponse.json({
        success: true,
        event: event.event,
        webhooksTriggered: subscribedWebhooks.length,
        successCount,
        failureCount,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'Failed to send' }),
      });
    }

    // Handle incoming webhook (from external service)
    const signature = request.headers.get('x-webhook-signature');
    const webhookId = request.headers.get('x-webhook-id');
    
    if (signature && webhookId) {
      const webhook = webhookEndpoints.get(webhookId);
      
      if (!webhook) {
        return NextResponse.json(
          { success: false, error: 'Webhook not found' },
          { status: 404 }
        );
      }

      const rawBody = await request.text();
      
      if (!verifyWebhookSignature(rawBody, signature, webhook.secret)) {
        return NextResponse.json(
          { success: false, error: 'Invalid signature' },
          { status: 401 }
        );
      }

      const event = JSON.parse(rawBody);
      
      // Process the webhook event here
      console.log('Received webhook event:', event);
      
      // Store event or trigger actions based on event type
      await processWebhookEvent(event);

      return NextResponse.json({
        success: true,
        message: 'Webhook processed successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid webhook request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Webhook POST error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// PUT: Update webhook endpoint
export async function PUT(request: NextRequest) {
  try {
    if (!(await requireAuth(request))) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const webhookId = request.nextUrl.searchParams.get('id');
    
    if (!webhookId) {
      return NextResponse.json(
        { success: false, error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    const webhook = webhookEndpoints.get(webhookId);
    
    if (!webhook) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    const UpdateSchema = z.object({
      url: z.string().url().optional(),
      events: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    });

    const updates = UpdateSchema.parse(body);
    
    if (updates.url) {
      if (!isUrlAllowed(updates.url)) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook URL. Only HTTPS URLs to public hosts are allowed.' },
          { status: 400 }
        );
      }
      webhook.url = updates.url;
    }
    if (updates.events) webhook.events = updates.events;
    if (updates.isActive !== undefined) webhook.isActive = updates.isActive;

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
      },
      message: 'Webhook updated successfully',
    });
  } catch (error) {
    console.error('Webhook PUT error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

// DELETE: Remove webhook endpoint
export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireAuth(request))) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const webhookId = request.nextUrl.searchParams.get('id');
    
    if (!webhookId) {
      return NextResponse.json(
        { success: false, error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    const deleted = webhookEndpoints.delete(webhookId);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Webhook DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}

// Process incoming webhook events
async function processWebhookEvent(event: WebhookEvent): Promise<void> {
  // Implement event-specific logic here
  switch (event.event) {
    case 'chat.message.created':
      // Handle new chat message
      console.log('New chat message:', event.payload);
      break;
      
    case 'api.usage.threshold':
      // Handle API usage threshold
      console.log('API usage threshold reached:', event.payload);
      break;
      
    case 'session.created':
      // Handle new session
      console.log('New session created:', event.payload);
      break;
      
    case 'provider.error':
      // Handle provider error
      console.log('Provider error:', event.payload);
      break;
      
    default:
      console.log('Unknown webhook event:', event);
  }
}