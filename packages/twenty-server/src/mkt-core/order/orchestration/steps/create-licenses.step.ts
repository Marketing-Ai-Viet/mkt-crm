import { Injectable, Logger } from '@nestjs/common';

import { In, QueryRunner } from 'typeorm';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { LinkedAccount } from 'src/mkt-core/customer/types/linked-account.types';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import { MktLicenseResponse } from 'src/mkt-core/mkt-license-integration/types';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';
import {
  IS_CREATE_NEW_TRIAL_ACTION,
  IS_PURE_TRIAL_ACTION,
} from 'src/mkt-core/order/constants/order-status.constants';
import { ORDER_TRIAL_CONFIG } from 'src/mkt-core/order/constants/order-service.constants';
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
  ItemLicenseResult,
} from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * CreateLicensesStep - Step 3: Create TRIAL licenses for order items
 *
 * UNIFIED FLOW: All payment methods receive trial license immediately.
 *
 * This step creates TRIAL licenses on MKT Server for order items that have
 * external packages. The license information is then embedded into
 * the order item (no separate license entity in CRM).
 *
 * Workflow:
 * 1. For each order item with externalMktPackageId
 * 2. Create TRIAL license on MKT Server (30 days by default)
 * 3. Create license snapshot using MktSnapshotService
 * 4. Update order item with license info + isTrialLicense=true
 *
 * License Lifecycle:
 * - Day 1-30: Trial license active
 * - Day 30: Send reminder + extend 7 days (handled by OrderOverdueWorkerService)
 * - Day 37: Revoke license + mark order OVERDUE
 * - On payment confirmed: Revoke trial + Create official license (CreateLicensesOnConfirmStep)
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
   * NEW FLOW (Option 3):
   * - NEW_ORDER, TRIAL: Check if trial exists → reuse, else create new
   * - LICENSE_RENEWING, TRIAL_TO_PAID, CHANGE_VARIANT: Skip (handled elsewhere)
   * - Other actions: Skip (ACCOUNTING_CONFIRMED, REFUND, etc.)
   *
   * Business Rule: 1 user can only have 1 active trial per product
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

    // Only NEW_ORDER and TRIAL actions create new trial licenses
    // LICENSE_RENEWING, TRIAL_TO_PAID, CHANGE_VARIANT reuse existing licenses (handled elsewhere)
    if (input.action && !IS_CREATE_NEW_TRIAL_ACTION(input.action)) {
      this.logger.debug(
        `Skipping: Action "${input.action}" does not create new trial license ` +
          `(reuses existing license)`,
      );

      return true;
    }

    // NEW_ORDER and TRIAL will check & reuse existing trial if found
    this.logger.debug(
      `Processing trial license for action "${input.action ?? 'NEW_ORDER'}" ` +
        `(will check for existing trial first)`,
    );

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

      // Determine if this is a trial license (all actions except pure TRIAL need payment)
      const isPureTrial = IS_PURE_TRIAL_ACTION(input.action);
      const trialDurationDays = isPureTrial
        ? (input.trialDurationDays ?? 14) // Pure trial: 7-14 days
        : ORDER_TRIAL_CONFIG.DEFAULT_TRIAL_DURATION_DAYS; // Payment required: 30 days

      this.logger.log(
        `Processing ${isPureTrial ? 'pure trial' : 'payment-pending trial'} licenses ` +
          `(${trialDurationDays} days) for ${context.orderItemIds.length} order items ` +
          `(will reuse existing trials if found)`,
      );

      // Calculate trial expiry date
      const trialExpiryDate = DateTimeUtils.add(DateTimeUtils.now(), {
        days: trialDurationDays,
      });

      // Store trial expiry in context for later steps (e.g., scheduling overdue jobs)
      context.metadata.set(
        'trialExpiryDate',
        DateTimeUtils.toISO(trialExpiryDate),
      );
      context.metadata.set('isPureTrial', isPureTrial);

      // Get customer email for license creation
      const customerEmail = await this.getCustomerEmail(context, input);

      // Get order items
      const orderItems = await this.orderItemRepository.findMany(
        context.workspaceId,
        { id: In(context.orderItemIds) },
      );

      // Process all order items - pass trialDurationDays directly
      const { createdLicenses, licenseIds } = await this.processOrderItems(
        context,
        orderItems,
        customerEmail,
        trialDurationDays,
      );

      // Store rollback data (only newly created licenses)
      this.storeRollbackData(context, licenseIds);

      // Calculate reused vs new counts
      const newlyCreatedCount = licenseIds.length;
      const reusedCount = createdLicenses.length - newlyCreatedCount;

      this.logger.log(
        `Processed ${createdLicenses.length} trial licenses: ` +
          `${newlyCreatedCount} new, ${reusedCount} reused ` +
          `(trialDays: ${trialDurationDays}, expires: ${DateTimeUtils.toISO(trialExpiryDate)})`,
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
   *
   * Priority:
   * 1. input.mktServerEmail (explicit override from API)
   * 2. MKT_SERVER linkedAccount (isPrimary=true, status=ACTIVE)
   *
   * @throws Error if no valid email found (no mktServerEmail provided and no valid linkedAccount)
   */
  private async getCustomerEmail(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
  ): Promise<string> {
    // Priority 1: Use explicit mktServerEmail from input if provided
    if (input.mktServerEmail) {
      this.logger.debug(
        `Using explicit mktServerEmail from input: "${input.mktServerEmail}"`,
      );

      return input.mktServerEmail;
    }

    // Priority 2: Extract from linkedAccounts (throws if not found)
    const customerId =
      input.customerId ?? (context.metadata.get('customerId') as string) ?? '';

    if (!customerId) {
      throw new Error(
        'No customerId provided. Cannot determine email for license creation.',
      );
    }

    const customer = await this.customerRepository.findByIdOrNull(
      customerId,
      context.workspaceId,
    );

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

  // ============================================
  // PRIVATE METHODS - License Creation
  // ============================================

  /**
   * Process all order items - check for existing trial or create new
   *
   * Business Rule: 1 user can only have 1 active trial per product
   *
   * Flow:
   * 1. Check if user has existing trial for this product
   * 2. If exists → reuse (link to order item, no rollback needed)
   * 3. If not → create new trial (add to rollback data)
   */
  private async processOrderItems(
    context: SagaContext,
    orderItems: MktOrderItemWorkspaceEntity[],
    customerEmail: string,
    trialDays: number,
  ): Promise<{
    createdLicenses: CreatedLicenseInfo[];
    licenseIds: string[];
  }> {
    const createdLicenses: CreatedLicenseInfo[] = [];
    const licenseIds: string[] = []; // Only newly created licenses (for rollback)

    for (const item of orderItems) {
      if (!this.isLicensableItem(item)) {
        this.logger.debug(
          `Skipping item ${item.id} - no external package/product`,
        );
        continue;
      }

      const result = await this.processLicenseForItem(
        context,
        item,
        customerEmail,
        trialDays,
      );

      createdLicenses.push(...result.createdLicenses);

      // Only add newly created licenses to rollback (not reused ones)
      if (result.isNewlyCreated) {
        licenseIds.push(...result.licenseIds);
      }
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
   * Process license for a single order item - check existing or create new
   *
   * Business Rule: 1 user can only have 1 active trial per product
   *
   * Flow:
   * 1. Check if user has existing trial for this product
   * 2. If exists → reuse (link to order item)
   * 3. If not → create new trial
   */
  private async processLicenseForItem(
    context: SagaContext,
    item: MktOrderItemWorkspaceEntity,
    customerEmail: string,
    trialDays: number,
  ): Promise<ItemLicenseResult & { isNewlyCreated: boolean }> {
    const productId = item.externalMktProductId ?? '';

    // Step 1: Check if user already has trial for this product
    const existingTrial = await this.mktLicenseProxy.findTrialByProductAndEmail(
      {
        productId,
        email: customerEmail,
      },
    );

    if (existingTrial) {
      // Step 2a: Reuse existing trial
      this.logger.log(
        `Reusing existing trial license ${existingTrial.id} ` +
          `for product ${productId} (order item ${item.id})`,
      );

      const result = this.createResultFromExistingLicense(
        existingTrial,
        item.id,
      );

      await this.updateOrderItemWithLicenses(
        context.workspaceId,
        item.id,
        result,
      );

      return { ...result, isNewlyCreated: false };
    }

    // Step 2b: Create new trial license
    this.logger.debug(
      `No existing trial found for product ${productId}, creating new trial`,
    );

    const result = await this.createNewTrialLicense(
      item,
      customerEmail,
      trialDays,
    );

    await this.updateOrderItemWithLicenses(
      context.workspaceId,
      item.id,
      result,
    );

    return { ...result, isNewlyCreated: true };
  }

  /**
   * Create result from existing license (for reuse)
   */
  private createResultFromExistingLicense(
    license: MktLicenseResponse,
    orderItemId: string,
  ): ItemLicenseResult {
    const snapshot = this.mktProductProxy.createLicenseSnapshot(license);

    return {
      licenseIds: [license.id],
      licenseKeys: [license.licenseKey],
      snapshots: [snapshot],
      createdLicenses: [
        {
          id: license.id,
          licenseKey: license.licenseKey,
          orderItemId,
        },
      ],
    };
  }

  /**
   * Create new trial license for order item
   */
  private async createNewTrialLicense(
    item: MktOrderItemWorkspaceEntity,
    customerEmail: string,
    trialDays: number,
  ): Promise<ItemLicenseResult> {
    const license = await this.createSingleTrialLicense(
      item,
      customerEmail,
      trialDays,
    );

    const snapshot = this.mktProductProxy.createLicenseSnapshot(license);

    this.logger.debug(
      `Created trial license ${license.id} for order item ${item.id} ` +
        `(trialDays: ${trialDays}, maxDevices: ${DEFAULT_MAX_DEVICES})`,
    );

    return {
      licenseIds: [license.id],
      licenseKeys: [license.licenseKey],
      snapshots: [snapshot],
      createdLicenses: [
        {
          id: license.id,
          licenseKey: license.licenseKey,
          orderItemId: item.id,
        },
      ],
    };
  }

  /**
   * Create a single TRIAL license on MKT Server
   *
   * Uses the dedicated trial endpoint which:
   * - Does NOT require productPackageId
   * - Defaults to maxDevices = 1 (single device only)
   * - Automatically sets license type to TRIAL
   *
   * Note: Trial licenses are temporary and will be replaced with official
   * licenses when payment is confirmed (CreateLicensesOnConfirmStep).
   */
  private async createSingleTrialLicense(
    item: MktOrderItemWorkspaceEntity,
    email: string,
    trialDays: number,
  ) {
    return this.mktLicenseProxy.createTrial({
      productId: item.externalMktProductId ?? '',
      email,
      trialDays,
      maxDevices: DEFAULT_MAX_DEVICES, // Always 1 device for trial
    });
  }

  // ============================================
  // PRIVATE METHODS - Order Item Update
  // ============================================

  /**
   * Update order item with created license information
   *
   * Trial licenses are always created with maxDevices = 1 (single device only)
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
