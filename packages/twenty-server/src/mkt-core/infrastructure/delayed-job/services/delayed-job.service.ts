import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import { Job, JobsOptions, Queue, Worker } from 'bullmq';

import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import {
  DELAYED_JOB_DEFAULTS,
  MktDelayedJobQueue,
} from 'src/mkt-core/infrastructure/delayed-job/constants';
import {
  CancelJobResult,
  DelayedJobHandler,
  DelayedJobOptions,
  DelayedJobWorkerOptions,
} from 'src/mkt-core/infrastructure/delayed-job/types';

/**
 * DelayedJobService - Tận dụng cùng infrastructure với Twenty message-queue
 *
 * Sử dụng cùng RedisClientService và BullMQ pattern,
 * nhưng thêm support cho delay và cancel job.
 */
@Injectable()
export class DelayedJobService implements OnModuleDestroy {
  private readonly logger = new Logger(DelayedJobService.name);
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();

  constructor(private readonly redisClientService: RedisClientService) {}

  /**
   * Get hoặc create queue - tận dụng cùng Redis connection với message-queue
   */
  private getQueue(queueName: MktDelayedJobQueue): Queue {
    let queue = this.queues.get(queueName);

    if (!queue) {
      queue = new Queue(queueName, {
        connection: this.redisClientService.getClient(),
      });
      this.queues.set(queueName, queue);
      this.logger.log(`Created delayed job queue: ${queueName}`);
    }

    return queue;
  }

  /**
   * Schedule delayed job - tương tự BullMQDriver.add() nhưng có delay
   */
  async scheduleJob<T>(
    queueName: MktDelayedJobQueue,
    jobName: string,
    payload: T,
    options: DelayedJobOptions,
  ): Promise<boolean> {
    const queue = this.getQueue(queueName);

    // Idempotency check - tương tự BullMQDriver
    const existingJob = await queue.getJob(options.jobId);

    if (existingJob) {
      this.logger.debug(`Job already exists: ${options.jobId}`);

      return false;
    }

    const jobOptions: JobsOptions = {
      jobId: options.jobId,
      delay: options.delayMs,
      priority: options.priority,
      attempts:
        1 + (options.retryAttempts ?? DELAYED_JOB_DEFAULTS.RETRY_ATTEMPTS),
      backoff: options.backoff ?? {
        type: DELAYED_JOB_DEFAULTS.BACKOFF_TYPE,
        delay: DELAYED_JOB_DEFAULTS.BACKOFF_DELAY_MS,
      },
      removeOnComplete: DELAYED_JOB_DEFAULTS.REMOVE_ON_COMPLETE,
      removeOnFail: DELAYED_JOB_DEFAULTS.REMOVE_ON_FAIL_COUNT,
    };

    await queue.add(jobName, payload, jobOptions);

    this.logger.log(
      `Scheduled delayed job: ${options.jobId} (delay: ${options.delayMs}ms)`,
    );

    return true;
  }

  /**
   * Cancel delayed job - feature không có trong Twenty message-queue
   */
  async cancelJob(
    queueName: MktDelayedJobQueue,
    jobId: string,
  ): Promise<CancelJobResult> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      return { success: false, jobId, reason: 'Job not found' };
    }

    const state = await job.getState();

    if (state !== 'delayed' && state !== 'waiting') {
      return { success: false, jobId, reason: `Job in ${state} state` };
    }

    await job.remove();
    this.logger.log(`Cancelled job: ${jobId}`);

    return { success: true, jobId };
  }

  /**
   * Register worker - tương tự BullMQDriver.work()
   */
  registerWorker<T>(
    options: DelayedJobWorkerOptions,
    handler: DelayedJobHandler<T>,
  ): void {
    const { queueName, concurrency = 1 } = options;

    if (this.workers.has(queueName)) {
      this.logger.warn(`Worker already registered: ${queueName}`);

      return;
    }

    const worker = new Worker<T>(
      queueName,
      async (job: Job<T>) => {
        await handler({
          jobId: job.id ?? '',
          payload: job.data,
          attemptNumber: job.attemptsMade + 1,
        });
      },
      {
        connection: this.redisClientService.getClient(),
        concurrency,
      },
    );

    worker.on('failed', (job, error) => {
      this.logger.error(`Job ${job?.id} failed: ${error.message}`);
    });

    this.workers.set(queueName, worker);
    this.logger.log(
      `Worker registered: ${queueName} (concurrency: ${concurrency})`,
    );
  }

  /**
   * Queue stats - cho monitoring
   */
  async getQueueStats(queueName: MktDelayedJobQueue): Promise<{
    waiting: number;
    delayed: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const queue = this.getQueue(queueName);

    const [waiting, delayed, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getDelayedCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return { waiting, delayed, active, completed, failed };
  }

  /**
   * Cleanup - tương tự BullMQDriver.onModuleDestroy()
   */
  async onModuleDestroy(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const worker of this.workers.values()) {
      closePromises.push(worker.close());
    }

    for (const queue of this.queues.values()) {
      closePromises.push(queue.close());
    }

    await Promise.all(closePromises);
    this.logger.log('Delayed job service destroyed');
  }
}
