import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_DEFAULT_LANGUAGE } from 'src/mkt-core/mkt-product-integration/constants';
import {
  MktProductSnapshot,
  MktPackageSnapshot,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/orchestration/saga/order-saga.interface';
import {
  OrderProductIntegrationService,
  ProductWithSnapshot,
} from 'src/mkt-core/order/services/integration/order-product.integration';
import {
  CreateOrderWithItemsInput,
  ExternalMktProductInput,
} from 'src/mkt-core/order/types';
import { MktSupportedLanguage } from 'src/mkt-core/order/types/mkt-product-proxy.types';

// ============================================
// STEP OUTPUT TYPE
// ============================================

export type CreateSnapshotsStepOutput = {
  snapshots: ProductWithSnapshot[];
  snapshotsMap: Map<
    string,
    {
      productSnapshot: MktProductSnapshot;
      packageSnapshot: MktPackageSnapshot | null;
    }
  >;
};

// ============================================
// STEP CONSTANTS
// ============================================

const STEP_NAME = 'create_snapshots';
const STEP_DESCRIPTION = 'Validate and create product/package snapshots';

/**
 * CreateSnapshotsStep - Create and validate product/package snapshots
 *
 * Thực hiện:
 * - Validate products/packages tồn tại và có thể order
 * - Tạo immutable snapshots với checksum
 * - Lưu snapshot map vào context cho các steps sau
 *
 * Compensate:
 * - Snapshots là immutable data, không cần rollback
 * - Chỉ clear metadata từ context
 *
 * Skip condition:
 * - Không có external products trong input
 */
@Injectable()
export class CreateSnapshotsStep extends SagaStep<
  CreateOrderWithItemsInput,
  CreateSnapshotsStepOutput
> {
  readonly name = STEP_NAME;
  readonly description = STEP_DESCRIPTION;

  private readonly logger = new Logger(CreateSnapshotsStep.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly productIntegration: OrderProductIntegrationService,
  ) {
    super();
  }

  /**
   * Skip if no external products
   */
  shouldSkip(_context: SagaContext, input: CreateOrderWithItemsInput): boolean {
    const hasExternalProducts =
      input.externalProducts && input.externalProducts.length > 0;

    if (!hasExternalProducts) {
      this.logger.debug('Skipping: No external products');

      return true;
    }

    return false;
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreateSnapshotsStepOutput>> {
    try {
      this.logger.log('Creating product/package snapshots');

      const externalProducts = input.externalProducts ?? [];
      const orderLanguage = (input.orderLanguage ??
        MKT_DEFAULT_LANGUAGE) as MktSupportedLanguage;

      // Validate and create snapshots
      const { validation, snapshots } =
        await this.productIntegration.validateAndCreateSnapshots(
          externalProducts,
          orderLanguage,
        );

      if (!validation.valid) {
        const errorMessages = validation.errors
          .map((e) => `${e.productId}: ${e.reason}`)
          .join(', ');

        this.logger.error(`Product validation failed: ${errorMessages}`);

        return {
          success: false,
          error: new Error(`Product validation failed: ${errorMessages}`),
        };
      }

      if (snapshots.length === 0) {
        return {
          success: false,
          error: new Error('No valid products found to create snapshots'),
        };
      }

      // Build snapshots map for efficient lookup
      const snapshotsMap = this.buildSnapshotsMap(snapshots, externalProducts);

      // Store in context for subsequent steps
      context.metadata.set('productSnapshots', snapshots);
      context.metadata.set('snapshotsMap', snapshotsMap);

      this.logger.log(
        `Created ${snapshots.length} product snapshots successfully`,
      );

      return {
        success: true,
        data: {
          snapshots,
          snapshotsMap,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create snapshots', error);

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
    // Snapshots are immutable data stored in JSON fields
    // They don't need database rollback
    // Just clear the metadata
    this.logger.warn('Compensating snapshots step - clearing metadata');

    context.metadata.delete('productSnapshots');
    context.metadata.delete('snapshotsMap');
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Build map from productId -> snapshots for efficient lookup
   */
  private buildSnapshotsMap(
    snapshots: ProductWithSnapshot[],
    externalProducts: ExternalMktProductInput[],
  ): Map<
    string,
    {
      productSnapshot: MktProductSnapshot;
      packageSnapshot: MktPackageSnapshot | null;
    }
  > {
    const map = new Map<
      string,
      {
        productSnapshot: MktProductSnapshot;
        packageSnapshot: MktPackageSnapshot | null;
      }
    >();

    for (const snapshot of snapshots) {
      const key = this.buildSnapshotKey(
        snapshot.product.id,
        snapshot.package?.id,
      );

      map.set(key, {
        productSnapshot: snapshot.productSnapshot,
        packageSnapshot: snapshot.packageSnapshot,
      });
    }

    return map;
  }

  /**
   * Build key for snapshot lookup
   */
  private buildSnapshotKey(productId: string, packageId?: string): string {
    return packageId ? `${productId}:${packageId}` : productId;
  }
}
