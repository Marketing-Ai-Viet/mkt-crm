import { Injectable, Logger } from '@nestjs/common';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import {
  CACHE_TTL,
  REDIS_LOG_CONTEXT,
  TAG_INDEX_CACHE_PREFIX,
} from 'src/mkt-core/infrastructure/redis/constants';

// ============================================
// TYPES
// ============================================

/**
 * Result of invalidation operation
 */
export type InvalidationResult = {
  success: boolean;
  invalidatedKeys: number;
  errors?: string[];
};

/**
 * Options for tagging a cache key
 */
export type TagOptions = {
  /** TTL for tag mapping (should match or exceed cache TTL) */
  ttlMs?: number;
};

/**
 * Invalidation service configuration
 */
export type InvalidationConfig = {
  /** Prefix for tag index keys */
  tagIndexPrefix?: string;
  /** Default TTL for tag mappings (ms) */
  defaultTagTtlMs?: number;
  /** Max keys to process in batch */
  batchSize?: number;
};

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_CONFIG: Required<InvalidationConfig> = {
  tagIndexPrefix: TAG_INDEX_CACHE_PREFIX.INDEX,
  defaultTagTtlMs: CACHE_TTL.DAY * 1000, // 24 hours
  batchSize: 100,
};

/**
 * Redis Cache Invalidation Service
 *
 * Provides tag-based cache invalidation for smart cache management.
 *
 * Architecture:
 * - Each cache key can be associated with multiple tags
 * - Tags are stored in Redis sets: mkt:tag:index:{tag} -> [key1, key2, ...]
 * - Invalidating a tag deletes all associated keys
 *
 * @example
 * ```typescript
 * // Tag a cache key
 * await invalidationService.tagKey('mkt:license:data:lic-123', [
 *   'license',
 *   'license:id:lic-123',
 *   'license:user:user-456',
 * ]);
 *
 * // Invalidate all keys with a tag
 * await invalidationService.invalidateByTag('license:user:user-456');
 *
 * // Invalidate multiple tags
 * await invalidationService.invalidateByTags(['license', 'order']);
 * ```
 */
@Injectable()
export class RedisInvalidationService {
  private readonly logger = new Logger(`${REDIS_LOG_CONTEXT}:Invalidation`);
  private readonly config: Required<InvalidationConfig>;

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.MktOrder)
    private readonly cacheStorage: CacheStorageService,
  ) {
    this.config = DEFAULT_CONFIG;
  }

  // ============================================
  // TAG MANAGEMENT
  // ============================================

  /**
   * Associate a cache key with one or more tags
   *
   * @param cacheKey - The cache key to tag
   * @param tags - Array of tags to associate
   * @param options - Optional configuration
   */
  async tagKey(
    cacheKey: string,
    tags: string[],
    options?: TagOptions,
  ): Promise<void> {
    if (tags.length === 0) {
      return;
    }

    const ttlMs = options?.ttlMs ?? this.config.defaultTagTtlMs;

    try {
      const tagPromises = tags.map((tag) =>
        this.addKeyToTagIndex(tag, cacheKey, ttlMs),
      );

      await Promise.all(tagPromises);

      this.logger.debug(`Tagged key ${cacheKey} with ${tags.length} tags`);
    } catch (error) {
      this.logger.error(`Failed to tag key ${cacheKey}`, error);
    }
  }

  /**
   * Remove a cache key from all its tags
   *
   * @param cacheKey - The cache key to untag
   * @param tags - Array of tags to remove from
   */
  async untagKey(cacheKey: string, tags: string[]): Promise<void> {
    if (tags.length === 0) {
      return;
    }

    try {
      const untagPromises = tags.map((tag) =>
        this.removeKeyFromTagIndex(tag, cacheKey),
      );

      await Promise.all(untagPromises);

      this.logger.debug(`Untagged key ${cacheKey} from ${tags.length} tags`);
    } catch (error) {
      this.logger.error(`Failed to untag key ${cacheKey}`, error);
    }
  }

  // ============================================
  // INVALIDATION
  // ============================================

  /**
   * Invalidate all cache keys associated with a tag
   *
   * @param tag - The tag to invalidate
   * @returns Result with count of invalidated keys
   */
  async invalidateByTag(tag: string): Promise<InvalidationResult> {
    try {
      const tagIndexKey = this.buildTagIndexKey(tag);
      const keys = await this.getKeysFromTagIndex(tagIndexKey);

      if (keys.length === 0) {
        return { success: true, invalidatedKeys: 0 };
      }

      // Delete all cached keys in batches
      const deletedCount = await this.deleteKeysInBatches(keys);

      // Clean up the tag index
      await this.cacheStorage.del(tagIndexKey);

      this.logger.log(`Invalidated ${deletedCount} keys for tag: ${tag}`);

      return { success: true, invalidatedKeys: deletedCount };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Failed to invalidate tag ${tag}`, error);

      return { success: false, invalidatedKeys: 0, errors: [errorMessage] };
    }
  }

  /**
   * Invalidate all cache keys associated with multiple tags
   *
   * @param tags - Array of tags to invalidate
   * @returns Combined result
   */
  async invalidateByTags(tags: string[]): Promise<InvalidationResult> {
    if (tags.length === 0) {
      return { success: true, invalidatedKeys: 0 };
    }

    const results = await Promise.all(
      tags.map((tag) => this.invalidateByTag(tag)),
    );

    const totalInvalidated = results.reduce(
      (sum, r) => sum + r.invalidatedKeys,
      0,
    );
    const allErrors = results
      .filter((r) => r.errors)
      .flatMap((r) => r.errors ?? []);
    const allSuccess = results.every((r) => r.success);

    return {
      success: allSuccess,
      invalidatedKeys: totalInvalidated,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };
  }

  /**
   * Invalidate a specific cache key and remove from all tags
   *
   * @param cacheKey - The cache key to invalidate
   * @param tags - Tags to clean up (optional)
   */
  async invalidateKey(cacheKey: string, tags?: string[]): Promise<void> {
    try {
      // Delete the cache key
      await this.cacheStorage.del(cacheKey);

      // Clean up tag indexes if provided
      if (tags && tags.length > 0) {
        await this.untagKey(cacheKey, tags);
      }

      this.logger.debug(`Invalidated key: ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate key ${cacheKey}`, error);
    }
  }

  /**
   * Invalidate multiple cache keys
   *
   * @param cacheKeys - Array of cache keys to invalidate
   */
  async invalidateKeys(cacheKeys: string[]): Promise<InvalidationResult> {
    if (cacheKeys.length === 0) {
      return { success: true, invalidatedKeys: 0 };
    }

    try {
      const deletedCount = await this.deleteKeysInBatches(cacheKeys);

      this.logger.log(`Invalidated ${deletedCount} keys`);

      return { success: true, invalidatedKeys: deletedCount };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('Failed to invalidate keys', error);

      return { success: false, invalidatedKeys: 0, errors: [errorMessage] };
    }
  }

  /**
   * Invalidate all keys matching a pattern
   *
   * @param pattern - Redis pattern (e.g., 'mkt:license:*')
   */
  async invalidateByPattern(pattern: string): Promise<InvalidationResult> {
    try {
      const keys = await this.cacheStorage.scanByPattern(pattern, {
        maxKeys: 10000,
      });

      if (keys.length === 0) {
        return { success: true, invalidatedKeys: 0 };
      }

      const deletedCount = await this.deleteKeysInBatches(keys);

      this.logger.log(
        `Invalidated ${deletedCount} keys matching pattern: ${pattern}`,
      );

      return { success: true, invalidatedKeys: deletedCount };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Failed to invalidate pattern ${pattern}`, error);

      return { success: false, invalidatedKeys: 0, errors: [errorMessage] };
    }
  }

  // ============================================
  // TAG INDEX OPERATIONS
  // ============================================

  /**
   * Get all keys associated with a tag
   */
  async getKeysByTag(tag: string): Promise<string[]> {
    const tagIndexKey = this.buildTagIndexKey(tag);

    return this.getKeysFromTagIndex(tagIndexKey);
  }

  /**
   * Get count of keys associated with a tag
   */
  async getTagKeyCount(tag: string): Promise<number> {
    const keys = await this.getKeysByTag(tag);

    return keys.length;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private buildTagIndexKey(tag: string): string {
    return `${this.config.tagIndexPrefix}:${tag}`;
  }

  private async addKeyToTagIndex(
    tag: string,
    cacheKey: string,
    ttlMs: number,
  ): Promise<void> {
    const tagIndexKey = this.buildTagIndexKey(tag);

    // Get existing keys
    const existingKeys = await this.getKeysFromTagIndex(tagIndexKey);

    // Add new key if not exists
    if (!existingKeys.includes(cacheKey)) {
      existingKeys.push(cacheKey);
    }

    // Store updated set with TTL
    await this.cacheStorage.set(tagIndexKey, existingKeys, ttlMs);
  }

  private async removeKeyFromTagIndex(
    tag: string,
    cacheKey: string,
  ): Promise<void> {
    const tagIndexKey = this.buildTagIndexKey(tag);

    const existingKeys = await this.getKeysFromTagIndex(tagIndexKey);
    const filteredKeys = existingKeys.filter((key) => key !== cacheKey);

    if (filteredKeys.length === 0) {
      await this.cacheStorage.del(tagIndexKey);
    } else if (filteredKeys.length !== existingKeys.length) {
      // Only update if something was removed
      await this.cacheStorage.set(
        tagIndexKey,
        filteredKeys,
        this.config.defaultTagTtlMs,
      );
    }
  }

  private async getKeysFromTagIndex(tagIndexKey: string): Promise<string[]> {
    try {
      const keys = await this.cacheStorage.get<string[]>(tagIndexKey);

      return keys ?? [];
    } catch {
      return [];
    }
  }

  private async deleteKeysInBatches(keys: string[]): Promise<number> {
    let deletedCount = 0;

    for (let i = 0; i < keys.length; i += this.config.batchSize) {
      const batch = keys.slice(i, i + this.config.batchSize);
      const deletePromises = batch.map((key) => this.cacheStorage.del(key));

      await Promise.all(deletePromises);
      deletedCount += batch.length;
    }

    return deletedCount;
  }
}
