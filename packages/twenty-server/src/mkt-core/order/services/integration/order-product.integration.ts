import { Injectable, Logger } from '@nestjs/common';

import { UserContext } from 'src/mkt-core/oauth2-client/types';
import { MktProductProxyService } from 'src/mkt-core/mkt-product-integration/services';
import { MktSnapshotService } from 'src/mkt-core/mkt-product-integration/services/mkt-snapshot.service';
import { MktValidationService } from 'src/mkt-core/mkt-product-integration/services/mkt-validation.service';
import {
  MktProduct,
  MktProductPackage,
  MktProductSnapshot,
  MktPackageSnapshot,
  MktSupportedLanguage,
} from 'src/mkt-core/mkt-product-integration/types';
import { ExternalMktProductInput } from 'src/mkt-core/order/types/order-mutation.types';
import {
  ProductValidationResult,
  ProductWithSnapshot,
} from 'src/mkt-core/order/types';

const ORDER_PRODUCT_LOG_CONTEXT = 'OrderProductIntegration';

/**
 * OrderProductIntegrationService
 *
 * Integration service that bridges Order module with MKT Product Integration module.
 * Provides unified API for:
 * - Validating products/packages for orders
 * - Creating immutable snapshots at order time
 * - Verifying snapshot integrity
 *
 * Architecture:
 * - Wraps MktProductProxyService for data access
 * - Uses MktSnapshotService for snapshot creation
 * - Uses MktValidationService for order validation
 */
@Injectable()
export class OrderProductIntegrationService {
  private readonly logger = new Logger(ORDER_PRODUCT_LOG_CONTEXT);

  constructor(
    private readonly productProxyService: MktProductProxyService,
    private readonly snapshotService: MktSnapshotService,
    private readonly validationService: MktValidationService,
  ) {}

  /**
   * Validate products/packages for order creation
   *
   * @param items - External product inputs from order request
   * @param userContext - OAuth2 user context for API calls
   * @returns Validation result with errors if any
   */
  async validateProducts(
    items: ExternalMktProductInput[],
    userContext?: UserContext,
  ): Promise<ProductValidationResult> {
    this.logger.debug('Validating products for order', {
      itemCount: items.length,
    });

    const validationItems = items.map((item) => ({
      productId: item.productId,
      packageId: item.packageId,
    }));

    const result = await this.validationService.validateForOrder(
      validationItems,
      (productId: string, ctx?: UserContext) =>
        this.productProxyService.getProduct(productId, ctx),
      (packageId: string, ctx?: UserContext, productId?: string) =>
        this.productProxyService.getPackage(packageId, ctx, productId),
      userContext,
    );

    return {
      valid: result.valid,
      errors: result.errors,
    };
  }

  /**
   * Create snapshots for order items
   * Uses batch fetching to prevent N+1 queries
   *
   * @param items - External product inputs from order request
   * @param language - Display language for snapshots
   * @param userContext - OAuth2 user context for API calls
   * @returns Products with their snapshots
   */
  async createSnapshots(
    items: ExternalMktProductInput[],
    language: MktSupportedLanguage = 'vi',
    userContext?: UserContext,
  ): Promise<ProductWithSnapshot[]> {
    this.logger.debug('Creating snapshots for order items', {
      itemCount: items.length,
      language,
    });

    if (items.length === 0) {
      return [];
    }

    // Batch fetch all products in parallel (prevents N+1)
    const productIds = items.map((item) => item.productId);
    const productMap = await this.productProxyService.getProductsByIds(
      productIds,
      userContext,
    );

    // Batch fetch all packages in parallel (prevents N+1)
    const packageItems = items
      .filter((item) => item.packageId)
      .map((item) => ({
        packageId: item.packageId as string,
        productId: item.productId,
      }));
    const packageMap = await this.productProxyService.getPackagesByIds(
      packageItems,
      userContext,
    );

    // Build results using fetched data
    const results: ProductWithSnapshot[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        this.logger.warn(`Product not found: ${item.productId}`);
        continue;
      }

      let pkg: MktProductPackage | null = null;
      let packageSnapshot: MktPackageSnapshot | null = null;

      if (item.packageId) {
        pkg = packageMap.get(item.packageId) ?? null;

        if (pkg) {
          packageSnapshot = this.snapshotService.createPackageSnapshot(pkg);
        }
      }

      const productSnapshot = this.snapshotService.createProductSnapshot(
        product,
        language,
      );

      results.push({
        product,
        package: pkg,
        productSnapshot,
        packageSnapshot,
        maxDevices: item.maxDevices ?? 1,
      });
    }

    this.logger.log('Snapshots created successfully', {
      count: results.length,
    });

    return results;
  }

  /**
   * Validate and create snapshots in one operation
   * Combines validation and snapshot creation for efficiency
   *
   * @param items - External product inputs from order request
   * @param language - Display language for snapshots
   * @param userContext - OAuth2 user context for API calls
   * @returns Validation result and snapshots if valid
   */
  async validateAndCreateSnapshots(
    items: ExternalMktProductInput[],
    language: MktSupportedLanguage = 'vi',
    userContext?: UserContext,
  ): Promise<{
    validation: ProductValidationResult;
    snapshots: ProductWithSnapshot[];
  }> {
    // First validate
    const validation = await this.validateProducts(items, userContext);

    if (!validation.valid) {
      return {
        validation,
        snapshots: [],
      };
    }

    // Then create snapshots
    const snapshots = await this.createSnapshots(items, language, userContext);

    return {
      validation,
      snapshots,
    };
  }

  /**
   * Verify snapshot integrity
   *
   * @param snapshot - Product snapshot to verify
   * @returns True if checksum is valid
   */
  verifySnapshot(snapshot: MktProductSnapshot): boolean {
    return this.snapshotService.verifyChecksum(snapshot);
  }

  /**
   * Get product by ID
   */
  async getProductById(
    productId: string,
    userContext?: UserContext,
  ): Promise<MktProduct | null> {
    return this.productProxyService.getProduct(productId, userContext);
  }

  /**
   * Get package by ID
   */
  async getPackageById(
    packageId: string,
    productId: string,
    userContext?: UserContext,
  ): Promise<MktProductPackage | null> {
    return this.productProxyService.getPackage(
      packageId,
      userContext,
      productId,
    );
  }
}
