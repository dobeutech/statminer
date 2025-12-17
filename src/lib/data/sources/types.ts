import { z } from 'zod';

/**
 * Data Source Types for StatMiner
 * Unified interface for government, academic, and financial data APIs
 */

// Data source categories
export type DataSourceCategory = 'government' | 'academic' | 'financial' | 'health' | 'international';

// Dataset metadata
export interface DatasetInfo {
  id: string;
  name: string;
  description: string;
  source: string;
  category: DataSourceCategory;
  variables?: string[];
  geography?: string[];
  years?: number[];
  lastUpdated?: Date;
}

// Fetch parameters
export interface FetchParams {
  variables?: string[];
  geography?: string;
  year?: number | string;
  filters?: Record<string, string | number>;
  limit?: number;
  offset?: number;
}

// Data result with metadata
export interface DataResult {
  source: string;
  dataset: string;
  data: Record<string, any>[];
  metadata: {
    fetchedAt: Date;
    rowCount: number;
    columns: string[];
    freshness?: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'annual';
    sourceUrl?: string;
  };
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
  warnings: string[];
  data?: any;
}

// Rate limit info
export interface RateLimitInfo {
  requestsPerMinute: number;
  requestsPerDay: number;
  currentUsage?: number;
}

// Data source interface
export interface DataSource {
  id: string;
  name: string;
  category: DataSourceCategory;
  description: string;
  baseUrl: string;
  requiresApiKey: boolean;
  
  // Core methods
  search(query: string): Promise<DatasetInfo[]>;
  fetch(datasetId: string, params: FetchParams): Promise<DataResult>;
  getDatasets(): Promise<DatasetInfo[]>;
  
  // Metadata
  getRateLimits(): RateLimitInfo;
}

// Zod schemas for validation
export const DataResultSchema = z.object({
  source: z.string(),
  dataset: z.string(),
  data: z.array(z.record(z.unknown())),
  metadata: z.object({
    fetchedAt: z.date(),
    rowCount: z.number(),
    columns: z.array(z.string()),
    freshness: z.enum(['realtime', 'daily', 'weekly', 'monthly', 'annual']).optional(),
    sourceUrl: z.string().optional(),
  }),
});

export const FetchParamsSchema = z.object({
  variables: z.array(z.string()).optional(),
  geography: z.string().optional(),
  year: z.union([z.number(), z.string()]).optional(),
  filters: z.record(z.union([z.string(), z.number()])).optional(),
  limit: z.number().positive().optional(),
  offset: z.number().nonnegative().optional(),
});

// Helper to validate data results
export function validateDataResult(data: unknown): ValidationResult {
  const result = DataResultSchema.safeParse(data);
  
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
      warnings: [],
    };
  }
  
  const warnings: string[] = [];
  
  // Check data freshness
  const fetchedAt = new Date(result.data.metadata.fetchedAt);
  const ageInDays = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays > 30) {
    warnings.push(`Data is ${Math.floor(ageInDays)} days old`);
  }
  
  // Check for empty data
  if (result.data.data.length === 0) {
    warnings.push('Query returned no results');
  }
  
  return { valid: true, errors: [], warnings, data: result.data };
}
