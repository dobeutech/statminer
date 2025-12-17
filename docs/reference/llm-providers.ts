// src/lib/llm-providers/index.ts

import { LLMProvider, ModelResponse, ChatMessage } from '@/types';
import axios from 'axios';

export class LLMProviderManager {
  private providers: Map<string, LLMProvider> = new Map();
  private apiKeys: Map<string, string> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const providers: LLMProvider[] = [
      {
        id: 'openai',
        name: 'OpenAI',
        endpoint: 'https://api.openai.com/v1',
        apiKeyRequired: true,
        models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
        maxTokens: 128000,
        supportsStreaming: true
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        endpoint: 'https://api.anthropic.com/v1',
        apiKeyRequired: true,
        models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        maxTokens: 200000,
        supportsStreaming: true
      },
      {
        id: 'openrouter',
        name: 'OpenRouter',
        endpoint: 'https://openrouter.ai/api/v1',
        apiKeyRequired: true,
        models: ['meta-llama/llama-3-70b-instruct', 'mistralai/mixtral-8x7b-instruct', 'google/gemini-pro'],
        maxTokens: 32000,
        supportsStreaming: true
      },
      {
        id: 'grok',
        name: 'xAI Grok',
        endpoint: 'https://api.x.ai/v1',
        apiKeyRequired: true,
        models: ['grok-beta'],
        maxTokens: 100000,
        supportsStreaming: true
      },
      {
        id: 'requesty',
        name: 'Requesty AI',
        endpoint: 'https://api.requesty.ai/v1',
        apiKeyRequired: true,
        models: ['requesty-turbo', 'requesty-base'],
        maxTokens: 32000,
        supportsStreaming: false
      }
    ];

    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  public setApiKey(providerId: string, apiKey: string): void {
    this.apiKeys.set(providerId, apiKey);
  }

  public async sendMessage(
    providerId: string,
    model: string,
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<ModelResponse> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const apiKey = this.apiKeys.get(providerId);
    if (provider.apiKeyRequired && !apiKey) {
      throw new Error(`API key required for ${provider.name}`);
    }

    const startTime = Date.now();

    try {
      let response: any;
      
      switch (providerId) {
        case 'openai':
          response = await this.sendOpenAIRequest(apiKey!, model, messages, options);
          break;
        case 'anthropic':
          response = await this.sendAnthropicRequest(apiKey!, model, messages, options);
          break;
        case 'openrouter':
          response = await this.sendOpenRouterRequest(apiKey!, model, messages, options);
          break;
        case 'grok':
          response = await this.sendGrokRequest(apiKey!, model, messages, options);
          break;
        case 'requesty':
          response = await this.sendRequestyRequest(apiKey!, model, messages, options);
          break;
        default:
          throw new Error(`Provider ${providerId} not implemented`);
      }

      const latency = Date.now() - startTime;

      return {
        modelId: `${providerId}:${model}`,
        modelName: `${provider.name} - ${model}`,
        response: response.content,
        latency,
        tokens: response.usage || {
          prompt: 0,
          completion: 0,
          total: 0
        },
        citations: []
      };
    } catch (error: any) {
      return {
        modelId: `${providerId}:${model}`,
        modelName: `${provider.name} - ${model}`,
        response: '',
        latency: Date.now() - startTime,
        tokens: { prompt: 0, completion: 0, total: 0 },
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  private async sendOpenAIRequest(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    options?: any
  ): Promise<any> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.choices[0].message.content,
      usage: {
        prompt: response.data.usage.prompt_tokens,
        completion: response.data.usage.completion_tokens,
        total: response.data.usage.total_tokens
      }
    };
  }

  private async sendAnthropicRequest(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    options?: any
  ): Promise<any> {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        messages: messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        system: messages.find(m => m.role === 'system')?.content,
        max_tokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.7
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.content[0].text,
      usage: {
        prompt: response.data.usage?.input_tokens || 0,
        completion: response.data.usage?.output_tokens || 0,
        total: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
      }
    };
  }

  private async sendOpenRouterRequest(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    options?: any
  ): Promise<any> {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://data-aggregator.vercel.app',
          'X-Title': 'Data Aggregator',
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.choices[0].message.content,
      usage: {
        prompt: response.data.usage?.prompt_tokens || 0,
        completion: response.data.usage?.completion_tokens || 0,
        total: response.data.usage?.total_tokens || 0
      }
    };
  }

  private async sendGrokRequest(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    options?: any
  ): Promise<any> {
    // Grok API implementation (when available)
    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage || { prompt: 0, completion: 0, total: 0 }
    };
  }

  private async sendRequestyRequest(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    options?: any
  ): Promise<any> {
    // Requesty.ai API implementation
    const response = await axios.post(
      'https://api.requesty.ai/v1/completions',
      {
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000
      },
      {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.response,
      usage: response.data.usage || { prompt: 0, completion: 0, total: 0 }
    };
  }

  public async sendToMultipleModels(
    messages: ChatMessage[],
    modelConfigs: Array<{ providerId: string; model: string }>,
    options?: any
  ): Promise<ModelResponse[]> {
    const promises = modelConfigs.map(config =>
      this.sendMessage(config.providerId, config.model, messages, options)
    );

    return Promise.all(promises);
  }

  public getAvailableProviders(): LLLProvider[] {
    return Array.from(this.providers.values());
  }

  public getProviderModels(providerId: string): string[] {
    const provider = this.providers.get(providerId);
    return provider?.models || [];
  }
}