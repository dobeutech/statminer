'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import {
  registerServiceWorker,
  requestPersistentStorage,
  requestNotificationPermission,
  checkForUpdates,
} from '@/lib/pwa/register-sw';

interface PWAContextType {
  isOnline: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  promptInstall: () => void;
  hasNotificationPermission: boolean;
  requestNotifications: () => void;
}

const subscribeOnline = (notify: () => void) => {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
};
const subscribeInstalled = (notify: () => void) => {
  const media = window.matchMedia('(display-mode: standalone)');
  media.addEventListener('change', notify);
  window.addEventListener('appinstalled', notify);
  return () => {
    media.removeEventListener('change', notify);
    window.removeEventListener('appinstalled', notify);
  };
};
const getInstalled = () => Boolean(window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone ||
  document.referrer.includes('android-app://'));

const PWAContext = React.createContext<PWAContextType | null>(null);

interface PWAProviderProps {
  children: React.ReactNode;
}

const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const isOnline = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [installedByEvent, setInstalledByEvent] = useState(false);
  const installedInBrowser = useSyncExternalStore(subscribeInstalled, getInstalled, () => false);
  const isInstalled = installedByEvent || installedInBrowser;
  const [canInstall, setCanInstall] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    async function initializePWA() {
      // Register service worker
      await registerServiceWorker();

      // Request persistent storage
      await requestPersistentStorage();

      // Check for updates
      checkForUpdates();

      // Check notification permission
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setHasNotificationPermission(Notification.permission === 'granted');
      }
    }

    // Initialize PWA features
    initializePWA();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setInstalledByEvent(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('PWA install accepted');
      } else {
        console.log('PWA install dismissed');
      }

      setDeferredPrompt(null);
      setCanInstall(false);
    }
  };

  const requestNotifications = async () => {
    const granted = await requestNotificationPermission();
    setHasNotificationPermission(granted);
  };

  const contextValue: PWAContextType = {
    isOnline,
    isInstalled,
    canInstall,
    promptInstall,
    hasNotificationPermission,
    requestNotifications,
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      {!isOnline && <OfflineIndicator />}
      {canInstall && !isInstalled && <InstallPrompt onInstall={promptInstall} />}
    </PWAContext.Provider>
  );
};

// Offline indicator component
const OfflineIndicator: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 px-4 text-sm font-medium z-50">
      <div className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        You&apos;re offline. Some features may be limited.
      </div>
    </div>
  );
};

// Install prompt component
const InstallPrompt: React.FC<{ onInstall: () => void }> = ({ onInstall }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 max-w-sm mx-auto">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Install StatMiner
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Add to your home screen for quick access and offline use.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onInstall}
              className="text-xs bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded-sm font-medium"
            >
              Install
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-1"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook to use PWA context
export const usePWA = () => {
  const context = React.useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export default PWAProvider;
