import neo4j, { Driver } from 'neo4j-driver';
import { logger } from './logger';

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

declare global {
  // eslint-disable-next-line no-var
  var _neo4jDriver: Driver | undefined;
}

function createDriver(): Driver | null {
  if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD) {
    logger.warn('Neo4j credentials missing — graph features disabled');
    return null;
  }
  return neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
    maxConnectionPoolSize: 10,
    connectionAcquisitionTimeout: 5_000,
    disableLosslessIntegers: true,
  });
}

export function getNeo4jDriver(): Driver | null {
  if (process.env.NODE_ENV === 'production') {
    return createDriver();
  }
  if (!global._neo4jDriver) {
    const driver = createDriver();
    if (driver) global._neo4jDriver = driver;
  }
  return global._neo4jDriver ?? null;
}

export async function pingNeo4j(): Promise<{ ok: boolean; message?: string }> {
  const driver = getNeo4jDriver();
  if (!driver) return { ok: false, message: 'Neo4j not configured' };
  const session = driver.session();
  try {
    await session.run('RETURN 1 AS ok');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, message };
  } finally {
    await session.close();
  }
}
