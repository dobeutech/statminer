import { NextResponse } from 'next/server';
import { pingMongo } from '@/lib/mongodb';
import { pingNeo4j } from '@/lib/neo4j';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded' | 'disabled';
  message?: string;
}

function providerStatus(key: string | undefined): ServiceStatus {
  return key && key.length > 10
    ? { status: 'up' }
    : { status: 'disabled', message: 'API key not configured' };
}

export async function GET() {
  const started = Date.now();
  const [mongo, neo4j] = await Promise.all([pingMongo(), pingNeo4j()]);

  const services = {
    mongodb: mongo.ok
      ? { status: 'up' as const }
      : { status: (mongo.message?.includes('not configured') ? 'disabled' : 'down') as ServiceStatus['status'], message: mongo.message },
    neo4j: neo4j.ok
      ? { status: 'up' as const }
      : { status: (neo4j.message?.includes('not configured') ? 'disabled' : 'down') as ServiceStatus['status'], message: neo4j.message },
    llm_anthropic: providerStatus(process.env.ANTHROPIC_API_KEY),
    llm_openai: providerStatus(process.env.OPENAI_API_KEY),
    llm_openrouter: providerStatus(process.env.OPENROUTER_API_KEY),
    llm_grok: providerStatus(process.env.XAI_API_KEY ?? process.env.GROK_API_KEY),
  };

  const anyDown = Object.values(services).some((s) => s.status === 'down');
  const allCoreDisabled =
    services.mongodb.status === 'disabled' &&
    services.neo4j.status === 'disabled' &&
    services.llm_anthropic.status === 'disabled' &&
    services.llm_openai.status === 'disabled' &&
    services.llm_openrouter.status === 'disabled' &&
    services.llm_grok.status === 'disabled';

  const overall: 'healthy' | 'degraded' | 'unhealthy' = anyDown
    ? 'unhealthy'
    : allCoreDisabled
      ? 'degraded'
      : 'healthy';

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      services,
    },
    {
      status: overall === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Response-Time': `${Date.now() - started}ms`,
      },
    }
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
