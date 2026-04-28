import type { ProviderId } from '@/types';

export interface ProviderConfig {
  id: ProviderId;
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
}

export const PROVIDER_CONFIG: Record<ProviderId, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-sonnet-latest',
  },
  openai: {
    id: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: (process.env.OPENAI_API_BASE ?? 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions',
    model: 'gpt-4o-mini',
  },
  openrouter: {
    id: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'anthropic/claude-3.5-sonnet',
  },
  grok: {
    id: 'grok',
    apiKey: process.env.XAI_API_KEY ?? process.env.GROK_API_KEY,
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-4',
  },
};

export interface StreamChunkHandlers {
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (message: string) => void;
  signal: AbortSignal;
}

async function* lineStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf('\n');
    while (idx !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      idx = buffer.indexOf('\n');
      if (line) yield line;
    }
  }
  if (buffer.trim()) yield buffer.trim();
}

export async function streamAnthropic(
  config: ProviderConfig,
  message: string,
  handlers: StreamChunkHandlers
): Promise<void> {
  if (!config.apiKey) {
    handlers.onError('Anthropic API key not configured');
    return;
  }
  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1024,
      stream: true,
      messages: [{ role: 'user', content: message }],
    }),
    signal: handlers.signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    handlers.onError(`Anthropic HTTP ${response.status}: ${text.slice(0, 200)}`);
    return;
  }

  const reader = response.body.getReader();
  try {
    for await (const line of lineStream(reader)) {
      if (!line.startsWith('data:')) continue;
      const payload = line.replace(/^data:\s*/, '');
      if (payload === '[DONE]') break;
      try {
        const event = JSON.parse(payload);
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          handlers.onChunk(event.delta.text ?? '');
        }
        if (event.type === 'message_stop') break;
      } catch {
        // ignore
      }
    }
    handlers.onComplete();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    handlers.onError(message);
  }
}

export async function streamOpenAICompatible(
  config: ProviderConfig,
  message: string,
  handlers: StreamChunkHandlers
): Promise<void> {
  if (!config.apiKey) {
    handlers.onError(`${config.id} API key not configured`);
    return;
  }

  const extraHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  };
  if (config.id === 'openrouter') {
    extraHeaders['HTTP-Referer'] = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://statminer.dobeu.tech';
    extraHeaders['X-Title'] = 'StatMiner';
  }

  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers: extraHeaders,
    body: JSON.stringify({
      model: config.model,
      stream: true,
      messages: [{ role: 'user', content: message }],
    }),
    signal: handlers.signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    handlers.onError(`${config.id} HTTP ${response.status}: ${text.slice(0, 200)}`);
    return;
  }

  const reader = response.body.getReader();
  try {
    for await (const line of lineStream(reader)) {
      if (!line.startsWith('data:')) continue;
      const payload = line.replace(/^data:\s*/, '');
      if (payload === '[DONE]') break;
      try {
        const event = JSON.parse(payload);
        const chunk = event.choices?.[0]?.delta?.content;
        if (typeof chunk === 'string' && chunk.length > 0) {
          handlers.onChunk(chunk);
        }
      } catch {
        // ignore malformed frame
      }
    }
    handlers.onComplete();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    handlers.onError(message);
  }
}

export async function streamFromProvider(
  providerId: ProviderId,
  message: string,
  handlers: StreamChunkHandlers
): Promise<void> {
  const config = PROVIDER_CONFIG[providerId];
  if (providerId === 'anthropic') {
    return streamAnthropic(config, message, handlers);
  }
  return streamOpenAICompatible(config, message, handlers);
}
