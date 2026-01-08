import { MktDelayedJobQueue } from 'src/mkt-core/infrastructure/delayed-job/constants';

/**
 * Backoff strategy cho retry
 */
export type DelayedJobBackoff = {
  type: 'exponential' | 'fixed';
  delay: number; // Base delay in milliseconds
};

/**
 * Options khi schedule delayed job
 */
export type DelayedJobOptions = {
  /** Unique job ID - dùng để cancel job sau này */
  jobId: string;
  /** Delay in milliseconds trước khi job được xử lý */
  delayMs: number;
  /** Số lần retry khi job fail (default: 3) */
  retryAttempts?: number;
  /** Backoff strategy cho retry */
  backoff?: DelayedJobBackoff;
  /** Priority của job (lower = higher priority) */
  priority?: number;
};

/**
 * Handler function cho delayed job
 */
export type DelayedJobHandler<T = unknown> = (data: {
  jobId: string;
  payload: T;
  attemptNumber: number;
}) => Promise<void>;

/**
 * Result của cancel job operation
 */
export type CancelJobResult = {
  success: boolean;
  jobId: string;
  reason?: string;
};

/**
 * Worker options
 */
export type DelayedJobWorkerOptions = {
  queueName: MktDelayedJobQueue;
  concurrency?: number;
};
