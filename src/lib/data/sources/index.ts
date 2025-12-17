/**
 * Data Sources Index
 * Central export for all data source connectors
 */

export * from './types';
export { CensusDataSource, censusSource, ACS_VARIABLES } from './census';
export { FredDataSource, FRED_SERIES } from './fred';
export { WorldBankDataSource, worldBankSource, WORLDBANK_INDICATORS, MAJOR_COUNTRIES, REGIONS } from './worldbank';

import { DataSource, DatasetInfo } from './types';
import { CensusDataSource, censusSource } from './census';
import { FredDataSource } from './fred';
import { WorldBankDataSource, worldBankSource } from './worldbank';

/**
 * Data source registry
 */
export interface DataSourceConfig {
  id: string;
  name: string;
  description: string;
  requiresApiKey: boolean;
  category: string;
  getInstance: (apiKey?: string) => DataSource;
}

export const DATA_SOURCES: DataSourceConfig[] = [
  {
    id: 'census',
    name: 'US Census Bureau',
    description: 'Official US population, economic, and housing statistics',
    requiresApiKey: false,
    category: 'government',
    getInstance: (apiKey) => new CensusDataSource(apiKey),
  },
  {
    id: 'fred',
    name: 'Federal Reserve (FRED)',
    description: 'Economic data from the Federal Reserve Bank of St. Louis',
    requiresApiKey: true,
    category: 'financial',
    getInstance: (apiKey) => new FredDataSource(apiKey || ''),
  },
  {
    id: 'worldbank',
    name: 'World Bank',
    description: 'Global development indicators for 200+ countries',
    requiresApiKey: false,
    category: 'international',
    getInstance: () => worldBankSource,
  },
];

/**
 * Get data source instance by ID
 */
export function getDataSource(sourceId: string, apiKeys: Record<string, string> = {}): DataSource | null {
  const config = DATA_SOURCES.find(s => s.id === sourceId);
  if (!config) return null;
  
  return config.getInstance(apiKeys[sourceId]);
}

/**
 * Search across all data sources
 */
export async function searchAllSources(query: string, apiKeys: Record<string, string> = {}): Promise<DatasetInfo[]> {
  const sources = DATA_SOURCES.map(config => config.getInstance(apiKeys[config.id]));
  
  const results = await Promise.allSettled(
    sources.map(source => source.search(query))
  );
  
  return results
    .filter((r): r is PromiseFulfilledResult<DatasetInfo[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

/**
 * Get all available datasets from all sources
 */
export async function getAllDatasets(apiKeys: Record<string, string> = {}): Promise<DatasetInfo[]> {
  const sources = DATA_SOURCES.map(config => config.getInstance(apiKeys[config.id]));
  
  const results = await Promise.allSettled(
    sources.map(source => source.getDatasets())
  );
  
  return results
    .filter((r): r is PromiseFulfilledResult<DatasetInfo[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
}
