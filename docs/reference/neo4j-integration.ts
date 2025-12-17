// src/lib/neo4j-client/index.ts

import neo4j, { Driver, Session, Result } from 'neo4j-driver';
import { NeuralNetworkNode, NeuralNetworkEdge, Dataset } from '@/types';

export class Neo4jClient {
  private driver: Driver;
  private uri: string;
  private user: string;
  private password: string;

  constructor(uri?: string, user?: string, password?: string) {
    this.uri = uri || process.env.NEO4J_URI || 'bolt://localhost:7687';
    this.user = user || process.env.NEO4J_USER || 'neo4j';
    this.password = password || process.env.NEO4J_PASSWORD || 'password';
    
    this.driver = neo4j.driver(
      this.uri,
      neo4j.auth.basic(this.user, this.password)
    );
  }

  public async verifyConnection(): Promise<boolean> {
    const session = this.driver.session();
    try {
      await session.run('RETURN 1');
      return true;
    } catch (error) {
      console.error('Neo4j connection failed:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  public async createDataset(dataset: Dataset): Promise<string> {
    const session = this.driver.session();
    try {
      // Create dataset node
      const datasetResult = await session.run(
        `
        CREATE (d:Dataset {
          id: $id,
          name: $name,
          category: $category,
          created: datetime(),
          updated: datetime(),
          description: $description
        })
        RETURN d.id as id
        `,
        {
          id: dataset.id,
          name: dataset.name,
          category: dataset.category,
          description: dataset.metadata.description || ''
        }
      );

      // Create nodes
      for (const node of dataset.nodes) {
        await session.run(
          `
          MATCH (d:Dataset {id: $datasetId})
          CREATE (n:DataNode {
            id: $id,
            label: $label,
            category: $category,
            properties: $properties
          })
          CREATE (d)-[:CONTAINS]->(n)
          `,
          {
            datasetId: dataset.id,
            id: node.id,
            label: node.label,
            category: node.category,
            properties: JSON.stringify(node.properties)
          }
        );
      }

      // Create edges
      for (const edge of dataset.edges) {
        await session.run(
          `
          MATCH (source:DataNode {id: $sourceId})
          MATCH (target:DataNode {id: $targetId})
          CREATE (source)-[r:CONNECTED {
            id: $id,
            label: $label,
            weight: $weight,
            type: $type
          }]->(target)
          `,
          {
            sourceId: edge.source,
            targetId: edge.target,
            id: edge.id,
            label: edge.label || '',
            weight: edge.weight || 1.0,
            type: edge.type || 'default'
          }
        );
      }

      return dataset.id;
    } finally {
      await session.close();
    }
  }

  public async getDataset(datasetId: string): Promise<Dataset | null> {
    const session = this.driver.session();
    try {
      // Get dataset metadata
      const datasetResult = await session.run(
        `
        MATCH (d:Dataset {id: $id})
        RETURN d
        `,
        { id: datasetId }
      );

      if (datasetResult.records.length === 0) {
        return null;
      }

      const datasetNode = datasetResult.records[0].get('d');

      // Get nodes
      const nodesResult = await session.run(
        `
        MATCH (d:Dataset {id: $datasetId})-[:CONTAINS]->(n:DataNode)
        RETURN n
        `,
        { datasetId }
      );

      const nodes: NeuralNetworkNode[] = nodesResult.records.map(record => {
        const node = record.get('n');
        return {
          id: node.properties.id,
          label: node.properties.label,
          category: node.properties.category,
          properties: JSON.parse(node.properties.properties)
        };
      });

      // Get edges
      const edgesResult = await session.run(
        `
        MATCH (d:Dataset {id: $datasetId})-[:CONTAINS]->(source:DataNode)
        MATCH (source)-[r:CONNECTED]->(target:DataNode)
        RETURN r, source.id as sourceId, target.id as targetId
        `,
        { datasetId }
      );

      const edges: NeuralNetworkEdge[] = edgesResult.records.map(record => {
        const rel = record.get('r');
        return {
          id: rel.properties.id,
          source: record.get('sourceId'),
          target: record.get('targetId'),
          label: rel.properties.label,
          weight: rel.properties.weight,
          type: rel.properties.type
        };
      });

      return {
        id: datasetNode.properties.id,
        name: datasetNode.properties.name,
        category: datasetNode.properties.category,
        nodes,
        edges,
        metadata: {
          created: new Date(datasetNode.properties.created),
          updated: new Date(datasetNode.properties.updated),
          source: [],
          description: datasetNode.properties.description
        }
      };
    } finally {
      await session.close();
    }
  }

  public async queryDataset(
    datasetId: string,
    cypherQuery: string
  ): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(cypherQuery, { datasetId });
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }

  public async addNodeToDataset(
    datasetId: string,
    node: NeuralNetworkNode
  ): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (d:Dataset {id: $datasetId})
        CREATE (n:DataNode {
          id: $id,
          label: $label,
          category: $category,
          properties: $properties
        })
        CREATE (d)-[:CONTAINS]->(n)
        SET d.updated = datetime()
        `,
        {
          datasetId,
          id: node.id,
          label: node.label,
          category: node.category,
          properties: JSON.stringify(node.properties)
        }
      );
    } finally {
      await session.close();
    }
  }

  public async addEdgeToDataset(
    datasetId: string,
    edge: NeuralNetworkEdge
  ): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (d:Dataset {id: $datasetId})
        MATCH (d)-[:CONTAINS]->(source:DataNode {id: $sourceId})
        MATCH (d)-[:CONTAINS]->(target:DataNode {id: $targetId})
        CREATE (source)-[r:CONNECTED {
          id: $id,
          label: $label,
          weight: $weight,
          type: $type
        }]->(target)
        SET d.updated = datetime()
        `,
        {
          datasetId,
          sourceId: edge.source,
          targetId: edge.target,
          id: edge.id,
          label: edge.label || '',
          weight: edge.weight || 1.0,
          type: edge.type || 'default'
        }
      );
    } finally {
      await session.close();
    }
  }

  public async findShortestPath(
    datasetId: string,
    sourceNodeId: string,
    targetNodeId: string
  ): Promise<any> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (d:Dataset {id: $datasetId})
        MATCH (d)-[:CONTAINS]->(source:DataNode {id: $sourceId})
        MATCH (d)-[:CONTAINS]->(target:DataNode {id: $targetId})
        MATCH path = shortestPath((source)-[*]-(target))
        RETURN path
        `,
        {
          datasetId,
          sourceId: sourceNodeId,
          targetId: targetNodeId
        }
      );

      if (result.records.length > 0) {
        return result.records[0].get('path');
      }
      return null;
    } finally {
      await session.close();
    }
  }

  public async getNodeNeighbors(
    datasetId: string,
    nodeId: string,
    depth: number = 1
  ): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (d:Dataset {id: $datasetId})
        MATCH (d)-[:CONTAINS]->(n:DataNode {id: $nodeId})
        MATCH (n)-[r*1..${depth}]-(neighbor:DataNode)
        WHERE (d)-[:CONTAINS]->(neighbor)
        RETURN DISTINCT neighbor, r
        `,
        {
          datasetId,
          nodeId
        }
      );

      return result.records.map(record => ({
        node: record.get('neighbor'),
        relationships: record.get('r')
      }));
    } finally {
      await session.close();
    }
  }

  public async getDatasetStatistics(datasetId: string): Promise<any> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (d:Dataset {id: $datasetId})
        MATCH (d)-[:CONTAINS]->(n:DataNode)
        WITH d, count(n) as nodeCount
        MATCH (d)-[:CONTAINS]->(source:DataNode)
        MATCH (source)-[r:CONNECTED]->(:DataNode)
        WITH d, nodeCount, count(r) as edgeCount
        MATCH (d)-[:CONTAINS]->(n:DataNode)
        RETURN {
          nodeCount: nodeCount,
          edgeCount: edgeCount,
          categories: collect(DISTINCT n.category),
          avgDegree: toFloat(edgeCount) / toFloat(nodeCount),
          created: d.created,
          updated: d.updated
        } as stats
        `,
        { datasetId }
      );

      if (result.records.length > 0) {
        return result.records[0].get('stats');
      }
      return null;
    } finally {
      await session.close();
    }
  }

  public async getAllDatasets(): Promise<Dataset[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (d:Dataset)
        RETURN d
        ORDER BY d.updated DESC
        `
      );

      const datasets: Dataset[] = [];
      for (const record of result.records) {
        const datasetNode = record.get('d');
        const dataset = await this.getDataset(datasetNode.properties.id);
        if (dataset) {
          datasets.push(dataset);
        }
      }

      return datasets;
    } finally {
      await session.close();
    }
  }

  public async deleteDataset(datasetId: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (d:Dataset {id: $datasetId})
        OPTIONAL MATCH (d)-[:CONTAINS]->(n:DataNode)
        OPTIONAL MATCH (n)-[r:CONNECTED]-()
        DELETE r, n, d
        `,
        { datasetId }
      );
    } finally {
      await session.close();
    }
  }

  public async close(): Promise<void> {
    await this.driver.close();
  }
}