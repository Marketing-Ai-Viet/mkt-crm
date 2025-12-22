import { Injectable, Logger } from '@nestjs/common';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { GenericComboCalculationResult } from 'src/mkt-core/mkt-combo/types/generic-combo.types';
import {
  GENERIC_COMBO_LOG_CONTEXT,
  GENERIC_COMBO_CACHE,
} from 'src/mkt-core/mkt-combo/constants/generic-combo.constants';

/**
 * Service quản lý cache cho Generic Combo
 * Sử dụng Redis cache thông qua CacheStorageService
 */
@Injectable()
export class GenericComboCacheService {
  private readonly logger = new Logger(GENERIC_COMBO_LOG_CONTEXT);

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.ModuleMessaging)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  /**
   * Lấy cache key cho combo calculation
   */
  private getCalculationCacheKey(workspaceId: string, comboId: string): string {
    return `${GENERIC_COMBO_CACHE.KEY_PREFIX}:${workspaceId}:calc:${comboId}`;
  }

  /**
   * Lấy cache key cho combo data
   */
  private getComboCacheKey(workspaceId: string, comboId: string): string {
    return `${GENERIC_COMBO_CACHE.KEY_PREFIX}:${workspaceId}:combo:${comboId}`;
  }

  /**
   * Lấy cache key cho combo by code
   */
  private getCodeMappingCacheKey(
    workspaceId: string,
    comboCode: string,
  ): string {
    return `${GENERIC_COMBO_CACHE.KEY_PREFIX}:${workspaceId}:code:${comboCode}`;
  }

  /**
   * Lấy kết quả calculation từ cache
   */
  async getCalculation(
    workspaceId: string,
    comboId: string,
  ): Promise<GenericComboCalculationResult | null> {
    const key = this.getCalculationCacheKey(workspaceId, comboId);

    try {
      const cached = await this.cacheStorage.get<string>(key);

      if (cached) {
        this.logger.debug('Cache hit for calculation', { comboId });

        return JSON.parse(cached) as GenericComboCalculationResult;
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to get calculation from cache', {
        comboId,
        error,
      });

      return null;
    }
  }

  /**
   * Lưu kết quả calculation vào cache
   */
  async setCalculation(
    workspaceId: string,
    comboId: string,
    result: GenericComboCalculationResult,
  ): Promise<void> {
    const key = this.getCalculationCacheKey(workspaceId, comboId);

    try {
      await this.cacheStorage.set(
        key,
        JSON.stringify(result),
        GENERIC_COMBO_CACHE.CALCULATION_TTL_SECONDS * 1000,
      );

      this.logger.debug('Cached calculation result', { comboId });
    } catch (error) {
      this.logger.warn('Failed to cache calculation', { comboId, error });
    }
  }

  /**
   * Lấy combo ID từ code mapping
   */
  async getComboIdByCode(
    workspaceId: string,
    comboCode: string,
  ): Promise<string | null> {
    const key = this.getCodeMappingCacheKey(workspaceId, comboCode);

    try {
      const cached = await this.cacheStorage.get<string>(key);

      return cached ?? null;
    } catch (error) {
      this.logger.warn('Failed to get combo ID by code from cache', {
        comboCode,
        error,
      });

      return null;
    }
  }

  /**
   * Lưu code mapping vào cache
   */
  async setCodeMapping(
    workspaceId: string,
    comboCode: string,
    comboId: string,
  ): Promise<void> {
    const key = this.getCodeMappingCacheKey(workspaceId, comboCode);

    try {
      await this.cacheStorage.set(
        key,
        comboId,
        GENERIC_COMBO_CACHE.TTL_SECONDS * 1000,
      );

      this.logger.debug('Cached code mapping', { comboCode, comboId });
    } catch (error) {
      this.logger.warn('Failed to cache code mapping', { comboCode, error });
    }
  }

  /**
   * Invalidate cache cho combo
   */
  async invalidateCombo(workspaceId: string, comboId: string): Promise<void> {
    const calculationKey = this.getCalculationCacheKey(workspaceId, comboId);
    const comboKey = this.getComboCacheKey(workspaceId, comboId);

    try {
      await Promise.all([
        this.cacheStorage.del(calculationKey),
        this.cacheStorage.del(comboKey),
      ]);

      this.logger.debug('Invalidated cache for combo', { comboId });
    } catch (error) {
      this.logger.warn('Failed to invalidate combo cache', { comboId, error });
    }
  }

  /**
   * Invalidate code mapping
   */
  async invalidateCodeMapping(
    workspaceId: string,
    comboCode: string,
  ): Promise<void> {
    const key = this.getCodeMappingCacheKey(workspaceId, comboCode);

    try {
      await this.cacheStorage.del(key);

      this.logger.debug('Invalidated code mapping cache', { comboCode });
    } catch (error) {
      this.logger.warn('Failed to invalidate code mapping cache', {
        comboCode,
        error,
      });
    }
  }
}
