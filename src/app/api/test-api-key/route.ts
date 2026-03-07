import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

const ALLOWED_PROVIDER_ENDPOINTS: Record<string, string[]> = {
  openai: ['https://api.openai.com/'],
  anthropic: ['https://api.anthropic.com/'],
  openrouter: ['https://openrouter.ai/'],
  grok: ['https://api.x.ai/'],
};

const TestApiKeySchema = z.object({
  providerId: z.string(),
  apiKey: z.string(),
  endpoint: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const authSession = await getServerSession();
    if (!authSession?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { providerId, apiKey, endpoint } = TestApiKeySchema.parse(body);

    const allowedPrefixes = ALLOWED_PROVIDER_ENDPOINTS[providerId];
    if (!allowedPrefixes || !allowedPrefixes.some(prefix => endpoint.startsWith(prefix))) {
      return NextResponse.json(
        { success: false, error: 'Invalid endpoint for the specified provider' },
        { status: 400 }
      );
    }

    let isValid = false;

    switch (providerId) {
      case 'openai':
        isValid = await testOpenAIKey(apiKey, endpoint);
        break;
      case 'anthropic':
        isValid = await testAnthropicKey(apiKey, endpoint);
        break;
      case 'openrouter':
        isValid = await testOpenRouterKey(apiKey, endpoint);
        break;
      case 'grok':
        isValid = await testGrokKey(apiKey, endpoint);
        break;
      default:
        isValid = false;
    }

    return NextResponse.json({
      success: true,
      valid: isValid,
      providerId,
    });
  } catch (error) {
    console.error('API key test error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to test API key' },
      { status: 500 }
    );
  }
}

async function testOpenAIKey(apiKey: string, endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5,
      }),
    });

    return response.status === 200 || response.status === 429; // 429 = rate limited but valid key
  } catch (error) {
    console.error('OpenAI key test failed:', error);
    return false;
  }
}

async function testAnthropicKey(apiKey: string, endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint}`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5,
      }),
    });

    return response.status === 200 || response.status === 429;
  } catch (error) {
    console.error('Anthropic key test failed:', error);
    return false;
  }
}

async function testOpenRouterKey(apiKey: string, endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'StatMiner',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5,
      }),
    });

    return response.status === 200 || response.status === 429;
  } catch (error) {
    console.error('OpenRouter key test failed:', error);
    return false;
  }
}

async function testGrokKey(apiKey: string, endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5,
      }),
    });

    return response.status === 200 || response.status === 429;
  } catch (error) {
    console.error('Grok key test failed:', error);
    return false;
  }
}