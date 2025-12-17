import { DataSource, DatasetInfo, FetchParams, DataResult, RateLimitInfo } from './types';

/**
 * Federal Reserve Economic Data (FRED)
 * https://fred.stlouisfed.org/docs/api/fred/
 * 
 * Comprehensive economic data from the Federal Reserve Bank of St. Louis
 * Requires free API key from https://fred.stlouisfed.org/docs/api/api_key.html
 */

// Popular FRED series
const POPULAR_SERIES: Record<string, { name: string; description: string }> = {
  'GDP': { name: 'Gross Domestic Product', description: 'US GDP in billions of dollars' },
  'GDPC1': { name: 'Real GDP', description: 'Real Gross Domestic Product, seasonally adjusted' },
  'UNRATE': { name: 'Unemployment Rate', description: 'Civilian unemployment rate' },
  'CPIAUCSL': { name: 'Consumer Price Index', description: 'CPI for All Urban Consumers' },
  'FEDFUNDS': { name: 'Federal Funds Rate', description: 'Effective Federal Funds Rate' },
  'DGS10': { name: '10-Year Treasury', description: '10-Year Treasury Constant Maturity Rate' },
  'MORTGAGE30US': { name: '30-Year Mortgage Rate', description: '30-Year Fixed Rate Mortgage Average' },
  'DEXUSEU': { name: 'USD/EUR Exchange Rate', description: 'US Dollar to Euro exchange rate' },
  'SP500': { name: 'S&P 500', description: 'S&P 500 Index' },
  'PAYEMS': { name: 'Nonfarm Payrolls', description: 'All Employees, Total Nonfarm' },
  'HOUST': { name: 'Housing Starts', description: 'New privately-owned housing units started' },
  'RSXFS': { name: 'Retail Sales', description: 'Advance Retail Sales: Retail and Food Services' },
  'INDPRO': { name: 'Industrial Production', description: 'Industrial Production Index' },
  'M2SL': { name: 'M2 Money Supply', description: 'M2 Money Stock' },
  'PPIACO': { name: 'Producer Price Index', description: 'Producer Price Index: All Commodities' },
};

// FRED data categories
const FRED_CATEGORIES: DatasetInfo[] = [
  { id: 'money-banking', name: 'Money, Banking & Finance', description: 'Interest rates, money supply, banking data', source: 'fred', category: 'financial' },
  { id: 'population-employment', name: 'Population, Employment & Labor', description: 'Unemployment, payrolls, labor force data', source: 'fred', category: 'government' },
  { id: 'production-business', name: 'Production & Business Activity', description: 'GDP, industrial production, business surveys', source: 'fred', category: 'financial' },
  { id: 'prices', name: 'Prices', description: 'CPI, PPI, inflation measures', source: 'fred', category: 'financial' },
  { id: 'international', name: 'International Data', description: 'Exchange rates, trade data', source: 'fred', category: 'international' },
  { id: 'housing', name: 'Housing', description: 'Home prices, housing starts, mortgage rates', source: 'fred', category: 'financial' },
];

export class FredDataSource implements DataSource {
  id = 'fred';
  name = 'Federal Reserve Economic Data';
  category = 'financial' as const;
  description = 'Economic data from the Federal Reserve Bank of St. Louis';
  baseUrl = 'https://api.stlouisfed.org/fred';
  requiresApiKey = true;

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getDatasets(): Promise<DatasetInfo[]> {
    // Return popular series as datasets
    return Object.entries(POPULAR_SERIES).map(([id, info]) => ({
      id,
      name: info.name,
      description: info.description,
      source: 'fred',
      category: 'financial',
    }));
  }

  async search(query: string): Promise<DatasetInfo[]> {
    const url = new URL(`${this.baseUrl}/series/search`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('search_text', query);
    url.searchParams.set('file_type', 'json');
    url.searchParams.set('limit', '20');

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`FRED API error: ${response.status}`);
      }

      const data = await response.json();
      
      return (data.seriess || []).map((series: any) => ({
        id: series.id,
        name: series.title,
        description: series.notes || '',
        source: 'fred',
        category: 'financial' as const,
        lastUpdated: new Date(series.last_updated),
      }));
    } catch (error) {
      // Fallback to local search if API fails
      const lowerQuery = query.toLowerCase();
      return Object.entries(POPULAR_SERIES)
        .filter(([id, info]) => 
          id.toLowerCase().includes(lowerQuery) ||
          info.name.toLowerCase().includes(lowerQuery) ||
          info.description.toLowerCase().includes(lowerQuery)
        )
        .map(([id, info]) => ({
          id,
          name: info.name,
          description: info.description,
          source: 'fred',
          category: 'financial' as const,
        }));
    }
  }

  async fetch(seriesId: string, params: FetchParams): Promise<DataResult> {
    const url = new URL(`${this.baseUrl}/series/observations`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('series_id', seriesId);
    url.searchParams.set('file_type', 'json');
    
    // Handle date range
    if (params.year) {
      url.searchParams.set('observation_start', `${params.year}-01-01`);
      url.searchParams.set('observation_end', `${params.year}-12-31`);
    }
    
    if (params.limit) {
      url.searchParams.set('limit', params.limit.toString());
    }
    
    if (params.offset) {
      url.searchParams.set('offset', params.offset.toString());
    }

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`FRED API error: ${response.status} - ${errorData.error_message || 'Unknown error'}`);
      }

      const rawData = await response.json();
      
      // Transform observations to structured data
      const data = (rawData.observations || []).map((obs: any) => ({
        date: obs.date,
        value: obs.value === '.' ? null : Number(obs.value),
        seriesId,
      }));

      return {
        source: this.id,
        dataset: seriesId,
        data,
        metadata: {
          fetchedAt: new Date(),
          rowCount: data.length,
          columns: ['date', 'value', 'seriesId'],
          freshness: this.determineFreshness(rawData.frequency_short),
          sourceUrl: `https://fred.stlouisfed.org/series/${seriesId}`,
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch FRED data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getRateLimits(): RateLimitInfo {
    return {
      requestsPerMinute: 120,
      requestsPerDay: 10000,
    };
  }

  private determineFreshness(frequencyCode: string): 'realtime' | 'daily' | 'weekly' | 'monthly' | 'annual' {
    switch (frequencyCode) {
      case 'D': return 'daily';
      case 'W': return 'weekly';
      case 'M': return 'monthly';
      case 'Q': return 'monthly';
      case 'A': return 'annual';
      default: return 'monthly';
    }
  }

  // Convenience methods for common queries

  /**
   * Get GDP data
   */
  async getGDP(startYear?: number): Promise<DataResult> {
    return this.fetch('GDP', { year: startYear });
  }

  /**
   * Get unemployment rate
   */
  async getUnemploymentRate(startYear?: number): Promise<DataResult> {
    return this.fetch('UNRATE', { year: startYear });
  }

  /**
   * Get inflation (CPI)
   */
  async getInflation(startYear?: number): Promise<DataResult> {
    return this.fetch('CPIAUCSL', { year: startYear });
  }

  /**
   * Get Federal Funds Rate
   */
  async getFedFundsRate(startYear?: number): Promise<DataResult> {
    return this.fetch('FEDFUNDS', { year: startYear });
  }

  /**
   * Get multiple series at once
   */
  async getMultipleSeries(seriesIds: string[], startYear?: number): Promise<DataResult[]> {
    const results = await Promise.allSettled(
      seriesIds.map(id => this.fetch(id, { year: startYear }))
    );
    
    return results
      .filter((r): r is PromiseFulfilledResult<DataResult> => r.status === 'fulfilled')
      .map(r => r.value);
  }
}

// Export popular series for UI
export { POPULAR_SERIES as FRED_SERIES };

export default FredDataSource;
