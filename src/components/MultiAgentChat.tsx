'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { AgentTab, ChatViewMode, ChatMessage, LLMProvider, StreamingResponse } from '@/types';
import { useChatStore } from '@/lib/stores/chat-store';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import ChatInput from './ChatInput';
import MessageList from './MessageList';
import ProviderSelector from './ProviderSelector';

interface MultiAgentChatProps {
  sessionId: string;
}

const MultiAgentChat: React.FC<MultiAgentChatProps> = ({ sessionId }) => {
  const [viewMode, setViewMode] = useState<ChatViewMode['type']>('tabs');
  const [activeProviders, setActiveProviders] = useState<string[]>(['openai', 'anthropic']);
  const [streamingProviders, setStreamingProviders] = useState<string[]>([]);
  const [selectedTabId, setActiveTabId] = useState<string>('');
  const activeTabId = selectedTabId || activeProviders[0] || '';

  const { 
    sendMessage, 
    messages, 
    isStreaming, 
    providers,
    addMessage,
    updateMessage 
  } = useChatStore();

  // WebSocket connection for real-time streaming
  const { isConnected, send: sendWebSocket } = useWebSocket('/api/ws/chat', {
    onMessage: handleWebSocketMessage,
    onError: (error) => console.error('WebSocket error:', error),
  });

  const agentTabs: AgentTab[] = activeProviders.map(providerId => ({
    id: providerId,
    providerId,
    name: providers.find(p => p.id === providerId)?.name || providerId,
    isActive: providerId === activeProviders[0],
    messages: messages.filter(m => m.providerId === providerId),
    isStreaming: streamingProviders.includes(providerId),
  }));

  function handleWebSocketMessage(message: StreamingResponse) {
    if (message.isComplete) {
      // Handle complete message
      updateMessage(message.providerId, message.chunk);
      setStreamingProviders(prev => prev.filter(id => id !== message.providerId));
    } else {
      // Handle streaming chunk
      addMessage({
        id: `${message.providerId}-${Date.now()}`,
        role: 'assistant',
        content: message.chunk,
        timestamp: new Date(),
        providerId: message.providerId,
        metadata: message.metadata,
      });
    }
  }

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Add user message to all active tabs
    addMessage(userMessage);
    
    // Mark all tabs as streaming
    setStreamingProviders(activeProviders);

    // Send to all active providers via WebSocket if connected, otherwise use HTTP
    if (isConnected) {
      sendWebSocket({
        type: 'chat',
        payload: {
          message: content,
          providers: activeProviders,
          sessionId,
        },
        sessionId,
        timestamp: new Date(),
      });
    } else {
      // Fallback to HTTP API
      try {
        await sendMessage(content, activeProviders, sessionId);
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setStreamingProviders([]);
      }
    }
  }, [activeProviders, sessionId, isConnected, sendMessage, sendWebSocket, addMessage]);

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
              ${tab.isActive 
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

      <div className="flex-1 relative">
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
                className="flex-1 flex flex-col"
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
    <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
      {agentTabs.slice(0, 4).map(tab => (
        <motion.div
          key={tab.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
        >
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {tab.name}
            </h3>
            {tab.isStreaming && (
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="h-full">
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
            flex-1 border-r border-gray-200 dark:border-gray-700 
            ${index === agentTabs.length - 1 ? 'border-r-0' : ''}
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
          <MessageList 
            messages={tab.messages} 
            isStreaming={tab.isStreaming}
            providerName={tab.name}
            compact
          />
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
              className={`p-2 rounded-sm ${viewMode === 'tabs' ? 'bg-cyan-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              title="Tab View"
            >
              📑
            </button>
            <button
              onClick={() => setViewMode('quad')}
              className={`p-2 rounded-sm ${viewMode === 'quad' ? 'bg-cyan-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              title="Quad View"
            >
              ⊞
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`p-2 rounded-sm ${viewMode === 'comparison' ? 'bg-cyan-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              title="Comparison View"
            >
              ⚖️
            </button>
          </div>

          {/* Provider Selector */}
          <ProviderSelector
            providers={providers}
            activeProviders={activeProviders}
            onProviderToggle={handleProviderToggle}
          />

          {/* Connection Status */}
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
               title={isConnected ? 'Connected' : 'Disconnected'} />
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
          disabled={isStreaming || activeProviders.length === 0}
          placeholder={
            activeProviders.length === 0 
              ? "Select at least one AI provider to start chatting..."
              : "Ask all selected agents a question..."
          }
        />
      </div>
    </div>
  );
};

export default MultiAgentChat;