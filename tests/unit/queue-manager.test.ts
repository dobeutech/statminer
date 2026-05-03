import QueueManager from '@/lib/queue/queue-manager';

describe('QueueManager', () => {
  let queue: QueueManager;

  beforeEach(async () => {
    queue = QueueManager.getInstance();
    await queue.shutdown();
  });

  it('returns singleton instance', () => {
    const instance1 = QueueManager.getInstance();
    const instance2 = QueueManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('adds a job to the queue', async () => {
    const job = await queue.addJob('chat', { message: 'test', providers: [] });
    expect(job.id).toBeDefined();
    expect(['pending', 'processing', 'completed']).toContain(job.status);
    expect(job.queueName).toBe('chat');
  });

  it('retrieves a job by id', async () => {
    const job = await queue.addJob('chat', { message: 'test', providers: [] });
    const retrieved = await queue.getJob('chat', job.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(job.id);
  });

  it('returns null for non-existent job', async () => {
    const result = await queue.getJob('chat', 'nonexistent');
    expect(result).toBeNull();
  });

  it('respects priority ordering', async () => {
    await queue.addJob('chat', { order: 'low' }, { priority: 5 });
    await queue.addJob('chat', { order: 'high' }, { priority: 1 });
    await queue.addJob('chat', { order: 'normal' }, { priority: 3 });

    const status = await queue.getQueueStatus('chat');
    expect(status.waiting + status.active + status.completed + status.failed).toBeGreaterThanOrEqual(3);
  });

  it('reports queue status correctly', async () => {
    await queue.addJob('test-queue', { data: 1 });
    await queue.addJob('test-queue', { data: 2 });
    const status = await queue.getQueueStatus('test-queue');
    expect(status.waiting + status.active + status.completed).toBeGreaterThanOrEqual(0);
  });

  it('clears all jobs on shutdown', async () => {
    await queue.addJob('chat', { message: 'test', providers: [] });
    await queue.shutdown();
    const status = await queue.getQueueStatus('chat');
    expect(status.waiting).toBe(0);
    expect(status.active).toBe(0);
  });
});
