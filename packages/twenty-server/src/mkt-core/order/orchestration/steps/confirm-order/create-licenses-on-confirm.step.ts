import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { LinkedAccount } from 'src/mkt-core/customer/types/linked-account.types';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { ConfirmOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories';
import {
  ConfirmOrderInput,
  CreatedLicenseInfo,
  DEFAULT_MAX_DEVICES,
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types';
import {
  MktLicenseSnapshot,
  OrderItemLicense,
} from 'src/mkt-core/order/types/mkt-product-proxy.types';
import { ORDER_ITEM_TYPE } from 'src/mkt-core/order/types/order-combo.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * CreateLicensesOnConfirmStep - Create licenses when order is confirmed
 *
 * This step is triggered ONLY when:
 * - Action is CONFIRM_ORDER
 * - Order has items with externalMktPackageId but no license yet
 *
 * Flow:
 * - NEW_ORDER: Created with DRAFT status, no license
 * - CONFIRM_ORDER: This step creates licenses with PENDING_PAYMENT status
 *
 * Compensate:
 * - Revoke created licenses on MKT Server
 */
@Injectable()
export class CreateLicensesOnConfirmStep extends SagaStep<
  ConfirmOrderInput,
  CreatedLicenseInfo[]
> {
  readonly name = 'create_licenses_on_confirm';
  readonly description =
    'Create licenses on MKT Server when accounting confirms';

  private readonly logger = new Logger(CreateLicensesOnConfirmStep.name);

  constructor(
    private readonly orderItemRepository: MktOrderItemRepository,
    private readonly mktLicenseProxy: MktLicenseProxyService,
    private readonly mktProductProxy: MktProductProxyService,
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
   *
   * Note: We don't check paymentStatus here because:
   * - UpdateStatusStep runs BEFORE this step
   * - The order in context is from ValidateOrderStep (before update)
   */
  shouldSkip(context: SagaContext, input: ConfirmOrderInput): boolean {
    const typedContext = context as ConfirmOrderSagaContext;

    // Only create licenses when order is confirmed
    if (input.action !== ORDER_ACTION.CONFIRM_ORDER) {
      this.logger.debug(
        `Skipping: Action "${input.action}" does not trigger license creation`,
      );

      return true;
    }

    // Skip for TRIAL orders (license already created)
    if (typedContext.previousStatus === ORDER_STATUS.TRIAL) {
      this.logger.debug('Skipping: Trial orders already have licenses');

      return true;
    }

    this.logger.debug(
      'Proceeding with license creation for CONFIRM_ORDER action',
    );

    return false;
  }

  async execute(
    context: SagaContext,
    _input: ConfirmOrderInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreatedLicenseInfo[]>> {
    const typedContext = context as ConfirmOrderSagaContext;

    try {
      const order = typedContext.currentOrder;

      if (!order) {
        return {
          success: false,
          error: new Error('Order not found in context'),
        };
      }

      // Get order items that can have licenses created
      // Only DIGITAL_EXTERNAL items with packageId are licensable
      // With unified flow, items may already have trial licenses that need to be replaced
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
        `Processing ${licensableItems.length} DIGITAL_EXTERNAL order items for official licenses`,
      );

      // Get customer email for license creation
      const customerEmail = await this.getCustomerEmail(
        order.mktCustomerId ?? '',
      );

      // Process licenses for each item
      // - If trial license exists → upgrade to official (atomic, keeps license key)
      // - If no license exists → create new official license
      const processedLicenses: CreatedLicenseInfo[] = [];
      const upgradedLicenseIds: string[] = [];
      const newLicenseIds: string[] = [];

      for (const item of licensableItems) {
        // Check if item has existing trial licenses to upgrade
        const hasTrialLicenses = (item.licenses?.length ?? 0) > 0;

        if (hasTrialLicenses) {
          // Upgrade existing trial license to official (atomic operation)
          const result = await this.upgradeTrialLicenseForItem(item);

          if (result) {
            processedLicenses.push(result);
            upgradedLicenseIds.push(result.id);
          }
        } else {
          // Create new official license (no trial exists)
          const result = await this.createOfficialLicenseForItem(
            item,
            customerEmail,
          );

          if (result) {
            processedLicenses.push(result);
            newLicenseIds.push(result.id);
          }
        }
      }

      // Store rollback data
      context.rollbackData.set(this.name, {
        upgradedLicenseIds,
        newLicenseIds,
      });

      this.logger.log(
        `Order ${order.id}: Upgraded ${upgradedLicenseIds.length} trial licenses, ` +
          `created ${newLicenseIds.length} new licenses`,
      );

      return { success: true, data: processedLicenses };
    } catch (error) {
      this.logger.error('Failed to create licenses on confirm', error);

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  async compensate(
    context: SagaContext,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    const data = context.rollbackData.get(this.name) as {
      upgradedLicenseIds?: string[];
      newLicenseIds?: string[];
    } | null;

    const upgradedCount = data?.upgradedLicenseIds?.length ?? 0;
    const newCount = data?.newLicenseIds?.length ?? 0;

    if (upgradedCount === 0 && newCount === 0) {
      this.logger.warn('No licenses to compensate');

      return;
    }

    // Revoke newly created licenses (can be undone)
    if (data?.newLicenseIds?.length) {
      this.logger.warn(`Revoking ${data.newLicenseIds.length} new licenses`);

      for (const licenseId of data.newLicenseIds) {
        try {
          await this.mktLicenseProxy.revoke(licenseId);
          this.logger.debug(`Revoked new license ${licenseId}`);
        } catch (error) {
          this.logger.error(`Failed to revoke license ${licenseId}`, error);
        }
      }
    }

    // Note: Upgraded licenses cannot be easily rolled back
    // The upgrade is atomic and the trial state is lost
    // Log a warning for manual intervention if needed
    if (upgradedCount > 0) {
      this.logger.warn(
        `${upgradedCount} upgraded licenses cannot be auto-reverted. ` +
          `Manual intervention may be required.`,
      );
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

    // Must have productId for license creation
    if (!item.externalMktProductId) {
      return false;
    }

    return true;
  }

  /**
   * Get customer email for license creation
   *
   * @throws Error if customer not found or no valid MKT_SERVER email
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

    // This will throw if no valid MKT_SERVER email found
    const email = this.customerRepository.extractMktServerEmail(
      customer.linkedAccounts as LinkedAccount[] | null,
      customerId,
    );

    this.logger.debug(
      `Customer ${customerId}: using email "${email}" for license creation`,
    );

    return email;
  }

  /**
   * Upgrade trial license to official license
   *
   * Uses MKT Server's atomic upgrade endpoint which:
   * - Validates trial license
   * - Converts to official with productPackageId
   * - Keeps the same license key (customer doesn't need new key)
   */
  private async upgradeTrialLicenseForItem(
    item: MktOrderItemWorkspaceEntity,
  ): Promise<CreatedLicenseInfo | null> {
    // Get trial license ID from the licenses array (first license for trial orders)
    const trialLicenseId = item.licenses?.[0]?.id;

    if (!trialLicenseId) {
      return null;
    }

    try {
      const maxDevices = item.maxDevices ?? DEFAULT_MAX_DEVICES;

      this.logger.debug(
        `Upgrading trial license ${trialLicenseId} for item ${item.id}`,
      );

      // Upgrade trial to official (atomic operation on MKT Server)
      const license = await this.mktLicenseProxy.upgradeTrial(trialLicenseId, {
        productPackageId: item.externalMktPackageId ?? '',
        maxDevices,
        reason: 'Payment confirmed - upgrading trial to official license',
      });

      // Create snapshot with updated license info
      const snapshot: MktLicenseSnapshot =
        this.mktProductProxy.createLicenseSnapshot(license);

      // Update licenses array - replace the trial license with upgraded snapshot
      const existingLicenses = item.licenses ?? [];
      const updatedLicenses = existingLicenses.map((lic) =>
        lic.id === trialLicenseId
          ? {
              ...lic,
              snapshot,
              createdAt: DateTimeUtils.toISO(DateTimeUtils.now()),
            }
          : lic,
      );

      // If not found in array (backward compat), add it
      if (!existingLicenses.some((lic) => lic.id === trialLicenseId)) {
        const orderItemLicense: OrderItemLicense = {
          id: license.id,
          licenseKey: license.licenseKey,
          snapshot,
          deviceIndex: 1,
          createdAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        };

        updatedLicenses.push(orderItemLicense);
      }

      // Update order item with upgraded license
      await this.orderItemRepository.update(item.id, {
        licenses: updatedLicenses,
      });

      this.logger.log(
        `Upgraded trial license ${license.id} to official for order item ${item.id}`,
      );

      return {
        id: license.id,
        licenseKey: license.licenseKey,
        orderItemId: item.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upgrade trial license ${trialLicenseId} for order item ${item.id}`,
        error,
      );

      throw error;
    }
  }

  /**
   * Create official license for a single order item (no trial exists)
   *
   * Official licenses are created with:
   * - productPackageId (required for duration/features)
   * - maxDevices from order item (can be > 1 for paid licenses)
   */
  private async createOfficialLicenseForItem(
    item: MktOrderItemWorkspaceEntity,
    email: string,
  ): Promise<CreatedLicenseInfo | null> {
    try {
      // Use maxDevices from orderItem, fallback to default
      const maxDevices = item.maxDevices ?? DEFAULT_MAX_DEVICES;

      this.logger.debug(
        `Creating official license for item ${item.id} with maxDevices=${maxDevices}`,
      );

      // Create official license on MKT Server (requires productPackageId)
      const license = await this.mktLicenseProxy.create({
        productPackageId: item.externalMktPackageId ?? '',
        productId: item.externalMktProductId ?? '',
        email,
        maxDevices,
      });

      // Create snapshot
      const snapshot: MktLicenseSnapshot =
        this.mktProductProxy.createLicenseSnapshot(license);

      // Build OrderItemLicense for the licenses array
      const orderItemLicense: OrderItemLicense = {
        id: license.id,
        licenseKey: license.licenseKey,
        snapshot,
        deviceIndex: 1,
        createdAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      };

      // Add to existing licenses array
      const existingLicenses = item.licenses ?? [];
      const updatedLicenses = [...existingLicenses, orderItemLicense];

      // Update order item with license info
      await this.orderItemRepository.update(item.id, {
        licenses: updatedLicenses,
      });

      this.logger.log(
        `Created official license ${license.id} for order item ${item.id} (total: ${updatedLicenses.length})`,
      );

      return {
        id: license.id,
        licenseKey: license.licenseKey,
        orderItemId: item.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create official license for order item ${item.id}`,
        error,
      );

      throw error;
    }
  }
}
