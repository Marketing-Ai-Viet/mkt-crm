import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';
import {
  IS_CREATE_TRIAL_ON_ORDER_ACTION,
  IS_SKIP_LICENSE_ON_ORDER_ACTION,
} from 'src/mkt-core/order/constants/order-status.constants';
import { ORDER_TRIAL_CONFIG } from 'src/mkt-core/order/constants/order-service.constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import {
  MktOrderItemRepository,
  MktOrderRepository,
} from 'src/mkt-core/order/repositories';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types/order-saga.interface';
import {
  CreateLicensesStepOutput,
  CreateOrderWithItemsInput,
  DEFAULT_MAX_DEVICES,
  CreatedLicenseInfo,
} from 'src/mkt-core/order/types';
import { MktLicenseSnapshot } from 'src/mkt-core/order/types/mkt-product-proxy.types';

/**
 * CreateLicensesStep - Step 5: Create licenses for order items
 *
 * LICENSE FLOW:
 *
 * 1. NEW_ORDER:
 *    - SKIP: Không tạo license khi tạo order
 *    - License được tạo MỚI trong CreateLicensesOnConfirmStep khi payment confirmed
 *
 * 2. TRIAL_TO_PAID:
 *    - CREATE: Tạo TRIAL license ngay khi tạo order
 *    - Upgrade trial → official trong CreateLicensesOnConfirmStep khi payment confirmed
 *
 * Compensate:
 * - Revoke licenses on MKT Server (if any were created)
 */
@Injectable()
export class CreateLicensesStep extends SagaStep<
  CreateOrderWithItemsInput,
  CreateLicensesStepOutput
> {
  readonly name = 'create_licenses';
  readonly description = 'Create trial licenses for TRIAL_TO_PAID orders';

  private readonly logger = new Logger(CreateLicensesStep.name);

  constructor(
    private readonly mktLicenseProxy: MktLicenseProxyService,
    private readonly mktProductProxy: MktProductProxyService,
    private readonly orderRepository: MktOrderRepository,
    private readonly orderItemRepository: MktOrderItemRepository,
  ) {
    super();
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Determine if this step should be skipped
   *
   * - NEW_ORDER: Skip (license created on confirm)
   * - TRIAL_TO_PAID: Do NOT skip (create trial license)
   */
  shouldSkip(_context: SagaContext, input: CreateOrderWithItemsInput): boolean {
    // Skip if no external products
    if (!input.externalProducts || input.externalProducts.length === 0) {
      this.logger.debug('Skipping: No external products');

      return true;
    }

    // Skip if no packages
    const hasPackages = input.externalProducts.some((p) => p.packageId);

    if (!hasPackages) {
      this.logger.debug('Skipping: No packages in external products');

      return true;
    }

    // NEW_ORDER: Skip - license created on confirm
    if (input.action && IS_SKIP_LICENSE_ON_ORDER_ACTION(input.action)) {
      this.logger.debug(
        `Skipping: Action "${input.action}" - license created on payment confirm`,
      );

      return true;
    }

    // TRIAL_TO_PAID: Do NOT skip - create trial license
    if (input.action && IS_CREATE_TRIAL_ON_ORDER_ACTION(input.action)) {
      this.logger.debug(
        `Proceeding: Action "${input.action}" - creating trial license`,
      );

      return false;
    }

    // Unknown action - skip by default
    this.logger.debug(
      `Skipping: Unknown action "${input.action ?? 'undefined'}"`,
    );

    return true;
  }

  /**
   * Execute: Create trial licenses for TRIAL_TO_PAID orders
   */
  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateLicensesStepOutput>> {
    try {
      // Validate context
      if (!context.orderId) {
        return {
          success: false,
          error: new Error('Order ID is required from previous step'),
        };
      }

      // Get order with items from repository
      const order = await this.orderRepository.findById(
        context.workspaceId,
        context.orderId,
        { relations: { orderItems: true } },
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

        return { success: true, data: { licenses: [] } };
      }

      // Filter items that can have licenses (have productId)
      const licensableItems = orderItems.filter(
        (item) => item.externalMktProductId,
      );

      if (licensableItems.length === 0) {
        this.logger.log('No licensable order items found');

        return { success: true, data: { licenses: [] } };
      }

      this.logger.log(
        `Creating trial licenses for ${licensableItems.length} items (action: ${input.action})`,
      );

      // Get trial duration
      const trialDays =
        input.trialDurationDays ??
        ORDER_TRIAL_CONFIG.DEFAULT_TRIAL_DURATION_DAYS;

      // Create trial licenses for each item
      const createdLicenses: CreatedLicenseInfo[] = [];
      const licenseIds: string[] = [];

      for (const item of licensableItems) {
        const license = await this.createTrialLicenseForItem(
          context.workspaceId,
          input.customerId,
          item,
          trialDays,
        );

        if (license) {
          createdLicenses.push(license);
          licenseIds.push(license.id);
        }
      }

      // Store rollback data
      context.rollbackData.set(this.name, { licenseIds });

      // Update context for next steps
      context.licenseIds = licenseIds;

      this.logger.log(
        `Created ${createdLicenses.length} trial licenses for order ${context.orderId}`,
      );

      return {
        success: true,
        data: { licenses: createdLicenses },
      };
    } catch (error) {
      this.logger.error('Failed to create trial licenses', error);

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Compensate by revoking any licenses that were created.
   */
  async compensate(
    context: SagaContext,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    const data = context.rollbackData.get(this.name) as {
      licenseIds: string[];
    } | null;

    if (!data?.licenseIds?.length) {
      this.logger.debug('No licenses to compensate');

      return;
    }

    this.logger.warn(`Revoking ${data.licenseIds.length} trial licenses`);

    for (const licenseId of data.licenseIds) {
      try {
        await this.mktLicenseProxy.revoke(licenseId);
        this.logger.debug(`Revoked license ${licenseId}`);
      } catch (error) {
        this.logger.error(`Failed to revoke license ${licenseId}`, error);
      }
    }

    this.logger.log('License compensation completed');
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Create trial license for a single order item
   *
   * Uses createOrReuseTrial to check for existing trial first (1 user = 1 trial per product)
   */
  private async createTrialLicenseForItem(
    workspaceId: string,
    customerId: string,
    item: MktOrderItemWorkspaceEntity,
    trialDays: number,
  ): Promise<CreatedLicenseInfo | null> {
    const productId = item.externalMktProductId;

    if (!productId) {
      this.logger.warn(`Order item ${item.id} has no productId, skipping`);

      return null;
    }

    try {
      const maxDevices = item.maxDevices ?? DEFAULT_MAX_DEVICES;

      this.logger.debug(
        `Creating trial license for item ${item.id}, product ${productId}`,
      );

      // Create or reuse trial license (1 user = 1 trial per product)
      const result = await this.mktLicenseProxy.createOrReuseTrial({
        productId,
        customerId,
        workspaceId,
        trialDays,
        maxDevices,
      });

      const license = result.license;

      // Create snapshot
      const snapshot: MktLicenseSnapshot =
        this.mktProductProxy.createLicenseSnapshot(license);

      // Update order item with license info
      await this.orderItemRepository.update(workspaceId, item.id, {
        externalMktLicenseId: license.id,
        externalMktLicenseKey: license.licenseKey,
        licenseSnapshot: snapshot,
      });

      this.logger.log(
        `${result.reused ? 'Reused' : 'Created'} trial license ${license.id} for item ${item.id}`,
      );

      return {
        id: license.id,
        licenseKey: license.licenseKey,
        orderItemId: item.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create trial license for item ${item.id}`,
        error,
      );
      throw error;
    }
  }
}
