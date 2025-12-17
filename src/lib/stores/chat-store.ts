import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ChatMessage, ChatSession, UserPreferences } from '@/types';

interface ChatStore {
  // State
  messages: ChatMessage[];
  sessions: ChatSession[];
  currentSessionId: string | null;
  isStreaming: boolean;
  
  // Message actions
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  
  // Session management
  createSession: (title?: string) => string;
  deleteSession: (sessionId: string) => void;
  switchSession: (sessionId: string) => void;
  
  // Streaming
  setStreaming: (isStreaming: boolean) => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  defaultProviders: ['openai'],
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
        
        // Message actions
        addMessage: (message) => 
          set((state) => ({
            messages: [...state.messages, message],
          })),
          
        updateMessage: (messageId, updates) =>
          set((state) => ({
            messages: state.messages.map(m => 
              m.id === messageId ? { ...m, ...updates } : m
            ),
          })),
          
        clearMessages: () => set({ messages: [] }),
        
        // Session management
        createSession: (title) => {
          const sessionId = `session-${Date.now()}`;
          const newSession: ChatSession = {
            id: sessionId,
            title: title || `Chat ${get().sessions.length + 1}`,
            messages: [],
            activeProviders: defaultPreferences.defaultProviders,
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
        
        // Streaming
        setStreaming: (isStreaming) => set({ isStreaming }),
      }),
      {
        name: 'statminer-chat-store',
        partialize: (state) => ({
          sessions: state.sessions,
        }),
      }
    ),
    {
      name: 'chat-store',
    }
  )
);

export default useChatStore;
