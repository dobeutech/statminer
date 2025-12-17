import { DataSource, DatasetInfo, FetchParams, DataResult, RateLimitInfo } from './types';

/**
 * World Bank Open Data API
 * https://datahelpdesk.worldbank.org/knowledgebase/topics/125589-developer-information
 * 
 * Free API - no API key required
 * Global development indicators for 200+ countries
 */

// Popular World Bank indicators
const POPULAR_INDICATORS: Record<string, { name: string; description: string }> = {
  'NY.GDP.MKTP.CD': { name: 'GDP (current US$)', description: 'Gross Domestic Product at market prices' },
  'NY.GDP.PCAP.CD': { name: 'GDP per capita (current US$)', description: 'GDP divided by midyear population' },
  'NY.GDP.MKTP.KD.ZG': { name: 'GDP growth (annual %)', description: 'Annual GDP growth rate' },
  'SP.POP.TOTL': { name: 'Population, total', description: 'Total population count' },
  'SP.POP.GROW': { name: 'Population growth (annual %)', description: 'Annual population growth rate' },
  'SL.UEM.TOTL.ZS': { name: 'Unemployment (% of labor force)', description: 'Unemployment as % of total labor force' },
  'FP.CPI.TOTL.ZG': { name: 'Inflation (consumer prices)', description: 'Annual inflation rate' },
  'SL.TLF.CACT.ZS': { name: 'Labor force participation rate', description: 'Labor force as % of population 15+' },
  'SE.ADT.LITR.ZS': { name: 'Literacy rate (% adults)', description: 'Adult literacy rate, ages 15+' },
  'SP.DYN.LE00.IN': { name: 'Life expectancy at birth', description: 'Total life expectancy in years' },
  'SH.XPD.CHEX.PC.CD': { name: 'Health expenditure per capita', description: 'Current health expenditure per capita in USD' },
  'SE.XPD.TOTL.GD.ZS': { name: 'Education expenditure (% of GDP)', description: 'Government expenditure on education' },
  'EG.USE.ELEC.KH.PC': { name: 'Electric power consumption', description: 'Electric power consumption per capita (kWh)' },
  'EN.ATM.CO2E.PC': { name: 'CO2 emissions per capita', description: 'CO2 emissions in metric tons per capita' },
  'SI.POV.DDAY': { name: 'Poverty headcount ratio', description: 'Population below $2.15/day (2017 PPP)' },
};

// Country regions
const REGIONS: Record<string, string> = {
  'WLD': 'World',
  'EAS': 'East Asia & Pacific',
  'ECS': 'Europe & Central Asia',
  'LCN': 'Latin America & Caribbean',
  'MEA': 'Middle East & North Africa',
  'NAC': 'North America',
  'SAS': 'South Asia',
  'SSF': 'Sub-Saharan Africa',
};

// Major countries
const MAJOR_COUNTRIES: Record<string, string> = {
  'USA': 'United States',
  'CHN': 'China',
  'JPN': 'Japan',
  'DEU': 'Germany',
  'GBR': 'United Kingdom',
  'FRA': 'France',
  'IND': 'India',
  'ITA': 'Italy',
  'BRA': 'Brazil',
  'CAN': 'Canada',
  'AUS': 'Australia',
  'KOR': 'South Korea',
  'MEX': 'Mexico',
  'RUS': 'Russia',
};

export class WorldBankDataSource implements DataSource {
  id = 'worldbank';
  name = 'World Bank Open Data';
  category = 'international' as const;
  description = 'Global development indicators for 200+ countries';
  baseUrl = 'https://api.worldbank.org/v2';
  requiresApiKey = false;

  async getDatasets(): Promise<DatasetInfo[]> {
    return Object.entries(POPULAR_INDICATORS).map(([id, info]) => ({
      id,
      name: info.name,
      description: info.description,
      source: 'worldbank',
      category: 'international',
    }));
  }

  async search(query: string): Promise<DatasetInfo[]> {
    // First try API search
    try {
      const url = `${this.baseUrl}/indicator?format=json&per_page=20&search=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const [, data] = await response.json();
        
        if (data && Array.isArray(data)) {
          return data.map((ind: any) => ({
            id: ind.id,
            name: ind.name,
            description: ind.sourceNote || '',
            source: 'worldbank',
            category: 'international' as const,
          }));
        }
      }
    } catch (error) {
      console.warn('World Bank API search failed, using local search');
    }

    // Fallback to local search
    const lowerQuery = query.toLowerCase();
    return Object.entries(POPULAR_INDICATORS)
      .filter(([id, info]) => 
        id.toLowerCase().includes(lowerQuery) ||
        info.name.toLowerCase().includes(lowerQuery) ||
        info.description.toLowerCase().includes(lowerQuery)
      )
      .map(([id, info]) => ({
        id,
        name: info.name,
        description: info.description,
        source: 'worldbank',
        category: 'international' as const,
      }));
  }

  async fetch(indicatorId: string, params: FetchParams): Promise<DataResult> {
    // Default to all countries if none specified
    const country = params.geography || 'all';
    const dateRange = params.year ? `${params.year}` : '2010:2023';
    const perPage = params.limit || 1000;

    const url = `${this.baseUrl}/country/${country}/indicator/${indicatorId}?format=json&per_page=${perPage}&date=${dateRange}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`World Bank API error: ${response.status}`);
      }

      const [metadata, rawData] = await response.json();
      
      if (!rawData || rawData.length === 0) {
        return {
          source: this.id,
          dataset: indicatorId,
          data: [],
          metadata: {
            fetchedAt: new Date(),
            rowCount: 0,
            columns: ['country', 'countryCode', 'year', 'value', 'indicator'],
            freshness: 'annual',
            sourceUrl: url,
          },
        };
      }

      // Transform to structured data
      const data = rawData
        .filter((item: any) => item.value !== null)
        .map((item: any) => ({
          country: item.country.value,
          countryCode: item.countryiso3code || item.country.id,
          year: parseInt(item.date),
          value: item.value,
          indicator: item.indicator.id,
          indicatorName: item.indicator.value,
        }));

      return {
        source: this.id,
        dataset: indicatorId,
        data,
        metadata: {
          fetchedAt: new Date(),
          rowCount: data.length,
          columns: ['country', 'countryCode', 'year', 'value', 'indicator', 'indicatorName'],
          freshness: 'annual',
          sourceUrl: `https://data.worldbank.org/indicator/${indicatorId}`,
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch World Bank data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getRateLimits(): RateLimitInfo {
    return {
      requestsPerMinute: 100,
      requestsPerDay: 50000, // Very generous limits
    };
  }

  // Convenience methods

  /**
   * Get GDP data for all countries
   */
  async getGlobalGDP(year?: number): Promise<DataResult> {
    return this.fetch('NY.GDP.MKTP.CD', { year });
  }

  /**
   * Get data for a specific country
   */
  async getCountryData(countryCode: string, indicatorId: string, startYear?: number): Promise<DataResult> {
    return this.fetch(indicatorId, { 
      geography: countryCode, 
      year: startYear 
    });
  }

  /**
   * Get population data
   */
  async getPopulation(country: string = 'all', year?: number): Promise<DataResult> {
    return this.fetch('SP.POP.TOTL', { geography: country, year });
  }

  /**
   * Get comparison data for major economies
   */
  async getMajorEconomies(indicatorId: string, year?: number): Promise<DataResult> {
    const countries = Object.keys(MAJOR_COUNTRIES).join(';');
    return this.fetch(indicatorId, { geography: countries, year });
  }

  /**
   * Get regional data
   */
  async getRegionalData(indicatorId: string, year?: number): Promise<DataResult> {
    const regions = Object.keys(REGIONS).join(';');
    return this.fetch(indicatorId, { geography: regions, year });
  }

  /**
   * Compare multiple indicators for a country
   */
  async getCountryProfile(countryCode: string, year?: number): Promise<DataResult[]> {
    const indicators = [
      'NY.GDP.MKTP.CD',      // GDP
      'NY.GDP.PCAP.CD',      // GDP per capita
      'SP.POP.TOTL',         // Population
      'SL.UEM.TOTL.ZS',      // Unemployment
      'FP.CPI.TOTL.ZG',      // Inflation
      'SP.DYN.LE00.IN',      // Life expectancy
    ];

    const results = await Promise.allSettled(
      indicators.map(id => this.fetch(id, { geography: countryCode, year }))
    );

    return results
      .filter((r): r is PromiseFulfilledResult<DataResult> => r.status === 'fulfilled')
      .map(r => r.value);
  }
}

// Export for UI
export { POPULAR_INDICATORS as WORLDBANK_INDICATORS, MAJOR_COUNTRIES, REGIONS };

// Export singleton instance
export const worldBankSource = new WorldBankDataSource();

export default WorldBankDataSource;
