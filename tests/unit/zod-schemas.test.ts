import { ChatRequestSchema, ApiKeyConfigSchema, MessageSchema } from '@/types';

describe('Zod Schemas', () => {
  describe('ChatRequestSchema', () => {
    it('validates a correct chat request', () => {
      const result = ChatRequestSchema.safeParse({
        message: 'Hello world',
        providers: ['openai'],
        streaming: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty message', () => {
      const result = ChatRequestSchema.safeParse({
        message: '',
        providers: ['openai'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty providers array', () => {
      const result = ChatRequestSchema.safeParse({
        message: 'Hello',
        providers: [],
      });
      expect(result.success).toBe(false);
    });

    it('defaults streaming to true', () => {
      const result = ChatRequestSchema.parse({
        message: 'Hello',
        providers: ['openai'],
      });
      expect(result.streaming).toBe(true);
    });

    it('accepts optional sessionId', () => {
      const result = ChatRequestSchema.safeParse({
        message: 'Hello',
        providers: ['openai'],
        sessionId: 'session-123',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ApiKeyConfigSchema', () => {
    it('validates all optional keys', () => {
      const result = ApiKeyConfigSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('validates with some keys provided', () => {
      const result = ApiKeyConfigSchema.safeParse({
        openai: 'sk-test',
        anthropic: 'sk-ant-test',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('MessageSchema', () => {
    it('validates a user message', () => {
      const result = MessageSchema.safeParse({
        role: 'user',
        content: 'Hello',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = MessageSchema.safeParse({
        role: 'invalid',
        content: 'Hello',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty content', () => {
      const result = MessageSchema.safeParse({
        role: 'user',
        content: '',
      });
      expect(result.success).toBe(false);
    });
  });
});
