import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktLicenseApiService } from 'src/mkt-core/license/integration/mkt-license-api.service';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/license.constants';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/orchestration/saga/order-saga.interface';
import { CreateOrderWithItemsInput } from 'src/mkt-core/order/types';

// ============================================
// STEP OUTPUT TYPE
// ============================================

export type CreateLicensesStepOutput = {
  licenses: MktLicenseWorkspaceEntity[];
};

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_LICENSE_EXPIRY_DAYS = 30;

/**
 * CreateLicensesStep - Step 3: Tạo licenses cho order items
 *
 * Thực hiện:
 * - Tạo licenses mới cho order items (normal flow)
 * - Hoặc update reference cho licenses từ trial order (TRIAL_TO_PAID)
 * - Hoặc link existing license (LICENSE_RENEWING)
 *
 * Compensate:
 * - Hard delete licenses đã tạo
 * - Hoặc revert license references
 */
@Injectable()
export class CreateLicensesStep extends SagaStep<
  CreateOrderWithItemsInput,
  CreateLicensesStepOutput
> {
  readonly name = 'create_licenses';
  readonly description = 'Create or link licenses for order items';

  private readonly logger = new Logger(CreateLicensesStep.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly mktLicenseApiService: MktLicenseApiService,
  ) {
    super();
  }

  /**
   * Skip step for LICENSE_RENEWING action (licenses already exist)
   */
  shouldSkip(_context: SagaContext, input: CreateOrderWithItemsInput): boolean {
    return input.action === ORDER_ACTION.LICENSE_RENEWING;
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateLicensesStepOutput>> {
    try {
      if (!context.orderId) {
        return {
          success: false,
          error: new Error('Order ID is required from previous step'),
        };
      }

      this.logger.log(`Creating licenses for order: ${context.orderId}`);

      // Handle TRIAL_TO_PAID: Update license references
      if (input.action === ORDER_ACTION.TRIAL_TO_PAID && input.trialOrderId) {
        return this.updateLicenseReferences(context, input, queryRunner);
      }

      // Handle LICENSE_RENEWING: Link existing license
      if (input.action === ORDER_ACTION.LICENSE_RENEWING && input.licenseId) {
        return this.linkExistingLicense(context, input, queryRunner);
      }

      // Normal flow: Create new licenses
      return this.createNewLicenses(context, input, queryRunner);
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
    queryRunner: QueryRunner,
  ): Promise<void> {
    const data = context.rollbackData.get(this.name) as {
      licenseIds?: string[];
      updatedLicenseRefs?: { licenseId: string; originalOrderId: string }[];
    } | null;

    if (!data) {
      this.logger.warn('No license data to compensate');

      return;
    }

    try {
      // Hard delete newly created licenses
      if (data.licenseIds?.length) {
        this.logger.warn(`Hard deleting ${data.licenseIds.length} licenses`);

        await queryRunner.manager.delete(
          MktLicenseWorkspaceEntity,
          data.licenseIds,
        );

        this.logger.log('Licenses deleted successfully');
      }

      // Revert license references
      if (data.updatedLicenseRefs?.length) {
        this.logger.warn(
          `Reverting ${data.updatedLicenseRefs.length} license references`,
        );

        for (const ref of data.updatedLicenseRefs) {
          await queryRunner.manager.update(
            MktLicenseWorkspaceEntity,
            { id: ref.licenseId },
            { mktOrderId: ref.originalOrderId },
          );
        }

        this.logger.log('License references reverted successfully');
      }
    } catch (error) {
      this.logger.error('Failed to compensate licenses', error);
      throw error;
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Tạo licenses mới cho order items
   */
  private async createNewLicenses(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateLicensesStepOutput>> {
    // Get order with items
    const orderRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        context.workspaceId,
        MktOrderWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const order = await orderRepository.findOne({
      where: { id: context.orderId },
      relations: ['orderItems', 'accountOwner'],
    });

    if (!order) {
      return {
        success: false,
        error: new Error(`Order ${context.orderId} not found`),
      };
    }

    if (!order.orderItems || order.orderItems.length === 0) {
      return {
        success: false,
        error: new Error('Order has no items'),
      };
    }

    // Determine if trial license
    const isTrialLicense = input.action === ORDER_ACTION.TRIAL;

    // Create licenses for items
    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        context.workspaceId,
        MktLicenseWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const licenses: MktLicenseWorkspaceEntity[] = [];

    for (const orderItem of order.orderItems) {
      const itemLicenses = await this.createLicensesForOrderItem(
        order,
        orderItem,
        input.customerId,
        isTrialLicense,
        licenseRepository,
        queryRunner,
      );

      licenses.push(...itemLicenses);
    }

    this.logger.log(`Created ${licenses.length} licenses`);

    // Store in context
    context.licenseIds = licenses.map((l) => l.id);
    context.rollbackData.set(this.name, {
      licenseIds: context.licenseIds,
    });

    return {
      success: true,
      data: { licenses },
    };
  }

  /**
   * Update license references for TRIAL_TO_PAID
   */
  private async updateLicenseReferences(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateLicensesStepOutput>> {
    if (!input.trialOrderId) {
      return {
        success: false,
        error: new Error('Trial order ID is required'),
      };
    }

    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        context.workspaceId,
        MktLicenseWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    // Find licenses from trial order
    const trialLicenses = await licenseRepository.find({
      where: { mktOrderId: input.trialOrderId },
    });

    if (trialLicenses.length === 0) {
      this.logger.warn(
        `No licenses found for trial order: ${input.trialOrderId}`,
      );

      return {
        success: true,
        data: { licenses: [] },
      };
    }

    // Store original references for rollback
    const updatedLicenseRefs = trialLicenses.map((license) => ({
      licenseId: license.id,
      originalOrderId: input.trialOrderId as string,
    }));

    // Update license references to new order
    for (const license of trialLicenses) {
      await queryRunner.manager.update(
        MktLicenseWorkspaceEntity,
        { id: license.id },
        {
          mktOrderId: context.orderId,
          status: MKT_LICENSE_STATUS.ACTIVE,
          trialLicense: false,
          notes: `Cập nhật tham chiếu từ trial order ${input.trialOrderId} sang order ${context.orderId}`,
        },
      );
    }

    this.logger.log(
      `Updated ${trialLicenses.length} license references to order: ${context.orderId}`,
    );

    // Store in context
    context.licenseIds = trialLicenses.map((l) => l.id);
    context.rollbackData.set(this.name, {
      updatedLicenseRefs,
    });

    return {
      success: true,
      data: { licenses: trialLicenses },
    };
  }

  /**
   * Link existing license for LICENSE_RENEWING
   */
  private async linkExistingLicense(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateLicensesStepOutput>> {
    if (!input.licenseId) {
      return {
        success: false,
        error: new Error('License ID is required for license renewal'),
      };
    }

    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        context.workspaceId,
        MktLicenseWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const license = await licenseRepository.findOne({
      where: { id: input.licenseId },
    });

    if (!license) {
      return {
        success: false,
        error: new Error(`License ${input.licenseId} not found`),
      };
    }

    // Store original order reference for rollback
    const originalOrderId = license.mktOrderId;

    // Update license to reference new order
    await queryRunner.manager.update(
      MktLicenseWorkspaceEntity,
      { id: input.licenseId },
      {
        mktOrderId: context.orderId,
        status: MKT_LICENSE_STATUS.RENEWING,
        notes: `Gia hạn license - liên kết với order mới ${context.orderId}`,
      },
    );

    this.logger.log(
      `Linked license ${input.licenseId} to order: ${context.orderId}`,
    );

    // Store in context
    context.licenseIds = [input.licenseId];
    context.rollbackData.set(this.name, {
      updatedLicenseRefs: [
        {
          licenseId: input.licenseId,
          originalOrderId: originalOrderId ?? '',
        },
      ],
    });

    return {
      success: true,
      data: { licenses: [license] },
    };
  }

  /**
   * Create licenses for a single order item
   */
  private async createLicensesForOrderItem(
    order: MktOrderWorkspaceEntity,
    orderItem: MktOrderItemWorkspaceEntity,
    customerId: string,
    isTrialLicense: boolean,
    licenseRepository: Awaited<
      ReturnType<typeof this.twentyORMGlobalManager.getRepositoryForWorkspace>
    >,
    queryRunner: QueryRunner,
  ): Promise<MktLicenseWorkspaceEntity[]> {
    const productName =
      orderItem.snapshotProductName ?? orderItem.name ?? 'Sản phẩm';
    const licenseName = `License cho ${productName}`;
    const quantity = orderItem.quantity ?? 1;

    const createdLicenses: MktLicenseWorkspaceEntity[] = [];

    for (let i = 1; i <= quantity; i++) {
      // Generate license key and fetch from API
      let licenseKey = this.generateLicenseKey();
      let expiresAt = this.getDefaultExpiresAt();
      let licenseUuid: string | undefined;

      try {
        const licenseApiResponse =
          await this.mktLicenseApiService.fetchLicenseFromApi(
            order.id,
            licenseName,
            orderItem.id,
          );

        licenseKey = licenseApiResponse.licenseKey;
        expiresAt = new Date(licenseApiResponse.expiresAt);
        licenseUuid = licenseApiResponse.licenseUuid ?? undefined;
      } catch (error) {
        this.logger.warn(
          `Failed to fetch license from API, using generated key: ${error}`,
        );
      }

      const licenseData: Partial<MktLicenseWorkspaceEntity> = {
        name: licenseName,
        licenseKey,
        status: isTrialLicense
          ? MKT_LICENSE_STATUS.TRIAL
          : MKT_LICENSE_STATUS.ACTIVE,
        activatedAt: new Date(),
        expiresAt,
        licenseUuid,
        mktOrderId: order.id,
        mktVariantId: orderItem.mktVariantId,
        mktCustomerId: customerId,
        accountOwnerId: order.accountOwnerId ?? undefined,
        departmentOwnerId: order.accountOwner?.departmentId ?? undefined,
        teamOwnerId: order.accountOwner?.teamId ?? undefined,
        notes: `License được tạo cho order item: ${orderItem.name} (${i}/${quantity})`,
        trialLicense: isTrialLicense,
      };

      const license = licenseRepository.create(licenseData);

      license.createdBy = order.createdBy;

      const savedLicense = await queryRunner.manager.save(license);

      createdLicenses.push(savedLicense as MktLicenseWorkspaceEntity);
    }

    return createdLicenses;
  }

  /**
   * Generate fallback license key
   */
  private generateLicenseKey(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();

    return `LIC-${timestamp}-${random}`;
  }

  /**
   * Get default expiration date (30 days from now)
   */
  private getDefaultExpiresAt(): Date {
    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + DEFAULT_LICENSE_EXPIRY_DAYS);

    return expiresAt;
  }
}
