import { Injectable, Logger } from '@nestjs/common';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import {
  CASBIN_CACHE_KEYS,
  CASBIN_CACHE_TTL,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/constants/cache-keys.constant';
import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

import {
  CheckPermissionResult,
  FilterCondition,
  PermissionSummary,
} from './rbac-enforcer.service';
import { UserContext } from './rbac-context.service';

/**
 * Cache stats type
 */
type CacheStats = {
  localCacheSize: number;
  hits: number;
  misses: number;
  invalidations: number;
  workspaces: string[];
};

/**
 * Local cache entry with timestamp
 */
type LocalCacheEntry<T> = {
  data: T;
  timestamp: number;
};

/**
 * Default cache TTLs in milliseconds
 */
const DEFAULT_CACHE_TTL = {
  USER_CONTEXT: CASBIN_CACHE_TTL.USER_ROLES * 1000, // 15 minutes
  PERMISSION_CHECK: 5 * 60 * 1000, // 5 minutes
  PERMISSION_SUMMARY: 5 * 60 * 1000, // 5 minutes
  DATA_FILTER: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Local cache TTL in milliseconds (shorter than Redis for freshness)
 */
const LOCAL_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * RBAC Cache Service
 *
 * Multi-tier caching for RBAC operations:
 * - Tier 1: In-memory cache for hot data (2min TTL)
 * - Tier 2: Redis cache for distributed caching (configurable TTL)
 *
 * Features:
 * - User context caching
 * - Permission check result caching
 * - Permission summary caching
 * - Data filter caching
 * - Pattern-based cache invalidation
 * - Cache statistics tracking
 *
 * Usage:
 * ```typescript
 * // Get cached user context
 * const context = await cacheService.getContext(userId, workspaceId);
 *
 * // Cache permission check result
 * await cacheService.setCheckResult(userId, workspaceId, resource, action, result);
 *
 * // Invalidate all cache for user
 * await cacheService.invalidateUser(userId, workspaceId);
 * ```
 */
@Injectable()
export class RbacCacheService {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:RbacCache`);

  // In-memory cache for hot data
  private readonly contextCache = new Map<
    string,
    LocalCacheEntry<UserContext>
  >();
  private readonly checkResultCache = new Map<
    string,
    LocalCacheEntry<CheckPermissionResult>
  >();
  private readonly summaryCache = new Map<
    string,
    LocalCacheEntry<PermissionSummary>
  >();
  private readonly filterCache = new Map<
    string,
    LocalCacheEntry<FilterCondition>
  >();

  // Statistics tracking
  private stats = {
    hits: 0,
    misses: 0,
    invalidations: 0,
  };

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.RbacUser)
    private readonly userCacheStorage: CacheStorageService,
    @InjectCacheStorage(CacheStorageNamespace.RbacPermission)
    private readonly permissionCacheStorage: CacheStorageService,
  ) {}

  // ============================================
  // User Context Cache
  // ============================================

  /**
   * Get cached user context
   *
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   * @returns Cached user context or null
   */
  async getContext(
    userId: string,
    workspaceId: string,
  ): Promise<UserContext | null> {
    const cacheKey = CASBIN_CACHE_KEYS.USER_CONTEXT(workspaceId, userId);

    // Check local cache first
    const localResult = this.getFromLocalCache(this.contextCache, cacheKey);

    if (localResult !== null) {
      this.stats.hits++;

      return localResult;
    }

    // Check Redis cache
    const redisResult = await this.userCacheStorage.get<UserContext>(cacheKey);

    if (redisResult) {
      this.stats.hits++;
      this.setLocalCache(this.contextCache, cacheKey, redisResult);

      return redisResult;
    }

    this.stats.misses++;

    return null;
  }

  /**
   * Cache user context
   *
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   * @param context - User context to cache
   * @param ttl - TTL in milliseconds (optional)
   */
  async setContext(
    userId: string,
    workspaceId: string,
    context: UserContext,
    ttl?: number,
  ): Promise<void> {
    const cacheKey = CASBIN_CACHE_KEYS.USER_CONTEXT(workspaceId, userId);
    const cacheTtl = ttl ?? DEFAULT_CACHE_TTL.USER_CONTEXT;

    // Set Redis cache
    await this.userCacheStorage.set(cacheKey, context, cacheTtl);

    // Set local cache
    this.setLocalCache(this.contextCache, cacheKey, context);

    this.logger.debug(
      `Cached user context for user: ${userId}, workspace: ${workspaceId}`,
    );
  }

  // ============================================
  // Permission Check Result Cache
  // ============================================

  /**
   * Get cached permission check result
   *
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   * @param resource - Resource name
   * @param action - Action name
   * @returns Cached result or null
   */
  async getCheckResult(
    userId: string,
    workspaceId: string,
    resource: string,
    action: string,
  ): Promise<CheckPermissionResult | null> {
    const cacheKey = CASBIN_CACHE_KEYS.PERMISSION_CHECK(
      workspaceId,
      userId,
      resource,
      action,
    );

    // Check local cache first
    const localResult = this.getFromLocalCache(this.checkResultCache, cacheKey);

    if (localResult !== null) {
      this.stats.hits++;

      return { ...localResult, cached: true };
    }

    // Check Redis cache
    const redisResult =
      await this.permissionCacheStorage.get<CheckPermissionResult>(cacheKey);

    if (redisResult) {
      this.stats.hits++;
      this.setLocalCache(this.checkResultCache, cacheKey, redisResult);

      return { ...redisResult, cached: true };
    }

    this.stats.misses++;

    return null;
  }

  /**
   * Cache permission check result
   *
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   * @param resource - Resource name
   * @param action - Action name
   * @param result - Permission check result
   * @param ttl - TTL in milliseconds (optional)
   */
  async setCheckResult(
    userId: string,
    workspaceId: string,
    resource: string,
    action: string,
    result: CheckPermissionResult,
    ttl?: number,
  ): Promise<void> {
    const cacheKey = CASBIN_CACHE_KEYS.PERMISSION_CHECK(
      workspaceId,
      userId,
      resource,
      action,
    );
    const cacheTtl = ttl ?? DEFAULT_CACHE_TTL.PERMISSION_CHECK;

    // Set Redis cache
    await this.permissionCacheStorage.set(cacheKey, result, cacheTtl);

    // Set local cache
    this.setLocalCache(this.checkResultCache, cacheKey, result);
  }

  // ============================================
  // Permission Summary Cache
  // ============================================

  /**
   * Get cached permission summary
   *
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   * @returns Cached summary or null
   */
  async getSummary(
    userId: string,
    workspaceId: string,
  ): Promise<PermissionSummary | null> {
    const cacheKey = CASBIN_CACHE_KEYS.PERMISSION_SUMMARY(workspaceId, userId);

    // Check local cache first
    const localResult = this.getFromLocalCache(this.summaryCache, cacheKey);

    if (localResult !== null) {
      this.stats.hits++;

      return localResult;
    }

    // Check Redis cache
    const redisResult =
      await this.permissionCacheStorage.get<PermissionSummary>(cacheKey);

    if (redisResult) {
      this.stats.hits++;
      this.setLocalCache(this.summaryCache, cacheKey, redisResult);

      return redisResult;
    }

    this.stats.misses++;

    return null;
  }

  /**
   * Cache permission summary
   *
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   * @param summary - Permission summary
   * @param ttl - TTL in milliseconds (optional)
   */
  async setSummary(
    userId: string,
    workspaceId: string,
    summary: PermissionSummary,
    ttl?: number,
  ): Promise<void> {
    const cacheKey = CASBIN_CACHE_KEYS.PERMISSION_SUMMARY(workspaceId, userId);
    const cacheTtl = ttl ?? DEFAULT_CACHE_TTL.PERMISSION_SUMMARY;

    // Set Redis cache
    await this.permissionCacheStorage.set(cacheKey, summary, cacheTtl);

    // Set local cache
    this.setLocalCache(this.summaryCache, cacheKey, summary);

    this.logger.debug(
      `Cached permission summary for user: ${userId}, workspace: ${workspaceId}`,
    );
  }

  // ============================================
  // Data Filter Cache
  // ============================================

  /**
   * Get cached data filter
   *
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   * @param resource - Resource name
   * @returns Cached filter or null
   */
  async getDataFilter(
    userId: string,
    workspaceId: string,
    resource: string,
  ): Promise<FilterCondition | null> {
    const cacheKey = CASBIN_CACHE_KEYS.DATA_FILTER(
      workspaceId,
      userId,
      resource,
    );

    // Check local cache first
    const localResult = this.getFromLocalCache(this.filterCache, cacheKey);

    if (localResult !== null) {
      this.stats.hits++;

      return localResult;
    }

    // Check Redis cache
    const redisResult =
      await this.permissionCacheStorage.get<FilterCondition>(cacheKey);

    if (redisResult) {
      this.stats.hits++;
      this.setLocalCache(this.filterCache, cacheKey, redisResult);

      return redisResult;
    }

    this.stats.misses++;

    return null;
  }

  /**
   * Cache data filter
   *
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   * @param resource - Resource name
   * @param filter - Filter condition
   * @param ttl - TTL in milliseconds (optional)
   */
  async setDataFilter(
    userId: string,
    workspaceId: string,
    resource: string,
    filter: FilterCondition,
    ttl?: number,
  ): Promise<void> {
    const cacheKey = CASBIN_CACHE_KEYS.DATA_FILTER(
      workspaceId,
      userId,
      resource,
    );
    const cacheTtl = ttl ?? DEFAULT_CACHE_TTL.DATA_FILTER;

    // Set Redis cache
    await this.permissionCacheStorage.set(cacheKey, filter, cacheTtl);

    // Set local cache
    this.setLocalCache(this.filterCache, cacheKey, filter);
  }

  // ============================================
  // Cache Invalidation
  // ============================================

  /**
   * Invalidate all cache for a specific user
   *
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   */
  async invalidateUser(userId: string, workspaceId: string): Promise<void> {
    this.stats.invalidations++;

    // Clear local caches
    this.invalidateLocalCacheByPattern(
      this.contextCache,
      `${workspaceId}:${userId}`,
    );
    this.invalidateLocalCacheByPattern(
      this.checkResultCache,
      `${workspaceId}:${userId}`,
    );
    this.invalidateLocalCacheByPattern(
      this.summaryCache,
      `${workspaceId}:${userId}`,
    );
    this.invalidateLocalCacheByPattern(
      this.filterCache,
      `${workspaceId}:${userId}`,
    );

    // Clear Redis caches using pattern
    const userContextKey = CASBIN_CACHE_KEYS.USER_CONTEXT(workspaceId, userId);
    const summaryKey = CASBIN_CACHE_KEYS.PERMISSION_SUMMARY(
      workspaceId,
      userId,
    );

    await Promise.all([
      this.userCacheStorage.del(userContextKey),
      this.permissionCacheStorage.del(summaryKey),
      this.permissionCacheStorage.flushByPattern(
        `rbac:check:${workspaceId}:${userId}:*`,
      ),
      this.permissionCacheStorage.flushByPattern(
        `rbac:filter:${workspaceId}:${userId}:*`,
      ),
    ]);

    this.logger.debug(
      `Invalidated all cache for user: ${userId} in workspace: ${workspaceId}`,
    );
  }

  /**
   * Invalidate cache for a specific resource across all users
   *
   * @param workspaceId - Workspace ID
   * @param resource - Resource name
   */
  async invalidateResource(
    workspaceId: string,
    resource: string,
  ): Promise<void> {
    this.stats.invalidations++;

    // Clear local caches by resource pattern
    this.invalidateLocalCacheByPattern(this.checkResultCache, `:${resource}:`);
    this.invalidateLocalCacheByPattern(this.filterCache, `:${resource}`);

    // Clear Redis caches using pattern
    await Promise.all([
      this.permissionCacheStorage.flushByPattern(
        `rbac:check:${workspaceId}:*:${resource}:*`,
      ),
      this.permissionCacheStorage.flushByPattern(
        `rbac:filter:${workspaceId}:*:${resource}`,
      ),
    ]);

    this.logger.debug(
      `Invalidated cache for resource: ${resource} in workspace: ${workspaceId}`,
    );
  }

  /**
   * Invalidate all RBAC cache for a workspace
   *
   * @param workspaceId - Workspace ID
   */
  async invalidateWorkspace(workspaceId: string): Promise<void> {
    this.stats.invalidations++;

    // Clear all local caches
    this.contextCache.clear();
    this.checkResultCache.clear();
    this.summaryCache.clear();
    this.filterCache.clear();

    // Clear Redis caches using pattern
    await Promise.all([
      this.userCacheStorage.flushByPattern(`rbac:context:${workspaceId}:*`),
      this.permissionCacheStorage.flushByPattern(`rbac:check:${workspaceId}:*`),
      this.permissionCacheStorage.flushByPattern(
        `rbac:summary:${workspaceId}:*`,
      ),
      this.permissionCacheStorage.flushByPattern(
        `rbac:filter:${workspaceId}:*`,
      ),
    ]);

    this.logger.log(`Invalidated all RBAC cache for workspace: ${workspaceId}`);
  }

  /**
   * Invalidate all RBAC cache (global)
   */
  async invalidateAll(): Promise<void> {
    this.stats.invalidations++;

    // Clear all local caches
    this.contextCache.clear();
    this.checkResultCache.clear();
    this.summaryCache.clear();
    this.filterCache.clear();

    // Clear Redis caches using pattern
    await Promise.all([
      this.userCacheStorage.flushByPattern('rbac:context:*'),
      this.permissionCacheStorage.flushByPattern('rbac:check:*'),
      this.permissionCacheStorage.flushByPattern('rbac:summary:*'),
      this.permissionCacheStorage.flushByPattern('rbac:filter:*'),
    ]);

    this.logger.log('Invalidated all RBAC cache globally');
  }

  // ============================================
  // Cache Statistics
  // ============================================

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const workspaces = new Set<string>();

    // Collect unique workspaces from all caches
    for (const key of this.contextCache.keys()) {
      const parts = key.split(':');

      if (parts.length >= 2) {
        workspaces.add(parts[1]);
      }
    }

    return {
      localCacheSize:
        this.contextCache.size +
        this.checkResultCache.size +
        this.summaryCache.size +
        this.filterCache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      invalidations: this.stats.invalidations,
      workspaces: Array.from(workspaces),
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
    };
  }

  /**
   * Get hit rate percentage
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;

    if (total === 0) {
      return 0;
    }

    return (this.stats.hits / total) * 100;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Get current timestamp in milliseconds
   */
  private getCurrentTimestamp(): number {
    return DateTimeUtils.toMillis(DateTimeUtils.now());
  }

  /**
   * Get value from local cache if valid
   */
  private getFromLocalCache<T>(
    cache: Map<string, LocalCacheEntry<T>>,
    key: string,
  ): T | null {
    const entry = cache.get(key);

    if (!entry) {
      return null;
    }

    const currentTime = this.getCurrentTimestamp();
    const isExpired = currentTime - entry.timestamp > LOCAL_CACHE_TTL_MS;

    if (isExpired) {
      cache.delete(key);

      return null;
    }

    return entry.data;
  }

  /**
   * Set value in local cache
   */
  private setLocalCache<T>(
    cache: Map<string, LocalCacheEntry<T>>,
    key: string,
    data: T,
  ): void {
    cache.set(key, {
      data,
      timestamp: this.getCurrentTimestamp(),
    });

    // Cleanup old entries if cache is too large
    this.cleanupLocalCache(cache);
  }

  /**
   * Invalidate local cache entries matching pattern
   */
  private invalidateLocalCacheByPattern<T>(
    cache: Map<string, LocalCacheEntry<T>>,
    pattern: string,
  ): void {
    const keysToDelete: string[] = [];

    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      cache.delete(key);
    }
  }

  /**
   * Cleanup old entries from local cache to prevent memory bloat
   */
  private cleanupLocalCache<T>(
    cache: Map<string, LocalCacheEntry<T>>,
    maxSize = 10000,
  ): void {
    if (cache.size <= maxSize) {
      return;
    }

    // Remove oldest entries
    const entries = Array.from(cache.entries());

    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, cache.size - maxSize);

    for (const [key] of toRemove) {
      cache.delete(key);
    }

    this.logger.debug(`Cleaned up ${toRemove.length} entries from local cache`);
  }
}
