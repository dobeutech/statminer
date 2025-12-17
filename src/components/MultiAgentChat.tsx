'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { AgentTab, ChatViewMode, ChatMessage, LLMProvider } from '@/types';
import { useChatStore } from '@/lib/stores/chat-store';
import { useChat } from '@/lib/hooks/useChat';
import ChatInput from './ChatInput';
import MessageList from './MessageList';
import ProviderSelector from './ProviderSelector';
import ApiKeyPrompt from './ApiKeyPrompt';

interface MultiAgentChatProps {
  sessionId?: string;
}

// Default providers configuration
const DEFAULT_PROVIDERS: LLMProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI GPT-4',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo-preview',
    supportsStreaming: true,
    maxTokens: 4096,
    costPer1kTokens: 0.01,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-sonnet-20241022',
    supportsStreaming: true,
    maxTokens: 4096,
    costPer1kTokens: 0.015,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'anthropic/claude-3.5-sonnet',
    supportsStreaming: true,
    maxTokens: 4096,
    costPer1kTokens: 0.015,
  },
  {
    id: 'grok',
    name: 'Grok (xAI)',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-beta',
    supportsStreaming: true,
    maxTokens: 4096,
    costPer1kTokens: 0.01,
  },
];

const MultiAgentChat: React.FC<MultiAgentChatProps> = ({ sessionId }) => {
  const [viewMode, setViewMode] = useState<ChatViewMode['type']>('tabs');
  const [activeProviders, setActiveProviders] = useState<string[]>(['openai']);
  const [agentTabs, setAgentTabs] = useState<AgentTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('openai');
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  
  // Get API keys from localStorage
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  
  const { 
    messages, 
    addMessage,
    clearMessages,
  } = useChatStore();

  // Simple HTTP-based chat hook
  const { isLoading, error, sendMessage } = useChat({
    onResponse: (providerId, response, metadata) => {
      // Add assistant response to messages
      addMessage({
        id: `${providerId}-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        providerId,
        metadata,
      });
      
      // Update tab streaming state
      setAgentTabs(prev => prev.map(tab => 
        tab.providerId === providerId 
          ? { ...tab, isStreaming: false }
          : tab
      ));
    },
    onError: (providerId, errorMsg) => {
      // Add error message
      addMessage({
        id: `error-${providerId}-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${errorMsg}`,
        timestamp: new Date(),
        providerId,
      });
      
      setAgentTabs(prev => prev.map(tab => 
        tab.providerId === providerId 
          ? { ...tab, isStreaming: false }
          : tab
      ));
    },
    onComplete: () => {
      setAgentTabs(prev => prev.map(tab => ({ ...tab, isStreaming: false })));
    },
  });

  // Load API keys from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('statminer-api-keys');
      if (stored) {
        try {
          setApiKeys(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse stored API keys');
        }
      }
    }
  }, []);

  // Save API keys to localStorage
  const saveApiKeys = useCallback((keys: Record<string, string>) => {
    setApiKeys(keys);
    if (typeof window !== 'undefined') {
      localStorage.setItem('statminer-api-keys', JSON.stringify(keys));
    }
  }, []);

  // Initialize agent tabs when providers change
  useEffect(() => {
    const tabs = activeProviders.map(providerId => {
      const provider = DEFAULT_PROVIDERS.find(p => p.id === providerId);
      return {
        id: providerId,
        providerId,
        name: provider?.name || providerId,
        isActive: providerId === activeProviders[0],
        messages: messages.filter(m => m.providerId === providerId || !m.providerId),
        isStreaming: false,
      };
    });
    setAgentTabs(tabs);
    if (tabs.length > 0 && !activeProviders.includes(activeTabId)) {
      setActiveTabId(tabs[0].id);
    }
  }, [activeProviders, messages, activeTabId]);

  // Check if we have API keys for active providers
  const hasRequiredApiKeys = activeProviders.every(id => apiKeys[id]);

  const handleSendMessage = useCallback(async (content: string) => {
    // Check for API keys
    if (!hasRequiredApiKeys) {
      setShowApiKeyPrompt(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Add user message
    addMessage(userMessage);
    
    // Mark all tabs as streaming
    setAgentTabs(prev => prev.map(tab => ({ ...tab, isStreaming: true })));

    // Send to all active providers
    await sendMessage(content, activeProviders, apiKeys);
  }, [activeProviders, apiKeys, hasRequiredApiKeys, addMessage, sendMessage]);

  const handleProviderToggle = (providerId: string, enabled: boolean) => {
    if (enabled) {
      setActiveProviders(prev => [...prev, providerId]);
    } else {
      setActiveProviders(prev => prev.filter(id => id !== providerId));
    }
  };

  const renderTabsView = () => (
    <Tabs.Root 
      value={activeTabId} 
      onValueChange={setActiveTabId}
      className="flex flex-col h-full"
    >
      <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {agentTabs.map(tab => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            className={`
              flex items-center px-4 py-2 text-sm font-medium transition-colors
              ${activeTabId === tab.id
                ? 'border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-2">
              <span>{tab.name}</span>
              {tab.isStreaming && (
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
              )}
            </div>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <div className="flex-1 relative overflow-hidden">
        {agentTabs.map(tab => (
          <Tabs.Content 
            key={tab.id}
            value={tab.id}
            className="h-full flex flex-col absolute inset-0"
          >
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <MessageList 
                  messages={tab.messages} 
                  isStreaming={tab.isStreaming}
                  providerName={tab.name}
                />
              </motion.div>
            </AnimatePresence>
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  );

  const renderQuadView = () => (
    <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full p-4">
      {agentTabs.slice(0, 4).map(tab => (
        <motion.div
          key={tab.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 flex flex-col"
        >
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {tab.name}
            </h3>
            {tab.isStreaming && (
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <MessageList 
              messages={tab.messages} 
              isStreaming={tab.isStreaming}
              providerName={tab.name}
              compact
            />
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderComparisonView = () => (
    <div className="flex h-full">
      {agentTabs.map((tab, index) => (
        <motion.div
          key={tab.id}
          initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`
            flex-1 flex flex-col
            ${index < agentTabs.length - 1 ? 'border-r border-gray-200 dark:border-gray-700' : ''}
            bg-white dark:bg-gray-800
          `}
        >
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {tab.name}
            </h3>
            {tab.isStreaming && (
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <MessageList 
              messages={tab.messages} 
              isStreaming={tab.isStreaming}
              providerName={tab.name}
              compact
            />
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          StatMiner Multi-Agent Chat
        </h1>
        
        <div className="flex items-center space-x-4">
          {/* View Mode Selector */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('tabs')}
              className={`p-2 rounded transition-colors ${viewMode === 'tabs' ? 'bg-cyan-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              title="Tab View"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('quad')}
              className={`p-2 rounded transition-colors ${viewMode === 'quad' ? 'bg-cyan-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              title="Quad View"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`p-2 rounded transition-colors ${viewMode === 'comparison' ? 'bg-cyan-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              title="Comparison View"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          </div>

          {/* Provider Selector */}
          <ProviderSelector
            providers={DEFAULT_PROVIDERS}
            activeProviders={activeProviders}
            onProviderToggle={handleProviderToggle}
          />

          {/* API Keys Button */}
          <button
            onClick={() => setShowApiKeyPrompt(true)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              hasRequiredApiKeys 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
            }`}
          >
            {hasRequiredApiKeys ? '🔑 Keys Set' : '⚠️ Set API Keys'}
          </button>

          {/* Loading/Error Indicator */}
          {isLoading && (
            <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" title="Processing..." />
          )}
          {error && (
            <div className="w-3 h-3 rounded-full bg-red-500" title={error} />
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'tabs' && renderTabsView()}
        {viewMode === 'quad' && renderQuadView()}
        {viewMode === 'comparison' && renderComparisonView()}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <ChatInput 
          onSendMessage={handleSendMessage}
          disabled={isLoading || activeProviders.length === 0}
          placeholder={
            activeProviders.length === 0 
              ? "Select at least one AI provider to start chatting..."
              : !hasRequiredApiKeys
              ? "Set your API keys to start chatting..."
              : "Ask a question to all selected AI providers..."
          }
        />
      </div>

      {/* API Key Prompt Modal */}
      {showApiKeyPrompt && (
        <ApiKeyPrompt
          providers={DEFAULT_PROVIDERS}
          activeProviders={activeProviders}
          apiKeys={apiKeys}
          onSave={(keys) => {
            saveApiKeys(keys);
            setShowApiKeyPrompt(false);
          }}
          onClose={() => setShowApiKeyPrompt(false)}
        />
      )}
    </div>
  );
};

export default MultiAgentChat;
