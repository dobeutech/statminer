'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '@/lib/stores/chat-store';
import MultiAgentChat from '@/components/MultiAgentChat';
import ApiKeyPrompt from '@/components/ApiKeyPrompt';

export default function Home() {
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const { providers, createSession, currentSessionId } = useChatStore();

  useEffect(() => {
    if (!currentSessionId) {
      createSession('Default Session');
    }
  }, [currentSessionId, createSession]);

  const hasConfiguredProvider = providers.some(
    (p) => p.apiKey && p.apiKey.length > 0
  );

  return (
    <main className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {currentSessionId ? (
        <MultiAgentChat sessionId={currentSessionId} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-gray-500 dark:text-gray-400">
            Initializing session...
          </div>
        </div>
      )}

      {showApiKeyPrompt && (
        <ApiKeyPrompt
          providers={providers}
          onApiKeysConfigured={() => setShowApiKeyPrompt(false)}
        />
      )}
    </main>
  );
}
