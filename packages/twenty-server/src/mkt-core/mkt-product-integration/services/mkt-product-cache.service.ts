import { Injectable, Logger } from '@nestjs/common';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import {
  MktProduct,
  MktProductPackage,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  MKT_CACHE_TTL,
  MKT_FALLBACK_CACHE_TTL,
  MKT_PRODUCT_LOG_CONTEXT,
  MKT_PRODUCT_MESSAGES,
  MKT_PRODUCT_ERROR_BUILDER,
} from 'src/mkt-core/mkt-product-integration/constants';

// ============================================
// CACHE KEY BUILDERS
// ============================================

const CACHE_KEYS = {
  product: (id: string) => `product:${id}`,
  productCode: (code: string) => `product:code:${code}`,
  productFallback: (id: string) => `product:fallback:${id}`,
  package: (id: string) => `package:${id}`,
  packageCode: (code: string) => `package:code:${code}`,
  packagesByProduct: (productId: string) => `packages:product:${productId}`,
} as const;

// ============================================
// SERVICE
// ============================================

@Injectable()
export class MktProductCacheService {
  private readonly logger = new Logger(MKT_PRODUCT_LOG_CONTEXT);

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.MktProduct)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  // ============================================
  // PRODUCT CACHE
  // ============================================

  /**
   * Get product from cache by ID
   */
  async getProduct(productId: string): Promise<MktProduct | null> {
    try {
      const key = CACHE_KEYS.product(productId);
      const cached = await this.cacheStorage.get<MktProduct>(key);

      if (cached) {
        this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_HIT, { key });
      }

      return cached ?? null;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(this.getErrorMessage(error)),
        { productId },
      );

      return null;
    }
  }

  /**
   * Get product from cache by code
   */
  async getProductByCode(code: string): Promise<MktProduct | null> {
    try {
      const mappingKey = CACHE_KEYS.productCode(code);
      const productId = await this.cacheStorage.get<string>(mappingKey);

      if (!productId) {
        return null;
      }

      return this.getProduct(productId);
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(this.getErrorMessage(error)),
        { code },
      );

      return null;
    }
  }

  /**
   * Set product in cache
   */
  async setProduct(productId: string, product: MktProduct): Promise<void> {
    try {
      const key = CACHE_KEYS.product(productId);
      const ttlMs = MKT_CACHE_TTL * 1000;

      await this.cacheStorage.set(key, product, ttlMs);

      // Also set fallback cache with longer TTL
      const fallbackKey = CACHE_KEYS.productFallback(productId);
      const fallbackTtlMs = MKT_FALLBACK_CACHE_TTL * 1000;

      await this.cacheStorage.set(fallbackKey, product, fallbackTtlMs);

      this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_SET, { key });
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(this.getErrorMessage(error)),
        { productId },
      );
    }
  }

  /**
   * Set product code to ID mapping
   */
  async setProductCodeMapping(code: string, productId: string): Promise<void> {
    try {
      const key = CACHE_KEYS.productCode(code);
      const ttlMs = MKT_CACHE_TTL * 1000;

      await this.cacheStorage.set(key, productId, ttlMs);
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(this.getErrorMessage(error)),
        { code, productId },
      );
    }
  }

  /**
   * Get product from fallback cache (used when API is unavailable)
   */
  async getProductFromFallback(productId: string): Promise<MktProduct | null> {
    try {
      const key = CACHE_KEYS.productFallback(productId);

      return (await this.cacheStorage.get<MktProduct>(key)) ?? null;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(this.getErrorMessage(error)),
        { productId },
      );

      return null;
    }
  }

  // ============================================
  // PACKAGE CACHE
  // ============================================

  /**
   * Get package from cache by ID
   */
  async getPackage(packageId: string): Promise<MktProductPackage | null> {
    try {
      const key = CACHE_KEYS.package(packageId);
      const cached = await this.cacheStorage.get<MktProductPackage>(key);

      if (cached) {
        this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_HIT, { key });
      }

      return cached ?? null;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(this.getErrorMessage(error)),
        { packageId },
      );

      return null;
    }
  }

  /**
   * Set package in cache
   */
  async setPackage(packageId: string, pkg: MktProductPackage): Promise<void> {
    try {
      const key = CACHE_KEYS.package(packageId);
      const ttlMs = MKT_CACHE_TTL * 1000;

      await this.cacheStorage.set(key, pkg, ttlMs);

      this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_SET, { key });
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(this.getErrorMessage(error)),
        { packageId },
      );
    }
  }

  /**
   * Get packages by product ID from cache
   */
  async getPackagesByProductId(
    productId: string,
  ): Promise<MktProductPackage[] | null> {
    try {
      const key = CACHE_KEYS.packagesByProduct(productId);

      return (await this.cacheStorage.get<MktProductPackage[]>(key)) ?? null;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(this.getErrorMessage(error)),
        { productId },
      );

      return null;
    }
  }

  /**
   * Set packages by product ID in cache
   */
  async setPackagesByProductId(
    productId: string,
    packages: MktProductPackage[],
  ): Promise<void> {
    try {
      const key = CACHE_KEYS.packagesByProduct(productId);
      const ttlMs = MKT_CACHE_TTL * 1000;

      await this.cacheStorage.set(key, packages, ttlMs);

      // Also cache individual packages
      for (const pkg of packages) {
        await this.setPackage(pkg.id, pkg);
      }

      this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_SET, { key });
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(this.getErrorMessage(error)),
        { productId },
      );
    }
  }

  // ============================================
  // CACHE INVALIDATION
  // ============================================

  /**
   * Invalidate product cache
   */
  async invalidateProduct(productId: string): Promise<void> {
    try {
      await this.cacheStorage.del(CACHE_KEYS.product(productId));
      await this.cacheStorage.del(CACHE_KEYS.packagesByProduct(productId));

      this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_INVALIDATE, { productId });
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(this.getErrorMessage(error)),
        { productId },
      );
    }
  }

  /**
   * Invalidate package cache
   */
  async invalidatePackage(packageId: string): Promise<void> {
    try {
      await this.cacheStorage.del(CACHE_KEYS.package(packageId));

      this.logger.debug(MKT_PRODUCT_MESSAGES.CACHE_INVALIDATE, { packageId });
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(this.getErrorMessage(error)),
        { packageId },
      );
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
