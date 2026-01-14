import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { OrderConfig } from 'src/mkt-core/order/config/order-config.types';
import { orderConfig } from 'src/mkt-core/order/config/order.config';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { OrderOverdueSchedulerService } from 'src/mkt-core/order/services/core/order-overdue-scheduler.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  MigrationOrderResult,
  MigrationWorkspaceResult,
} from 'src/mkt-core/order/types';

/**
 * OrderOverdueMigrationService
 *
 * Service chạy khi server startup để detect và schedule jobs cho
 * các orders PENDING_PAYMENT có thể đã bị miss:
 * - Orders tạo trước khi deploy delayed job system
 * - Orders bị miss do Redis clear/reset
 * - Orders đã quá hạn khi server down
 *
 * Logic:
 * 1. Query tất cả orders có status = PENDING_PAYMENT
 * 2. Tính thời gian còn lại trước khi overdue
 * 3. Schedule job với delay phù hợp (hoặc 0 nếu đã quá hạn)
 */
@Injectable()
export class OrderOverdueMigrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrderOverdueMigrationService.name);

  constructor(
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly orderOverdueSchedulerService: OrderOverdueSchedulerService,
    @Inject(orderConfig.KEY)
    private readonly config: OrderConfig,
    @InjectRepository(Workspace, 'core')
    private readonly workspaceRepository: Repository<Workspace>,
  ) {}

  /**
   * Chạy migration khi application bootstrap hoàn tất
   */
  async onApplicationBootstrap(): Promise<void> {
    // Delay một chút để các services khác khởi động xong
    await this.delay(5000);

    this.logger.log('Starting order overdue migration on startup...');

    try {
      const results = await this.migrateAllWorkspaces();

      this.logMigrationSummary(results);
    } catch (error) {
      this.logger.error(
        'Failed to run order overdue migration on startup',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Migrate tất cả workspaces active có orders PENDING_PAYMENT
   *
   * Logic:
   * 1. Lấy danh sách active workspaces từ core database
   * 2. Iterate qua từng workspace, query orders PENDING_PAYMENT
   * 3. Schedule jobs cho orders cần migrate
   */
  private async migrateAllWorkspaces(): Promise<MigrationWorkspaceResult[]> {
    // Lấy danh sách active workspaces
    const workspaceIds = await this.getActiveWorkspaceIds();

    if (workspaceIds.length === 0) {
      this.logger.log('No active workspaces found');

      return [];
    }

    this.logger.log(`Found ${workspaceIds.length} active workspaces to scan`);

    const results: MigrationWorkspaceResult[] = [];

    for (const workspaceId of workspaceIds) {
      try {
        const result = await this.migrateWorkspace(workspaceId);

        // Chỉ log nếu có orders được xử lý
        if (result.totalOrders > 0) {
          results.push(result);
        }
      } catch (error) {
        this.logger.error(
          `Failed to migrate workspace ${workspaceId}`,
          error instanceof Error ? error.message : error,
        );
        results.push({
          workspaceId,
          totalOrders: 0,
          scheduled: 0,
          immediate: 0,
          skipped: 0,
          errors: 1,
        });
      }
    }

    return results;
  }

  /**
   * Lấy danh sách workspace IDs active
   *
   * Chỉ lấy các workspaces có activationStatus = ACTIVE
   * để tránh query vào workspaces đang bị suspended/deleted
   */
  private async getActiveWorkspaceIds(): Promise<string[]> {
    try {
      const activeWorkspaces = await this.workspaceRepository.find({
        select: ['id'],
        where: {
          activationStatus: In([
            WorkspaceActivationStatus.ACTIVE,
            WorkspaceActivationStatus.ONGOING_CREATION,
          ]),
        },
      });

      return activeWorkspaces.map((w) => w.id);
    } catch (error) {
      this.logger.error('Failed to query active workspaces', error);

      return [];
    }
  }

  /**
   * Migrate một workspace cụ thể
   */
  private async migrateWorkspace(
    workspaceId: string,
  ): Promise<MigrationWorkspaceResult> {
    const orders = await this.mktOrderRepository.findByStatus(
      ORDER_STATUS.PENDING_PAYMENT,
    );

    if (orders.length === 0) {
      return {
        workspaceId,
        totalOrders: 0,
        scheduled: 0,
        immediate: 0,
        skipped: 0,
        errors: 0,
      };
    }

    this.logger.log(
      `Migrating ${orders.length} PENDING_PAYMENT orders in workspace ${workspaceId}`,
    );

    const result: MigrationWorkspaceResult = {
      workspaceId,
      totalOrders: orders.length,
      scheduled: 0,
      immediate: 0,
      skipped: 0,
      errors: 0,
    };

    for (const order of orders) {
      const orderResult = await this.migrateOrder(workspaceId, order);

      switch (orderResult.status) {
        case 'scheduled':
          result.scheduled++;
          break;
        case 'immediate':
          result.immediate++;
          break;
        case 'skipped':
          result.skipped++;
          break;
        case 'error':
          result.errors++;
          break;
      }
    }

    return result;
  }

  /**
   * Migrate một order cụ thể
   *
   * Tính delay còn lại và schedule job phù hợp
   */
  private async migrateOrder(
    workspaceId: string,
    order: Pick<MktOrderWorkspaceEntity, 'id' | 'orderCode' | 'createdAt'>,
  ): Promise<MigrationOrderResult> {
    try {
      // Validate createdAt exists
      if (!order.createdAt) {
        this.logger.warn({
          message: 'Order has no createdAt, skipping',
          orderId: order.id,
          orderCode: order.orderCode,
        });

        return {
          orderId: order.id,
          orderCode: order.orderCode ?? undefined,
          status: 'skipped',
        };
      }

      const now = DateTimeUtils.now();
      // Sử dụng parse() thay vì fromISO() vì TypeORM có thể return Date object
      const createdAt = DateTimeUtils.parse(order.createdAt);

      // Validate createdAt is valid DateTime
      if (!createdAt.isValid) {
        this.logger.warn({
          message: 'Order has invalid createdAt, skipping',
          orderId: order.id,
          orderCode: order.orderCode,
          createdAt: order.createdAt,
        });

        return {
          orderId: order.id,
          orderCode: order.orderCode ?? undefined,
          status: 'skipped',
        };
      }

      // Tính thời gian đã trôi qua từ khi tạo order
      const elapsedMs =
        DateTimeUtils.toMillis(now) - DateTimeUtils.toMillis(createdAt);

      // Tính delay còn lại
      const overdueDelayMs = this.config.overdue.delayMs;
      const remainingDelayMs = Math.max(0, overdueDelayMs - elapsedMs);

      if (remainingDelayMs <= 0) {
        // Đã quá hạn → Schedule job với delay = 0 (chạy ngay)
        const scheduled =
          await this.orderOverdueSchedulerService.scheduleOverdueCheck(
            workspaceId,
            order.id,
            order.orderCode ?? undefined,
            1000, // 1 second delay để tránh race condition
          );

        if (!scheduled) {
          // Job đã tồn tại (đã được schedule trước đó)
          return {
            orderId: order.id,
            orderCode: order.orderCode ?? undefined,
            status: 'skipped',
          };
        }

        return {
          orderId: order.id,
          orderCode: order.orderCode ?? undefined,
          status: 'immediate',
          delayMs: 1000,
        };
      }

      // Chưa quá hạn → Schedule job với delay còn lại
      const scheduled =
        await this.orderOverdueSchedulerService.scheduleOverdueCheck(
          workspaceId,
          order.id,
          order.orderCode ?? undefined,
          remainingDelayMs,
        );

      if (!scheduled) {
        // Job đã tồn tại
        return {
          orderId: order.id,
          orderCode: order.orderCode ?? undefined,
          status: 'skipped',
        };
      }

      return {
        orderId: order.id,
        orderCode: order.orderCode ?? undefined,
        status: 'scheduled',
        delayMs: remainingDelayMs,
      };
    } catch (error) {
      this.logger.error(
        `Failed to migrate order ${order.id}`,
        error instanceof Error ? error.message : error,
      );

      return {
        orderId: order.id,
        orderCode: order.orderCode ?? undefined,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Log tổng kết migration
   */
  private logMigrationSummary(results: MigrationWorkspaceResult[]): void {
    const total = results.reduce(
      (acc, r) => ({
        workspaces: acc.workspaces + 1,
        orders: acc.orders + r.totalOrders,
        scheduled: acc.scheduled + r.scheduled,
        immediate: acc.immediate + r.immediate,
        skipped: acc.skipped + r.skipped,
        errors: acc.errors + r.errors,
      }),
      {
        workspaces: 0,
        orders: 0,
        scheduled: 0,
        immediate: 0,
        skipped: 0,
        errors: 0,
      },
    );

    this.logger.log({
      message: 'Order overdue migration completed',
      summary: {
        workspacesProcessed: total.workspaces,
        totalOrders: total.orders,
        scheduled: total.scheduled,
        immediate: total.immediate,
        skipped: total.skipped,
        errors: total.errors,
      },
    });

    if (total.immediate > 0) {
      this.logger.warn(
        `${total.immediate} orders were already overdue and scheduled for immediate processing`,
      );
    }

    if (total.errors > 0) {
      this.logger.error(
        `${total.errors} orders failed to migrate - manual intervention may be required`,
      );
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
