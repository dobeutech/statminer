import { useChatStore } from '@/lib/stores/chat-store';

describe('ChatStore', () => {
  beforeEach(() => {
    const store = useChatStore.getState();
    store.clearMessages();
  });

  it('initializes with default providers', () => {
    const { providers } = useChatStore.getState();
    expect(providers.length).toBeGreaterThan(0);
    expect(providers.some(p => p.id === 'openai')).toBe(true);
    expect(providers.some(p => p.id === 'anthropic')).toBe(true);
  });

  it('adds a message to the store', () => {
    const { addMessage } = useChatStore.getState();
    addMessage({
      id: 'test-msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date(),
    });
    const { messages } = useChatStore.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Hello');
  });

  it('clears all messages', () => {
    const store = useChatStore.getState();
    store.addMessage({ id: '1', role: 'user', content: 'msg', timestamp: new Date() });
    store.clearMessages();
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it('creates a new session', () => {
    const { createSession } = useChatStore.getState();
    const sessionId = createSession('Test Session');
    expect(sessionId).toMatch(/^session-/);
    const { sessions, currentSessionId } = useChatStore.getState();
    expect(sessions.some(s => s.id === sessionId)).toBe(true);
    expect(currentSessionId).toBe(sessionId);
  });

  it('persistence config excludes API keys', () => {
    const store = useChatStore.getState();
    store.updatePreferences({ apiKeys: { openai: 'sk-secret' } });

    // The persist partialize function should strip API keys
    // Access the persist options through the store's internal API
    const persistOptions = (useChatStore as any).persist;
    if (persistOptions?.getOptions) {
      const options = persistOptions.getOptions();
      if (options?.partialize) {
        const partialState = options.partialize(useChatStore.getState());
        expect(partialState.userPreferences.apiKeys).toEqual({});
      }
    }
  });

  it('updates streaming state', () => {
    const { setStreaming } = useChatStore.getState();
    setStreaming(true);
    expect(useChatStore.getState().isStreaming).toBe(true);
    setStreaming(false);
    expect(useChatStore.getState().isStreaming).toBe(false);
  });
});
