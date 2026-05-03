import { LLMProvider, BatchResponse } from '@/types';
import logger from '@/lib/logger';

interface StreamingCallbacks {
  onStream: (providerId: string, chunk: string, isComplete: boolean) => void;
  onComplete: (providerId: string, response: string, metadata: any) => void;
  onError: (providerId: string, error: string) => void;
}

interface ProviderRequest {
  providerId: string;
  message: string;
  apiKey: string;
  endpoint: string;
  model: string;
  streaming?: boolean;
}

// Provider-specific implementations
class OpenAIProvider {
  static async sendRequest(
    request: ProviderRequest,
    callbacks?: StreamingCallbacks
  ): Promise<BatchResponse | void> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(request.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${request.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages: [{ role: 'user', content: request.message }],
          stream: request.streaming || false,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      if (request.streaming && callbacks) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(line => line.trim() !== '');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    callbacks.onComplete(request.providerId, fullResponse, {
                      tokensUsed: fullResponse.length / 4, // Rough estimate
                      responseTime: Date.now() - startTime,
                      model: request.model,
                    });
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices[0]?.delta?.content || '';
                    if (content) {
                      fullResponse += content;
                      callbacks.onStream(request.providerId, content, false);
                    }
                  } catch (e) {
                    logger.error({ err: e }, 'Failed to parse OpenAI stream');
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      } else {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        const tokensUsed = data.usage?.total_tokens || 0;

        return {
          providerId: request.providerId,
          response: content,
          metadata: {
            tokensUsed,
            responseTime: Date.now() - startTime,
            model: request.model,
            cost: (tokensUsed / 1000) * 0.03, // Example cost calculation
          },
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (callbacks) {
        callbacks.onError(request.providerId, errorMessage);
      } else {
        throw error;
      }
    }
  }
}

class AnthropicProvider {
  static async sendRequest(
    request: ProviderRequest,
    callbacks?: StreamingCallbacks
  ): Promise<BatchResponse | void> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(request.endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': request.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: request.model,
          messages: [{ role: 'user', content: request.message }],
          max_tokens: 4096,
          stream: request.streaming || false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      if (request.streaming && callbacks) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(line => line.trim() !== '');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'content_block_delta') {
                      const content = parsed.delta?.text || '';
                      if (content) {
                        fullResponse += content;
                        callbacks.onStream(request.providerId, content, false);
                      }
                    } else if (parsed.type === 'message_stop') {
                      callbacks.onComplete(request.providerId, fullResponse, {
                        tokensUsed: fullResponse.length / 4, // Rough estimate
                        responseTime: Date.now() - startTime,
                        model: request.model,
                      });
                      return;
                    }
                  } catch (e) {
                    logger.error({ err: e }, 'Failed to parse Anthropic stream');
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      } else {
        const data = await response.json();
        const content = data.content[0]?.text || '';
        
        return {
          providerId: request.providerId,
          response: content,
          metadata: {
            tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens || 0,
            responseTime: Date.now() - startTime,
            model: request.model,
            cost: ((data.usage?.input_tokens || 0) / 1000) * 0.015 + 
                  ((data.usage?.output_tokens || 0) / 1000) * 0.075,
          },
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (callbacks) {
        callbacks.onError(request.providerId, errorMessage);
      } else {
        throw error;
      }
    }
  }
}

class OpenRouterProvider {
  static async sendRequest(
    request: ProviderRequest,
    callbacks?: StreamingCallbacks
  ): Promise<BatchResponse | void> {
    // OpenRouter uses OpenAI-compatible API
    return OpenAIProvider.sendRequest(
      {
        ...request,
        endpoint: request.endpoint,
      },
      callbacks
    );
  }
}

class GrokProvider {
  static async sendRequest(
    request: ProviderRequest,
    callbacks?: StreamingCallbacks
  ): Promise<BatchResponse | void> {
    // Grok uses OpenAI-compatible API
    return OpenAIProvider.sendRequest(request, callbacks);
  }
}

class RequestyProvider {
  static async sendRequest(
    request: ProviderRequest,
    callbacks?: StreamingCallbacks
  ): Promise<BatchResponse | void> {
    // Requesty uses OpenAI-compatible API with their endpoint
    return OpenAIProvider.sendRequest(request, callbacks);
  }
}

// Provider registry
const PROVIDERS = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  openrouter: OpenRouterProvider,
  grok: GrokProvider,
  requesty: RequestyProvider,
} as const;

// Provider endpoint/model configuration
const PROVIDER_DEFAULTS: Record<string, { endpoint: string; model: string; name: string }> = {
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo-preview',
    name: 'OpenAI GPT-4',
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-opus-20240229',
    name: 'Anthropic Claude',
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'anthropic/claude-3-opus',
    name: 'OpenRouter',
  },
  grok: {
    endpoint: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-beta',
    name: 'Grok',
  },
  requesty: {
    endpoint: 'https://router.requesty.ai/v1/chat/completions',
    model: 'gpt-4-turbo-preview',
    name: 'Requesty',
  },
};

interface SendOptions {
  apiKeys?: Record<string, string>;
  history?: Array<{ role: string; content: string }>;
}

// Main function to send messages to multiple providers
export async function sendToLLMProviders(
  message: string,
  providerIds: string[],
  callbacks?: StreamingCallbacks,
  options?: SendOptions
): Promise<BatchResponse[]> {
  const requests: Promise<BatchResponse | void>[] = [];

  for (const providerId of providerIds) {
    const defaults = PROVIDER_DEFAULTS[providerId];
    if (!defaults) {
      logger.warn({ providerId }, 'No implementation found for provider');
      if (callbacks) {
        callbacks.onError(providerId, `Provider ${providerId} is not supported`);
      }
      continue;
    }

    const apiKey = options?.apiKeys?.[providerId] || process.env[`${providerId.toUpperCase()}_API_KEY`] || '';
    if (!apiKey) {
      logger.warn({ providerId }, 'No API key found for provider');
      if (callbacks) {
        callbacks.onError(providerId, `No API key configured for ${defaults.name}`);
      }
      continue;
    }

    const ProviderClass = PROVIDERS[providerId as keyof typeof PROVIDERS];
    if (!ProviderClass) {
      continue;
    }

    const fullMessage = options?.history?.length
      ? options.history.map(m => `${m.role}: ${m.content}`).join('\n') + `\nuser: ${message}`
      : message;

    const request: ProviderRequest = {
      providerId,
      message: fullMessage,
      apiKey,
      endpoint: defaults.endpoint,
      model: defaults.model,
      streaming: !!callbacks,
    };

    requests.push(ProviderClass.sendRequest(request, callbacks));
  }

  if (callbacks) {
    await Promise.allSettled(requests);
    return [];
  } else {
    const results = await Promise.allSettled(requests);
    return results
      .filter((result): result is PromiseFulfilledResult<BatchResponse> =>
        result.status === 'fulfilled' && result.value !== undefined
      )
      .map(result => result.value);
  }
}