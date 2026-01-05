import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import { IS_SKIP_TRIAL_CREATION_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types/order-saga.interface';
import {
  CreateLicensesStepOutput,
  CreateOrderWithItemsInput,
} from 'src/mkt-core/order/types';

/**
 * CreateLicensesStep - Step 3: Create TRIAL licenses for order items
 *
 * NEW FLOW (Simplified):
 * - Trial license is created separately via `mktCreateTrialLicense` mutation
 * - This step is SKIPPED for all current order actions (NEW_ORDER, TRIAL_TO_PAID)
 * - License creation/upgrade happens in `CreateLicensesOnConfirmStep` on payment confirm
 *
 * This step is kept for backward compatibility but will skip for all actions.
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
  readonly description = 'Create licenses on MKT Server for order items';

  private readonly logger = new Logger(CreateLicensesStep.name);

  constructor(private readonly mktLicenseProxy: MktLicenseProxyService) {
    super();
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Skip license creation for all order actions
   *
   * NEW FLOW (Simplified):
   * - Trial license is created via standalone `mktCreateTrialLicense` mutation
   * - Order flow skips trial creation for all actions (NEW_ORDER, TRIAL_TO_PAID)
   * - License upgrade happens in `CreateLicensesOnConfirmStep` on payment confirm
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

    // NEW FLOW: Skip trial creation for all order actions
    // Trial is created separately via mktCreateTrialLicense mutation
    if (input.action && IS_SKIP_TRIAL_CREATION_ACTION(input.action)) {
      this.logger.debug(
        `Skipping: Action "${input.action}" - trial created via mktCreateTrialLicense`,
      );

      return true;
    }

    // Fallback: skip for any unknown action
    this.logger.debug(
      `Skipping: Unknown action "${input.action ?? 'undefined'}" - trial creation disabled`,
    );

    return true;
  }

  /**
   * Execute is no longer called because shouldSkip always returns true.
   * Trial licenses are created via mktCreateTrialLicense mutation.
   * License upgrade happens in CreateLicensesOnConfirmStep.
   */
  async execute(
    _context: SagaContext,
    _input: CreateOrderWithItemsInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateLicensesStepOutput>> {
    // This should never be called because shouldSkip always returns true
    this.logger.warn(
      'CreateLicensesStep.execute called unexpectedly - trial creation is disabled',
    );

    return { success: true, data: { licenses: [] } };
  }

  /**
   * Compensate by revoking any licenses that were created.
   * In the new flow, this should rarely be needed since we don't create licenses here.
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
}
