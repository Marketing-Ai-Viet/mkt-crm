import { Injectable, Logger } from '@nestjs/common';

import { In, QueryRunner } from 'typeorm';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { LinkedAccount } from 'src/mkt-core/customer/types/linked-account.types';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/orchestration/saga/order-saga.interface';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories';
import {
  CreateLicensesStepOutput,
  CreateOrderWithItemsInput,
} from 'src/mkt-core/order/types';
import { MktLicenseSnapshot } from 'src/mkt-core/order/types/mkt-product-proxy.types';

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
    private readonly orderItemRepository: MktOrderItemRepository,
    private readonly mktLicenseProxy: MktLicenseProxyService,
    private readonly mktProductProxy: MktProductProxyService,
    private readonly customerRepository: MktCustomerRepository,
  ) {
    super();
  }

  /**
   * Skip this step if no external packages in order items
   */
  shouldSkip(_context: SagaContext, input: CreateOrderWithItemsInput): boolean {
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
    _queryRunner: QueryRunner,
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

      // Get customer info with linkedAccounts
      const customerId =
        input.customerId ??
        (context.metadata.get('customerId') as string) ??
        '';

      const customer = customerId
        ? await this.customerRepository.findByIdOrNull(
            customerId,
            context.workspaceId,
          )
        : null;

      // Extract email from MKT_SERVER linkedAccount or fallback to customer email
      const customerEmail = this.customerRepository.extractMktServerEmail(
        customer?.linkedAccounts as LinkedAccount[] | null,
        customer?.email ?? null,
      );

      this.logger.debug(
        `Customer ${customerId}: using email "${customerEmail}" for license creation`,
      );

      // Get order items from repository
      const orderItems = await this.orderItemRepository.findMany(
        context.workspaceId,
        { id: In(context.orderItemIds) },
      );

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
          // Find matching external product input to get maxDevices and splitLicenses
          const externalProduct = input.externalProducts?.find(
            (p) =>
              p.productId === item.externalMktProductId &&
              p.packageId === item.externalMktPackageId,
          );

          const maxDevices = externalProduct?.maxDevices ?? DEFAULT_MAX_DEVICES;
          const splitLicenses = externalProduct?.splitLicenses ?? false;

          // Determine number of licenses to create and devices per license
          const licenseCount = splitLicenses ? maxDevices : 1;
          const devicesPerLicense = splitLicenses
            ? DEFAULT_MAX_DEVICES
            : maxDevices;

          const itemLicenseIds: string[] = [];
          const itemLicenseKeys: string[] = [];
          const itemLicenseSnapshots: MktLicenseSnapshot[] = [];

          // Create license(s) on MKT Server
          for (let i = 0; i < licenseCount; i++) {
            const mktLicense = await this.mktLicenseProxy.create({
              productPackageId: item.externalMktPackageId,
              productId: item.externalMktProductId,
              email: customerEmail,
              maxDevices: devicesPerLicense,
            });

            itemLicenseIds.push(mktLicense.id);
            itemLicenseKeys.push(mktLicense.licenseKey);
            itemLicenseSnapshots.push(
              this.mktProductProxy.createLicenseSnapshot(mktLicense),
            );

            createdLicenses.push({
              id: mktLicense.id,
              licenseKey: mktLicense.licenseKey,
              orderItemId: item.id,
            });

            licenseIdsForRollback.push(mktLicense.id);

            this.logger.debug(
              `Created license ${mktLicense.id} (${i + 1}/${licenseCount}) for order item ${item.id}`,
            );
          }

          // Update order item with license info (store first license for backward compatibility)
          // Multiple licenses are stored in licenseSnapshot array
          await this.orderItemRepository.update(context.workspaceId, item.id, {
            externalMktLicenseId: itemLicenseIds[0],
            externalMktLicenseKey: itemLicenseKeys.join(', '),
            licenseSnapshot: itemLicenseSnapshots[0],
          });
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
