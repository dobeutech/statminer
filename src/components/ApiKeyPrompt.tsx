'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { LLMProvider, ApiKeyConfigSchema } from '@/types';
import { useChatStore } from '@/lib/stores/chat-store';

interface ApiKeyPromptProps {
  providers: LLMProvider[];
  onApiKeysConfigured: () => void;
}

const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ providers, onApiKeysConfigured }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const { updateProvider } = useChatStore();

  // Check for missing API keys on mount
  useEffect(() => {
    const missingKeys = providers.filter(p => !p.apiKey || p.apiKey.length === 0);
    if (missingKeys.length > 0) {
      setIsOpen(true);
    }
  }, [providers]);

  const missingProviders = providers.filter(p => !p.apiKey || p.apiKey.length === 0);
  const totalSteps = missingProviders.length;

  const handleApiKeyChange = (providerId: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [providerId]: value }));
    if (errors[providerId]) {
      setErrors(prev => ({ ...prev, [providerId]: '' }));
    }
  };

  const validateApiKey = (providerId: string, apiKey: string): string | null => {
    if (!apiKey.trim()) {
      return 'API key is required';
    }

    // Provider-specific validation
    switch (providerId) {
      case 'openai':
        if (!apiKey.startsWith('sk-')) {
          return 'OpenAI API keys should start with "sk-"';
        }
        if (apiKey.length < 40) {
          return 'OpenAI API key appears to be too short';
        }
        break;
      case 'anthropic':
        if (!apiKey.startsWith('sk-ant-')) {
          return 'Anthropic API keys should start with "sk-ant-"';
        }
        break;
      case 'openrouter':
        if (!apiKey.startsWith('sk-or-')) {
          return 'OpenRouter API keys should start with "sk-or-"';
        }
        break;
      case 'grok':
        if (apiKey.length < 20) {
          return 'Grok API key appears to be too short';
        }
        break;
      case 'requesty':
        if (apiKey.length < 20) {
          return 'Requesty API key appears to be too short';
        }
        break;
    }

    return null;
  };

  const handleTestApiKey = async (providerId: string, apiKey: string): Promise<boolean> => {
    try {
      const provider = providers.find(p => p.id === providerId);
      if (!provider) return false;

      const response = await fetch('/api/test-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId,
          apiKey,
          endpoint: provider.endpoint,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('API key test failed:', error);
      return false;
    }
  };

  const handleNext = async () => {
    const currentProvider = missingProviders[currentStep];
    const currentApiKey = apiKeys[currentProvider.id];

    // Validate current step
    const validationError = validateApiKey(currentProvider.id, currentApiKey);
    if (validationError) {
      setErrors(prev => ({ ...prev, [currentProvider.id]: validationError }));
      return;
    }

    setIsLoading(true);

    // Test API key
    const isValid = await handleTestApiKey(currentProvider.id, currentApiKey);
    if (!isValid) {
      setErrors(prev => ({ 
        ...prev, 
        [currentProvider.id]: 'API key validation failed. Please check your key.' 
      }));
      setIsLoading(false);
      return;
    }

    // Save API key
    updateProvider(currentProvider.id, { apiKey: currentApiKey });

    // Move to next step or finish
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // All keys configured
      setIsOpen(false);
      onApiKeysConfigured();
    }

    setIsLoading(false);
  };

  const handleSkip = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsOpen(false);
      onApiKeysConfigured();
    }
  };

  const handleSkipAll = () => {
    setIsOpen(false);
    onApiKeysConfigured();
  };

  if (missingProviders.length === 0) {
    return null;
  }

  const currentProvider = missingProviders[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Configure API Keys
              </Dialog.Title>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {currentStep + 1} of {totalSteps}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentProvider.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Provider Info */}
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-medium">
                      {currentProvider.name[0]}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {currentProvider.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {currentProvider.model}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    To use {currentProvider.name}, please provide your API key. This will be stored locally and used for requests.
                  </p>
                </div>

                {/* API Key Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKeys[currentProvider.id] || ''}
                    onChange={(e) => handleApiKeyChange(currentProvider.id, e.target.value)}
                    placeholder={`Enter your ${currentProvider.name} API key`}
                    className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                      errors[currentProvider.id] 
                        ? 'border-red-300 dark:border-red-600' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors[currentProvider.id] && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {errors[currentProvider.id]}
                    </p>
                  )}
                </div>

                {/* Help Text */}
                <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    <strong>Where to find your API key:</strong>
                    {getApiKeyInstructions(currentProvider.id)}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={handleSkip}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Skip This
                </button>
                <button
                  onClick={handleSkipAll}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Skip All
                </button>
              </div>
              
              <div className="flex space-x-2">
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={isLoading || !apiKeys[currentProvider.id]?.trim()}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                    isLoading || !apiKeys[currentProvider.id]?.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-cyan-500 hover:bg-cyan-600'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Testing...</span>
                    </div>
                  ) : currentStep === totalSteps - 1 ? (
                    'Finish'
                  ) : (
                    'Next'
                  )}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

function getApiKeyInstructions(providerId: string): string {
  switch (providerId) {
    case 'openai':
      return ' Visit platform.openai.com/api-keys to create a new API key.';
    case 'anthropic':
      return ' Visit console.anthropic.com to generate your API key.';
    case 'openrouter':
      return ' Visit openrouter.ai/keys to get your API key.';
    case 'grok':
      return ' Visit x.ai to access your Grok API key.';
    case 'requesty':
      return ' Visit requesty.ai to get your API key.';
    default:
      return ' Check your provider\'s documentation for API key instructions.';
  }
}

export default ApiKeyPrompt;