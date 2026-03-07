import neo4j, { Driver, Session } from 'neo4j-driver';
import { Neo4jDataset, Neo4jNode, Neo4jRelationship } from '@/types';

interface BackupOptions {
  includeIndexes?: boolean;
  includeConstraints?: boolean;
  compressed?: boolean;
  encryptionKey?: string;
}

interface BackupMetadata {
  id: string;
  timestamp: Date;
  version: string;
  nodeCount: number;
  relationshipCount: number;
  sizeBytes: number;
  checksum: string;
  compressed: boolean;
  encrypted: boolean;
}

class Neo4jBackupManager {
  private driver: Driver;
  private backups: Map<string, BackupMetadata> = new Map();

  constructor() {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      throw new Error('NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD environment variables are required');
    }

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  // Create a full database backup
  async createBackup(
    datasetId: string,
    options: BackupOptions = {}
  ): Promise<BackupMetadata> {
    const session = this.driver.session();
    
    try {
      // Get all nodes
      const nodesResult = await session.run(
        'MATCH (n) RETURN n, labels(n) as labels, id(n) as id'
      );
      
      const nodes: Neo4jNode[] = nodesResult.records.map(record => ({
        id: record.get('id').toString(),
        labels: record.get('labels'),
        properties: record.get('n').properties,
      }));

      // Get all relationships
      const relationshipsResult = await session.run(
        'MATCH (a)-[r]->(b) RETURN r, type(r) as type, id(r) as id, id(a) as startId, id(b) as endId'
      );
      
      const relationships: Neo4jRelationship[] = relationshipsResult.records.map(record => ({
        id: record.get('id').toString(),
        type: record.get('type'),
        startNodeId: record.get('startId').toString(),
        endNodeId: record.get('endId').toString(),
        properties: record.get('r').properties,
      }));

      // Get indexes if requested
      let indexes: any[] = [];
      if (options.includeIndexes) {
        const indexResult = await session.run('SHOW INDEXES');
        indexes = indexResult.records.map(r => r.toObject());
      }

      // Get constraints if requested
      let constraints: any[] = [];
      if (options.includeConstraints) {
        const constraintResult = await session.run('SHOW CONSTRAINTS');
        constraints = constraintResult.records.map(r => r.toObject());
      }

      // Create backup object
      const backup: Neo4jDataset = {
        id: datasetId,
        name: `Backup of ${datasetId}`,
        description: `Full backup created at ${new Date().toISOString()}`,
        nodes,
        relationships,
        metadata: {
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: ['backup', 'auto'],
        } as Neo4jDataset['metadata'] & { indexes?: any[]; constraints?: any[] },
      };

      // Serialize backup
      let backupData = JSON.stringify(backup);
      
      // Compress if requested
      if (options.compressed) {
        backupData = await this.compressData(backupData);
      }

      // Encrypt if requested
      if (options.encryptionKey) {
        backupData = await this.encryptData(backupData, options.encryptionKey);
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(backupData);

      // Store backup (in production, save to cloud storage)
      const backupId = `backup-${Date.now()}`;
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: new Date(),
        version: '1.0.0',
        nodeCount: nodes.length,
        relationshipCount: relationships.length,
        sizeBytes: Buffer.byteLength(backupData),
        checksum,
        compressed: options.compressed || false,
        encrypted: !!options.encryptionKey,
      };

      this.backups.set(backupId, metadata);
      
      // In production, upload to cloud storage
      await this.uploadToCloudStorage(backupId, backupData, metadata);

      return metadata;
    } finally {
      await session.close();
    }
  }

  // Restore from backup
  async restoreBackup(
    backupId: string,
    options: { clearExisting?: boolean; encryptionKey?: string } = {}
  ): Promise<boolean> {
    const session = this.driver.session();
    
    try {
      const metadata = this.backups.get(backupId);
      if (!metadata) {
        throw new Error(`Backup ${backupId} not found`);
      }

      // Download backup from storage
      let backupData = await this.downloadFromCloudStorage(backupId);

      // Decrypt if needed
      if (metadata.encrypted && options.encryptionKey) {
        backupData = await this.decryptData(backupData, options.encryptionKey);
      }

      // Decompress if needed
      if (metadata.compressed) {
        backupData = await this.decompressData(backupData);
      }

      // Verify checksum
      const checksum = await this.calculateChecksum(backupData);
      if (checksum !== metadata.checksum) {
        throw new Error('Backup checksum verification failed');
      }

      const backup: Neo4jDataset = JSON.parse(backupData);

      // Clear existing data if requested
      if (options.clearExisting) {
        await session.run('MATCH (n) DETACH DELETE n');
      }

      // Restore nodes
      for (const node of backup.nodes) {
        const sanitizedLabels = node.labels.map(l => l.replace(/[^a-zA-Z0-9_]/g, ''));
        if (sanitizedLabels.length === 0 || sanitizedLabels.some(l => l.length === 0)) {
          console.warn('Skipping node with invalid labels:', node.labels);
          continue;
        }
        const labelStr = sanitizedLabels.map(l => `\`${l}\``).join(':');
        await session.run(
          `CREATE (n:${labelStr}) SET n = $props`,
          { props: node.properties }
        );
      }

      // Restore relationships
      for (const rel of backup.relationships) {
        const sanitizedType = rel.type.replace(/[^a-zA-Z0-9_]/g, '');
        if (!sanitizedType) {
          console.warn('Skipping relationship with invalid type:', rel.type);
          continue;
        }
        await session.run(
          `MATCH (a), (b) 
           WHERE id(a) = $startId AND id(b) = $endId
           CREATE (a)-[r:\`${sanitizedType}\`]->(b)
           SET r = $props`,
          {
            startId: neo4j.int(rel.startNodeId),
            endId: neo4j.int(rel.endNodeId),
            props: rel.properties,
          }
        );
      }

      const extMeta = backup.metadata as any;
      if (extMeta.indexes) {
        for (const index of extMeta.indexes) {
          console.log('Restoring index:', index);
        }
      }

      if (extMeta.constraints) {
        for (const constraint of extMeta.constraints) {
          console.log('Restoring constraint:', constraint);
        }
      }

      return true;
    } finally {
      await session.close();
    }
  }

  // Create incremental backup (only changes since last backup)
  async createIncrementalBackup(
    datasetId: string,
    lastBackupId: string,
    options: BackupOptions = {}
  ): Promise<BackupMetadata> {
    const session = this.driver.session();
    
    try {
      const lastBackup = this.backups.get(lastBackupId);
      if (!lastBackup) {
        throw new Error(`Previous backup ${lastBackupId} not found`);
      }

      // Get changes since last backup timestamp
      const changedNodesResult = await session.run(
        'MATCH (n) WHERE n.updatedAt > $timestamp RETURN n, labels(n) as labels, id(n) as id',
        { timestamp: lastBackup.timestamp }
      );

      const changedNodes: Neo4jNode[] = changedNodesResult.records.map(record => ({
        id: record.get('id').toString(),
        labels: record.get('labels'),
        properties: record.get('n').properties,
      }));

      // Get changed relationships
      const changedRelationshipsResult = await session.run(
        'MATCH (a)-[r]->(b) WHERE r.updatedAt > $timestamp RETURN r, type(r) as type, id(r) as id, id(a) as startId, id(b) as endId',
        { timestamp: lastBackup.timestamp }
      );

      const changedRelationships: Neo4jRelationship[] = changedRelationshipsResult.records.map(record => ({
        id: record.get('id').toString(),
        type: record.get('type'),
        startNodeId: record.get('startId').toString(),
        endNodeId: record.get('endId').toString(),
        properties: record.get('r').properties,
      }));

      // Create incremental backup
      const incrementalBackup = {
        id: datasetId,
        type: 'incremental',
        baseBackupId: lastBackupId,
        timestamp: new Date(),
        changes: {
          nodes: changedNodes,
          relationships: changedRelationships,
        },
      };

      let backupData = JSON.stringify(incrementalBackup);
      
      if (options.compressed) {
        backupData = await this.compressData(backupData);
      }

      if (options.encryptionKey) {
        backupData = await this.encryptData(backupData, options.encryptionKey);
      }

      const checksum = await this.calculateChecksum(backupData);
      const backupId = `backup-inc-${Date.now()}`;
      
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: new Date(),
        version: '1.0.0',
        nodeCount: changedNodes.length,
        relationshipCount: changedRelationships.length,
        sizeBytes: Buffer.byteLength(backupData),
        checksum,
        compressed: options.compressed || false,
        encrypted: !!options.encryptionKey,
      };

      this.backups.set(backupId, metadata);
      await this.uploadToCloudStorage(backupId, backupData, metadata);

      return metadata;
    } finally {
      await session.close();
    }
  }

  // Schedule automatic backups
  scheduleAutomaticBackups(
    datasetId: string,
    intervalHours: number,
    options: BackupOptions = {}
  ): NodeJS.Timer {
    return setInterval(async () => {
      try {
        console.log(`Running scheduled backup for ${datasetId}`);
        const backup = await this.createBackup(datasetId, options);
        console.log(`Backup completed: ${backup.id}`);
        
        // Clean up old backups (keep last 10)
        await this.cleanupOldBackups(10);
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    }, intervalHours * 60 * 60 * 1000);
  }

  // List all backups
  async listBackups(): Promise<BackupMetadata[]> {
    return Array.from(this.backups.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  // Delete backup
  async deleteBackup(backupId: string): Promise<boolean> {
    const metadata = this.backups.get(backupId);
    if (!metadata) {
      return false;
    }

    // Delete from cloud storage
    await this.deleteFromCloudStorage(backupId);
    
    return this.backups.delete(backupId);
  }

  // Clean up old backups
  async cleanupOldBackups(keepCount: number): Promise<number> {
    const backups = await this.listBackups();
    let deletedCount = 0;

    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);
      
      for (const backup of toDelete) {
        if (await this.deleteBackup(backup.id)) {
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  // Helper methods
  private async compressData(data: string): Promise<string> {
    // Implement compression (e.g., using zlib)
    const zlib = require('zlib');
    return zlib.gzipSync(data).toString('base64');
  }

  private async decompressData(data: string): Promise<string> {
    const zlib = require('zlib');
    return zlib.gunzipSync(Buffer.from(data, 'base64')).toString();
  }

  private async encryptData(data: string, key: string): Promise<string> {
    // Implement encryption (e.g., using crypto)
    const crypto = require('crypto');
    const cipher = crypto.createCipher('aes-256-gcm', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private async decryptData(data: string, key: string): Promise<string> {
    const crypto = require('crypto');
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async calculateChecksum(data: string): Promise<string> {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async uploadToCloudStorage(
    backupId: string,
    data: string,
    metadata: BackupMetadata
  ): Promise<void> {
    // Implement cloud storage upload (e.g., S3, Google Cloud Storage, Azure Blob)
    console.log(`Uploading backup ${backupId} to cloud storage`);
    // In production, implement actual upload
  }

  private async downloadFromCloudStorage(backupId: string): Promise<string> {
    // Implement cloud storage download
    console.log(`Downloading backup ${backupId} from cloud storage`);
    // In production, implement actual download
    return ''; // Placeholder
  }

  private async deleteFromCloudStorage(backupId: string): Promise<void> {
    // Implement cloud storage deletion
    console.log(`Deleting backup ${backupId} from cloud storage`);
    // In production, implement actual deletion
  }

  // Cleanup on shutdown
  async close(): Promise<void> {
    await this.driver.close();
  }
}

export default Neo4jBackupManager;