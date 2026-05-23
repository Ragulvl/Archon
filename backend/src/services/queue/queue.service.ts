/**
 * Job Queue — BullMQ-based background task processing.
 *
 * Handles long-running tasks that cannot run inline in HTTP requests:
 * - AI code generation
 * - Sandbox builds
 * - Deployments
 *
 * Requires Redis (uses same REDIS_URL as Socket.IO adapter).
 */

import { Queue, Worker, Job } from 'bullmq';
import { env } from '../../config/env';
import { aiLogger } from '../../utils/logger';

// ─── Queue Names ─────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  GENERATION: 'generation',
  SANDBOX:    'sandbox',
  DEPLOY:     'deploy',
} as const;

// ─── Job Types ───────────────────────────────────────────────────────────────

export interface GenerationJobData {
  type: 'generate';
  sessionId: string;
  projectId: string;
  userMessage: string;
  userId: string;
  intent?: string;
}

export interface SandboxJobData {
  type: 'sandbox';
  projectId: string;
  command: string;
  sandboxId?: string;
}

export interface DeployJobData {
  type: 'deploy';
  projectId: string;
  provider: string;
  userId: string;
  config?: Record<string, string>;
}

export type JobData = GenerationJobData | SandboxJobData | DeployJobData;

// ─── Queue Factory ───────────────────────────────────────────────────────────

let queues: Map<string, Queue> = new Map();

function getRedisConnection() {
  if (!env.REDIS_URL) return null;

  // Parse redis URL
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
  };
}

export function getQueue(name: string): Queue | null {
  if (queues.has(name)) return queues.get(name)!;

  const connection = getRedisConnection();
  if (!connection) {
    aiLogger.warn(`No REDIS_URL — queue "${name}" unavailable. Jobs will run inline.`);
    return null;
  }

  const queue = new Queue(name, { connection });
  queues.set(name, queue);
  return queue;
}

// ─── Enqueue Helpers ─────────────────────────────────────────────────────────

export async function enqueueGeneration(data: Omit<GenerationJobData, 'type'>): Promise<string | null> {
  const queue = getQueue(QUEUE_NAMES.GENERATION);
  if (!queue) return null; // Will fall back to inline execution

  const job = await queue.add('generate', { ...data, type: 'generate' }, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 },  // Keep completed jobs for 1 hour
    removeOnFail: { age: 86400 },     // Keep failed jobs for 1 day
  });

  return job.id ?? null;
}

export async function enqueueSandboxCommand(data: Omit<SandboxJobData, 'type'>): Promise<string | null> {
  const queue = getQueue(QUEUE_NAMES.SANDBOX);
  if (!queue) return null;

  const job = await queue.add('sandbox', { ...data, type: 'sandbox' }, {
    attempts: 1,
    removeOnComplete: { age: 1800 },
  });

  return job.id ?? null;
}

export async function enqueueDeploy(data: Omit<DeployJobData, 'type'>): Promise<string | null> {
  const queue = getQueue(QUEUE_NAMES.DEPLOY);
  if (!queue) return null;

  const job = await queue.add('deploy', { ...data, type: 'deploy' }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 86400 * 7 },
  });

  return job.id ?? null;
}

// ─── Worker Registration ─────────────────────────────────────────────────────

let workers: Worker[] = [];

export function registerWorker(
  queueName: string,
  processor: (job: Job<JobData>) => Promise<void>,
  concurrency: number = 2
): Worker | null {
  const connection = getRedisConnection();
  if (!connection) return null;

  const worker = new Worker(queueName, processor, {
    connection,
    concurrency,
  });

  worker.on('completed', (job) => {
    aiLogger.info(`Job ${job.id} completed in queue ${queueName}`);
  });

  worker.on('failed', (job, err) => {
    aiLogger.error(`Job ${job?.id} failed in queue ${queueName}:`, err);
  });

  workers.push(worker);
  return worker;
}

// ─── Shutdown ────────────────────────────────────────────────────────────────

export async function closeQueues(): Promise<void> {
  await Promise.all(workers.map(w => w.close()));
  await Promise.all([...queues.values()].map(q => q.close()));
  queues.clear();
  workers = [];
}
