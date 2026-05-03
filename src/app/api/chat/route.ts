import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ChatRequestSchema } from '@/types';
import { sendToLLMProviders } from '@/lib/llm-providers';
import logger from '@/lib/logger';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, providers, streaming, apiKeys, history } = ChatRequestSchema.parse(body);

    if (streaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            await sendToLLMProviders(message, providers, {
              onStream: (providerId, chunk) => {
                const data = JSON.stringify({ providerId, chunk, isComplete: false });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              },
              onComplete: (providerId, response, metadata) => {
                const data = JSON.stringify({ providerId, chunk: response, isComplete: true, metadata });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              },
              onError: (providerId, error) => {
                const data = JSON.stringify({ providerId, error, isComplete: true });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              },
            }, { apiKeys, history });
          } catch (err) {
            logger.error({ err }, 'Streaming chat error');
            const data = JSON.stringify({ error: 'Stream failed' });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const responses = await sendToLLMProviders(message, providers, undefined, { apiKeys, history });

    return NextResponse.json({
      success: true,
      responses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Chat API error');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
