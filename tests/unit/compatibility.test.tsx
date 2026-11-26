import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import CookieConsent from '@/components/CookieConsent';
import PWAProvider, { usePWA } from '@/components/PWAProvider';

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: { div: ({ children, initial, animate, exit, transition, ...props }: any) => <div {...props}>{children}</div> },
}));
jest.mock('@/lib/pwa/register-sw', () => ({
  registerServiceWorker: jest.fn().mockResolvedValue(undefined),
  requestPersistentStorage: jest.fn().mockResolvedValue(undefined),
  checkForUpdates: jest.fn(),
  requestNotificationPermission: jest.fn().mockResolvedValue(true),
}));
function Status() {
  const { isOnline, isInstalled, canInstall } = usePWA();
  return <output>{`${isOnline}/${isInstalled}/${canInstall}`}</output>;
}
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: jest.fn(() => ({
    matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn(),
  })) });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
it('honors stored consent, persists dismissal, and updates from another tab', () => {
  localStorage.setItem('statminer-cookie-consent', 'accepted');
  render(<CookieConsent />);
  expect(screen.queryByText('Accept All')).toBeNull();
  act(() => { localStorage.clear(); window.dispatchEvent(new Event('storage')); });
  fireEvent.click(screen.getByText('Decline Optional'));
  expect(localStorage.getItem('statminer-cookie-consent')).toBe('declined');
  expect(screen.queryByText('Accept All')).toBeNull();
});
it('tracks network events and retains installation after appinstalled', async () => {
  const view = render(<PWAProvider><Status /></PWAProvider>);
  await act(async () => {});
  expect(screen.getByRole('status').textContent).toBe('true/false/false');
  act(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    window.dispatchEvent(new Event('offline'));
  });
  expect(screen.getByRole('status').textContent).toBe('false/false/false');
  act(() => { window.dispatchEvent(new Event('beforeinstallprompt')); });
  expect(screen.getByRole('status').textContent).toBe('false/false/true');
  act(() => { window.dispatchEvent(new Event('appinstalled')); });
  expect(screen.getByRole('status').textContent).toBe('false/true/false');
  view.unmount();
});

jest.mock('@/lib/hooks/useWebSocket', () => ({ useWebSocket: () => ({ isConnected: false, send: jest.fn() }) }));
jest.mock('@/lib/stores/chat-store', () => ({ useChatStore: jest.fn() }));
jest.mock('@/components/ProviderSelector', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ChatInput', () => ({ __esModule: true, default: ({ onSendMessage }: { onSendMessage: (s: string) => void }) => <button onClick={() => onSendMessage('hello')}>Send</button> }));
jest.mock('@/components/MessageList', () => ({ __esModule: true, default: ({ isStreaming }: { isStreaming: boolean }) => <span>{isStreaming ? 'Streaming' : 'Idle'}</span> }));
import MultiAgentChat from '@/components/MultiAgentChat';
import { useChatStore } from '@/lib/stores/chat-store';
it.each(['success', 'handled failure', 'rejection'])('ends HTTP streaming after %s', async (result) => {
  let finish!: () => void;
  const request = new Promise<void>((resolve, reject) => { finish = () => result === 'rejection' ? reject(new Error('failed')) : resolve(); });
  jest.mocked(useChatStore).mockReturnValue({
    sendMessage: jest.fn(() => request), messages: [], isStreaming: false,
    providers: [], addMessage: jest.fn(), updateMessage: jest.fn(),
  });
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<MultiAgentChat sessionId="session" />);
  fireEvent.click(screen.getByText('Send'));
  expect(screen.getAllByText('Streaming').length).toBeGreaterThan(0);
  await act(async () => { finish(); await request.catch(() => {}); });
  expect(screen.queryByText('Streaming')).toBeNull();
  expect(screen.getAllByText('Idle').length).toBeGreaterThan(0);
  errorLog.mockRestore();
});
import ApiKeyPrompt from '@/components/ApiKeyPrompt';
import { LLMProvider } from '@/types';
it('opens for missing API keys, allows dismissal, and reopens when providers change', () => {
  jest.mocked(useChatStore).mockReturnValue({ updateProvider: jest.fn() });
  const provider = { id: 'openai', name: 'OpenAI', model: 'test', apiKey: '' } as LLMProvider;
  const done = jest.fn();
  const view = render(<ApiKeyPrompt providers={[]} onApiKeysConfigured={done} />);
  expect(screen.queryByText('Configure API Keys')).toBeNull();
  view.rerender(<ApiKeyPrompt providers={[provider]} onApiKeysConfigured={done} />);
  expect(screen.getByText('Configure API Keys')).toBeTruthy();
  fireEvent.click(screen.getByText('Skip All'));
  expect(done).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Configure API Keys')).toBeNull();
  view.rerender(<ApiKeyPrompt providers={[{ ...provider, model: 'updated' }]} onApiKeysConfigured={done} />);
  expect(screen.getByText('Configure API Keys')).toBeTruthy();
});
