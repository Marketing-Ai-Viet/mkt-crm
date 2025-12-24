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
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/orchestration/saga';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories';
import { ConfirmOrderInput } from 'src/mkt-core/order/types';
import { MktLicenseSnapshot } from 'src/mkt-core/order/types/mkt-product-proxy.types';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_MAX_DEVICES = 1;

// ============================================
// TYPES
// ============================================

type CreatedLicenseInfo = {
  id: string;
  licenseKey: string;
  orderItemId: string;
};

/**
 * CreateLicensesOnConfirmStep - Create licenses when accounting confirms payment
 *
 * This step is triggered ONLY when:
 * - Action is ACCOUNTING_CONFIRMED
 * - Order has items with externalMktPackageId but no license yet
 *
 * Flow:
 * - NEW_ORDER: Created with PENDING_PAYMENT status, no license
 * - ACCOUNTING_CONFIRMED: This step creates licenses
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
   * - Action is NOT ACCOUNTING_CONFIRMED
   * - Order is TRIAL (trial creates license immediately in CreateOrderSaga)
   */
  shouldSkip(context: SagaContext, input: ConfirmOrderInput): boolean {
    const typedContext = context as ConfirmOrderSagaContext;

    // Only create licenses when accounting confirms
    if (input.action !== ORDER_ACTION.ACCOUNTING_CONFIRMED) {
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

      // Get order items that need licenses
      const orderItems = order.orderItems ?? [];
      const itemsNeedingLicenses = orderItems.filter(
        (item) =>
          item.externalMktPackageId &&
          item.externalMktProductId &&
          !item.externalMktLicenseId,
      );

      if (itemsNeedingLicenses.length === 0) {
        this.logger.log('No order items need licenses');

        return { success: true, data: [] };
      }

      this.logger.log(
        `Creating licenses for ${itemsNeedingLicenses.length} order items`,
      );

      // Get customer email for license creation
      const customerEmail = await this.getCustomerEmail(
        context.workspaceId,
        order.mktCustomerId ?? '',
      );

      // Create licenses for each item
      const createdLicenses: CreatedLicenseInfo[] = [];
      const licenseIds: string[] = [];

      for (const item of itemsNeedingLicenses) {
        const result = await this.createLicenseForItem(
          context.workspaceId,
          item,
          customerEmail,
        );

        if (result) {
          createdLicenses.push(result);
          licenseIds.push(result.id);
        }
      }

      // Store rollback data
      context.rollbackData.set(this.name, { licenseIds });

      this.logger.log(
        `Created ${createdLicenses.length} licenses for order: ${order.id}`,
      );

      return { success: true, data: createdLicenses };
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
      licenseIds: string[];
    } | null;

    if (!data?.licenseIds?.length) {
      this.logger.warn('No licenses to compensate');

      return;
    }

    this.logger.warn(`Revoking ${data.licenseIds.length} licenses`);

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
   * Get customer email for license creation
   */
  private async getCustomerEmail(
    workspaceId: string,
    customerId: string,
  ): Promise<string> {
    if (!customerId) {
      return '';
    }

    const customer = await this.customerRepository.findByIdOrNull(
      customerId,
      workspaceId,
    );

    const email = this.customerRepository.extractMktServerEmail(
      customer?.linkedAccounts as LinkedAccount[] | null,
      customer?.email ?? null,
    );

    this.logger.debug(
      `Customer ${customerId}: using email "${email}" for license creation`,
    );

    return email;
  }

  /**
   * Create license for a single order item
   */
  private async createLicenseForItem(
    workspaceId: string,
    item: MktOrderItemWorkspaceEntity,
    email: string,
  ): Promise<CreatedLicenseInfo | null> {
    try {
      // Create license on MKT Server
      const license = await this.mktLicenseProxy.create({
        productPackageId: item.externalMktPackageId ?? '',
        productId: item.externalMktProductId ?? '',
        email,
        maxDevices: DEFAULT_MAX_DEVICES,
      });

      // Create snapshot
      const snapshot: MktLicenseSnapshot =
        this.mktProductProxy.createLicenseSnapshot(license);

      // Update order item with license info
      await this.orderItemRepository.update(workspaceId, item.id, {
        externalMktLicenseId: license.id,
        externalMktLicenseKey: license.licenseKey,
        licenseSnapshot: snapshot,
      });

      this.logger.debug(
        `Created license ${license.id} for order item ${item.id}`,
      );

      return {
        id: license.id,
        licenseKey: license.licenseKey,
        orderItemId: item.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create license for order item ${item.id}`,
        error,
      );

      throw error;
    }
  }
}
