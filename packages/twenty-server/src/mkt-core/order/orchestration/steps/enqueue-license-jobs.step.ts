import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { LinkedAccount } from 'src/mkt-core/customer/types/linked-account.types';
import { MktLicenseQueueService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-queue.service';
import { LICENSE_JOB_ACTIONS } from 'src/mkt-core/mkt-license-integration/types/license-job.types';
import {
  IS_CREATE_TRIAL_ON_ORDER_ACTION,
  IS_SKIP_LICENSE_ON_ORDER_ACTION,
} from 'src/mkt-core/order/constants/order-status.constants';
import { ORDER_TRIAL_CONFIG } from 'src/mkt-core/order/constants/order-service.constants';
import { LICENSE_ITEM_STATUS } from 'src/mkt-core/order/constants/license-item-status.constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { CreateOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import {
  MktOrderItemRepository,
  MktOrderRepository,
} from 'src/mkt-core/order/repositories';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
  CreateOrderWithItemsInput,
  DEFAULT_MAX_DEVICES,
} from 'src/mkt-core/order/types';
import { ORDER_ITEM_TYPE } from 'src/mkt-core/order/types/order-combo.types';
import { BulkEnqueueResult } from 'src/mkt-core/mkt-license-integration/types/license-queue.types';

/**
 * EnqueueLicenseJobsStep - Step 5: Enqueue license creation jobs (async)
 *
 * Replaces synchronous CreateLicensesStep with async job enqueueing.
 *
 * LICENSE FLOW:
 *
 * 1. NEW_ORDER:
 *    - SKIP: Không enqueue job khi tạo order
 *    - Jobs được enqueue trong EnqueueLicensesOnConfirmStep khi payment confirmed
 *
 * 2. TRIAL_TO_PAID:
 *    - ENQUEUE: Enqueue CREATE_TRIAL job ngay khi tạo order
 *    - Upgrade trial → official trong EnqueueLicensesOnConfirmStep khi confirmed
 *
 * Compensate:
 * - Reset licenseStatus = NOT_APPLICABLE on affected items
 * - Orphaned BullMQ jobs handled by idempotency checks in processors
 */
@Injectable()
export class EnqueueLicenseJobsStep extends SagaStep<
  CreateOrderWithItemsInput,
  BulkEnqueueResult
> {
  readonly name = 'enqueue_license_jobs';
  readonly description =
    'Enqueue trial license creation jobs for TRIAL_TO_PAID orders';

  private readonly logger = new Logger(EnqueueLicenseJobsStep.name);

  constructor(
    private readonly mktLicenseQueueService: MktLicenseQueueService,
    private readonly orderRepository: MktOrderRepository,
    private readonly orderItemRepository: MktOrderItemRepository,
    private readonly customerRepository: MktCustomerRepository,
  ) {
    super();
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Determine if this step should be skipped
   *
   * Same logic as CreateLicensesStep:
   * - isDraft: Always skip
   * - NEW_ORDER: Skip (license enqueued on confirm)
   * - TRIAL_TO_PAID: Do NOT skip (enqueue trial creation)
   */
  shouldSkip(_context: SagaContext, input: CreateOrderWithItemsInput): boolean {
    if (input.isDraft) {
      this.logger.debug('Skipping: Draft order - no license enqueue');

      return true;
    }

    const hasExternalProductsWithPackages =
      input.externalProducts?.some((p) => p.packageId) ?? false;
    const hasCombos = (input.combos?.length ?? 0) > 0;

    if (!hasExternalProductsWithPackages && !hasCombos) {
      this.logger.debug(
        'Skipping: No external products with packages and no combos',
      );

      return true;
    }

    if (input.action && IS_SKIP_LICENSE_ON_ORDER_ACTION(input.action)) {
      this.logger.debug(
        `Skipping: Action "${input.action}" - license enqueued on confirm`,
      );

      return true;
    }

    if (input.action && IS_CREATE_TRIAL_ON_ORDER_ACTION(input.action)) {
      this.logger.debug(
        `Proceeding: Action "${input.action}" - enqueuing trial license jobs`,
      );

      return false;
    }

    this.logger.debug(
      `Skipping: Unknown action "${input.action ?? 'undefined'}"`,
    );

    return true;
  }

  /**
   * Execute: Enqueue trial license creation jobs for TRIAL_TO_PAID orders
   */
  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<BulkEnqueueResult>> {
    try {
      if (!context.orderId) {
        return {
          success: false,
          error: new Error('Order ID is required from previous step'),
        };
      }

      const order = await this.orderRepository.findByIdWithOptions(
        context.orderId,
        { relations: { orderItems: true } },
        context.workspaceId,
      );

      if (!order) {
        return {
          success: false,
          error: new Error(`Order ${context.orderId} not found`),
        };
      }

      const orderItems = order.orderItems ?? [];

      if (orderItems.length === 0) {
        this.logger.warn('No order items found');

        return {
          success: true,
          data: { jobIds: [], correlationIds: [], count: 0 },
        };
      }

      const licensableItems = orderItems.filter((item) =>
        this.isLicensableItem(item),
      );

      if (licensableItems.length === 0) {
        this.logger.log(
          'No licensable order items found (no DIGITAL_EXTERNAL items with packageId)',
        );

        return {
          success: true,
          data: { jobIds: [], correlationIds: [], count: 0 },
        };
      }

      // Get customer email for license creation
      const customerEmail = await this.getCustomerEmail(input.customerId);

      const trialDays =
        input.trialDurationDays ??
        ORDER_TRIAL_CONFIG.TRIAL_TO_PAID_DEFAULT_DAYS;

      this.logger.log(
        `Enqueuing trial license jobs for ${licensableItems.length} DIGITAL_EXTERNAL items (action: ${input.action})`,
      );

      // Update licenseStatus to PENDING and enqueue jobs
      const affectedItemIds: string[] = [];

      const enqueueParams = licensableItems.map((item) => {
        affectedItemIds.push(item.id);

        return {
          workspaceId: context.workspaceId,
          orderId: context.orderId as string,
          orderItemId: item.id,
          action: LICENSE_JOB_ACTIONS.CREATE_TRIAL,
          customerId: input.customerId,
          customerEmail,
          productId: item.externalMktProductId ?? '',
          productPackageId: item.externalMktPackageId ?? undefined,
          trialDays,
          maxDevices: item.maxDevices ?? DEFAULT_MAX_DEVICES,
          deviceIndex: 1,
        };
      });

      // Batch update licenseStatus to PENDING
      await this.orderItemRepository.updateManyOrderItems(affectedItemIds, {
        licenseStatus: LICENSE_ITEM_STATUS.PENDING,
      });

      // Enqueue all jobs
      const bulkResult =
        await this.mktLicenseQueueService.enqueueBulkCreation(enqueueParams);

      // Store in typed context
      const typedContext = context as CreateOrderSagaContext;

      typedContext.enqueuedJobIds = bulkResult.jobIds;
      typedContext.enqueuedCorrelationIds = bulkResult.correlationIds;

      this.logger.log(
        `Enqueued ${bulkResult.count} trial license jobs for order ${context.orderId}`,
      );

      return { success: true, data: bulkResult };
    } catch (error) {
      this.logger.error('Failed to enqueue trial license jobs', error);

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
    if (!context.orderId) {
      this.logger.debug('No orderId to compensate');

      return;
    }

    try {
      const order = await this.orderRepository.findByIdWithOptions(
        context.orderId,
        { relations: { orderItems: true } },
        context.workspaceId,
      );

      const licensableItems = (order?.orderItems ?? []).filter(
        (item) => item.licenseStatus === LICENSE_ITEM_STATUS.PENDING,
      );

      if (licensableItems.length === 0) {
        this.logger.debug('No items to compensate');

        return;
      }

      const itemIds = licensableItems.map((item) => item.id);

      this.logger.warn(
        `Resetting licenseStatus to NOT_APPLICABLE for ${itemIds.length} items`,
      );

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
   * Only DIGITAL_EXTERNAL items with a packageId are licensable.
   */
  private isLicensableItem(item: MktOrderItemWorkspaceEntity): boolean {
    if (item.itemType && item.itemType !== ORDER_ITEM_TYPE.DIGITAL_EXTERNAL) {
      return false;
    }

    if (!item.externalMktPackageId) {
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
