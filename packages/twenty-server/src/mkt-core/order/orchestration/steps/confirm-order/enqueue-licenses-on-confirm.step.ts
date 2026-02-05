import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { LinkedAccount } from 'src/mkt-core/customer/types/linked-account.types';
import { MktLicenseQueueService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-queue.service';
import { LICENSE_JOB_ACTIONS } from 'src/mkt-core/mkt-license-integration/types/license-job.types';
import { EnqueueResult } from 'src/mkt-core/mkt-license-integration/types/license-queue.types';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { LICENSE_ITEM_STATUS } from 'src/mkt-core/order/constants/license-item-status.constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { ConfirmOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories';
import {
  ConfirmOrderInput,
  DEFAULT_MAX_DEVICES,
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types';
import { ORDER_ITEM_TYPE } from 'src/mkt-core/order/types/order-combo.types';

/**
 * EnqueueLicensesOnConfirmStep - Enqueue license jobs when order is confirmed
 *
 * Replaces synchronous CreateLicensesOnConfirmStep with async job enqueueing.
 *
 * This step is triggered ONLY when:
 * - Action is CONFIRM_ORDER
 * - Order was NOT previously TRIAL (trial already has licenses)
 *
 * Flow:
 * - If item has trial licenses (item.licenses?.length > 0) → enqueueUpgrade()
 * - Else → enqueueCreation({ action: 'CREATE_OFFICIAL', ... })
 *
 * Compensate:
 * - Reset licenseStatus = NOT_APPLICABLE on affected items
 * - Orphaned BullMQ jobs handled by idempotency checks in processors
 */
@Injectable()
export class EnqueueLicensesOnConfirmStep extends SagaStep<
  ConfirmOrderInput,
  EnqueueResult[]
> {
  readonly name = 'enqueue_licenses_on_confirm';
  readonly description =
    'Enqueue license creation/upgrade jobs when order is confirmed';

  private readonly logger = new Logger(EnqueueLicensesOnConfirmStep.name);

  constructor(
    private readonly mktLicenseQueueService: MktLicenseQueueService,
    private readonly orderItemRepository: MktOrderItemRepository,
    private readonly customerRepository: MktCustomerRepository,
  ) {
    super();
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Skip this step if:
   * - Action is NOT CONFIRM_ORDER
   * - Order is TRIAL (trial creates license immediately in CreateOrderSaga)
   */
  shouldSkip(context: SagaContext, input: ConfirmOrderInput): boolean {
    const typedContext = context as ConfirmOrderSagaContext;

    if (input.action !== ORDER_ACTION.CONFIRM_ORDER) {
      this.logger.debug(
        `Skipping: Action "${input.action}" does not trigger license enqueue`,
      );

      return true;
    }

    if (typedContext.previousStatus === ORDER_STATUS.TRIAL) {
      this.logger.debug('Skipping: Trial orders already have licenses');

      return true;
    }

    this.logger.debug(
      'Proceeding with license job enqueueing for CONFIRM_ORDER action',
    );

    return false;
  }

  async execute(
    context: SagaContext,
    _input: ConfirmOrderInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<EnqueueResult[]>> {
    const typedContext = context as ConfirmOrderSagaContext;

    try {
      const order = typedContext.currentOrder;

      if (!order) {
        return {
          success: false,
          error: new Error('Order not found in context'),
        };
      }

      const orderItems = order.orderItems ?? [];
      const licensableItems = orderItems.filter((item) =>
        this.isLicensableItem(item),
      );

      if (licensableItems.length === 0) {
        this.logger.log(
          'No licensable order items found (no DIGITAL_EXTERNAL items with packageId)',
        );

        return { success: true, data: [] };
      }

      this.logger.log(
        `Enqueuing license jobs for ${licensableItems.length} DIGITAL_EXTERNAL items`,
      );

      // Get customer email for CREATE_OFFICIAL jobs
      const customerEmail = await this.getCustomerEmail(
        order.mktCustomerId ?? '',
      );

      const results: EnqueueResult[] = [];
      const affectedItemIds: string[] = [];

      for (const item of licensableItems) {
        affectedItemIds.push(item.id);

        const hasTrialLicenses = (item.licenses?.length ?? 0) > 0;

        if (hasTrialLicenses) {
          // Upgrade existing trial license to official
          const trialLicenseId = item.licenses?.[0]?.id;

          if (!trialLicenseId) {
            this.logger.warn(
              `Item ${item.id} has licenses array but no valid ID, skipping`,
            );
            continue;
          }

          const result = await this.mktLicenseQueueService.enqueueUpgrade({
            workspaceId: context.workspaceId,
            orderId: order.id,
            orderItemId: item.id,
            licenseId: trialLicenseId,
            productPackageId: item.externalMktPackageId ?? '',
            maxDevices: item.maxDevices ?? DEFAULT_MAX_DEVICES,
            reason: 'Payment confirmed - upgrading trial to official license',
          });

          results.push(result);
        } else {
          // Create new official license
          const result = await this.mktLicenseQueueService.enqueueCreation({
            workspaceId: context.workspaceId,
            orderId: order.id,
            orderItemId: item.id,
            action: LICENSE_JOB_ACTIONS.CREATE_OFFICIAL,
            customerId: order.mktCustomerId ?? '',
            customerEmail,
            productId: item.externalMktProductId ?? '',
            productPackageId: item.externalMktPackageId ?? undefined,
            maxDevices: item.maxDevices ?? DEFAULT_MAX_DEVICES,
            deviceIndex: 1,
          });

          results.push(result);
        }
      }

      // Batch update licenseStatus to PENDING
      if (affectedItemIds.length > 0) {
        await this.orderItemRepository.updateManyOrderItems(affectedItemIds, {
          licenseStatus: LICENSE_ITEM_STATUS.PENDING,
        });
      }

      // Store in typed context
      typedContext.enqueuedLicenseJobIds = results.map((r) => r.jobId);
      typedContext.enqueuedLicenseCorrelationIds = results.map(
        (r) => r.correlationId,
      );

      this.logger.log(
        `Order ${order.id}: Enqueued ${results.length} license jobs`,
      );

      return { success: true, data: results };
    } catch (error) {
      this.logger.error('Failed to enqueue licenses on confirm', error);

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Compensate: Reset licenseStatus to NOT_APPLICABLE on affected items.
   * Orphaned BullMQ jobs are handled by idempotency checks in processors.
   */
  async compensate(
    context: SagaContext,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    const typedContext = context as ConfirmOrderSagaContext;
    const order = typedContext.currentOrder;

    if (!order) {
      this.logger.debug('No order in context to compensate');

      return;
    }

    const orderItems = order.orderItems ?? [];
    const pendingItems = orderItems.filter(
      (item) => item.licenseStatus === LICENSE_ITEM_STATUS.PENDING,
    );

    if (pendingItems.length === 0) {
      this.logger.debug('No PENDING items to compensate');

      return;
    }

    const itemIds = pendingItems.map((item) => item.id);

    this.logger.warn(
      `Resetting licenseStatus to NOT_APPLICABLE for ${itemIds.length} items`,
    );

    try {
      await this.orderItemRepository.updateManyOrderItems(itemIds, {
        licenseStatus: LICENSE_ITEM_STATUS.NOT_APPLICABLE,
      });

      this.logger.log('License enqueue compensation completed');
    } catch (error) {
      this.logger.error('Failed to compensate license enqueue step', error);
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Check if an order item should have a license created.
   * Only DIGITAL_EXTERNAL items with packageId and productId are licensable.
   */
  private isLicensableItem(item: MktOrderItemWorkspaceEntity): boolean {
    if (item.itemType && item.itemType !== ORDER_ITEM_TYPE.DIGITAL_EXTERNAL) {
      return false;
    }

    if (!item.externalMktPackageId) {
      return false;
    }

    if (!item.externalMktProductId) {
      return false;
    }

    return true;
  }

  /**
   * Get customer email for license creation via MKT Server.
   */
  private async getCustomerEmail(customerId: string): Promise<string> {
    if (!customerId) {
      throw new Error(
        'No customerId provided. Cannot determine email for license creation.',
      );
    }

    const customer = await this.customerRepository.findByIdOrNull(customerId);

    if (!customer) {
      throw new Error(
        `Customer "${customerId}" not found. Cannot determine email for license creation.`,
      );
    }

    return this.customerRepository.extractMktServerEmail(
      customer.linkedAccounts as LinkedAccount[] | null,
      customerId,
    );
  }
}
