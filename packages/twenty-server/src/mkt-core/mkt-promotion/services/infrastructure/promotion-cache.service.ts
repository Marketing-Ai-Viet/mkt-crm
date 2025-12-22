import { Injectable, Logger } from '@nestjs/common';

import { MktPromotionWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion.workspace-entity';
import {
  PROMOTION_CACHE,
  PROMOTION_LOG_CONTEXT,
} from 'src/mkt-core/mkt-promotion/constants';
import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';

/**
 * PromotionCacheService - Service quản lý cache cho promotions
 * Sử dụng Redis cache thông qua WorkspaceCacheStorageService
 */
@Injectable()
export class PromotionCacheService {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.MktPromotion)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  /**
   * Lấy active promotions từ cache
   */
  async getActivePromotions(
    workspaceId: string,
  ): Promise<MktPromotionWorkspaceEntity[] | null> {
    const cacheKey = this.buildActivePromotionsKey(workspaceId);

    try {
      const result =
        await this.cacheStorage.get<MktPromotionWorkspaceEntity[]>(cacheKey);

      return result ?? null;
    } catch (error) {
      this.logger.warn('Failed to get active promotions from cache', {
        workspaceId,
        error,
      });

      return null;
    }
  }

  /**
   * Lưu active promotions vào cache
   */
  async setActivePromotions(
    workspaceId: string,
    promotions: MktPromotionWorkspaceEntity[],
  ): Promise<void> {
    const cacheKey = this.buildActivePromotionsKey(workspaceId);

    try {
      await this.cacheStorage.set(
        cacheKey,
        promotions,
        PROMOTION_CACHE.TTL_SECONDS,
      );

      this.logger.debug('Cached active promotions', {
        workspaceId,
        count: promotions.length,
      });
    } catch (error) {
      this.logger.warn('Failed to cache active promotions', {
        workspaceId,
        error,
      });
    }
  }

  /**
   * Invalidate active promotions cache
   */
  async invalidateActivePromotions(workspaceId: string): Promise<void> {
    const cacheKey = this.buildActivePromotionsKey(workspaceId);

    try {
      await this.cacheStorage.del(cacheKey);

      this.logger.debug('Invalidated active promotions cache', { workspaceId });
    } catch (error) {
      this.logger.warn('Failed to invalidate active promotions cache', {
        workspaceId,
        error,
      });
    }
  }

  /**
   * Lấy promotion từ cache theo ID
   */
  async getPromotion(
    workspaceId: string,
    promotionId: string,
  ): Promise<MktPromotionWorkspaceEntity | null> {
    const cacheKey = this.buildPromotionKey(workspaceId, promotionId);

    try {
      const result =
        await this.cacheStorage.get<MktPromotionWorkspaceEntity>(cacheKey);

      return result ?? null;
    } catch (error) {
      this.logger.warn('Failed to get promotion from cache', {
        promotionId,
        error,
      });

      return null;
    }
  }

  /**
   * Lưu promotion vào cache
   */
  async setPromotion(
    workspaceId: string,
    promotion: MktPromotionWorkspaceEntity,
  ): Promise<void> {
    const cacheKey = this.buildPromotionKey(workspaceId, promotion.id);

    try {
      await this.cacheStorage.set(
        cacheKey,
        promotion,
        PROMOTION_CACHE.TTL_SECONDS,
      );

      this.logger.debug('Cached promotion', { promotionId: promotion.id });
    } catch (error) {
      this.logger.warn('Failed to cache promotion', {
        promotionId: promotion.id,
        error,
      });
    }
  }

  /**
   * Invalidate promotion cache
   */
  async invalidatePromotion(
    workspaceId: string,
    promotionId: string,
  ): Promise<void> {
    const cacheKey = this.buildPromotionKey(workspaceId, promotionId);

    try {
      await this.cacheStorage.del(cacheKey);

      this.logger.debug('Invalidated promotion cache', { promotionId });
    } catch (error) {
      this.logger.warn('Failed to invalidate promotion cache', {
        promotionId,
        error,
      });
    }
  }

  /**
   * Lấy promotion từ cache theo code
   */
  async getPromotionByCode(
    workspaceId: string,
    code: string,
  ): Promise<MktPromotionWorkspaceEntity | null> {
    const cacheKey = this.buildPromotionByCodeKey(workspaceId, code);

    try {
      const result =
        await this.cacheStorage.get<MktPromotionWorkspaceEntity>(cacheKey);

      return result ?? null;
    } catch (error) {
      this.logger.warn('Failed to get promotion by code from cache', {
        code,
        error,
      });

      return null;
    }
  }

  /**
   * Lưu promotion vào cache theo code
   */
  async setPromotionByCode(
    workspaceId: string,
    code: string,
    promotion: MktPromotionWorkspaceEntity,
  ): Promise<void> {
    const cacheKey = this.buildPromotionByCodeKey(workspaceId, code);

    try {
      await this.cacheStorage.set(
        cacheKey,
        promotion,
        PROMOTION_CACHE.TTL_SECONDS,
      );

      this.logger.debug('Cached promotion by code', { code });
    } catch (error) {
      this.logger.warn('Failed to cache promotion by code', { code, error });
    }
  }

  /**
   * Build cache key cho active promotions
   */
  private buildActivePromotionsKey(workspaceId: string): string {
    return `${PROMOTION_CACHE.KEY_PREFIX}:${workspaceId}:${PROMOTION_CACHE.ACTIVE_PROMOTIONS_KEY}`;
  }

  /**
   * Build cache key cho promotion by ID
   */
  private buildPromotionKey(workspaceId: string, promotionId: string): string {
    return `${PROMOTION_CACHE.KEY_PREFIX}:${workspaceId}:${PROMOTION_CACHE.PROMOTION_BY_ID_PREFIX}:${promotionId}`;
  }

  /**
   * Build cache key cho promotion by code
   */
  private buildPromotionByCodeKey(workspaceId: string, code: string): string {
    return `${PROMOTION_CACHE.KEY_PREFIX}:${workspaceId}:${PROMOTION_CACHE.PROMOTION_BY_CODE_PREFIX}:${code}`;
  }
}
