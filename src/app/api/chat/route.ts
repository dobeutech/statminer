import { NextRequest } from 'next/server';
import { ChatRequestSchema } from '@/types';
import { streamFromProvider } from '@/lib/llm';
import { getChatsCollection } from '@/lib/mongodb';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', issues: parsed.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { message, providers, sessionId } = parsed.data;
  const encoder = new TextEncoder();
  const writer = new TransformStream<Uint8Array, Uint8Array>();
  const output = writer.writable.getWriter();
  const controller = new AbortController();
  request.signal.addEventListener('abort', () => controller.abort());

  const send = async (event: unknown) => {
    await output.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  const startedAt = Date.now();
  const answers = new Map<string, { content: string; latencyMs?: number; error?: string }>();
  providers.forEach((p) => answers.set(p, { content: '' }));

  const allProviderWork = providers.map(async (providerId) => {
    const providerStart = Date.now();
    let content = '';
    try {
      await streamFromProvider(providerId, message, {
        signal: controller.signal,
        onChunk: async (chunk) => {
          content += chunk;
          answers.set(providerId, { ...(answers.get(providerId) ?? { content: '' }), content });
          await send({ providerId, type: 'chunk', chunk });
        },
        onComplete: async () => {
          const latency = Date.now() - providerStart;
          answers.set(providerId, {
            ...(answers.get(providerId) ?? { content: '' }),
            latencyMs: latency,
          });
          await send({ providerId, type: 'complete', latencyMs: latency });
        },
        onError: async (error) => {
          answers.set(providerId, {
            ...(answers.get(providerId) ?? { content: '' }),
            error,
          });
          await send({ providerId, type: 'error', error });
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await send({ providerId, type: 'error', error: msg });
    }
  });

  (async () => {
    try {
      await Promise.all(allProviderWork);
      await send({ type: 'done' });
    } catch (error) {
      logger.error({ err: error }, 'Chat stream failed');
    } finally {
      try {
        const collection = await getChatsCollection();
        if (collection) {
          await collection.insertOne({
            sessionId: sessionId ?? `anon-${Date.now()}`,
            userMessage: message,
            answers: Array.from(answers.entries()).map(([providerId, value]) => ({
              providerId,
              content: value.content,
              latencyMs: value.latencyMs,
              error: value.error,
            })),
            createdAt: new Date(),
          });
        }
      } catch (error) {
        logger.warn({ err: error }, 'Failed to persist chat turn');
      }
      await output.close().catch(() => undefined);
      logger.info(
        { providers, latency: Date.now() - startedAt },
        'chat turn completed'
      );
    }
  })();

  return new Response(writer.readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
