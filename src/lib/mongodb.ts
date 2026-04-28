import { MongoClient, Db, Collection } from 'mongodb';
import { logger } from './logger';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB ?? 'statminer';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function buildClient(): Promise<MongoClient> | null {
  if (!MONGODB_URI) {
    logger.warn('MONGODB_URI missing — MongoDB features disabled');
    return null;
  }
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5_000,
  });
  return client.connect();
}

const clientPromise: Promise<MongoClient> | null =
  process.env.NODE_ENV === 'production'
    ? buildClient()
    : (global._mongoClientPromise ||= buildClient() ?? undefined) ?? null;

export async function getMongoDb(): Promise<Db | null> {
  if (!clientPromise) return null;
  try {
    const client = await clientPromise;
    return client.db(MONGODB_DB);
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to MongoDB');
    return null;
  }
}

export interface ChatTurnDocument {
  _id?: string;
  sessionId: string;
  userMessage: string;
  answers: Array<{
    providerId: string;
    content: string;
    latencyMs?: number;
    error?: string;
  }>;
  createdAt: Date;
}

export async function getChatsCollection(): Promise<Collection<ChatTurnDocument> | null> {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection<ChatTurnDocument>('chat_turns');
}

export async function pingMongo(): Promise<{ ok: boolean; message?: string }> {
  if (!clientPromise) return { ok: false, message: 'MONGODB_URI not configured' };
  try {
    const client = await clientPromise;
    await client.db('admin').command({ ping: 1 });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, message };
  }
}
