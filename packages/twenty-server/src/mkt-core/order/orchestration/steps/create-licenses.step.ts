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
import { CreateOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
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
import {
  MktLicenseSnapshot,
  OrderItemLicense,
} from 'src/mkt-core/order/types/mkt-product-proxy.types';
import { ORDER_ITEM_TYPE } from 'src/mkt-core/order/types/order-combo.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

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
   * - isDraft: Always skip (draft orders don't create licenses)
   * - NEW_ORDER: Skip (license created on confirm)
   * - TRIAL_TO_PAID: Do NOT skip (create trial license)
   */
  shouldSkip(_context: SagaContext, input: CreateOrderWithItemsInput): boolean {
    // Draft mode: Always skip license creation
    if (input.isDraft) {
      this.logger.debug('Skipping: Draft order - no license creation');

      return true;
    }

    // Check if we have any licensable items (external products with packages OR combos with digital items)
    const hasExternalProductsWithPackages =
      input.externalProducts?.some((p) => p.packageId) ?? false;

    // Combos may contain DIGITAL_EXTERNAL items - we'll filter in execute()
    const hasCombos = (input.combos?.length ?? 0) > 0;

    if (!hasExternalProductsWithPackages && !hasCombos) {
      this.logger.debug(
        'Skipping: No external products with packages and no combos',
      );

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
      const order = await this.orderRepository.findByIdWithOptions(
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

      // Filter items that can have licenses:
      // - itemType must be DIGITAL_EXTERNAL (only digital items need licenses)
      // - must have externalMktPackageId (licenses are package-based)
      const licensableItems = orderItems.filter((item) =>
        this.isLicensableItem(item),
      );

      if (licensableItems.length === 0) {
        this.logger.log(
          'No licensable order items found (no DIGITAL_EXTERNAL items with packageId)',
        );

        return { success: true, data: { licenses: [] } };
      }

      this.logger.log(
        `Creating trial licenses for ${licensableItems.length} DIGITAL_EXTERNAL items (action: ${input.action})`,
      );

      // Get trial duration
      // TRIAL_TO_PAID uses 1 day default, other actions use 30 days default
      const trialDays =
        input.trialDurationDays ??
        ORDER_TRIAL_CONFIG.TRIAL_TO_PAID_DEFAULT_DAYS;

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

      // Cast to typed context
      const typedContext = context as CreateOrderSagaContext;

      // Store in typed context for subsequent steps
      typedContext.licenses = createdLicenses;
      typedContext.rollbackLicenses = licenseIds;

      // Also store in base context for backward compatibility
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
    // Use typed context for rollback data
    const typedContext = context as CreateOrderSagaContext;
    const licenseIds = typedContext.rollbackLicenses;

    if (!licenseIds?.length) {
      this.logger.debug('No licenses to compensate');

      return;
    }

    this.logger.warn(`Revoking ${licenseIds.length} trial licenses`);

    for (const licenseId of licenseIds) {
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
   * Check if an order item should have a license created
   *
   * Only DIGITAL_EXTERNAL items with a packageId are licensable
   * - SERVICE, CUSTOM, INTERNAL_PRODUCT, INTERNAL_VARIANT items do NOT need licenses
   */
  private isLicensableItem(item: MktOrderItemWorkspaceEntity): boolean {
    // Check itemType - only DIGITAL_EXTERNAL items need licenses
    // If itemType is not set, fall back to checking externalMktPackageId (backwards compatibility)
    if (item.itemType && item.itemType !== ORDER_ITEM_TYPE.DIGITAL_EXTERNAL) {
      return false;
    }

    // Must have packageId - licenses are package-based
    if (!item.externalMktPackageId) {
      return false;
    }

    return true;
  }

  /**
   * Create trial license for a single order item
   *
   * Uses createOrReuseTrial to check for existing trial first (1 user = 1 trial per product)
   * Supports multiple licenses per item (based on maxDevices)
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
        `Creating trial license for item ${item.id}, product ${productId}, maxDevices ${maxDevices}`,
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

      // Build OrderItemLicense for the new licenses array
      const orderItemLicense: OrderItemLicense = {
        id: license.id,
        licenseKey: license.licenseKey,
        snapshot,
        deviceIndex: 1, // First device
        createdAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      };

      // Get existing licenses or start fresh
      const existingLicenses = item.licenses ?? [];
      const updatedLicenses = [...existingLicenses, orderItemLicense];

      // Update order item with license info
      await this.orderItemRepository.updateOrderItem(item.id, {
        licenses: updatedLicenses,
      });

      this.logger.log(
        `${result.reused ? 'Reused' : 'Created'} trial license ${license.id} for item ${item.id} (total: ${updatedLicenses.length})`,
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
