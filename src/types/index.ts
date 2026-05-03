import { z } from 'zod';

// LLM Provider Types
export interface LLMProvider {
  id: string;
  name: string;
  endpoint: string;
  apiKey?: string;
  model: string;
  supportsStreaming: boolean;
  maxTokens: number;
  costPer1kTokens: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  providerId?: string;
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;
    cost?: number;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  activeProviders: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Multi-Agent Interface Types
export interface AgentTab {
  id: string;
  providerId: string;
  name: string;
  isActive: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
}

export interface ChatViewMode {
  type: 'tabs' | 'quad' | 'comparison';
  activeAgents: string[];
}

// Zod Validation Schemas
export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message content is required'),
  timestamp: z.date().optional().default(() => new Date()),
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  providers: z.array(z.string()).min(1, 'At least one provider is required'),
  sessionId: z.string().optional(),
  streaming: z.boolean().default(true),
  apiKeys: z.record(z.string(), z.string()).optional(),
  history: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).optional(),
});

export const ApiKeyConfigSchema = z.object({
  openai: z.string().optional(),
  anthropic: z.string().optional(),
  openrouter: z.string().optional(),
  grok: z.string().optional(),
  requesty: z.string().optional(),
});

// Database Types
export interface DatabaseConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  category: 'government' | 'academic' | 'financial' | 'healthcare' | 'commercial';
  endpoints: {
    [key: string]: {
      path: string;
      method: 'GET' | 'POST';
      parameters: string[];
      rateLimit: number;
    };
  };
}

// Neo4j Types
export interface Neo4jDataset {
  id: string;
  name: string;
  description: string;
  nodes: Neo4jNode[];
  relationships: Neo4jRelationship[];
  metadata: {
    version: string;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
  };
}

export interface Neo4jNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface Neo4jRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, any>;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'chat' | 'status' | 'error' | 'connection';
  payload: any;
  sessionId?: string;
  providerId?: string;
  timestamp: Date;
}

// User Session Types
export interface UserPreferences {
  theme: 'light' | 'dark';
  defaultProviders: string[];
  chatViewMode: ChatViewMode['type'];
  autoSave: boolean;
  notifications: {
    email: boolean;
    browser: boolean;
    apiAlerts: boolean;
  };
  apiKeys: Record<string, string>;
}

export interface UserSession {
  id: string;
  userId?: string;
  preferences: UserPreferences;
  chatSessions: ChatSession[];
  apiUsage: {
    [providerId: string]: {
      tokensUsed: number;
      requestCount: number;
      cost: number;
      lastUsed: Date;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Analytics Types
export interface AnalyticsEvent {
  eventType: 'chat_sent' | 'provider_selected' | 'session_created' | 'api_error';
  properties: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
}

// Citation Types
export interface Citation {
  id: string;
  type: 'web' | 'journal' | 'book' | 'database' | 'api';
  title: string;
  authors?: string[];
  publicationDate?: Date;
  url?: string;
  accessedDate: Date;
  source: string;
  formattedCitation: string;
}

// API Response Types
export interface StreamingResponse {
  chunk: string;
  isComplete: boolean;
  providerId: string;
  metadata?: {
    tokensUsed?: number;
    model?: string;
  };
}

export interface BatchResponse {
  providerId: string;
  response: string;
  metadata: {
    tokensUsed: number;
    responseTime: number;
    model: string;
    cost: number;
  };
  error?: string;
}

// Queue Types
export interface QueuedJob {
  id: string;
  type: 'chat' | 'database_query' | 'neo4j_operation';
  priority: 'low' | 'normal' | 'high';
  data: any;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
}

// PWA Types
export interface PWAManifest {
  name: string;
  short_name: string;
  description: string;
  theme_color: string;
  background_color: string;
  display: 'standalone' | 'minimal-ui' | 'browser';
  orientation: 'portrait' | 'landscape' | 'any';
  icons: {
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }[];
}

// Webhook Types
export interface WebhookEvent {
  id: string;
  event: string;
  payload: any;
  timestamp: Date;
  source: string;
  signature?: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: Date;
}

export const DATABASE_CONFIGS: DatabaseConfig[] = [
  {
    id: 'census',
    name: 'US Census Bureau',
    baseUrl: 'https://api.census.gov/data',
    category: 'government',
    endpoints: {
      acs: {
        path: '/2022/acs/acs1',
        method: 'GET',
        parameters: ['get', 'for', 'in'],
        rateLimit: 500,
      },
    },
  },
  // Add more database configurations...
];

export type { z } from 'zod';