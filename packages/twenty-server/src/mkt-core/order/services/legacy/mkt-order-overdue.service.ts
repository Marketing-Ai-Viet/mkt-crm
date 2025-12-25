import { Injectable, Logger } from '@nestjs/common';

import { In, LessThan } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktCommonOrderService } from 'src/mkt-core/common/service/mkt-common-order.service';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

@Injectable()
export class MktOrderOverdueService {
  private readonly logger = new Logger(MktOrderOverdueService.name);

  constructor(
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly mktCommonOrderService: MktCommonOrderService,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  async updateOverdueOrders(workspaceId: string): Promise<void> {
    this.logger.log(`Processing overdue orders for workspace: ${workspaceId}`);

    try {
      const orderRepository =
        await this.mktOrderRepository.getRepository(workspaceId);

      // Tìm tất cả orders có status WAIT và được tạo từ 24h trước
      const twentyFourHoursAgo = DateTimeUtils.subtract(DateTimeUtils.now(), {
        hours: 24,
      });
      const twentyFourHoursAgoISO = DateTimeUtils.toISO(twentyFourHoursAgo);

      const waitOrders = await orderRepository.find({
        where: {
          status: ORDER_STATUS.PENDING_PAYMENT,
          createdAt: LessThan(twentyFourHoursAgoISO),
        },
      });

      if (waitOrders.length === 0) {
        this.logger.log(
          `No orders found that need to be updated to OVERDUE for workspace: ${workspaceId}`,
        );

        return;
      }

      this.logger.log(
        `Found ${waitOrders.length} orders to update to OVERDUE status`,
      );

      // Update tất cả orders thành OVERDUE
      const orderIds = waitOrders.map((order) => order.id);

      await orderRepository.update(
        { id: In(orderIds) },
        { status: ORDER_STATUS.OVERDUE },
      );

      // TODO: Implement license locking using new license module
      // The old MktLicenseEventService has been removed with the license module
      this.logger.warn(
        'License locking is not implemented - license module removed',
      );

      this.logger.log(
        `Successfully updated ${waitOrders.length} orders to OVERDUE status for workspace: ${workspaceId}`,
      );

      // Log chi tiết các orders đã được update
      const updatedOrderCodes = waitOrders
        .map((order) => order.orderCode)
        .filter(Boolean);

      if (updatedOrderCodes.length > 0) {
        this.logger.log(`Updated orders: ${updatedOrderCodes.join(', ')}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to update overdue orders for workspace ${workspaceId}:`,
        error,
      );
      throw error;
    }
  }

  async processAllWorkspaces(): Promise<void> {
    this.logger.log('Starting overdue orders processing for all workspaces');

    try {
      // Lấy danh sách tất cả workspaces có orders với status PENDING_PAYMENT
      // Using TwentyORMGlobalManager for cross-workspace queries
      const orderRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          'system',
          MktOrderWorkspaceEntity,
          { shouldBypassPermissionChecks: true },
        );

      const distinctWorkspaces = await orderRepository
        .createQueryBuilder('order')
        .select('DISTINCT order.workspaceId', 'workspaceId')
        .where('order.status = :status', {
          status: ORDER_STATUS.PENDING_PAYMENT,
        })
        .getRawMany();

      if (distinctWorkspaces.length === 0) {
        this.logger.log('No workspaces found with PENDING_PAYMENT orders');

        return;
      }

      this.logger.log(
        `Found ${distinctWorkspaces.length} workspaces with WAIT orders`,
      );

      let successCount = 0;
      let failureCount = 0;

      for (const workspace of distinctWorkspaces) {
        try {
          await this.updateOverdueOrders(workspace.workspaceId);
          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to process workspace ${workspace.workspaceId}:`,
            error,
          );
          failureCount++;
        }
      }

      this.logger.log(
        `Overdue orders processing completed: ${successCount} successful, ${failureCount} failed`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to process overdue orders for all workspaces:',
        error,
      );
      throw error;
    }
  }
}
