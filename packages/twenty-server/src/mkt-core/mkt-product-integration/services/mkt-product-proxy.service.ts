import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OAuth2HttpService } from 'src/mkt-core/oauth2-client/services/oauth2-http.service';
import { UserContext } from 'src/mkt-core/oauth2-client/types';
import {
  MktProduct,
  MktProductPackage,
  MktProductSnapshot,
  MktPackageSnapshot,
  MktApiResponse,
  MktPaginatedData,
  MktProductQueryParams,
  MktSupportedLanguage,
  MktOrderValidationItem,
  MktValidationResult,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  MKT_PRODUCT_ENDPOINTS,
  MKT_DEFAULT_LANGUAGE,
  MKT_ORDERABLE_STATUSES,
  MKT_PRODUCT_LOG_CONTEXT,
  MKT_PRODUCT_MESSAGES,
  MKT_PRODUCT_ERROR_BUILDER,
} from 'src/mkt-core/mkt-product-integration/constants';

import { MktProductCacheService } from './mkt-product-cache.service';
import { MktSnapshotService } from './mkt-snapshot.service';

@Injectable()
export class MktProductProxyService {
  private readonly logger = new Logger(MKT_PRODUCT_LOG_CONTEXT);
  private readonly apiBaseUrl: string;

  constructor(
    private readonly oauth2Http: OAuth2HttpService,
    private readonly cacheService: MktProductCacheService,
    private readonly snapshotService: MktSnapshotService,
    private readonly configService: ConfigService,
  ) {
    this.apiBaseUrl =
      this.configService.get<string>('oauth2Client.serverUrl') ?? '';
  }

  // ============================================
  // PRODUCT OPERATIONS
  // ============================================

  /**
   * Get product by ID with caching
   */
  async getProduct(
    productId: string,
    userContext?: UserContext,
  ): Promise<MktProduct | null> {
    // Check cache first
    const cached = await this.cacheService.getProduct(productId);

    if (cached) {
      this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_HIT, { productId });

      return cached;
    }

    // Fetch from API
    this.logger.debug(MKT_PRODUCT_MESSAGES.FETCH_PRODUCT, { productId });

    try {
      const url = this.buildUrl(MKT_PRODUCT_ENDPOINTS.GET_BY_ID, {
        id: productId,
      });

      const response = await this.oauth2Http.get<MktApiResponse<MktProduct>>(
        url,
        undefined,
        userContext,
      );

      if (!response.success || !response.data) {
        return null;
      }

      // Cache result
      await this.cacheService.setProduct(productId, response.data);

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchFailed(this.getErrorMessage(error)),
        { productId },
      );

      // Try fallback cache
      const fallback =
        await this.cacheService.getProductFromFallback(productId);

      if (fallback) {
        this.logger.warn('Using fallback cache for product', { productId });

        return fallback;
      }

      throw error;
    }
  }

  /**
   * Get product by code with caching
   */
  async getProductByCode(
    code: string,
    userContext?: UserContext,
  ): Promise<MktProduct | null> {
    // Check cache first
    const cached = await this.cacheService.getProductByCode(code);

    if (cached) {
      this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_HIT, { code });

      return cached;
    }

    // Fetch from API
    this.logger.debug(MKT_PRODUCT_MESSAGES.FETCH_PRODUCT_BY_CODE, { code });

    try {
      const url = this.buildUrl(MKT_PRODUCT_ENDPOINTS.GET_BY_CODE, { code });

      const response = await this.oauth2Http.get<MktApiResponse<MktProduct>>(
        url,
        undefined,
        userContext,
      );

      if (!response.success || !response.data) {
        return null;
      }

      // Cache result
      await this.cacheService.setProduct(response.data.id, response.data);
      await this.cacheService.setProductCodeMapping(code, response.data.id);

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchFailed(this.getErrorMessage(error)),
        { code },
      );

      throw error;
    }
  }

  /**
   * Get products list with pagination
   */
  async getProducts(
    params: MktProductQueryParams = {},
    userContext?: UserContext,
  ): Promise<MktPaginatedData<MktProduct>> {
    this.logger.debug(MKT_PRODUCT_MESSAGES.FETCH_PRODUCTS, { params });

    try {
      const url = this.buildUrl(MKT_PRODUCT_ENDPOINTS.LIST);

      const response = await this.oauth2Http.get<
        MktApiResponse<MktPaginatedData<MktProduct>>
      >(url, { params }, userContext);

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchFailed(this.getErrorMessage(error)),
        { params },
      );

      throw error;
    }
  }

  /**
   * Get product with packages
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
   */
  async getPackage(
    packageId: string,
    userContext?: UserContext,
  ): Promise<MktProductPackage | null> {
    // Check cache first
    const cached = await this.cacheService.getPackage(packageId);

    if (cached) {
      this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_HIT, { packageId });

      return cached;
    }

    // Fetch from API
    this.logger.debug(MKT_PRODUCT_MESSAGES.FETCH_PACKAGE, { packageId });

    try {
      const url = this.buildUrl(MKT_PRODUCT_ENDPOINTS.GET_PACKAGE, {
        id: packageId,
      });

      const response = await this.oauth2Http.get<
        MktApiResponse<MktProductPackage>
      >(url, undefined, userContext);

      if (!response.success || !response.data) {
        return null;
      }

      // Cache result
      await this.cacheService.setPackage(packageId, response.data);

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchPackageFailed(
          this.getErrorMessage(error),
        ),
        { packageId },
      );

      throw error;
    }
  }

  /**
   * Get packages list with pagination
   * Used by MktProductSyncService for bulk sync
   */
  async getPackages(
    params: { page?: number; limit?: number } = {},
    userContext?: UserContext,
  ): Promise<MktPaginatedData<MktProductPackage>> {
    this.logger.debug('Fetching packages list from MKT Server', { params });

    try {
      const url = this.buildUrl(MKT_PRODUCT_ENDPOINTS.PACKAGES_LIST);

      const response = await this.oauth2Http.get<
        MktApiResponse<MktPaginatedData<MktProductPackage>>
      >(url, { params }, userContext);

      return response.data;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchPackageFailed(
          this.getErrorMessage(error),
        ),
        { params },
      );

      throw error;
    }
  }

  /**
   * Get packages by product ID with caching
   */
  async getPackagesByProductId(
    productId: string,
    userContext?: UserContext,
  ): Promise<MktProductPackage[]> {
    // Check cache first
    const cached = await this.cacheService.getPackagesByProductId(productId);

    if (cached) {
      this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_HIT, {
        productId,
        packagesCount: cached.length,
      });

      return cached;
    }

    // Fetch from API
    this.logger.debug(MKT_PRODUCT_MESSAGES.FETCH_PACKAGES_BY_PRODUCT, {
      productId,
    });

    try {
      const url = this.buildUrl(MKT_PRODUCT_ENDPOINTS.GET_PRODUCT_PACKAGES, {
        id: productId,
      });

      const response = await this.oauth2Http.get<
        MktApiResponse<MktProductPackage[]>
      >(url, undefined, userContext);

      const packages = response.data ?? [];

      // Cache result
      if (packages.length > 0) {
        await this.cacheService.setPackagesByProductId(productId, packages);
      }

      return packages;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchPackageFailed(
          this.getErrorMessage(error),
        ),
        { productId },
      );

      throw error;
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
  createPackageSnapshot(
    pkg: MktProductPackage,
    language: MktSupportedLanguage = MKT_DEFAULT_LANGUAGE,
  ): MktPackageSnapshot {
    return this.snapshotService.createPackageSnapshot(pkg, language);
  }

  /**
   * Verify product snapshot integrity
   */
  verifyProductSnapshot(snapshot: MktProductSnapshot): boolean {
    return this.snapshotService.verifyChecksum(snapshot);
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
    this.logger.debug(MKT_PRODUCT_MESSAGES.VALIDATION_START, {
      itemCount: items.length,
    });

    const errors: MktValidationResult['errors'] = [];

    for (const item of items) {
      const product = await this.getProduct(item.productId, userContext);

      if (!product) {
        errors.push({
          productId: item.productId,
          reason: MKT_PRODUCT_MESSAGES.PRODUCT_NOT_FOUND,
        });
        continue;
      }

      if (!MKT_ORDERABLE_STATUSES.includes(product.status as never)) {
        errors.push({
          productId: item.productId,
          reason: `Product status is ${product.status}`,
        });
        continue;
      }

      if (item.packageId) {
        const pkg = await this.getPackage(item.packageId, userContext);

        if (!pkg) {
          errors.push({
            productId: item.productId,
            packageId: item.packageId,
            reason: MKT_PRODUCT_MESSAGES.PACKAGE_NOT_FOUND,
          });
          continue;
        }

        if (pkg.productId !== item.productId) {
          errors.push({
            productId: item.productId,
            packageId: item.packageId,
            reason: 'Package does not belong to this product',
          });
          continue;
        }

        if (!pkg.isActive) {
          errors.push({
            productId: item.productId,
            packageId: item.packageId,
            reason: 'Package is not active',
          });
        }
      }
    }

    const isValid = errors.length === 0;

    if (isValid) {
      this.logger.debug(MKT_PRODUCT_MESSAGES.VALIDATION_SUCCESS, {
        itemCount: items.length,
      });
    } else {
      this.logger.warn(MKT_PRODUCT_MESSAGES.VALIDATION_FAILED, {
        errors,
      });
    }

    return { valid: isValid, errors };
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
   * Invalidate package cache
   */
  async invalidatePackageCache(packageId: string): Promise<void> {
    await this.cacheService.invalidatePackage(packageId);
  }

  // ============================================
  // HELPERS
  // ============================================

  private buildUrl(
    path: string,
    params?: Record<string, string | number>,
  ): string {
    let processedPath = path;

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        processedPath = processedPath.replace(`:${key}`, String(value));
      }
    }

    return `${this.apiBaseUrl}${processedPath}`;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
