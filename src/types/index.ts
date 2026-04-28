import { z } from 'zod';

export const ProviderIdSchema = z.enum(['anthropic', 'openai', 'openrouter', 'grok']);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(12_000, 'Message too long'),
  providers: z.array(ProviderIdSchema).min(1).max(4),
  sessionId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  providerId?: ProviderId;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
