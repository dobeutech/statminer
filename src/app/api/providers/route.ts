import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  const available = {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
    grok: Boolean(process.env.XAI_API_KEY || process.env.GROK_API_KEY),
  };
  return NextResponse.json(
    { available },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
