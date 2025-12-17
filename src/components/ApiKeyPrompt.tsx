'use client';

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { LLMProvider } from '@/types';

interface ApiKeyPromptProps {
  providers: LLMProvider[];
  activeProviders: string[];
  apiKeys: Record<string, string>;
  onSave: (keys: Record<string, string>) => void;
  onClose: () => void;
}

const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({
  providers,
  activeProviders,
  apiKeys,
  onSave,
  onClose,
}) => {
  const [keys, setKeys] = useState<Record<string, string>>(apiKeys);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setKeys(apiKeys);
  }, [apiKeys]);

  const handleSave = () => {
    onSave(keys);
  };

  const toggleShowKey = (providerId: string) => {
    setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const getApiKeyPlaceholder = (providerId: string): string => {
    switch (providerId) {
      case 'openai':
        return 'sk-...';
      case 'anthropic':
        return 'sk-ant-api03-...';
      case 'openrouter':
        return 'sk-or-v1-...';
      case 'grok':
        return 'xai-...';
      default:
        return 'Enter API key...';
    }
  };

  const getApiKeyUrl = (providerId: string): string => {
    switch (providerId) {
      case 'openai':
        return 'https://platform.openai.com/api-keys';
      case 'anthropic':
        return 'https://console.anthropic.com/settings/keys';
      case 'openrouter':
        return 'https://openrouter.ai/keys';
      case 'grok':
        return 'https://console.x.ai/';
      default:
        return '#';
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg z-50">
          <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Configure API Keys
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Enter your API keys for the providers you want to use. Keys are stored locally in your browser and never sent to our servers.
          </Dialog.Description>

          <div className="space-y-4 mb-6">
            {providers.map((provider) => {
              const isActive = activeProviders.includes(provider.id);
              const hasKey = !!keys[provider.id];
              
              return (
                <div 
                  key={provider.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    isActive 
                      ? 'border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20' 
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {provider.name}
                      </span>
                      {isActive && (
                        <span className="text-xs px-2 py-0.5 bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-200 rounded">
                          Active
                        </span>
                      )}
                      {hasKey && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 rounded">
                          ✓ Set
                        </span>
                      )}
                    </div>
                    <a
                      href={getApiKeyUrl(provider.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      Get API key →
                    </a>
                  </div>
                  
                  <div className="relative">
                    <input
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      value={keys[provider.id] || ''}
                      onChange={(e) => setKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                      placeholder={getApiKeyPlaceholder(provider.id)}
                      className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(provider.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showKeys[provider.id] ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-6">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>🔒 Privacy:</strong> Your API keys are stored only in your browser's local storage. 
              They are sent directly to the provider APIs and never pass through our servers.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors"
            >
              Save Keys
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ApiKeyPrompt;
