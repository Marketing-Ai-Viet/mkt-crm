import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { In, QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_ORDER_EVENT_TYPES } from 'src/mkt-core/common/common.type';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/license.constants';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderStatusService } from 'src/mkt-core/order/services/core';
import {
  RefundOrderInput,
  RefundOrderResponse,
} from 'src/mkt-core/order/types';
import { MktVariantWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-variant.workspace-entity';

import { SagaContext, SagaStepResult } from './order-saga.interface';

/**
 * RefundOrderSaga - Saga for refunding orders
 *
 * Handles order refunds with:
 * - Full refund: All licenses refunded, order status -> REFUND
 * - Partial refund: Selected licenses refunded, order status -> REFUND_PARTIAL
 *
 * Steps:
 * 1. Validate order can be refunded
 * 2. Get licenses to refund
 * 3. Calculate refund amount
 * 4. Update license statuses
 * 5. Update order status and refund amount
 * 6. Emit events
 */
@Injectable()
export class RefundOrderSaga {
  private readonly logger = new Logger(RefundOrderSaga.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly eventEmitter: EventEmitter2,
    private readonly orderStatusService: OrderStatusService,
  ) {}

  /**
   * Execute the refund order saga
   */
  async execute(
    workspaceId: string,
    input: RefundOrderInput,
  ): Promise<RefundOrderResponse> {
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace({
        workspaceId,
      });

    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const context: SagaContext = {
      workspaceId,
      rollbackData: new Map(),
      metadata: new Map(),
    };

    try {
      // Step 1: Validate order can be refunded
      const validateResult = await this.validateOrder(
        context,
        input,
        queryRunner,
      );

      if (!validateResult.success) {
        await queryRunner.rollbackTransaction();

        return {
          success: false,
          error: validateResult.error?.message ?? 'Order validation failed',
        };
      }

      const currentOrder = validateResult.data;

      if (!currentOrder) {
        await queryRunner.rollbackTransaction();

        return {
          success: false,
          error: 'Order validation failed: no data returned',
        };
      }

      const previousStatus = currentOrder.status as ORDER_STATUS;

      // Determine if partial or full refund
      const isPartial =
        input.isPartial ?? (input.licenseIds && input.licenseIds.length > 0);
      const action = isPartial
        ? ORDER_ACTION.REFUND_PARTIAL
        : ORDER_ACTION.REFUND;
      const newStatus = isPartial
        ? ORDER_STATUS.REFUND_PARTIAL
        : ORDER_STATUS.REFUND;

      // Validate transition
      if (
        !this.orderStatusService.validateTransition(previousStatus, newStatus)
      ) {
        await queryRunner.rollbackTransaction();

        return {
          success: false,
          error: `Cannot refund order with status: ${previousStatus}`,
        };
      }

      // Step 2: Get licenses to refund
      const licensesToRefund = await this.getLicensesToRefund(
        context,
        input,
        currentOrder,
      );

      if (licensesToRefund.length === 0) {
        await queryRunner.rollbackTransaction();

        return {
          success: false,
          error: 'No licenses found to refund',
        };
      }

      // Step 3: Calculate refund amount
      const refundAmount =
        input.refundAmount ??
        (await this.calculateRefundAmount(context, licensesToRefund));

      // Step 4: Update license statuses
      const updateLicensesResult = await this.updateLicenseStatuses(
        context,
        licensesToRefund,
        queryRunner,
      );

      if (!updateLicensesResult.success) {
        await queryRunner.rollbackTransaction();

        return {
          success: false,
          error:
            updateLicensesResult.error?.message ?? 'Failed to update licenses',
        };
      }

      // Step 5: Update order status and refund amount
      const updateOrderResult = await this.updateOrderForRefund(
        context,
        input,
        action,
        newStatus,
        refundAmount,
        licensesToRefund.map((l) => l.id),
        queryRunner,
      );

      if (!updateOrderResult.success) {
        await queryRunner.rollbackTransaction();

        return {
          success: false,
          error: updateOrderResult.error?.message ?? 'Failed to update order',
        };
      }

      await queryRunner.commitTransaction();

      // Emit event after successful commit
      this.emitRefundEvent(context, input, newStatus, refundAmount);

      this.logger.log(
        `Order ${input.orderId} refunded: ${previousStatus} -> ${newStatus}, amount: ${refundAmount}`,
      );

      return {
        success: true,
        orderId: input.orderId,
        refundedAmount: refundAmount,
        newStatus,
      };
    } catch (error) {
      this.logger.error('RefundOrderSaga execution error', error);
      await queryRunner.rollbackTransaction();

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Step 1: Validate order can be refunded
   */
  private async validateOrder(
    context: SagaContext,
    input: RefundOrderInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<MktOrderWorkspaceEntity>> {
    try {
      const orderRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          context.workspaceId,
          MktOrderWorkspaceEntity,
          { shouldBypassPermissionChecks: true },
        );

      const order = await orderRepository.findOne({
        where: { id: input.orderId },
        relations: ['orderItems', 'mktLicense'],
      });

      if (!order) {
        return {
          success: false,
          error: new Error(`Order ${input.orderId} not found`),
        };
      }

      // Check if order can be refunded
      const status = order.status as ORDER_STATUS;
      const refundableStatuses = [
        ORDER_STATUS.COMPLETED,
        ORDER_STATUS.CONFIRMED,
        ORDER_STATUS.REFUND_PARTIAL,
      ];

      if (!refundableStatuses.includes(status)) {
        return {
          success: false,
          error: new Error(`Order with status ${status} cannot be refunded`),
        };
      }

      // Store for rollback and context
      context.orderId = order.id;
      context.orderCode = order.orderCode;
      context.rollbackData.set('previousOrder', {
        status: order.status,
        refundAmount: order.refundAmount,
      });

      return {
        success: true,
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Validation failed'),
      };
    }
  }

  /**
   * Get licenses to refund
   */
  private async getLicensesToRefund(
    _context: SagaContext,
    input: RefundOrderInput,
    order: MktOrderWorkspaceEntity,
  ): Promise<MktLicenseWorkspaceEntity[]> {
    const allLicenses = order.mktLicense ?? [];
    const { licenseIds } = input;

    // If specific license IDs provided, filter to those
    if (licenseIds && licenseIds.length > 0) {
      return allLicenses.filter((license) => licenseIds.includes(license.id));
    }

    // Otherwise, return all non-refunded licenses
    return allLicenses.filter(
      (license) => license.status !== MKT_LICENSE_STATUS.REFUND,
    );
  }

  /**
   * Calculate refund amount from licenses
   */
  private async calculateRefundAmount(
    context: SagaContext,
    licenses: MktLicenseWorkspaceEntity[],
  ): Promise<number> {
    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        context.workspaceId,
        MktLicenseWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    // Fetch licenses with variant relation
    const licensesWithVariants = await licenseRepository.find({
      where: { id: In(licenses.map((l) => l.id)) },
      relations: ['mktVariant'],
    });

    let totalRefundAmount = 0;

    for (const license of licensesWithVariants) {
      const variant = license.mktVariant as MktVariantWorkspaceEntity;

      if (variant) {
        totalRefundAmount += variant.price ?? 0;
      }
    }

    return totalRefundAmount;
  }

  /**
   * Update license statuses to REFUND
   */
  private async updateLicenseStatuses(
    context: SagaContext,
    licenses: MktLicenseWorkspaceEntity[],
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult> {
    try {
      if (licenses.length === 0) {
        return { success: true };
      }

      const licenseIds = licenses.map((l) => l.id);

      // Store for rollback
      context.rollbackData.set('refundedLicenseIds', licenseIds);
      context.rollbackData.set(
        'previousLicenseStatuses',
        licenses.map((l) => ({ id: l.id, status: l.status })),
      );

      // Update all license statuses
      await queryRunner.manager.update(
        MktLicenseWorkspaceEntity,
        { id: In(licenseIds) },
        { status: MKT_LICENSE_STATUS.REFUND },
      );

      this.logger.log(`Updated ${licenseIds.length} licenses to REFUND status`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error('License update failed'),
      };
    }
  }

  /**
   * Update order for refund
   */
  private async updateOrderForRefund(
    context: SagaContext,
    input: RefundOrderInput,
    action: ORDER_ACTION,
    newStatus: ORDER_STATUS,
    refundAmount: number,
    refundedLicenseIds: string[],
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult> {
    try {
      // Build refund metadata
      const refundMetadata = {
        orderAction: action,
        refundedAt: new Date().toISOString(),
        refundedLicenseIds,
        refundAmount,
        reason: input.reason,
      };

      const updateData: Partial<MktOrderWorkspaceEntity> = {
        status: newStatus,
        refundAmount,
        updatedAt: new Date().toISOString(),
        metadata: JSON.stringify(refundMetadata) as unknown as JSON,
      };

      await queryRunner.manager.update(
        MktOrderWorkspaceEntity,
        { id: input.orderId },
        updateData,
      );

      context.metadata.set('newStatus', newStatus);
      context.metadata.set('refundAmount', refundAmount);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error('Order update failed'),
      };
    }
  }

  /**
   * Emit refund event
   */
  private emitRefundEvent(
    context: SagaContext,
    input: RefundOrderInput,
    newStatus: ORDER_STATUS,
    refundAmount: number,
  ): void {
    if (!context.orderId) return;

    this.eventEmitter.emit(MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED, {
      name: MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED,
      workspaceId: context.workspaceId,
      events: [
        {
          eventType: MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED,
          orderId: context.orderId,
          workspaceId: context.workspaceId,
          orderData: {
            id: context.orderId,
            status: newStatus,
            refundAmount,
            reason: input.reason,
            isPartial: input.isPartial,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    });

    this.logger.log(
      `Emitted ORDER_REFUNDED event for order: ${context.orderId}`,
    );
  }
}
