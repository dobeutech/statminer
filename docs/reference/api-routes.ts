// src/app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { LLMProviderManager } from '@/lib/llm-providers';
import { ChatMessage } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { messages, models, apiKeys } = await request.json();

    const llmManager = new LLMProviderManager();

    // Set API keys
    Object.entries(apiKeys).forEach(([provider, key]) => {
      if (key) {
        llmManager.setApiKey(provider, key as string);
      }
    });

    // Send to all selected models
    const modelConfigs = models.map((model: string) => {
      const [providerId, modelName] = model.split(':');
      return { providerId, model: modelName };
    });

    const responses = await llmManager.sendToMultipleModels(
      messages as ChatMessage[],
      modelConfigs
    );

    return NextResponse.json({ responses });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// src/app/api/neo4j/verify/route.ts

import { NextResponse } from 'next/server';
import { Neo4jClient } from '@/lib/neo4j-client';

export async function GET() {
  try {
    const client = new Neo4jClient();
    const isConnected = await client.verifyConnection();
    await client.close();

    return NextResponse.json({ connected: isConnected });
  } catch (error: any) {
    return NextResponse.json(
      { connected: false, error: error.message },
      { status: 500 }
    );
  }
}

// src/app/api/neo4j/datasets/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Neo4jClient } from '@/lib/neo4j-client';
import { Dataset } from '@/types';

export async function GET() {
  try {
    const client = new Neo4jClient();
    const datasets = await client.getAllDatasets();
    await client.close();

    return NextResponse.json({ datasets });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const dataset: Dataset = await request.json();
    
    const client = new Neo4jClient();
    const datasetId = await client.createDataset(dataset);
    await client.close();

    return NextResponse.json({ datasetId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// src/app/api/databases/[id]/query/route.ts

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { DATABASE_CONFIGS } from '@/types';
import { MLACitationFormatter } from '@/lib/citation-formatter';
import { Citation } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { query, apiKey } = await request.json();
    const databaseId = params.id;

    const dbConfig = DATABASE_CONFIGS[databaseId];
    if (!dbConfig) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }

    // Build request based on database type
    let response;
    const headers: any = {};

    if (dbConfig.authentication === 'api-key' && apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    switch (databaseId) {
      case 'census':
        response = await axios.get(
          `${dbConfig.endpoint}${query}`,
          { 
            headers,
            params: { key: apiKey }
          }
        );
        break;

      case 'bls':
        response = await axios.post(
          `${dbConfig.endpoint}timeseries/data/`,
          {
            seriesid: [query],
            startyear: new Date().getFullYear() - 5,
            endyear: new Date().getFullYear()
          },
          { headers }
        );
        break;

      case 'fred':
        response = await axios.get(
          `${dbConfig.endpoint}series/observations`,
          {
            headers,
            params: {
              series_id: query,
              api_key: apiKey,
              file_type: 'json'
            }
          }
        );
        break;

      default:
        response = await axios.get(
          `${dbConfig.endpoint}${query}`,
          { headers }
        );
    }

    // Generate citation
    const citation: Citation = {
      id: `cite-${Date.now()}`,
      source: dbConfig.name,
      title: `${dbConfig.name} Data Query: ${query}`,
      url: dbConfig.documentation,
      accessDate: new Date(),
      type: 'database'
    };

    const formatter = new MLACitationFormatter();
    const formattedCitation = formatter.formatCitation(citation);

    return NextResponse.json({
      data: response.data,
      citation: formattedCitation,
      metadata: {
        database: dbConfig.name,
        query,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Query failed' },
      { status: 500 }
    );
  }
}

// src/app/api/citations/format/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { MLACitationFormatter } from '@/lib/citation-formatter';
import { Citation } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { citations } = await request.json();
    
    const formatter = new MLACitationFormatter();
    
    const formattedCitations = citations.map((citation: Citation) =>
      formatter.formatCitation(citation)
    );
    
    const worksCited = formatter.generateWorksCited(citations);
    
    return NextResponse.json({
      citations: formattedCitations,
      worksCited
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// src/app/api/visualizations/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { data, type, config } = await request.json();
    
    // Process data for visualization
    let processedData;
    
    switch (type) {
      case 'bar':
      case 'line':
        processedData = {
          labels: data.labels || [],
          datasets: data.datasets || []
        };
        break;
        
      case 'pie':
      case 'scatter':
        processedData = {
          datasets: [{
            data: data.values || [],
            backgroundColor: config.colors || []
          }]
        };
        break;
        
      case 'network':
        processedData = {
          nodes: data.nodes || [],
          edges: data.edges || []
        };
        break;
        
      default:
        processedData = data;
    }
    
    return NextResponse.json({
      visualization: {
        id: `viz-${Date.now()}`,
        type,
        data: processedData,
        config: config || {}
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}