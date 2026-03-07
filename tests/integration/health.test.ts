describe('Health API Endpoint', () => {
  it('should return health status structure', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('services');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
  });

  it('should include service checks', async () => {
    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data = await response.json();

    expect(data.services).toHaveProperty('neo4j');
    expect(data.services.neo4j).toHaveProperty('status');
  });
});
