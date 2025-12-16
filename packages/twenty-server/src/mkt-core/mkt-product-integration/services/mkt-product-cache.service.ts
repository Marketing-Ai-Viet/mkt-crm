import { Injectable, Logger } from '@nestjs/common';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import {
  MktProduct,
  MktProductPackage,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  CACHE_KEYS,
  MKT_FALLBACK_CACHE_TTL,
  MKT_PRODUCT_ERROR_BUILDER,
  MKT_PRODUCT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-product-integration/constants';
import { MKT_CACHE_MESSAGES } from 'src/mkt-core/mkt-product-integration/message';
import { getErrorMessage } from 'src/mkt-core/utils';

/**
 * MktProductCacheService - Optimized cache service (Option A)
 *
 * Cache structure:
 * - digital:{productId} → Product data (24h TTL)
 * - digital:code:{code} → productId mapping (24h TTL)
 * - digital:pkgs:{productId} → [packages] array (24h TTL)
 *
 * Optimizations:
 * - No fallback duplicate (use longer TTL directly)
 * - No individual pkg:{id} (lookup from pkgs array)
 * - Code→id mapping for efficient lookup by code
 */
@Injectable()
export class MktProductCacheService {
  private readonly logger = new Logger(MKT_PRODUCT_LOG_CONTEXT);
  private readonly cacheTtlMs = MKT_FALLBACK_CACHE_TTL * 1000; // 24 hours

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
        this.logger.debug(MKT_CACHE_MESSAGES.SUCCESS.HIT, { key });
      }

      return cached ?? null;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(getErrorMessage(error)),
        { productId },
      );

      return null;
    }
  }

  /**
   * Get product from cache by code (uses code→id mapping)
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
        MKT_PRODUCT_ERROR_BUILDER.cacheError(getErrorMessage(error)),
        { code },
      );

      return null;
    }
  }

  /**
   * Set product in cache (single entry with 24h TTL)
   */
  async setProduct(productId: string, product: MktProduct): Promise<void> {
    try {
      const key = CACHE_KEYS.product(productId);

      await this.cacheStorage.set(key, product, this.cacheTtlMs);

      // Also set code→id mapping if product has code
      if (product.code) {
        await this.setProductCodeMapping(product.code, productId);
      }

      this.logger.debug(MKT_CACHE_MESSAGES.SUCCESS.SET, { key });
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(getErrorMessage(error)),
        { productId },
      );
    }
  }

  /**
   * Set product code→id mapping
   */
  async setProductCodeMapping(code: string, productId: string): Promise<void> {
    try {
      const key = CACHE_KEYS.productCode(code);

      await this.cacheStorage.set(key, productId, this.cacheTtlMs);
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(getErrorMessage(error)),
        { code, productId },
      );
    }
  }

  // ============================================
  // PACKAGE CACHE (by product only)
  // ============================================

  /**
   * Get packages by product ID from cache
   */
  async getPackagesByProductId(
    productId: string,
  ): Promise<MktProductPackage[] | null> {
    try {
      const key = CACHE_KEYS.packagesByProduct(productId);
      const cached = await this.cacheStorage.get<MktProductPackage[]>(key);

      if (cached) {
        this.logger.debug(MKT_CACHE_MESSAGES.SUCCESS.HIT, {
          key,
          count: cached.length,
        });
      }

      return cached ?? null;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(getErrorMessage(error)),
        { productId },
      );

      return null;
    }
  }

  /**
   * Set packages by product ID in cache (single array entry)
   */
  async setPackagesByProductId(
    productId: string,
    packages: MktProductPackage[],
  ): Promise<void> {
    try {
      const key = CACHE_KEYS.packagesByProduct(productId);

      await this.cacheStorage.set(key, packages, this.cacheTtlMs);

      this.logger.debug(MKT_CACHE_MESSAGES.SUCCESS.SET, {
        key,
        count: packages.length,
      });
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(getErrorMessage(error)),
        { productId },
      );
    }
  }

  /**
   * Get single package by ID (searches in pkgs arrays)
   * Returns null if not found - caller should fetch from API
   */
  async getPackageById(
    packageId: string,
    productId?: string,
  ): Promise<MktProductPackage | null> {
    try {
      // If productId is provided, search in that product's packages only
      if (productId) {
        const packages = await this.getPackagesByProductId(productId);

        return packages?.find((pkg) => pkg.id === packageId) ?? null;
      }

      // Without productId, we can't efficiently find the package
      // Return null and let caller fetch from API
      return null;
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(getErrorMessage(error)),
        { packageId, productId },
      );

      return null;
    }
  }

  // ============================================
  // CACHE INVALIDATION
  // ============================================

  /**
   * Invalidate product cache (product + packages + code mapping)
   */
  async invalidateProduct(
    productId: string,
    productCode?: string,
  ): Promise<void> {
    try {
      await this.cacheStorage.del(CACHE_KEYS.product(productId));
      await this.cacheStorage.del(CACHE_KEYS.packagesByProduct(productId));

      if (productCode) {
        await this.cacheStorage.del(CACHE_KEYS.productCode(productCode));
      }

      this.logger.debug(MKT_CACHE_MESSAGES.SUCCESS.INVALIDATED, { productId });
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(getErrorMessage(error)),
        { productId },
      );
    }
  }

  /**
   * Invalidate packages for a product
   */
  async invalidatePackagesByProduct(productId: string): Promise<void> {
    try {
      await this.cacheStorage.del(CACHE_KEYS.packagesByProduct(productId));

      this.logger.debug(MKT_CACHE_MESSAGES.SUCCESS.INVALIDATED, {
        productId,
        type: 'packages',
      });
    } catch (error) {
      this.logger.error(
        MKT_PRODUCT_ERROR_BUILDER.cacheError(getErrorMessage(error)),
        { productId },
      );
    }
  }
}
