import { UserSession, UserPreferences, ChatSession } from '@/types';
import logger from '@/lib/logger';

class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, UserSession> = new Map();

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Create a new user session
  createSession(userId?: string): UserSession {
    const sessionId = userId || `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
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

    const session: UserSession = {
      id: sessionId,
      userId,
      preferences: defaultPreferences,
      chatSessions: [],
      apiUsage: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  // Get existing session or create a new one
  getSession(sessionId: string): UserSession | null {
    return this.sessions.get(sessionId) || null;
  }

  // Update session preferences
  updatePreferences(sessionId: string, preferences: Partial<UserPreferences>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.preferences = { ...session.preferences, ...preferences };
    session.updatedAt = new Date();
    return true;
  }

  // Add chat session
  addChatSession(sessionId: string, chatSession: ChatSession): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.chatSessions.push(chatSession);
    session.updatedAt = new Date();
    return true;
  }

  // Update API usage tracking
  updateApiUsage(
    sessionId: string, 
    providerId: string, 
    tokensUsed: number, 
    cost: number
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (!session.apiUsage[providerId]) {
      session.apiUsage[providerId] = {
        tokensUsed: 0,
        requestCount: 0,
        cost: 0,
        lastUsed: new Date(),
      };
    }

    session.apiUsage[providerId].tokensUsed += tokensUsed;
    session.apiUsage[providerId].requestCount += 1;
    session.apiUsage[providerId].cost += cost;
    session.apiUsage[providerId].lastUsed = new Date();
    session.updatedAt = new Date();

    return true;
  }

  // Store API key for a session
  storeApiKey(sessionId: string, providerId: string, apiKey: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.preferences.apiKeys[providerId] = apiKey;
    session.updatedAt = new Date();
    return true;
  }

  // Get API key for a provider
  getApiKey(sessionId: string, providerId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return session.preferences.apiKeys[providerId] || null;
  }

  // Delete session
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  // Get all sessions (for admin purposes)
  getAllSessions(): UserSession[] {
    return Array.from(this.sessions.values());
  }

  // Clean up old sessions (run periodically)
  cleanupOldSessions(maxAgeHours: number = 24): number {
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let deletedCount = 0;

    const entries = Array.from(this.sessions.entries());
    for (const [sessionId, session] of entries) {
      if (session.updatedAt < cutoffDate && !session.userId) {
        // Only delete anonymous sessions that are old
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Persist session to storage (implement based on your storage solution)
  async persistSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      // Here you would implement persistence to your chosen storage
      // For example: database, Redis, file system, etc.
      
      // For now, we'll just keep it in memory
      logger.info({ sessionId }, 'Persisting session');
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Failed to persist session');
      return false;
    }
  }

  // Load session from storage
  async loadSession(sessionId: string): Promise<UserSession | null> {
    try {
      // Here you would implement loading from your chosen storage
      
      // For now, return from memory
      return this.sessions.get(sessionId) || null;
    } catch (error) {
      logger.error({ err: error }, 'Failed to load session');
      return null;
    }
  }

  // Export session data
  exportSessionData(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      ...session,
      // Remove sensitive data
      preferences: {
        ...session.preferences,
        apiKeys: {}, // Don't export API keys
      },
    };
  }
}

export default SessionManager;