import SessionManager from '@/lib/auth/session-manager';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    // Reset singleton for testing
    manager = SessionManager.getInstance();
    // Clean up any existing sessions
    manager.getAllSessions().forEach(s => manager.deleteSession(s.id));
  });

  it('returns singleton instance', () => {
    const instance1 = SessionManager.getInstance();
    const instance2 = SessionManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('creates a session with default preferences', () => {
    const session = manager.createSession('user-123');
    expect(session.id).toBe('user-123');
    expect(session.preferences.theme).toBe('dark');
    expect(session.preferences.apiKeys).toEqual({});
  });

  it('creates an anonymous session with generated id', () => {
    const session = manager.createSession();
    expect(session.id).toMatch(/^anon-/);
  });

  it('retrieves an existing session', () => {
    manager.createSession('test-user');
    const retrieved = manager.getSession('test-user');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('test-user');
  });

  it('returns null for non-existent session', () => {
    expect(manager.getSession('nonexistent')).toBeNull();
  });

  it('updates session preferences', () => {
    manager.createSession('pref-user');
    const result = manager.updatePreferences('pref-user', { theme: 'light' });
    expect(result).toBe(true);
    const session = manager.getSession('pref-user');
    expect(session?.preferences.theme).toBe('light');
  });

  it('stores and retrieves API keys in memory', () => {
    manager.createSession('key-user');
    manager.storeApiKey('key-user', 'openai', 'sk-test-key');
    const key = manager.getApiKey('key-user', 'openai');
    expect(key).toBe('sk-test-key');
  });

  it('tracks API usage', () => {
    manager.createSession('usage-user');
    manager.updateApiUsage('usage-user', 'openai', 100, 0.003);
    manager.updateApiUsage('usage-user', 'openai', 200, 0.006);
    const session = manager.getSession('usage-user');
    expect(session?.apiUsage.openai.tokensUsed).toBe(300);
    expect(session?.apiUsage.openai.requestCount).toBe(2);
  });

  it('deletes a session', () => {
    manager.createSession('delete-me');
    expect(manager.deleteSession('delete-me')).toBe(true);
    expect(manager.getSession('delete-me')).toBeNull();
  });

  it('cleans up old anonymous sessions', () => {
    const session = manager.createSession();
    // Manually set updatedAt to 25 hours ago
    const s = manager.getSession(session.id);
    if (s) s.updatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const deleted = manager.cleanupOldSessions(24);
    expect(deleted).toBe(1);
  });

  it('does not clean up authenticated sessions', () => {
    manager.createSession('auth-user');
    const s = manager.getSession('auth-user');
    if (s) s.updatedAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const deleted = manager.cleanupOldSessions(24);
    expect(deleted).toBe(0);
  });

  it('exportSessionData excludes API keys', () => {
    manager.createSession('export-user');
    manager.storeApiKey('export-user', 'openai', 'sk-secret');
    const exported = manager.exportSessionData('export-user');
    expect(exported.preferences.apiKeys).toEqual({});
  });
});
