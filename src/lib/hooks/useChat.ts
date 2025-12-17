'use client';

import { useState, useCallback } from 'react';
import { ChatMessage, BatchResponse } from '@/types';

interface UseChatOptions {
  onResponse?: (providerId: string, response: string, metadata: any) => void;
  onError?: (providerId: string, error: string) => void;
  onComplete?: () => void;
}

interface UseChatReturn {
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string, providers: string[], apiKeys: Record<string, string>) => Promise<BatchResponse[]>;
  streamMessage: (message: string, providers: string[], apiKeys: Record<string, string>) => Promise<void>;
  cancelRequest: () => void;
}

/**
 * Simple HTTP-based chat hook for MVP
 * Replaces complex WebSocket implementation with straightforward fetch calls
 */
export const useChat = (options: UseChatOptions = {}): UseChatReturn => {
  const { onResponse, onError, onComplete } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const cancelRequest = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsLoading(false);
  }, [abortController]);

  /**
   * Send message to multiple providers and get batch responses
   * Simple, non-streaming approach for MVP
   */
  const sendMessage = useCallback(async (
    message: string,
    providers: string[],
    apiKeys: Record<string, string>
  ): Promise<BatchResponse[]> => {
    setIsLoading(true);
    setError(null);
    
    const controller = new AbortController();
    setAbortController(controller);
    
    const responses: BatchResponse[] = [];
    
    try {
      // Send to each provider in parallel
      const promises = providers.map(async (providerId) => {
        const apiKey = apiKeys[providerId];
        
        if (!apiKey) {
          const errorResponse: BatchResponse = {
            providerId,
            response: '',
            metadata: { tokensUsed: 0, responseTime: 0, model: '', cost: 0 },
            error: `No API key configured for ${providerId}`,
          };
          onError?.(providerId, errorResponse.error!);
          return errorResponse;
        }
        
        const startTime = Date.now();
        
        try {
          const response = await callProvider(providerId, message, apiKey, controller.signal);
          
          const result: BatchResponse = {
            providerId,
            response: response.content,
            metadata: {
              tokensUsed: response.tokensUsed || 0,
              responseTime: Date.now() - startTime,
              model: response.model || providerId,
              cost: response.cost || 0,
            },
          };
          
          onResponse?.(providerId, result.response, result.metadata);
          return result;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          const errorResponse: BatchResponse = {
            providerId,
            response: '',
            metadata: { tokensUsed: 0, responseTime: Date.now() - startTime, model: '', cost: 0 },
            error: errorMessage,
          };
          onError?.(providerId, errorMessage);
          return errorResponse;
        }
      });
      
      const results = await Promise.allSettled(promises);
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          responses.push(result.value);
        }
      }
      
      onComplete?.();
      return responses;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request cancelled');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      }
      return responses;
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  }, [onResponse, onError, onComplete]);

  /**
   * Stream responses from providers (uses Server-Sent Events simulation)
   * Falls back to batch if streaming not supported
   */
  const streamMessage = useCallback(async (
    message: string,
    providers: string[],
    apiKeys: Record<string, string>
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      // For MVP, use batch mode with simulated streaming effect
      // Real streaming would require SSE or WebSocket server
      await sendMessage(message, providers, apiKeys);
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  }, [sendMessage]);

  return {
    isLoading,
    error,
    sendMessage,
    streamMessage,
    cancelRequest,
  };
};

/**
 * Provider-specific API calls
 * These run client-side using user's own API keys
 */
async function callProvider(
  providerId: string,
  message: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<{ content: string; tokensUsed?: number; model?: string; cost?: number }> {
  const providerConfigs: Record<string, {
    endpoint: string;
    headers: (key: string) => Record<string, string>;
    body: (msg: string) => object;
    parseResponse: (data: any) => { content: string; tokensUsed?: number; model?: string };
  }> = {
    openai: {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      headers: (key) => ({
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      }),
      body: (msg) => ({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: msg }],
        max_tokens: 4096,
      }),
      parseResponse: (data) => ({
        content: data.choices?.[0]?.message?.content || '',
        tokensUsed: data.usage?.total_tokens,
        model: data.model,
      }),
    },
    anthropic: {
      endpoint: 'https://api.anthropic.com/v1/messages',
      headers: (key) => ({
        'x-api-key': key,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      }),
      body: (msg) => ({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: msg }],
        max_tokens: 4096,
      }),
      parseResponse: (data) => ({
        content: data.content?.[0]?.text || '',
        tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        model: data.model,
      }),
    },
    openrouter: {
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      headers: (key) => ({
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
      }),
      body: (msg) => ({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: msg }],
        max_tokens: 4096,
      }),
      parseResponse: (data) => ({
        content: data.choices?.[0]?.message?.content || '',
        tokensUsed: data.usage?.total_tokens,
        model: data.model,
      }),
    },
    grok: {
      endpoint: 'https://api.x.ai/v1/chat/completions',
      headers: (key) => ({
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      }),
      body: (msg) => ({
        model: 'grok-beta',
        messages: [{ role: 'user', content: msg }],
        max_tokens: 4096,
      }),
      parseResponse: (data) => ({
        content: data.choices?.[0]?.message?.content || '',
        tokensUsed: data.usage?.total_tokens,
        model: data.model,
      }),
    },
  };

  const config = providerConfigs[providerId];
  
  if (!config) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: config.headers(apiKey),
    body: JSON.stringify(config.body(message)),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || 
      `${providerId} API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const parsed = config.parseResponse(data);
  
  // Calculate approximate cost
  const cost = calculateCost(providerId, parsed.tokensUsed || 0);
  
  return { ...parsed, cost };
}

/**
 * Approximate cost calculation per provider
 * Prices as of late 2024
 */
function calculateCost(providerId: string, tokens: number): number {
  const costPer1kTokens: Record<string, number> = {
    openai: 0.01,      // GPT-4 Turbo average
    anthropic: 0.015,  // Claude 3.5 Sonnet average
    openrouter: 0.015, // Varies by model
    grok: 0.01,        // Estimated
  };
  
  return (tokens / 1000) * (costPer1kTokens[providerId] || 0.01);
}

export default useChat;
