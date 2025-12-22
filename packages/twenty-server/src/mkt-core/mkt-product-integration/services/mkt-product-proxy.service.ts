import { Injectable, Logger } from '@nestjs/common';

import { UserContext } from 'src/mkt-core/oauth2-client/types';
import {
  MktOrderValidationItem,
  MktPackageSnapshot,
  MktPaginatedData,
  MktProduct,
  MktProductPackage,
  MktProductQueryParams,
  MktProductSnapshot,
  MktSupportedLanguage,
  MktValidationResult,
} from 'src/mkt-core/mkt-product-integration/types';
import { MktLicenseResponse } from 'src/mkt-core/mkt-license-integration/types';
import { MktLicenseSnapshot } from 'src/mkt-core/order/types';
import {
  MKT_DEFAULT_LANGUAGE,
  MKT_PRODUCT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-product-integration/constants';
import { MKT_CACHE_MESSAGES } from 'src/mkt-core/mkt-product-integration/message';
import {
  MktPackageRepository,
  MktProductRepository,
} from 'src/mkt-core/mkt-product-integration/repositories';
import { getErrorMessage } from 'src/mkt-core/utils';

import { MktProductCacheService } from './mkt-product-cache.service';
import { MktSnapshotService } from './mkt-snapshot.service';
import { MktValidationService } from './mkt-validation.service';

/**
 * MktProductProxyService - Facade service for product operations
 *
 * Responsibilities:
 * - Orchestrate cache and repository layers
 * - Provide unified API for product/package operations
 * - Delegate validation to MktValidationService
 * - Delegate snapshots to MktSnapshotService
 *
 * Architecture:
 * - Uses Repository layer for data access (HTTP calls)
 * - Uses CacheService for caching
 * - Uses ValidationService for order validation
 * - Uses SnapshotService for creating immutable snapshots
 */
@Injectable()
export class MktProductProxyService {
  private readonly logger = new Logger(MKT_PRODUCT_LOG_CONTEXT);

  constructor(
    private readonly productRepository: MktProductRepository,
    private readonly packageRepository: MktPackageRepository,
    private readonly cacheService: MktProductCacheService,
    private readonly snapshotService: MktSnapshotService,
    private readonly validationService: MktValidationService,
  ) {}

  // ============================================
  // PRODUCT OPERATIONS
  // ============================================

  /**
   * Get product by ID with caching
   * Gracefully handles OAuth2 server unavailability by returning cached data or null
   */
  async getProduct(
    productId: string,
    userContext?: UserContext,
  ): Promise<MktProduct | null> {
    // Check cache first
    const cached = await this.cacheService.getProduct(productId);

    if (cached) {
      this.logger.debug(MKT_CACHE_MESSAGES.SUCCESS.HIT, { productId });

      return this.attachPackagesToProduct(cached);
    }

    // Fetch from repository with graceful error handling
    try {
      const product = await this.productRepository.findById(
        productId,
        userContext,
      );

      if (!product) {
        return null;
      }

      // Cache result
      await this.cacheService.setProduct(productId, product);

      return this.attachPackagesToProduct(product);
    } catch (error) {
      // OAuth2 server unavailable - return null instead of crashing
      this.logger.warn(
        `Failed to fetch product from server, OAuth2 may be unavailable: ${getErrorMessage(error)}`,
        { productId },
      );

      return null;
    }
  }

  /**
   * Get product by code with caching
   * Gracefully handles OAuth2 server unavailability by returning cached data or null
   */
  async getProductByCode(
    code: string,
    userContext?: UserContext,
  ): Promise<MktProduct | null> {
    // Check cache first
    const cached = await this.cacheService.getProductByCode(code);

    if (cached) {
      this.logger.debug(MKT_CACHE_MESSAGES.SUCCESS.HIT, { code });

      return this.attachPackagesToProduct(cached);
    }

    // Fetch from repository with graceful error handling
    try {
      const product = await this.productRepository.findByCode(
        code,
        userContext,
      );

      if (!product) {
        return null;
      }

      // Cache result
      await this.cacheService.setProduct(product.id, product);
      await this.cacheService.setProductCodeMapping(code, product.id);

      return this.attachPackagesToProduct(product);
    } catch (error) {
      // OAuth2 server unavailable - return null instead of crashing
      this.logger.warn(
        `Failed to fetch product by code from server, OAuth2 may be unavailable: ${getErrorMessage(error)}`,
        { code },
      );

      return null;
    }
  }

  /**
   * Get products list with pagination
   * Gracefully handles OAuth2 server unavailability by returning empty result
   */
  async getProducts(
    params: MktProductQueryParams = {},
    userContext?: UserContext,
  ): Promise<MktPaginatedData<MktProduct>> {
    try {
      const result = await this.productRepository.findAll(params, userContext);

      // Cache products and attach packages
      if (result.data.length > 0) {
        await this.cacheAndAttachPackages(result.data);
      }

      return result;
    } catch (error) {
      // OAuth2 server unavailable - return empty result instead of crashing
      this.logger.warn(
        `Failed to fetch products list from server, OAuth2 may be unavailable: ${getErrorMessage(error)}`,
        { params },
      );

      return {
        data: [],
        total: 0,
        page: params.page ?? 1,
        limit: params.limit ?? 50,
        totalPages: 0,
      };
    }
  }

  /**
   * Get product with packages (ensures packages are loaded)
   */
  async getProductWithPackages(
    productId: string,
    userContext?: UserContext,
  ): Promise<MktProduct | null> {
    const product = await this.getProduct(productId, userContext);

    if (!product) {
      return null;
    }

    if (!product.packages || product.packages.length === 0) {
      product.packages = await this.getPackagesByProductId(
        productId,
        userContext,
      );
    }

    return product;
  }

  // ============================================
  // PACKAGE OPERATIONS
  // ============================================

  /**
   * Get package by ID with caching
   * Gracefully handles OAuth2 server unavailability by returning cached data or null
   */
  async getPackage(
    packageId: string,
    userContext?: UserContext,
    productId?: string,
  ): Promise<MktProductPackage | null> {
    // Check cache first (if productId provided)
    if (productId) {
      const cached = await this.cacheService.getPackageById(
        packageId,
        productId,
      );

      if (cached) {
        this.logger.debug(MKT_CACHE_MESSAGES.SUCCESS.HIT, { packageId });

        return cached;
      }
    }

    // Fetch from repository with graceful error handling
    try {
      const pkg = await this.packageRepository.findById(packageId, userContext);

      if (!pkg) {
        return null;
      }

      // Update cache if package has productId
      if (pkg.productId) {
        await this.updatePackageInCache(pkg);
      }

      return pkg;
    } catch (error) {
      // OAuth2 server unavailable - return null instead of crashing
      this.logger.warn(
        `Failed to fetch package from server, OAuth2 may be unavailable: ${getErrorMessage(error)}`,
        { packageId, productId },
      );

      return null;
    }
  }

  /**
   * Get packages list with pagination
   * Used by sync service for bulk operations
   * Gracefully handles OAuth2 server unavailability by returning empty result
   */
  async getPackages(
    params: { page?: number; limit?: number } = {},
    userContext?: UserContext,
  ): Promise<MktPaginatedData<MktProductPackage>> {
    try {
      return await this.packageRepository.findAll(params, userContext);
    } catch (error) {
      // OAuth2 server unavailable - return empty result instead of crashing
      this.logger.warn(
        `Failed to fetch packages list from server, OAuth2 may be unavailable: ${getErrorMessage(error)}`,
        { params },
      );

      return {
        data: [],
        total: 0,
        page: params.page ?? 1,
        limit: params.limit ?? 50,
        totalPages: 0,
      };
    }
  }

  /**
   * Get packages by product ID with caching
   * Gracefully handles OAuth2 server unavailability by returning cached data or empty array
   */
  async getPackagesByProductId(
    productId: string,
    userContext?: UserContext,
  ): Promise<MktProductPackage[]> {
    // Check cache first
    const cached = await this.cacheService.getPackagesByProductId(productId);

    if (cached) {
      this.logger.debug(MKT_CACHE_MESSAGES.SUCCESS.HIT, {
        productId,
        packagesCount: cached.length,
      });

      return cached;
    }

    // Fetch from repository with graceful error handling
    try {
      const packages = await this.packageRepository.findByProductId(
        productId,
        userContext,
      );

      // Cache result
      if (packages.length > 0) {
        await this.cacheService.setPackagesByProductId(productId, packages);
      }

      return packages;
    } catch (error) {
      // OAuth2 server unavailable - return empty array instead of crashing
      this.logger.warn(
        `Failed to fetch packages by product from server, OAuth2 may be unavailable: ${getErrorMessage(error)}`,
        { productId },
      );

      return [];
    }
  }

  // ============================================
  // SNAPSHOT OPERATIONS
  // ============================================

  /**
   * Create product snapshot for order
   */
  createProductSnapshot(
    product: MktProduct,
    language: MktSupportedLanguage = MKT_DEFAULT_LANGUAGE,
  ): MktProductSnapshot {
    return this.snapshotService.createProductSnapshot(product, language);
  }

  /**
   * Create package snapshot for order
   */
  createPackageSnapshot(pkg: MktProductPackage): MktPackageSnapshot {
    return this.snapshotService.createPackageSnapshot(pkg);
  }

  /**
   * Verify product snapshot integrity
   */
  verifyProductSnapshot(snapshot: MktProductSnapshot): boolean {
    return this.snapshotService.verifyChecksum(snapshot);
  }

  /**
   * Create license snapshot for order
   */
  createLicenseSnapshot(license: MktLicenseResponse): MktLicenseSnapshot {
    return this.snapshotService.createLicenseSnapshot(license);
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate products and packages for order creation
   */
  async validateForOrder(
    items: MktOrderValidationItem[],
    userContext?: UserContext,
  ): Promise<MktValidationResult> {
    return this.validationService.validateForOrder(
      items,
      (productId, ctx) => this.getProduct(productId, ctx),
      (packageId, ctx, prodId) => this.getPackage(packageId, ctx, prodId),
      userContext,
    );
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  /**
   * Invalidate product cache
   */
  async invalidateProductCache(productId: string): Promise<void> {
    await this.cacheService.invalidateProduct(productId);
  }

  /**
   * Invalidate packages cache by product ID
   */
  async invalidatePackagesByProductCache(productId: string): Promise<void> {
    await this.cacheService.invalidatePackagesByProduct(productId);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Attach packages from cache to product if not already present
   */
  private async attachPackagesToProduct(
    product: MktProduct,
  ): Promise<MktProduct> {
    if (!product.packages || product.packages.length === 0) {
      const cachedPackages = await this.cacheService.getPackagesByProductId(
        product.id,
      );

      if (cachedPackages) {
        product.packages = cachedPackages;
      }
    }

    return product;
  }

  /**
   * Cache products and attach packages from cache
   */
  private async cacheAndAttachPackages(products: MktProduct[]): Promise<void> {
    const promises = products.map(async (product) => {
      await this.cacheService.setProduct(product.id, product);
      await this.attachPackagesToProduct(product);
    });

    await Promise.all(promises);
  }

  /**
   * Update or add package in the cached packages array
   */
  private async updatePackageInCache(pkg: MktProductPackage): Promise<void> {
    const existingPackages =
      (await this.cacheService.getPackagesByProductId(pkg.productId)) ?? [];

    const updatedPackages = existingPackages.some((p) => p.id === pkg.id)
      ? existingPackages.map((p) => (p.id === pkg.id ? pkg : p))
      : [...existingPackages, pkg];

    await this.cacheService.setPackagesByProductId(
      pkg.productId,
      updatedPackages,
    );
  }
}
