// functions/src/index.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import { LLMProviderManager } from './llm-providers';
import { DatabaseConnector } from './database-connector';
import { MLACitationFormatter } from './citation-formatter';
import { Neo4jService } from './neo4j-service';

// Initialize Firebase Admin
admin.initializeApp();

const corsHandler = cors({ origin: true });

// Main API endpoint
export const api = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    const path = request.path;
    
    try {
      // Route to appropriate handler
      if (path.startsWith('/chat')) {
        await handleChat(request, response);
      } else if (path.startsWith('/databases')) {
        await handleDatabase(request, response);
      } else if (path.startsWith('/neo4j')) {
        await handleNeo4j(request, response);
      } else if (path.startsWith('/citations')) {
        await handleCitations(request, response);
      } else {
        response.status(404).json({ error: 'Endpoint not found' });
      }
    } catch (error: any) {
      console.error('API Error:', error);
      response.status(500).json({ error: error.message });
    }
  });
});

// Chat endpoint - Multi-model LLM queries
async function handleChat(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, models, apiKeys, userId } = req.body;

  // Verify authentication
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken.uid !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

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
      messages,
      modelConfigs
    );

    // Save to Firestore
    await saveConversation(userId, messages, responses);

    res.json({ responses });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Database query endpoint
async function handleDatabase(req: any, res: any) {
  const pathParts = req.path.split('/');
  const databaseId = pathParts[2];
  const action = pathParts[3];

  if (action !== 'query' || req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, apiKey, userId } = req.body;

  // Verify authentication
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    const connector = new DatabaseConnector();
    const result = await connector.queryDatabase(databaseId, query, apiKey);
    
    // Generate citation
    const formatter = new MLACitationFormatter();
    const citation = await formatter.generateCitation({
      source: result.source,
      title: `${result.source} Query: ${query}`,
      url: result.documentation,
      accessDate: new Date(),
      type: 'database'
    });

    // Save citation to Firestore
    await saveCitation(decodedToken.uid, citation);

    res.json({
      data: result.data,
      citation: formatter.formatCitation(citation),
      metadata: {
        database: result.source,
        query,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Neo4j operations endpoint
async function handleNeo4j(req: any, res: any) {
  const pathParts = req.path.split('/');
  const action = pathParts[2];

  // Verify authentication
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const neo4jService = new Neo4jService();

    switch (action) {
      case 'verify':
        const isConnected = await neo4jService.verifyConnection();
        res.json({ connected: isConnected });
        break;

      case 'datasets':
        if (req.method === 'GET') {
          const datasets = await neo4jService.getUserDatasets(decodedToken.uid);
          res.json({ datasets });
        } else if (req.method === 'POST') {
          const dataset = req.body;
          dataset.ownerId = decodedToken.uid;
          const datasetId = await neo4jService.createDataset(dataset);
          res.json({ datasetId });
        } else {
          res.status(405).json({ error: 'Method not allowed' });
        }
        break;

      default:
        res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Citations endpoint
async function handleCitations(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { citations } = req.body;

  try {
    const formatter = new MLACitationFormatter();
    const formattedCitations = citations.map((citation: any) =>
      formatter.formatCitation(citation)
    );
    const worksCited = formatter.generateWorksCited(citations);

    res.json({
      citations: formattedCitations,
      worksCited
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Helper functions
async function saveConversation(userId: string, messages: any[], responses: any[]) {
  const db = admin.firestore();
  const sessionRef = db.collection('sessions').doc();
  
  await sessionRef.set({
    userId,
    messages,
    responses,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function saveCitation(userId: string, citation: any) {
  const db = admin.firestore();
  const citationRef = db.collection('citations').doc();
  
  await citationRef.set({
    ...citation,
    userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// Scheduled function to clean up old sessions
export const cleanupOldSessions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldSessions = await db
      .collection('sessions')
      .where('updatedAt', '<', thirtyDaysAgo)
      .get();

    const batch = db.batch();
    oldSessions.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${oldSessions.size} old sessions`);
  });

// functions/src/llm-providers.ts

import axios from 'axios';

export class LLMProviderManager {
  private apiKeys: Map<string, string> = new Map();

  public setApiKey(providerId: string, apiKey: string): void {
    this.apiKeys.set(providerId, apiKey);
  }

  public async sendMessage(
    providerId: string,
    model: string,
    messages: any[],
    options?: any
  ): Promise<any> {
    const apiKey = this.apiKeys.get(providerId);
    if (!apiKey) {
      throw new Error(`API key required for ${providerId}`);
    }

    const startTime = Date.now();

    try {
      let response: any;
      
      switch (providerId) {
        case 'openai':
          response = await this.sendOpenAIRequest(apiKey, model, messages, options);
          break;
        case 'anthropic':
          response = await this.sendAnthropicRequest(apiKey, model, messages, options);
          break;
        case 'openrouter':
          response = await this.sendOpenRouterRequest(apiKey, model, messages, options);
          break;
        default:
          throw new Error(`Provider ${providerId} not implemented`);
      }

      const latency = Date.now() - startTime;

      return {
        modelId: `${providerId}:${model}`,
        modelName: `${providerId} - ${model}`,
        response: response.content,
        latency,
        tokens: response.usage || { prompt: 0, completion: 0, total: 0 }
      };
    } catch (error: any) {
      return {
        modelId: `${providerId}:${model}`,
        modelName: `${providerId} - ${model}`,
        response: '',
        latency: Date.now() - startTime,
        tokens: { prompt: 0, completion: 0, total: 0 },
        error: error.message
      };
    }
  }

  private async sendOpenAIRequest(
    apiKey: string,
    model: string,
    messages: any[],
    options?: any
  ): Promise<any> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.choices[0].message.content,
      usage: {
        prompt: response.data.usage.prompt_tokens,
        completion: response.data.usage.completion_tokens,
        total: response.data.usage.total_tokens
      }
    };
  }

  private async sendAnthropicRequest(
    apiKey: string,
    model: string,
    messages: any[],
    options?: any
  ): Promise<any> {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        messages: messages.filter(m => m.role !== 'system'),
        system: messages.find(m => m.role === 'system')?.content,
        max_tokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.7
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.content[0].text,
      usage: {
        prompt: response.data.usage?.input_tokens || 0,
        completion: response.data.usage?.output_tokens || 0,
        total: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
      }
    };
  }

  private async sendOpenRouterRequest(
    apiKey: string,
    model: string,
    messages: any[],
    options?: any
  ): Promise<any> {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://statnerd-firebase.web.app',
          'X-Title': 'StatNerd',
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage || { prompt: 0, completion: 0, total: 0 }
    };
  }

  public async sendToMultipleModels(
    messages: any[],
    modelConfigs: Array<{ providerId: string; model: string }>,
    options?: any
  ): Promise<any[]> {
    const promises = modelConfigs.map(config =>
      this.sendMessage(config.providerId, config.model, messages, options)
    );

    return Promise.all(promises);
  }
}