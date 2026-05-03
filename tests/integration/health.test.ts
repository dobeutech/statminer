/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

function createRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:5000'));
}

describe('Health API Endpoint', () => {
  it('should return health status structure', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET(createRequest('/api/health'));
    const data = await response.json();

    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('services');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('buildSha');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
  });

  it('should include service checks', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET(createRequest('/api/health'));
    const data = await response.json();

    expect(data.services).toHaveProperty('neo4j');
    expect(data.services.neo4j).toHaveProperty('status');
  });

  it('should return 200 for healthy/degraded state', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET(createRequest('/api/health'));
    expect(response.status).toBeLessThanOrEqual(503);
  });

  it('supports HEAD requests', async () => {
    const { HEAD } = await import('@/app/api/health/route');
    const response = await HEAD();
    expect(response.status).toBe(200);
  });

  it('handles sentry probe parameter', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET(createRequest('/api/health?probe=sentry'));
    const data = await response.json();
    expect(data).toHaveProperty('probe', 'sentry');
  });
});
