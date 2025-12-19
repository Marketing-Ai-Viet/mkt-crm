import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/orchestration/saga/order-saga.interface';
import { CreateOrderWithItemsInput } from 'src/mkt-core/order/types';
import { MktLicenseSnapshot } from 'src/mkt-core/order/types/mkt-product-proxy.types';

// ============================================
// STEP OUTPUT TYPE
// ============================================

export type CreateLicensesStepOutput = {
  licenses: Array<{
    id: string;
    licenseKey: string;
    orderItemId: string;
  }>;
};

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_MAX_DEVICES = 1;

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
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly mktLicenseProxy: MktLicenseProxyService,
    private readonly mktProductProxy: MktProductProxyService,
  ) {
    super();
  }

  /**
   * Skip this step if no external packages in order items
   */
  shouldSkip(context: SagaContext, input: CreateOrderWithItemsInput): boolean {
    // Skip if no external products
    if (!input.externalProducts || input.externalProducts.length === 0) {
      return true;
    }

    // Skip if no packages (license requires package)
    const hasPackages = input.externalProducts.some((p) => p.packageId);

    return !hasPackages;
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateLicensesStepOutput>> {
    try {
      if (!context.orderItemIds || context.orderItemIds.length === 0) {
        this.logger.warn('No order items to create licenses for');

        return {
          success: true,
          data: { licenses: [] },
        };
      }

      this.logger.log(
        `Creating licenses for ${context.orderItemIds.length} order items`,
      );

      // Get order items from context
      const orderItemRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          context.workspaceId,
          MktOrderItemWorkspaceEntity,
          { shouldBypassPermissionChecks: true },
        );

      const orderItems = await orderItemRepository.find({
        where: context.orderItemIds.map((id) => ({ id })),
      });

      const createdLicenses: CreateLicensesStepOutput['licenses'] = [];
      const licenseIdsForRollback: string[] = [];

      for (const item of orderItems) {
        // Skip items without external package
        if (!item.externalMktPackageId || !item.externalMktProductId) {
          this.logger.debug(
            `Skipping item ${item.id} - no external package/product`,
          );
          continue;
        }

        try {
          // Get customerId from input or metadata
          const customerId =
            input.customerId ??
            (context.metadata.get('customerId') as string) ??
            '';

          // Create license on MKT Server
          const mktLicense = await this.mktLicenseProxy.create({
            productPackageId: item.externalMktPackageId,
            productId: item.externalMktProductId,
            userId: customerId,
            maxDevices: DEFAULT_MAX_DEVICES,
          });

          // Create license snapshot
          const licenseSnapshot: MktLicenseSnapshot =
            this.mktProductProxy.createLicenseSnapshot(mktLicense);

          // Update order item with license info
          await queryRunner.manager.update(
            MktOrderItemWorkspaceEntity,
            { id: item.id },
            {
              externalMktLicenseId: mktLicense.id,
              externalMktLicenseKey: mktLicense.licenseKey,
              licenseSnapshot,
            },
          );

          createdLicenses.push({
            id: mktLicense.id,
            licenseKey: mktLicense.licenseKey,
            orderItemId: item.id,
          });

          licenseIdsForRollback.push(mktLicense.id);

          this.logger.debug(
            `Created license ${mktLicense.id} for order item ${item.id}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to create license for order item ${item.id}`,
            error,
          );
          throw error;
        }
      }

      // Store rollback data
      context.rollbackData.set(this.name, {
        licenseIds: licenseIdsForRollback,
        orderItemIds: context.orderItemIds,
      });

      this.logger.log(
        `Created ${createdLicenses.length} licenses successfully`,
      );

      return {
        success: true,
        data: { licenses: createdLicenses },
      };
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
      orderItemIds: string[];
    } | null;

    if (!data?.licenseIds?.length) {
      this.logger.warn('No licenses to compensate');

      return;
    }

    this.logger.warn(`Revoking ${data.licenseIds.length} licenses`);

    // Revoke licenses on MKT Server
    for (const licenseId of data.licenseIds) {
      try {
        await this.mktLicenseProxy.revoke(licenseId);
        this.logger.debug(`Revoked license ${licenseId}`);
      } catch (error) {
        this.logger.error(`Failed to revoke license ${licenseId}`, error);
        // Continue revoking other licenses
      }
    }

    this.logger.log('License compensation completed');
  }
}
