import { Injectable, Logger } from '@nestjs/common';

import { In, LessThan } from 'typeorm';

import { MktCommonOrderService } from 'src/mkt-core/common/service/mkt-common-order.service';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktLicenseEventService } from 'src/mkt-core/license/services/mkt-license.event.service';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';

@Injectable()
export class MktOrderOverdueService {
  private readonly logger = new Logger(MktOrderOverdueService.name);

  constructor(
    private readonly mktRepo: MktRepositoryService,
    private readonly mktCommonOrderService: MktCommonOrderService,
    private readonly mktLicenseEventService: MktLicenseEventService,
  ) {}

  async updateOverdueOrders(workspaceId: string): Promise<void> {
    this.logger.log(`Processing overdue orders for workspace: ${workspaceId}`);

    try {
      const orderRepository =
        await this.mktRepo.getOrderRepositoryByWorkspaceId(workspaceId);

      // Tìm tất cả orders có status WAIT và được tạo từ 24h trước
      const twentyFourHoursAgo = new Date();

      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();

      const waitOrders = await orderRepository.find({
        where: {
          status: ORDER_STATUS.WAIT,
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

      await this.mktLicenseEventService.lockLicensesFromOrders(waitOrders);

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
      // Lấy danh sách tất cả workspaces có orders với status WAIT
      const orderRepository = await this.mktRepo.getOrderRepository();

      const distinctWorkspaces = await orderRepository
        .createQueryBuilder('order')
        .select('DISTINCT order.workspaceId', 'workspaceId')
        .where('order.status = :status', { status: ORDER_STATUS.WAIT })
        .getRawMany();

      if (distinctWorkspaces.length === 0) {
        this.logger.log('No workspaces found with WAIT orders');

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
