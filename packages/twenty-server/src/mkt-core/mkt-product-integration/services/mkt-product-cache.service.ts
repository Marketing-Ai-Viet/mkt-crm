import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

import {
  MktProduct,
  MktProductPackage,
} from 'src/mkt-core/mkt-product-integration/types';
import {
  MKT_CACHE_KEYS,
  MKT_CACHE_TTL,
  MKT_FALLBACK_CACHE_TTL,
  MKT_PRODUCT_LOG_CONTEXT,
  MKT_PRODUCT_MESSAGES,
  MKT_PRODUCT_ERROR_BUILDER,
} from 'src/mkt-core/mkt-product-integration/constants';

@Injectable()
export class MktProductCacheService {
  private readonly logger = new Logger(MKT_PRODUCT_LOG_CONTEXT);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  // ============================================
  // PRODUCT CACHE
  // ============================================

  /**
   * Get product from cache by ID
   */
  async getProduct(productId: string): Promise<MktProduct | null> {
    try {
      const key = MKT_CACHE_KEYS.PRODUCT(productId);
      const cached = await this.cacheManager.get<MktProduct>(key);

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
      const mappingKey = MKT_CACHE_KEYS.PRODUCT_CODE(code);
      const productId = await this.cacheManager.get<string>(mappingKey);

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
      const key = MKT_CACHE_KEYS.PRODUCT(productId);

      await this.cacheManager.set(key, product, MKT_CACHE_TTL * 1000);

      // Also set fallback cache with longer TTL
      const fallbackKey = MKT_CACHE_KEYS.PRODUCT_FALLBACK(productId);

      await this.cacheManager.set(
        fallbackKey,
        product,
        MKT_FALLBACK_CACHE_TTL * 1000,
      );

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
      const key = MKT_CACHE_KEYS.PRODUCT_CODE(code);

      await this.cacheManager.set(key, productId, MKT_CACHE_TTL * 1000);
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
      const key = MKT_CACHE_KEYS.PRODUCT_FALLBACK(productId);

      return (await this.cacheManager.get<MktProduct>(key)) ?? null;
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
      const key = MKT_CACHE_KEYS.PACKAGE(packageId);
      const cached = await this.cacheManager.get<MktProductPackage>(key);

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
      const key = MKT_CACHE_KEYS.PACKAGE(packageId);

      await this.cacheManager.set(key, pkg, MKT_CACHE_TTL * 1000);

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
      const key = MKT_CACHE_KEYS.PACKAGES_BY_PRODUCT(productId);

      return (await this.cacheManager.get<MktProductPackage[]>(key)) ?? null;
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
      const key = MKT_CACHE_KEYS.PACKAGES_BY_PRODUCT(productId);

      await this.cacheManager.set(key, packages, MKT_CACHE_TTL * 1000);

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
      await this.cacheManager.del(MKT_CACHE_KEYS.PRODUCT(productId));
      await this.cacheManager.del(
        MKT_CACHE_KEYS.PACKAGES_BY_PRODUCT(productId),
      );

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
      await this.cacheManager.del(MKT_CACHE_KEYS.PACKAGE(packageId));

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
