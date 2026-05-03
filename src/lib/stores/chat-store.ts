import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ChatMessage, LLMProvider, ChatSession, UserPreferences } from '@/types';

interface ChatStore {
  // State
  messages: ChatMessage[];
  sessions: ChatSession[];
  currentSessionId: string | null;
  isStreaming: boolean;
  providers: LLMProvider[];
  userPreferences: UserPreferences;
  
  // Actions
  addMessage: (message: ChatMessage) => void;
  updateMessage: (providerId: string, content: string) => void;
  clearMessages: () => void;
  sendMessage: (content: string, providerIds: string[], sessionId?: string) => Promise<void>;
  
  // Session management
  createSession: (title?: string) => string;
  deleteSession: (sessionId: string) => void;
  switchSession: (sessionId: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  
  // Providers
  updateProvider: (providerId: string, updates: Partial<LLMProvider>) => void;
  addProvider: (provider: LLMProvider) => void;
  removeProvider: (providerId: string) => void;
  
  // User preferences
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  
  // Streaming
  setStreaming: (isStreaming: boolean) => void;
}

const defaultProviders: LLMProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI GPT-4',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    model: 'gpt-4-turbo-preview',
    supportsStreaming: true,
    maxTokens: 4096,
    costPer1kTokens: 0.03,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    apiKey: '',
    model: 'claude-3-opus-20240229',
    supportsStreaming: true,
    maxTokens: 4096,
    costPer1kTokens: 0.015,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: '',
    model: 'anthropic/claude-3-opus',
    supportsStreaming: true,
    maxTokens: 4096,
    costPer1kTokens: 0.015,
  },
  {
    id: 'grok',
    name: 'Grok',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    apiKey: '',
    model: 'grok-beta',
    supportsStreaming: true,
    maxTokens: 4096,
    costPer1kTokens: 0.01,
  },
  {
    id: 'requesty',
    name: 'Requesty',
    endpoint: 'https://router.requesty.ai/v1/chat/completions',
    apiKey: '',
    model: 'gpt-4-turbo-preview',
    supportsStreaming: true,
    maxTokens: 4096,
    costPer1kTokens: 0.02,
  },
];

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  defaultProviders: ['openai', 'anthropic'],
  chatViewMode: 'tabs',
  autoSave: true,
  notifications: {
    email: false,
    browser: true,
    apiAlerts: true,
  },
  apiKeys: {},
};

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        messages: [],
        sessions: [],
        currentSessionId: null,
        isStreaming: false,
        providers: defaultProviders,
        userPreferences: defaultPreferences,
        
        // Message actions
        addMessage: (message) => 
          set((state) => ({
            messages: [...state.messages, message],
          })),
          
        updateMessage: (providerId, content) =>
          set((state) => {
            const existingMessageIndex = state.messages.findLastIndex(
              m => m.providerId === providerId && m.role === 'assistant'
            );
            
            if (existingMessageIndex >= 0) {
              const updatedMessages = [...state.messages];
              updatedMessages[existingMessageIndex] = {
                ...updatedMessages[existingMessageIndex],
                content: updatedMessages[existingMessageIndex].content + content,
              };
              return { messages: updatedMessages };
            } else {
              // Create new message if none exists
              const newMessage: ChatMessage = {
                id: `${providerId}-${Date.now()}`,
                role: 'assistant',
                content,
                timestamp: new Date(),
                providerId,
              };
              return { messages: [...state.messages, newMessage] };
            }
          }),
          
        clearMessages: () => set({ messages: [] }),
        
        sendMessage: async (content, providerIds, sessionId) => {
          const state = get();
          set({ isStreaming: true });

          const apiKeys: Record<string, string> = {};
          for (const p of state.providers) {
            if (p.apiKey && providerIds.includes(p.id)) {
              apiKeys[p.id] = p.apiKey;
            }
          }

          const history = state.messages
            .slice(-20)
            .map(m => ({ role: m.role, content: m.content }));

          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: content,
                providers: providerIds,
                sessionId: sessionId || state.currentSessionId,
                streaming: true,
                apiKeys,
                history,
              }),
            });
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Handle streaming response
            if (response.body) {
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  
                  const chunk = decoder.decode(value);
                  const lines = chunk.split('\n').filter(line => line.trim() !== '');
                  
                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      try {
                        const data = JSON.parse(line.slice(6));
                        if (data.providerId && data.chunk) {
                          get().updateMessage(data.providerId, data.chunk);
                        }
                      } catch (e) {
                        console.error('Failed to parse SSE data:', e);
                      }
                    }
                  }
                }
              } finally {
                reader.releaseLock();
              }
            }
          } catch (error) {
            console.error('Failed to send message:', error);
            // Add error message to chat
            get().addMessage({
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: 'Sorry, there was an error processing your request. Please try again.',
              timestamp: new Date(),
            });
          } finally {
            set({ isStreaming: false });
          }
        },
        
        // Session management
        createSession: (title) => {
          const sessionId = `session-${Date.now()}`;
          const newSession: ChatSession = {
            id: sessionId,
            title: title || `Chat ${get().sessions.length + 1}`,
            messages: [],
            activeProviders: get().userPreferences.defaultProviders,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          set((state) => ({
            sessions: [...state.sessions, newSession],
            currentSessionId: sessionId,
            messages: [],
          }));
          
          return sessionId;
        },
        
        deleteSession: (sessionId) =>
          set((state) => {
            const updatedSessions = state.sessions.filter(s => s.id !== sessionId);
            const newCurrentSession = state.currentSessionId === sessionId 
              ? updatedSessions[0]?.id || null 
              : state.currentSessionId;
              
            return {
              sessions: updatedSessions,
              currentSessionId: newCurrentSession,
              messages: newCurrentSession 
                ? updatedSessions.find(s => s.id === newCurrentSession)?.messages || []
                : [],
            };
          }),
          
        switchSession: (sessionId) => {
          const session = get().sessions.find(s => s.id === sessionId);
          if (session) {
            set({
              currentSessionId: sessionId,
              messages: session.messages,
            });
          }
        },
        
        updateSessionTitle: (sessionId, title) =>
          set((state) => ({
            sessions: state.sessions.map(s => 
              s.id === sessionId 
                ? { ...s, title, updatedAt: new Date() }
                : s
            ),
          })),
        
        // Provider management
        updateProvider: (providerId, updates) =>
          set((state) => ({
            providers: state.providers.map(p => 
              p.id === providerId ? { ...p, ...updates } : p
            ),
          })),
          
        addProvider: (provider) =>
          set((state) => ({
            providers: [...state.providers, provider],
          })),
          
        removeProvider: (providerId) =>
          set((state) => ({
            providers: state.providers.filter(p => p.id !== providerId),
          })),
        
        // User preferences
        updatePreferences: (preferences) =>
          set((state) => ({
            userPreferences: { ...state.userPreferences, ...preferences },
          })),
        
        // Streaming
        setStreaming: (isStreaming) => set({ isStreaming }),
      }),
      {
        name: 'statminer-chat-store',
        partialize: (state) => ({
          sessions: state.sessions,
          userPreferences: {
            ...state.userPreferences,
            apiKeys: {},
          },
          providers: state.providers.map(p => ({
            ...p,
            apiKey: undefined,
          })),
        }),
      }
    ),
    {
      name: 'chat-store',
    }
  )
);