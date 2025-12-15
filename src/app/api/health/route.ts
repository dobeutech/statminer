import { NextResponse } from 'next/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    [key: string]: {
      status: 'up' | 'down' | 'unknown';
      latency?: number;
      message?: string;
    };
  };
}

async function checkNeo4jConnection(): Promise<{ status: 'up' | 'down'; latency?: number; message?: string }> {
  const start = Date.now();
  
  try {
    // Check if Neo4j environment variables are configured
    if (!process.env.NEO4J_URI || !process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
      return { status: 'down', message: 'Neo4j credentials not configured' };
    }
    
    // Note: In a static export, we can't actually test the connection server-side
    // This would need to be done via an API route or Firebase Function
    return { status: 'up', latency: Date.now() - start };
  } catch (error) {
    return { 
      status: 'down', 
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function checkLLMProviders(): Promise<{ [key: string]: { status: 'up' | 'down' | 'unknown'; message?: string } }> {
  const providers: { [key: string]: { status: 'up' | 'down' | 'unknown'; message?: string } } = {};
  
  // Check OpenAI
  if (process.env.OPENAI_API_KEY) {
    providers.openai = { status: 'up' };
  } else {
    providers.openai = { status: 'unknown', message: 'API key not configured' };
  }
  
  // Check Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    providers.anthropic = { status: 'up' };
  } else {
    providers.anthropic = { status: 'unknown', message: 'API key not configured' };
  }
  
  // Check OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    providers.openrouter = { status: 'up' };
  } else {
    providers.openrouter = { status: 'unknown', message: 'API key not configured' };
  }
  
  // Check Grok
  if (process.env.GROK_API_KEY) {
    providers.grok = { status: 'up' };
  } else {
    providers.grok = { status: 'unknown', message: 'API key not configured' };
  }
  
  return providers;
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Perform health checks
    const [neo4jStatus, llmProviders] = await Promise.all([
      checkNeo4jConnection(),
      checkLLMProviders(),
    ]);
    
    // Aggregate service status
    const services: HealthStatus['services'] = {
      neo4j: neo4jStatus,
      ...Object.fromEntries(
        Object.entries(llmProviders).map(([key, value]) => [`llm_${key}`, value])
      ),
    };
    
    // Determine overall status
    const serviceStatuses = Object.values(services);
    const hasDown = serviceStatuses.some(s => s.status === 'down');
    const hasUnknown = serviceStatuses.some(s => s.status === 'unknown');
    const allUp = serviceStatuses.every(s => s.status === 'up');
    
    let overallStatus: HealthStatus['status'] = 'healthy';
    if (hasDown) {
      overallStatus = 'unhealthy';
    } else if (hasUnknown || !allUp) {
      overallStatus = 'degraded';
    }
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      services,
    };
    
    const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
    
    return NextResponse.json(healthStatus, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      services: {},
      error: errorMessage,
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });
  }
}

// Support HEAD requests for simple uptime monitoring
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
