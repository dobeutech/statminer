// src/types/index.ts

export interface LLMProvider {
  id: string;
  name: string;
  endpoint: string;
  apiKeyRequired: boolean;
  models: string[];
  maxTokens: number;
  supportsStreaming: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp: Date;
  citations?: Citation[];
  metadata?: Record<string, any>;
}

export interface ModelResponse {
  modelId: string;
  modelName: string;
  response: string;
  latency: number;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  citations?: Citation[];
  error?: string;
}

export interface Citation {
  id: string;
  source: string;
  title: string;
  authors?: string[];
  year?: string;
  url?: string;
  accessDate: Date;
  pageNumbers?: string;
  doi?: string;
  type: 'web' | 'journal' | 'book' | 'database' | 'api';
}

export interface DatabaseAPI {
  id: string;
  name: string;
  category: 'government' | 'academic' | 'commercial' | 'healthcare' | 'financial';
  endpoint: string;
  authentication: 'none' | 'api-key' | 'oauth' | 'custom';
  rateLimit?: {
    requests: number;
    period: 'second' | 'minute' | 'hour' | 'day';
  };
  documentation: string;
  dataTypes: string[];
  isActive: boolean;
}

export interface DataVisualization {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'network' | 'heatmap' | 'custom';
  data: any;
  config: Record<string, any>;
  title?: string;
  description?: string;
}

export interface NeuralNetworkNode {
  id: string;
  label: string;
  category: string;
  properties: Record<string, any>;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
}

export interface NeuralNetworkEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  weight?: number;
  type?: string;
}

export interface Dataset {
  id: string;
  name: string;
  category: string;
  nodes: NeuralNetworkNode[];
  edges: NeuralNetworkEdge[];
  metadata: {
    created: Date;
    updated: Date;
    source: string[];
    description?: string;
  };
}

export interface APIKey {
  id: string;
  service: string;
  key: string;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

export interface UserSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  activeModels: string[];
  datasets: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ComparisonResult {
  query: string;
  timestamp: Date;
  responses: ModelResponse[];
  analysis?: {
    consensus?: string;
    divergences?: string[];
    bestResponse?: string;
    metrics?: Record<string, any>;
  };
}

// Database API configurations based on the catalog
export const DATABASE_CONFIGS: Record<string, DatabaseAPI> = {
  // Government APIs
  'bls': {
    id: 'bls',
    name: 'Bureau of Labor Statistics',
    category: 'government',
    endpoint: 'https://api.bls.gov/publicAPI/v2/',
    authentication: 'api-key',
    rateLimit: { requests: 500, period: 'day' },
    documentation: 'https://www.bls.gov/developers/',
    dataTypes: ['employment', 'wages', 'inflation', 'cpi'],
    isActive: false
  },
  'census': {
    id: 'census',
    name: 'US Census Bureau',
    category: 'government',
    endpoint: 'https://api.census.gov/data/',
    authentication: 'api-key',
    rateLimit: { requests: 500, period: 'day' },
    documentation: 'https://www.census.gov/data/developers/',
    dataTypes: ['population', 'housing', 'economics', 'acs'],
    isActive: false
  },
  'noaa': {
    id: 'noaa',
    name: 'NOAA Weather Service',
    category: 'government',
    endpoint: 'https://api.weather.gov/',
    authentication: 'none',
    documentation: 'https://www.weather.gov/documentation/services-web-api',
    dataTypes: ['weather', 'climate', 'forecasts', 'alerts'],
    isActive: false
  },
  'fred': {
    id: 'fred',
    name: 'Federal Reserve Economic Data',
    category: 'government',
    endpoint: 'https://api.stlouisfed.org/fred/',
    authentication: 'api-key',
    documentation: 'https://fred.stlouisfed.org/docs/api/fred/',
    dataTypes: ['economic', 'financial', 'monetary'],
    isActive: false
  },
  // Academic APIs
  'pubmed': {
    id: 'pubmed',
    name: 'PubMed/NCBI',
    category: 'academic',
    endpoint: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/',
    authentication: 'api-key',
    rateLimit: { requests: 3, period: 'second' },
    documentation: 'https://www.ncbi.nlm.nih.gov/home/develop/api/',
    dataTypes: ['biomedical', 'literature', 'research'],
    isActive: false
  },
  'crossref': {
    id: 'crossref',
    name: 'CrossRef',
    category: 'academic',
    endpoint: 'https://api.crossref.org/',
    authentication: 'none',
    documentation: 'https://www.crossref.org/documentation/retrieve-metadata/rest-api/',
    dataTypes: ['scholarly', 'metadata', 'doi'],
    isActive: false
  },
  'arxiv': {
    id: 'arxiv',
    name: 'arXiv',
    category: 'academic',
    endpoint: 'https://export.arxiv.org/api/query',
    authentication: 'none',
    documentation: 'https://info.arxiv.org/help/api/',
    dataTypes: ['preprints', 'research', 'papers'],
    isActive: false
  }
};