/**
 * Enterprise RBAC Cache Service
 * High-performance caching for permission validation results
 * Independent from legacy modules
 */

import { Injectable, Logger } from '@nestjs/common';

import { PolicyEvaluationResult } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/policy-context.type';
import {
  CACHE_TTL,
  CACHE_KEY_PREFIXES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  EnhancedPermissionContext,
  EnhancedPermissionResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';

/**
 * Cache configuration interface
 */
interface CacheConfig {
  enabled: boolean;
  strategy: 'AGGRESSIVE' | 'CONSERVATIVE' | 'DISABLED';
  defaultTTL: number;
  maxSize: number;
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
}

/**
 * Cache statistics interface
 */
interface CacheStats {
  hitRate: number;
  size: number;
  evictions: number;
  errors: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
}

/**
 * Cache entry interface
 */
interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  tags?: string[];
}

/**
 * Enterprise RBAC Cache Service
 */
@Injectable()
export class RbacCacheService {
  private readonly logger = new Logger(RbacCacheService.name);

  // In-memory cache maps
  private readonly permissionCache = new Map<
    string,
    CacheEntry<EnhancedPermissionResult>
  >();
  private readonly userContextCache = new Map<
    string,
    CacheEntry<EnhancedPermissionContext>
  >();
  private readonly resourceCache = new Map<string, CacheEntry>();
  private readonly policyCache = new Map<
    string,
    CacheEntry<PolicyEvaluationResult>
  >();
  private readonly templateCache = new Map<string, CacheEntry>();

  // Cache statistics
  private stats: CacheStats = {
    hitRate: 0,
    size: 0,
    evictions: 0,
    errors: 0,
    totalRequests: 0,
    totalHits: 0,
    totalMisses: 0,
  };

  // Configuration
  private config: CacheConfig = {
    enabled: true,
    strategy: 'CONSERVATIVE',
    defaultTTL: CACHE_TTL.MEDIUM,
    maxSize: 10000,
    evictionPolicy: 'LRU',
  };

  constructor() {
    this.logger.log('Enterprise RBAC Cache Service initialized');
    this.startCleanupTimer();
  }

  /**
   * Get cached permission result
   */
  async getPermissionResult(
    key: string,
  ): Promise<EnhancedPermissionResult | null> {
    return this.get(this.permissionCache, key);
  }

  /**
   * Cache permission result
   */
  async cachePermissionResult(
    key: string,
    result: EnhancedPermissionResult,
    ttl?: number,
  ): Promise<void> {
    await this.set(this.permissionCache, key, result, ttl);
  }

  /**
   * Get cached user context
   */
  async getUserContext(key: string): Promise<EnhancedPermissionContext | null> {
    return this.get(this.userContextCache, key);
  }

  /**
   * Cache user context
   */
  async cacheUserContext(
    key: string,
    context: EnhancedPermissionContext,
    ttl?: number,
  ): Promise<void> {
    await this.set(this.userContextCache, key, context, ttl);
  }

  /**
   * Get cached resource information
   */
  async getResourceInfo(key: string): Promise<unknown | null> {
    return this.get(this.resourceCache, key);
  }

  /**
   * Cache resource information
   */
  async cacheResourceInfo(
    key: string,
    resource: unknown,
    ttl?: number,
  ): Promise<void> {
    await this.set(this.resourceCache, key, resource, ttl);
  }

  /**
   * Get cached policy evaluation result
   */
  async getPolicyResult(key: string): Promise<PolicyEvaluationResult | null> {
    return this.get(this.policyCache, key);
  }

  /**
   * Cache policy evaluation result
   */
  async cachePolicyResult(
    key: string,
    result: PolicyEvaluationResult,
    ttl?: number,
  ): Promise<void> {
    await this.set(this.policyCache, key, result, ttl);
  }

  /**
   * Get cached template information
   */
  async getTemplateInfo(key: string): Promise<unknown | null> {
    return this.get(this.templateCache, key);
  }

  /**
   * Cache template information
   */
  async cacheTemplateInfo(
    key: string,
    template: unknown,
    ttl?: number,
  ): Promise<void> {
    await this.set(this.templateCache, key, template, ttl);
  }

  /**
   * Generate cache key for permission context
   */
  generatePermissionKey(context: EnhancedPermissionContext): string {
    const parts = [
      context.userContext?.userId,
      context.userContext?.workspaceId,
      context.resourceContext?.objectName,
      context.action,
      context.resourceContext?.recordId || 'all',
    ];

    return `${CACHE_KEY_PREFIXES.PERMISSION_RESULT}${parts.join(':')}`;
  }

  /**
   * Generate cache key for user context
   */
  generateUserContextKey(workspaceMemberId: string): string {
    return `${CACHE_KEY_PREFIXES.USER_CONTEXT}${workspaceMemberId}`;
  }

  /**
   * Generate cache key for resource info
   */
  generateResourceKey(objectName: string, recordId?: string): string {
    const key = `${CACHE_KEY_PREFIXES.RESOURCE_INFO}${objectName}`;

    return recordId ? `${key}:${recordId}` : key;
  }

  /**
   * Generate cache key for policy result
   */
  generatePolicyKey(context: {
    userId?: string;
    resourceType?: string;
    action?: string;
  }): string {
    const keyParts = [
      context.userId,
      context.resourceType,
      context.action,
    ].filter(Boolean);

    return `${CACHE_KEY_PREFIXES.POLICY_RESULT}${keyParts.join(':')}`;
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      let invalidatedCount = 0;
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));

      // Check all cache maps
      const caches = [
        this.permissionCache,
        this.userContextCache,
        this.resourceCache,
        this.policyCache,
        this.templateCache,
      ];

      for (const cache of caches) {
        const keysToDelete: string[] = [];

        for (const key of cache.keys()) {
          if (regex.test(key)) {
            keysToDelete.push(key);
          }
        }

        for (const key of keysToDelete) {
          cache.delete(key);
          invalidatedCount++;
        }
      }

      this.logger.debug(
        `Invalidated ${invalidatedCount} cache entries matching pattern: ${pattern}`,
      );

      return invalidatedCount;
    } catch (error) {
      this.logger.error(
        `Error invalidating cache pattern: ${error.message}`,
        error.stack,
      );

      return 0;
    }
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    try {
      this.permissionCache.clear();
      this.userContextCache.clear();
      this.resourceCache.clear();
      this.policyCache.clear();
      this.templateCache.clear();

      this.resetStats();
      this.logger.log('All caches cleared');
    } catch (error) {
      this.logger.error(`Error clearing caches: ${error.message}`, error.stack);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    // Update size
    this.stats.size =
      this.permissionCache.size +
      this.userContextCache.size +
      this.resourceCache.size +
      this.policyCache.size +
      this.templateCache.size;

    // Update hit rate
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate =
        (this.stats.totalHits / this.stats.totalRequests) * 100;
    }

    return { ...this.stats };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.log(
      `Cache configuration updated: ${JSON.stringify(this.config)}`,
    );
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Warm up cache with common permission contexts
   */
  async warmup(contexts: EnhancedPermissionContext[]): Promise<void> {
    try {
      this.logger.log(`Starting cache warmup for ${contexts.length} contexts`);

      for (const context of contexts) {
        // Generate and cache common keys
        // const permissionKey = this.generatePermissionKey(context);
        const userKey = this.generateUserContextKey(
          context.userContext.workspaceMemberId,
        );
        const resourceKey = this.generateResourceKey(
          context.resourceContext.objectName,
          context.resourceContext.recordId,
        );

        // Pre-populate with placeholder data (would be replaced with actual data)
        await this.set(this.userContextCache, userKey, context, CACHE_TTL.LONG);
        await this.set(
          this.resourceCache,
          resourceKey,
          { warmedUp: true },
          CACHE_TTL.LONG,
        );
      }

      this.logger.log('Cache warmup completed');
    } catch (error) {
      this.logger.error(
        `Error during cache warmup: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Generic get method for any cache map
   */
  private async get<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
  ): Promise<T | null> {
    try {
      this.stats.totalRequests++;

      if (!this.config.enabled) {
        this.stats.totalMisses++;

        return null;
      }

      const entry = cache.get(key);

      if (!entry) {
        this.stats.totalMisses++;

        return null;
      }

      // Check if entry has expired
      const now = Date.now();
      const age = now - entry.createdAt.getTime();

      if (age > entry.ttl) {
        cache.delete(key);
        this.stats.totalMisses++;
        this.stats.evictions++;

        return null;
      }

      // Update access metadata
      entry.lastAccessed = new Date();
      entry.accessCount++;

      this.stats.totalHits++;

      return entry.value;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(
        `Cache get error for key ${key}: ${error.message}`,
        error.stack,
      );

      return null;
    }
  }

  /**
   * Generic set method for any cache map
   */
  private async set<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    value: T,
    ttl?: number,
  ): Promise<void> {
    try {
      if (!this.config.enabled) {
        return;
      }

      // Check size limits
      if (cache.size >= this.config.maxSize) {
        await this.evictOldEntries(cache);
      }

      const entry: CacheEntry<T> = {
        key,
        value,
        ttl: ttl || this.config.defaultTTL,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
      };

      cache.set(key, entry);
    } catch (error) {
      this.stats.errors++;
      this.logger.error(
        `Cache set error for key ${key}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Evict old entries based on configured policy
   */
  private async evictOldEntries<T>(
    cache: Map<string, CacheEntry<T>>,
  ): Promise<void> {
    try {
      const entriesToEvict = Math.floor(cache.size * 0.1); // Evict 10%
      const entries = Array.from(cache.entries());

      switch (this.config.evictionPolicy) {
        case 'LRU': // Least Recently Used
          entries.sort(
            (a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime(),
          );
          break;

        case 'LFU': // Least Frequently Used
          entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
          break;

        case 'FIFO': // First In, First Out
          entries.sort(
            (a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime(),
          );
          break;
      }

      for (let i = 0; i < entriesToEvict && i < entries.length; i++) {
        cache.delete(entries[i][0]);
        this.stats.evictions++;
      }
    } catch (error) {
      this.logger.error(
        `Error evicting cache entries: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Run every minute
  }

  /**
   * Clean up expired entries from all caches
   */
  private async cleanupExpiredEntries(): Promise<void> {
    try {
      const now = Date.now();
      const caches = [
        { name: 'permission', cache: this.permissionCache },
        { name: 'userContext', cache: this.userContextCache },
        { name: 'resource', cache: this.resourceCache },
        { name: 'policy', cache: this.policyCache },
        { name: 'template', cache: this.templateCache },
      ];

      let totalCleaned = 0;

      for (const { name: _name, cache } of caches) {
        const keysToDelete: string[] = [];

        for (const [key, entry] of cache.entries()) {
          const age = now - entry.createdAt.getTime();

          if (age > entry.ttl) {
            keysToDelete.push(key);
          }
        }

        for (const key of keysToDelete) {
          cache.delete(key);
          totalCleaned++;
          this.stats.evictions++;
        }
      }

      if (totalCleaned > 0) {
        this.logger.debug(`Cleaned up ${totalCleaned} expired cache entries`);
      }
    } catch (error) {
      this.logger.error(
        `Error during cache cleanup: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Reset cache statistics
   */
  private resetStats(): void {
    this.stats = {
      hitRate: 0,
      size: 0,
      evictions: 0,
      errors: 0,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
    };
  }

  /**
   * Check if cache performance is healthy
   */
  isHealthy(): boolean {
    const stats = this.getStats();

    if (stats.totalRequests === 0) return true; // No requests yet

    const hitRateThreshold = 80; // 80% minimum hit rate
    const errorRateThreshold = 5; // 5% maximum error rate

    const errorRate = (stats.errors / stats.totalRequests) * 100;

    return stats.hitRate >= hitRateThreshold && errorRate <= errorRateThreshold;
  }

  /**
   * Get cache health report
   */
  getHealthReport(): {
    healthy: boolean;
    statistics: CacheStats;
    configuration: CacheConfig;
    recommendations: string[];
  } {
    const stats = this.getStats();
    const isHealthy = this.isHealthy();

    return {
      healthy: isHealthy,
      statistics: stats,
      configuration: this.config,
      recommendations: this.generateRecommendations(stats),
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(stats: CacheStats): string[] {
    const recommendations: string[] = [];

    if (stats.hitRate < 70) {
      recommendations.push(
        'Consider increasing cache TTL or reviewing cache key patterns',
      );
    }

    if (stats.evictions > stats.totalRequests * 0.1) {
      recommendations.push(
        'Consider increasing cache size to reduce evictions',
      );
    }

    if (stats.errors > 0) {
      recommendations.push(
        'Investigate cache errors and improve error handling',
      );
    }

    if (stats.size > this.config.maxSize * 0.9) {
      recommendations.push(
        'Cache approaching size limit, consider increasing maxSize',
      );
    }

    return recommendations;
  }
}
