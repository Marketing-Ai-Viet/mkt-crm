import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
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
  licenses: Array<{ id: string }>;
};

// ============================================
// DEFAULT VALUES
// ============================================

// const DEFAULT_LICENSE_EXPIRY_DAYS = 30; // Unused - License module removed

/**
 * CreateLicensesStep - Step 3: Tạo licenses cho order items
 *
 * DEPRECATED: License module has been removed.
 * This step is now a no-op and should be removed from the saga workflow.
 *
 * License creation should be handled via MktLicenseIntegration service separately.
 */
@Injectable()
export class CreateLicensesStep extends SagaStep<
  CreateOrderWithItemsInput,
  CreateLicensesStepOutput
> {
  readonly name = 'create_licenses';
  readonly description = 'DEPRECATED: License creation removed';

  private readonly logger = new Logger(CreateLicensesStep.name);

  constructor(private readonly twentyORMGlobalManager: TwentyORMGlobalManager) {
    super();
  }

  /**
   * Always skip this step - license module has been removed
   */
  shouldSkip(
    _context: SagaContext,
    _input: CreateOrderWithItemsInput,
  ): boolean {
    return true;
  }

  async execute(
    _context: SagaContext,
    _input: CreateOrderWithItemsInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateLicensesStepOutput>> {
    this.logger.warn(
      'CreateLicensesStep is deprecated. License module has been removed.',
    );

    return {
      success: true,
      data: { licenses: [] },
    };
  }

  async compensate(
    _context: SagaContext,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    this.logger.warn('Compensate called but license module is removed. No-op.');
  }
}
