import { Logger, OnModuleInit } from '@nestjs/common';

import { Repository } from 'typeorm';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';

import { MessageQueueJobData } from 'src/engine/core-modules/message-queue/interfaces/message-queue-job.interface';

import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';

/**
 * Cấu hình cho một cron job
 */
export type CronJobConfig<T extends MessageQueueJobData = MessageQueueJobData> =
  {
    /** Tên job (thường là ClassName.name) */
    jobName: string;
    /** Cron pattern (e.g., '0 * * * *' for every hour) */
    pattern: string;
    /** Data truyền vào job */
    data: T;
    /** Mô tả job (dùng cho logging) */
    description?: string;
  };

/**
 * Abstract base class cho việc tự động đăng ký cron jobs
 *
 * Các module extend class này và implement:
 * - getLogContext(): Trả về log context
 * - isEnabled(): Kiểm tra xem cron registration có được enable không
 * - getCronJobsForWorkspace(workspaceId): Trả về danh sách cron jobs cho workspace
 *
 * Cách hoạt động:
 * 1. Khi module init, service sẽ query tất cả active workspaces từ DB
 * 2. Với mỗi workspace, gọi getCronJobsForWorkspace() để lấy danh sách jobs
 * 3. Đăng ký mỗi job vào message queue với cron pattern
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyCronRegistrationService extends BaseCronRegistrationService {
 *   constructor(
 *     @InjectMessageQueue(MessageQueue.cronQueue)
 *     messageQueueService: MessageQueueService,
 *     @InjectRepository(Workspace, 'core')
 *     workspaceRepository: Repository<Workspace>,
 *   ) {
 *     super(messageQueueService, workspaceRepository);
 *   }
 *
 *   protected getLogContext(): string {
 *     return 'MyModule:CronRegistration';
 *   }
 *
 *   protected isEnabled(): boolean {
 *     return process.env.MY_CRON_ENABLED !== 'false';
 *   }
 *
 *   protected getCronJobsForWorkspace(workspaceId: string): CronJobConfig[] {
 *     return [
 *       {
 *         jobName: MyJob.name,
 *         pattern: CronExpression.EVERY_HOUR,
 *         data: { workspaceId },
 *         description: 'My hourly job',
 *       },
 *     ];
 *   }
 * }
 * ```
 */
export abstract class BaseCronRegistrationService implements OnModuleInit {
  protected readonly logger: Logger;

  constructor(
    protected readonly messageQueueService: MessageQueueService,
    protected readonly workspaceRepository: Repository<Workspace>,
  ) {
    this.logger = new Logger(this.getLogContext());
  }

  /**
   * Trả về log context cho service
   */
  protected abstract getLogContext(): string;

  /**
   * Kiểm tra xem cron registration có được enable không
   */
  protected abstract isEnabled(): boolean;

  /**
   * Trả về danh sách cron jobs cho một workspace cụ thể
   * @param workspaceId ID của workspace
   */
  protected abstract getCronJobsForWorkspace(
    workspaceId: string,
  ): CronJobConfig[];

  /**
   * Lấy danh sách workspace IDs để đăng ký cron jobs
   * Query tất cả active workspaces từ DB
   */
  protected async getWorkspaceIds(): Promise<string[]> {
    const workspaces = await this.workspaceRepository.find({
      where: {
        activationStatus: WorkspaceActivationStatus.ACTIVE,
      },
      select: ['id'],
    });

    return workspaces.map((ws) => ws.id);
  }

  /**
   * Lifecycle hook - tự động đăng ký cron jobs khi module init
   */
  async onModuleInit(): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.log('Cron registration disabled, skipping');

      return;
    }

    try {
      const workspaceIds = await this.getWorkspaceIds();

      if (workspaceIds.length === 0) {
        this.logger.warn('No workspaces found, skipping cron registration');

        return;
      }

      await this.registerAllCronJobs(workspaceIds);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to register cron jobs', {
        error: errorMessage,
      });
    }
  }

  /**
   * Đăng ký cron jobs cho tất cả workspaces
   */
  private async registerAllCronJobs(workspaceIds: string[]): Promise<void> {
    let totalJobsRegistered = 0;

    for (const workspaceId of workspaceIds) {
      const cronJobs = this.getCronJobsForWorkspace(workspaceId);

      for (const config of cronJobs) {
        await this.registerCronJob(config);
        totalJobsRegistered++;
      }
    }

    this.logger.log(
      `Registered ${totalJobsRegistered} cron job(s) for ${workspaceIds.length} workspace(s)`,
    );
  }

  /**
   * Đăng ký một cron job
   */
  private async registerCronJob<T extends MessageQueueJobData>(
    config: CronJobConfig<T>,
  ): Promise<void> {
    try {
      await this.messageQueueService.addCron<T>({
        jobName: config.jobName,
        data: config.data,
        options: {
          repeat: {
            pattern: config.pattern,
          },
        },
      });

      this.logger.debug(`Cron job registered: ${config.jobName}`, {
        pattern: config.pattern,
        description: config.description,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to register cron job: ${config.jobName}`, {
        error: errorMessage,
      });
    }
  }
}
