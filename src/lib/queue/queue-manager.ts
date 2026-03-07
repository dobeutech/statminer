import { QueuedJob } from '@/types';
import { sendToLLMProviders } from '@/lib/llm-providers';
import SessionManager from '@/lib/auth/session-manager';

interface JobEntry {
  id: string;
  queueName: string;
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  createdAt: Date;
  result?: any;
  error?: string;
  attempts: number;
  maxAttempts: number;
}

class QueueManager {
  private static instance: QueueManager;
  private jobs: Map<string, JobEntry> = new Map();
  private sessionManager: SessionManager;
  private processing: boolean = false;
  private concurrency: number;

  private constructor(concurrency: number = 5) {
    this.sessionManager = SessionManager.getInstance();
    this.concurrency = concurrency;
  }

  static getInstance(concurrency?: number): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager(concurrency);
    }
    return QueueManager.instance;
  }

  async addJob(
    queueName: string,
    data: any,
    options?: { priority?: number; attempts?: number }
  ): Promise<JobEntry> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const job: JobEntry = {
      id: jobId,
      queueName,
      data,
      status: 'pending',
      priority: options?.priority ?? 3,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: options?.attempts ?? 3,
    };

    this.jobs.set(jobId, job);
    this.processQueue();
    return job;
  }

  async getJob(queueName: string, jobId: string): Promise<JobEntry | null> {
    const job = this.jobs.get(jobId);
    if (job && job.queueName === queueName) return job;
    return null;
  }

  async getQueueStatus(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const queueJobs = Array.from(this.jobs.values()).filter(j => j.queueName === queueName);
    return {
      waiting: queueJobs.filter(j => j.status === 'pending').length,
      active: queueJobs.filter(j => j.status === 'processing').length,
      completed: queueJobs.filter(j => j.status === 'completed').length,
      failed: queueJobs.filter(j => j.status === 'failed').length,
    };
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      const pendingJobs = Array.from(this.jobs.values())
        .filter(j => j.status === 'pending')
        .sort((a, b) => a.priority - b.priority)
        .slice(0, this.concurrency);

      await Promise.allSettled(
        pendingJobs.map(job => this.processJob(job))
      );
    } finally {
      this.processing = false;

      const hasPending = Array.from(this.jobs.values()).some(j => j.status === 'pending');
      if (hasPending) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  private async processJob(job: JobEntry) {
    job.status = 'processing';
    job.attempts++;

    try {
      let result: any;

      switch (job.queueName) {
        case 'chat': {
          const { message, providers, sessionId } = job.data;
          const responses = await sendToLLMProviders(message, providers);
          
          if (sessionId) {
            const session = this.sessionManager.getSession(sessionId);
            if (session) {
              for (const response of responses) {
                this.sessionManager.updateApiUsage(
                  sessionId,
                  response.providerId,
                  response.metadata.tokensUsed,
                  response.metadata.cost
                );
              }
            }
          }
          result = { success: true, responses };
          break;
        }
        default:
          result = { success: true };
      }

      job.status = 'completed';
      job.result = result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (job.attempts < job.maxAttempts) {
        job.status = 'pending';
      } else {
        job.status = 'failed';
        job.error = errorMessage;
      }
    }
  }

  async shutdown(): Promise<void> {
    this.jobs.clear();
  }
}

export default QueueManager;
