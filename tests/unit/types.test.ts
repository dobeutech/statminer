import { MessageSchema, ChatRequestSchema, ApiKeyConfigSchema } from '@/types';

describe('Zod Validation Schemas', () => {
  describe('MessageSchema', () => {
    it('should validate a correct message', () => {
      const result = MessageSchema.safeParse({
        role: 'user',
        content: 'Hello, world!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = MessageSchema.safeParse({
        role: 'user',
        content: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const result = MessageSchema.safeParse({
        role: 'invalid',
        content: 'Hello',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid roles', () => {
      for (const role of ['user', 'assistant', 'system']) {
        const result = MessageSchema.safeParse({
          role,
          content: 'Test message',
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('ChatRequestSchema', () => {
    it('should validate a correct chat request', () => {
      const result = ChatRequestSchema.safeParse({
        message: 'Hello',
        providers: ['openai'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty message', () => {
      const result = ChatRequestSchema.safeParse({
        message: '',
        providers: ['openai'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty providers array', () => {
      const result = ChatRequestSchema.safeParse({
        message: 'Hello',
        providers: [],
      });
      expect(result.success).toBe(false);
    });

    it('should default streaming to true', () => {
      const result = ChatRequestSchema.parse({
        message: 'Hello',
        providers: ['openai'],
      });
      expect(result.streaming).toBe(true);
    });
  });

  describe('ApiKeyConfigSchema', () => {
    it('should validate empty config', () => {
      const result = ApiKeyConfigSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate partial config', () => {
      const result = ApiKeyConfigSchema.safeParse({
        openai: 'sk-test-key',
      });
      expect(result.success).toBe(true);
    });
  });
});
