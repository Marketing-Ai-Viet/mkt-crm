import { Injectable, Logger } from '@nestjs/common';

import { In, QueryRunner } from 'typeorm';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { LinkedAccount } from 'src/mkt-core/customer/types/linked-account.types';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';
import { IS_IMMEDIATE_LICENSE_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types/order-saga.interface';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories';
import {
  CreatedLicenseInfo,
  CreateLicensesStepOutput,
  CreateOrderWithItemsInput,
  DEFAULT_MAX_DEVICES,
  DEFAULT_SPLIT_LICENSES,
  ExternalMktProductInput,
  ItemLicenseResult,
  LicenseConfig,
} from 'src/mkt-core/order/types';

/**
 * CreateLicensesStep - Step 3: Create licenses for order items
 *
 * This step creates licenses on MKT Server for order items that have
 * external packages. The license information is then embedded into
 * the order item (no separate license entity in CRM).
 *
 * Workflow:
 * 1. For each order item with externalMktPackageId
 * 2. Create license on MKT Server via MktLicenseProxyService
 * 3. Create license snapshot using MktSnapshotService
 * 4. Update order item with license info
 *
 * Compensate:
 * - Revoke licenses on MKT Server
 */
@Injectable()
export class CreateLicensesStep extends SagaStep<
  CreateOrderWithItemsInput,
  CreateLicensesStepOutput
> {
  readonly name = 'create_licenses';
  readonly description = 'Create licenses on MKT Server for order items';

  private readonly logger = new Logger(CreateLicensesStep.name);

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
   * Skip license creation based on action type
   *
   * License creation rules:
   * - TRIAL: License được tạo ngay khi tạo đơn
   * - NEW_ORDER, LICENSE_RENEWING, TRIAL_TO_PAID, CHANGE_VARIANT:
   *   License được tạo sau khi ACCOUNTING_CONFIRMED (trong ConfirmOrderSaga)
   *
   * Skip if:
   * - No external products/packages
   * - Action is NOT immediate license action (only TRIAL creates immediately)
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

    // Skip if action is NOT immediate (only TRIAL creates license immediately)
    // Other actions wait for accounting confirmation
    if (input.action && !IS_IMMEDIATE_LICENSE_ACTION(input.action)) {
      this.logger.debug(
        `Skipping: Action "${input.action}" requires accounting confirmation before license creation`,
      );

      return true;
    }

    return false;
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateLicensesStepOutput>> {
    try {
      if (!context.orderItemIds || context.orderItemIds.length === 0) {
        this.logger.warn('No order items to create licenses for');

        return { success: true, data: { licenses: [] } };
      }

      this.logger.log(
        `Creating licenses for ${context.orderItemIds.length} order items`,
      );

      // Get customer email for license creation
      const customerEmail = await this.getCustomerEmail(context, input);

      // Get order items
      const orderItems = await this.orderItemRepository.findMany(
        context.workspaceId,
        { id: In(context.orderItemIds) },
      );

      // Process all order items
      const { createdLicenses, licenseIds } = await this.processOrderItems(
        context,
        input,
        orderItems,
        customerEmail,
      );

      // Store rollback data
      this.storeRollbackData(context, licenseIds);

      this.logger.log(
        `Created ${createdLicenses.length} licenses successfully`,
      );

      return { success: true, data: { licenses: createdLicenses } };
    } catch (error) {
      this.logger.error('Failed to create licenses', error);

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
  // PRIVATE METHODS - Customer
  // ============================================

  /**
   * Get customer email for license creation
   * Priority: MKT_SERVER linkedAccount > customer.email
   */
  private async getCustomerEmail(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
  ): Promise<string> {
    const customerId =
      input.customerId ?? (context.metadata.get('customerId') as string) ?? '';

    if (!customerId) {
      return '';
    }

    const customer = await this.customerRepository.findByIdOrNull(
      customerId,
      context.workspaceId,
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

  // ============================================
  // PRIVATE METHODS - License Configuration
  // ============================================

  /**
   * Get license configuration from external product input
   */
  private getLicenseConfig(
    externalProducts: ExternalMktProductInput[] | undefined,
    productId: string,
    packageId: string,
  ): LicenseConfig {
    const externalProduct = externalProducts?.find(
      (p) => p.productId === productId && p.packageId === packageId,
    );

    const maxDevices = externalProduct?.maxDevices ?? DEFAULT_MAX_DEVICES;
    const splitLicenses =
      externalProduct?.splitLicenses ?? DEFAULT_SPLIT_LICENSES;

    return {
      licenseCount: splitLicenses ? maxDevices : 1,
      devicesPerLicense: splitLicenses ? DEFAULT_MAX_DEVICES : maxDevices,
    };
  }

  // ============================================
  // PRIVATE METHODS - License Creation
  // ============================================

  /**
   * Process all order items and create licenses
   */
  private async processOrderItems(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    orderItems: MktOrderItemWorkspaceEntity[],
    customerEmail: string,
  ): Promise<{
    createdLicenses: CreatedLicenseInfo[];
    licenseIds: string[];
  }> {
    const createdLicenses: CreatedLicenseInfo[] = [];
    const licenseIds: string[] = [];

    for (const item of orderItems) {
      if (!this.isLicensableItem(item)) {
        this.logger.debug(
          `Skipping item ${item.id} - no external package/product`,
        );
        continue;
      }

      const result = await this.createLicensesForItem(
        context,
        input,
        item,
        customerEmail,
      );

      createdLicenses.push(...result.createdLicenses);
      licenseIds.push(...result.licenseIds);
    }

    return { createdLicenses, licenseIds };
  }

  /**
   * Check if order item can have license created
   */
  private isLicensableItem(item: MktOrderItemWorkspaceEntity): boolean {
    return Boolean(item.externalMktPackageId && item.externalMktProductId);
  }

  /**
   * Create licenses for a single order item
   */
  private async createLicensesForItem(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    item: MktOrderItemWorkspaceEntity,
    customerEmail: string,
  ): Promise<ItemLicenseResult> {
    const config = this.getLicenseConfig(
      input.externalProducts,
      item.externalMktProductId ?? '',
      item.externalMktPackageId ?? '',
    );

    const result = await this.createMultipleLicenses(
      item,
      customerEmail,
      config,
    );

    await this.updateOrderItemWithLicenses(
      context.workspaceId,
      item.id,
      result,
    );

    return result;
  }

  /**
   * Create multiple licenses based on configuration
   */
  private async createMultipleLicenses(
    item: MktOrderItemWorkspaceEntity,
    customerEmail: string,
    config: LicenseConfig,
  ): Promise<ItemLicenseResult> {
    const result: ItemLicenseResult = {
      licenseIds: [],
      licenseKeys: [],
      snapshots: [],
      createdLicenses: [],
    };

    for (let i = 0; i < config.licenseCount; i++) {
      const license = await this.createSingleLicense(
        item,
        customerEmail,
        config.devicesPerLicense,
      );

      result.licenseIds.push(license.id);
      result.licenseKeys.push(license.licenseKey);
      result.snapshots.push(
        this.mktProductProxy.createLicenseSnapshot(license),
      );
      result.createdLicenses.push({
        id: license.id,
        licenseKey: license.licenseKey,
        orderItemId: item.id,
      });

      this.logger.debug(
        `Created license ${license.id} (${i + 1}/${config.licenseCount}) for order item ${item.id}`,
      );
    }

    return result;
  }

  /**
   * Create a single license on MKT Server
   */
  private async createSingleLicense(
    item: MktOrderItemWorkspaceEntity,
    email: string,
    maxDevices: number,
  ) {
    return this.mktLicenseProxy.create({
      productPackageId: item.externalMktPackageId ?? '',
      productId: item.externalMktProductId ?? '',
      email,
      maxDevices,
    });
  }

  // ============================================
  // PRIVATE METHODS - Order Item Update
  // ============================================

  /**
   * Update order item with created license information
   */
  private async updateOrderItemWithLicenses(
    workspaceId: string,
    itemId: string,
    result: ItemLicenseResult,
  ): Promise<void> {
    await this.orderItemRepository.update(workspaceId, itemId, {
      externalMktLicenseId: result.licenseIds[0],
      externalMktLicenseKey: result.licenseKeys.join(', '),
      licenseSnapshot: result.snapshots[0],
    });
  }

  // ============================================
  // PRIVATE METHODS - Rollback
  // ============================================

  /**
   * Store rollback data for compensation
   */
  private storeRollbackData(context: SagaContext, licenseIds: string[]): void {
    context.rollbackData.set(this.name, {
      licenseIds,
      orderItemIds: context.orderItemIds,
    });
  }
}
