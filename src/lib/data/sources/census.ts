import { DataSource, DatasetInfo, FetchParams, DataResult, RateLimitInfo } from './types';

/**
 * US Census Bureau Data Source
 * https://api.census.gov/data.html
 * 
 * Free API with optional API key for higher rate limits
 * Popular datasets: ACS, Decennial Census, Economic Census
 */

// Common ACS variables
const ACS_VARIABLES: Record<string, string> = {
  'B01001_001E': 'Total Population',
  'B01002_001E': 'Median Age',
  'B19013_001E': 'Median Household Income',
  'B19001_001E': 'Household Income Distribution',
  'B25077_001E': 'Median Home Value',
  'B25064_001E': 'Median Gross Rent',
  'B23025_001E': 'Employment Status',
  'B15003_001E': 'Educational Attainment',
  'B02001_001E': 'Race Total',
  'B03001_001E': 'Hispanic Origin',
  'B25001_001E': 'Total Housing Units',
  'B25002_001E': 'Occupancy Status',
  'B08301_001E': 'Means of Transportation to Work',
  'B17001_001E': 'Poverty Status',
  'B27001_001E': 'Health Insurance Coverage',
};

// Available datasets
const CENSUS_DATASETS: DatasetInfo[] = [
  {
    id: 'acs/acs1',
    name: 'American Community Survey 1-Year',
    description: 'Annual demographic, social, economic, and housing data for areas with 65,000+ population',
    source: 'census',
    category: 'government',
    years: [2022, 2021, 2020, 2019, 2018],
  },
  {
    id: 'acs/acs5',
    name: 'American Community Survey 5-Year',
    description: 'Five-year estimates for all geographic areas, including small populations',
    source: 'census',
    category: 'government',
    years: [2022, 2021, 2020, 2019, 2018],
  },
  {
    id: 'dec/pl',
    name: 'Decennial Census Redistricting Data',
    description: 'Population counts for redistricting purposes',
    source: 'census',
    category: 'government',
    years: [2020, 2010],
  },
  {
    id: 'pep/population',
    name: 'Population Estimates',
    description: 'Annual population estimates by age, sex, race, and Hispanic origin',
    source: 'census',
    category: 'government',
    years: [2022, 2021, 2020, 2019],
  },
];

export class CensusDataSource implements DataSource {
  id = 'census';
  name = 'US Census Bureau';
  category = 'government' as const;
  description = 'Official US government source for population, economic, and housing statistics';
  baseUrl = 'https://api.census.gov/data';
  requiresApiKey = false; // Optional but recommended

  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async getDatasets(): Promise<DatasetInfo[]> {
    return CENSUS_DATASETS;
  }

  async search(query: string): Promise<DatasetInfo[]> {
    const lowerQuery = query.toLowerCase();
    
    // Search in predefined datasets
    const matchingDatasets = CENSUS_DATASETS.filter(dataset => 
      dataset.name.toLowerCase().includes(lowerQuery) ||
      dataset.description.toLowerCase().includes(lowerQuery)
    );

    // Also search in variable names
    const matchingVariables = Object.entries(ACS_VARIABLES)
      .filter(([_, name]) => name.toLowerCase().includes(lowerQuery))
      .map(([code, name]) => ({
        id: `acs/acs5:${code}`,
        name: name,
        description: `ACS variable: ${code}`,
        source: 'census',
        category: 'government' as const,
      }));

    return [...matchingDatasets, ...matchingVariables];
  }

  async fetch(datasetId: string, params: FetchParams): Promise<DataResult> {
    const year = params.year || 2022;
    const geography = params.geography || 'state:*';
    
    // Parse variables from params or use defaults
    let variables = params.variables || ['B01001_001E', 'NAME'];
    
    // Always include NAME for readability
    if (!variables.includes('NAME')) {
      variables = ['NAME', ...variables];
    }

    // Build the API URL
    const url = new URL(`${this.baseUrl}/${year}/${datasetId}`);
    url.searchParams.set('get', variables.join(','));
    url.searchParams.set('for', geography);
    
    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Census API error: ${response.status} - ${errorText}`);
      }

      const rawData = await response.json();
      
      // Census API returns array of arrays, first row is headers
      const [headers, ...rows] = rawData;
      
      // Transform to array of objects
      const data = rows.map((row: string[]) => {
        const obj: Record<string, any> = {};
        headers.forEach((header: string, index: number) => {
          // Convert numeric values
          const value = row[index];
          obj[header] = isNaN(Number(value)) ? value : Number(value);
        });
        return obj;
      });

      return {
        source: this.id,
        dataset: datasetId,
        data,
        metadata: {
          fetchedAt: new Date(),
          rowCount: data.length,
          columns: headers,
          freshness: 'annual',
          sourceUrl: url.toString().replace(this.apiKey || '', '[API_KEY]'),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch Census data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getRateLimits(): RateLimitInfo {
    return {
      requestsPerMinute: this.apiKey ? 120 : 20,
      requestsPerDay: this.apiKey ? 10000 : 500,
    };
  }

  // Helper methods for common queries

  /**
   * Get population data for all states
   */
  async getStatePopulations(year: number = 2022): Promise<DataResult> {
    return this.fetch('acs/acs1', {
      variables: ['B01001_001E', 'B01002_001E'],
      geography: 'state:*',
      year,
    });
  }

  /**
   * Get median household income by state
   */
  async getStateIncomes(year: number = 2022): Promise<DataResult> {
    return this.fetch('acs/acs1', {
      variables: ['B19013_001E'],
      geography: 'state:*',
      year,
    });
  }

  /**
   * Get demographic data for a specific state
   */
  async getStateDemographics(stateCode: string, year: number = 2022): Promise<DataResult> {
    return this.fetch('acs/acs1', {
      variables: [
        'B01001_001E', // Total population
        'B01002_001E', // Median age
        'B19013_001E', // Median income
        'B25077_001E', // Median home value
        'B15003_001E', // Education
      ],
      geography: `state:${stateCode}`,
      year,
    });
  }

  /**
   * Get county-level data for a state
   */
  async getCountyData(stateCode: string, variables: string[], year: number = 2022): Promise<DataResult> {
    return this.fetch('acs/acs5', { // Use 5-year for county data
      variables,
      geography: `county:*&in=state:${stateCode}`,
      year,
    });
  }
}

// Export singleton instance
export const censusSource = new CensusDataSource();

// Export variable mappings for UI
export { ACS_VARIABLES };

export default CensusDataSource;
