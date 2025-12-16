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
  MKT_PRODUCT_ERROR_BUILDER,
} from 'src/mkt-core/mkt-product-integration/constants';
import { MKT_PRODUCT_MESSAGES } from 'src/mkt-core/mkt-product-integration/message';

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
   * Also attaches packages from cache if available
   */
  async getProduct(
    productId: string,
    userContext?: UserContext,
  ): Promise<MktProduct | null> {
    // Check cache first
    const cached = await this.cacheService.getProduct(productId);

    if (cached) {
      this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_HIT, { productId });

      // Attach packages from cache if not already present
      if (!cached.packages || cached.packages.length === 0) {
        const cachedPackages =
          await this.cacheService.getPackagesByProductId(productId);

        if (cachedPackages) {
          cached.packages = cachedPackages;
        }
      }

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

      const product = response.data;

      // Cache result
      await this.cacheService.setProduct(productId, product);

      // Attach packages from cache if available
      const cachedPackages =
        await this.cacheService.getPackagesByProductId(productId);

      if (cachedPackages) {
        product.packages = cachedPackages;
      }

      return product;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchFailed(this.getErrorMessage(error)),
        { productId },
      );

      throw error;
    }
  }

  /**
   * Get product by code with caching
   * Also attaches packages from cache if available
   */
  async getProductByCode(
    code: string,
    userContext?: UserContext,
  ): Promise<MktProduct | null> {
    // Check cache first
    const cached = await this.cacheService.getProductByCode(code);

    if (cached) {
      this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_HIT, { code });

      // Attach packages from cache if not already present
      if (!cached.packages || cached.packages.length === 0) {
        const cachedPackages = await this.cacheService.getPackagesByProductId(
          cached.id,
        );

        if (cachedPackages) {
          cached.packages = cachedPackages;
        }
      }

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

      const product = response.data;

      // Cache result
      await this.cacheService.setProduct(product.id, product);
      await this.cacheService.setProductCodeMapping(code, product.id);

      // Attach packages from cache if available
      const cachedPackages = await this.cacheService.getPackagesByProductId(
        product.id,
      );

      if (cachedPackages) {
        product.packages = cachedPackages;
      }

      return product;
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
   * Automatically attaches packages from cache for each product
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

      const result = response.data;

      // Cache products and attach packages from cache
      if (result.data.length > 0) {
        await this.cacheProductsAndAttachPackages(result.data);
      }

      return result;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.fetchFailed(this.getErrorMessage(error)),
        { params },
      );

      throw error;
    }
  }

  /**
   * Cache products and attach packages from cache
   */
  private async cacheProductsAndAttachPackages(
    products: MktProduct[],
  ): Promise<void> {
    const cachePromises = products.map(async (product) => {
      // Cache product
      await this.cacheService.setProduct(product.id, product);

      // Attach packages from cache if not already present
      if (!product.packages || product.packages.length === 0) {
        const cachedPackages = await this.cacheService.getPackagesByProductId(
          product.id,
        );

        if (cachedPackages) {
          product.packages = cachedPackages;
        }
      }
    });

    await Promise.all(cachePromises);
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
   * Note: Cache lookup requires productId for efficiency (searches in pkgs:{productId} array)
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
        this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_HIT, { packageId });

        return cached;
      }
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

      // Cache packages by productId if available
      const pkg = response.data;

      if (pkg.productId) {
        const existingPackages =
          (await this.cacheService.getPackagesByProductId(pkg.productId)) ?? [];

        // Update or add package in the array
        const updatedPackages = existingPackages.some((p) => p.id === packageId)
          ? existingPackages.map((p) => (p.id === packageId ? pkg : p))
          : [...existingPackages, pkg];

        await this.cacheService.setPackagesByProductId(
          pkg.productId,
          updatedPackages,
        );
      }

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
      const url = this.buildUrl(MKT_PRODUCT_ENDPOINTS.GET_PACKAGES_BY_PRODUCT, {
        productId,
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
  createPackageSnapshot(pkg: MktProductPackage): MktPackageSnapshot {
    return this.snapshotService.createPackageSnapshot(pkg);
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
        const pkg = await this.getPackage(
          item.packageId,
          userContext,
          item.productId,
        );

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
   * Invalidate packages cache by product ID
   * Note: Packages are cached by productId, not individually
   */
  async invalidatePackagesByProductCache(productId: string): Promise<void> {
    await this.cacheService.invalidatePackagesByProduct(productId);
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
