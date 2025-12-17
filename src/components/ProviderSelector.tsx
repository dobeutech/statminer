'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { LLMProvider } from '@/types';

interface ProviderSelectorProps {
  providers: LLMProvider[];
  activeProviders: string[];
  onProviderToggle: (providerId: string, enabled: boolean) => void;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  providers,
  activeProviders,
  onProviderToggle,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getProviderStatus = (provider: LLMProvider) => {
    const isActive = activeProviders.includes(provider.id);
    
    if (isActive) return { status: 'active', color: 'bg-green-500', text: 'Active' };
    return { status: 'available', color: 'bg-gray-400', text: 'Available' };
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Providers ({activeProviders.length})
          </span>
          <svg 
            className="w-4 h-4 text-gray-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50">
          <div className="p-6">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Select AI Providers
            </Dialog.Title>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {providers.map((provider) => {
                const { color, text } = getProviderStatus(provider);
                const isActive = activeProviders.includes(provider.id);
                
                return (
                  <motion.div
                    key={provider.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {provider.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {provider.model} • {text}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Cost indicator */}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ${provider.costPer1kTokens}/1k
                      </div>
                      
                      {/* Toggle Switch */}
                      <button
                        onClick={() => onProviderToggle(provider.id, !isActive)}
                        className={`
                          relative w-11 h-6 rounded-full transition-colors
                          ${isActive ? 'bg-cyan-600' : 'bg-gray-200 dark:bg-gray-700'}
                        `}
                      >
                        <div className={`
                          absolute top-0.5 left-0.5 bg-white 
                          rounded-full h-5 w-5 
                          transition-transform shadow
                          ${isActive ? 'translate-x-5' : 'translate-x-0'}
                        `} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {activeProviders.length === 0 && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  ⚠️ Select at least one provider to start chatting
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {activeProviders.length} of {providers.length} selected
              </div>
              
              <div className="flex space-x-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    Done
                  </button>
                </Dialog.Close>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ProviderSelector;