/**
 * RBAC Cache Manager Service
 * Dedicated cache management service for Enterprise RBAC system
 * Independent from database entities - uses Twenty's cache system directly
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import {
  EnhancedPermissionContext,
  EnhancedPermissionResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';

/**
 * Cache performance metrics (in-memory tracking)
 */
interface CachePerformanceMetrics {
  hitCount: number;
  missCount: number;
  totalRequests: number;
  averageResponseTime: number;
  errorCount: number;
  lastResetAt: Date;
  cacheSize: number;
  hotKeys: string[];
  slowOperations: string[];
}

/**
 * Cache optimization strategies
 */
enum CacheOptimizationStrategy {
  CONSERVATIVE = 'CONSERVATIVE',
  BALANCED = 'BALANCED',
  AGGRESSIVE = 'AGGRESSIVE',
  ADAPTIVE = 'ADAPTIVE',
}

/**
 * Cache configuration
 */
interface RbacCacheConfig {
  strategy: CacheOptimizationStrategy;
  defaultTTL: number;
  maxCacheSize: number;
  enablePrefetch: boolean;
  enableCompression: boolean;
  hotKeyThreshold: number;
  performanceMonitoring: boolean;
}

/**
 * Cache key patterns for RBAC system
 */
const RBAC_CACHE_KEYS = {
  PERMISSION_RESULT: 'rbac:permission:result',
  USER_CONTEXT: 'rbac:user:context',
  TEMPLATE_PERMISSIONS: 'rbac:template:permissions',
  RESOURCE_ACCESS: 'rbac:resource:access',
  HIERARCHY_CACHE: 'rbac:hierarchy:cache',
  POLICY_RESULTS: 'rbac:policy:results',
  DEPARTMENT_RESTRICTIONS: 'rbac:department:restrictions',
  SENSITIVE_DATA_ACCESS: 'rbac:sensitive:access',
  DYNAMIC_CONDITIONS: 'rbac:dynamic:conditions',
  PERFORMANCE_METRICS: 'rbac:performance:metrics',
} as const;

/**
 * TTL configurations for different cache types (in milliseconds)
 */
const RBAC_CACHE_TTL = {
  SHORT: 5 * 60 * 1000, // 5 minutes - for dynamic data
  MEDIUM: 30 * 60 * 1000, // 30 minutes - for user contexts
  LONG: 2 * 60 * 60 * 1000, // 2 hours - for permission templates
  EXTENDED: 24 * 60 * 60 * 1000, // 24 hours - for system configurations
  PERFORMANCE: 60 * 1000, // 1 minute - for performance metrics
} as const;

@Injectable()
export class RbacCacheManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(RbacCacheManagerService.name);

  // In-memory performance tracking
  private performanceMetrics: CachePerformanceMetrics = {
    hitCount: 0,
    missCount: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    errorCount: 0,
    lastResetAt: new Date(),
    cacheSize: 0,
    hotKeys: [],
    slowOperations: [],
  };

  // Cache configuration
  private cacheConfig: RbacCacheConfig = {
    strategy: CacheOptimizationStrategy.BALANCED,
    defaultTTL: RBAC_CACHE_TTL.MEDIUM,
    maxCacheSize: 10000,
    enablePrefetch: false,
    enableCompression: false,
    hotKeyThreshold: 100,
    performanceMonitoring: true,
  };

  // Hot keys tracking
  private keyAccessCount = new Map<string, number>();
  private keyLastAccess = new Map<string, Date>();

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.EngineWorkspace)
    private readonly cacheStorage: CacheStorageService,
  ) {
    this.logger.log('RBAC Cache Manager Service initialized');
    this.startPerformanceMonitoring();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('RBAC Cache Manager Service destroyed');
  }

  /**
   * Cache permission result with performance tracking
   */
  async cachePermissionResult(
    context: EnhancedPermissionContext,
    result: EnhancedPermissionResult,
    ttl?: number,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const key = this.generatePermissionKey(context);
      const cacheTTL = ttl || this.getCacheTTL('permission');

      await this.cacheStorage.set(key, result, cacheTTL);

      this.trackCacheOperation('set', key, Date.now() - startTime);
      this.logger.debug('Permission result cached', { key, ttl: cacheTTL });
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to cache permission result', {
        error: error.message,
        userId: context.userContext?.userId,
      });
    }
  }

  /**
   * Get cached permission result with performance tracking
   */
  async getCachedPermissionResult(
    context: EnhancedPermissionContext,
  ): Promise<EnhancedPermissionResult | null> {
    const startTime = Date.now();

    try {
      const key = this.generatePermissionKey(context);
      const result = await this.cacheStorage.get<EnhancedPermissionResult>(key);

      const responseTime = Date.now() - startTime;

      if (result) {
        this.performanceMetrics.hitCount++;
        this.trackCacheOperation('hit', key, responseTime);
        this.logger.debug('Cache hit for permission result', { key });
      } else {
        this.performanceMetrics.missCount++;
        this.trackCacheOperation('miss', key, responseTime);
      }

      this.performanceMetrics.totalRequests++;

      return result || null;
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to get cached permission result', {
        error: error.message,
        userId: context.userContext?.userId,
      });

      return null;
    }
  }

  /**
   * Cache user context data
   */
  async cacheUserContext(
    workspaceMemberId: string,
    context: Record<string, unknown>,
    ttl?: number,
  ): Promise<void> {
    try {
      const key = `${RBAC_CACHE_KEYS.USER_CONTEXT}:${workspaceMemberId}`;
      const cacheTTL = ttl || this.getCacheTTL('user_context');

      await this.cacheStorage.set(key, context, cacheTTL);
      this.logger.debug('User context cached', {
        workspaceMemberId,
        ttl: cacheTTL,
      });
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to cache user context', {
        error: error.message,
        workspaceMemberId,
      });
    }
  }

  /**
   * Get cached user context
   */
  async getCachedUserContext(
    workspaceMemberId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const key = `${RBAC_CACHE_KEYS.USER_CONTEXT}:${workspaceMemberId}`;
      const result = await this.cacheStorage.get<Record<string, unknown>>(key);

      if (result) {
        this.trackCacheOperation('hit', key, 0);
      } else {
        this.trackCacheOperation('miss', key, 0);
      }

      return result || null;
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to get cached user context', {
        error: error.message,
        workspaceMemberId,
      });

      return null;
    }
  }

  /**
   * Cache template permissions
   */
  async cacheTemplatePermissions(
    templateId: string,
    permissions: Record<string, unknown>,
    ttl?: number,
  ): Promise<void> {
    try {
      const key = `${RBAC_CACHE_KEYS.TEMPLATE_PERMISSIONS}:${templateId}`;
      const cacheTTL = ttl || this.getCacheTTL('template');

      await this.cacheStorage.set(key, permissions, cacheTTL);
      this.logger.debug('Template permissions cached', {
        templateId,
        ttl: cacheTTL,
      });
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to cache template permissions', {
        error: error.message,
        templateId,
      });
    }
  }

  /**
   * Get cached template permissions
   */
  async getCachedTemplatePermissions(
    templateId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const key = `${RBAC_CACHE_KEYS.TEMPLATE_PERMISSIONS}:${templateId}`;
      const result = await this.cacheStorage.get<Record<string, unknown>>(key);

      return result || null;
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to get cached template permissions', {
        error: error.message,
        templateId,
      });

      return null;
    }
  }

  /**
   * Generic cache get method
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const startTime = Date.now();
      const result = await this.cacheStorage.get<T>(key);
      const duration = Date.now() - startTime;

      if (result !== undefined) {
        this.trackCacheOperation('hit', key, duration);

        return result;
      } else {
        this.trackCacheOperation('miss', key, duration);

        return null;
      }
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to get cached value', {
        error: error.message,
        key,
      });

      return null;
    }
  }

  /**
   * Generic cache set method
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const startTime = Date.now();
      const cacheTTL = ttl || this.getCacheTTL('default');

      await this.cacheStorage.set(key, value, cacheTTL);
      const duration = Date.now() - startTime;

      this.trackCacheOperation('set', key, duration);
      this.logger.debug('Value cached', {
        key,
        ttl: cacheTTL,
      });
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to cache value', {
        error: error.message,
        key,
      });
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      await this.cacheStorage.flushByPattern(pattern);
      this.logger.debug('Cache invalidated by pattern', { pattern });
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to invalidate cache by pattern', {
        error: error.message,
        pattern,
      });
    }
  }

  /**
   * Invalidate user-specific cache
   */
  async invalidateUserCache(workspaceMemberId: string): Promise<void> {
    const patterns = [
      `${RBAC_CACHE_KEYS.USER_CONTEXT}:${workspaceMemberId}*`,
      `${RBAC_CACHE_KEYS.PERMISSION_RESULT}:*:${workspaceMemberId}:*`,
    ];

    for (const pattern of patterns) {
      await this.invalidateByPattern(pattern);
    }
  }

  /**
   * Invalidate template-specific cache
   */
  async invalidateTemplateCache(templateId: string): Promise<void> {
    const pattern = `${RBAC_CACHE_KEYS.TEMPLATE_PERMISSIONS}:${templateId}*`;

    await this.invalidateByPattern(pattern);
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): CachePerformanceMetrics & {
    hitRate: number;
    errorRate: number;
    avgResponseTime: number;
  } {
    const hitRate =
      this.performanceMetrics.totalRequests > 0
        ? (this.performanceMetrics.hitCount /
            this.performanceMetrics.totalRequests) *
          100
        : 0;

    const errorRate =
      this.performanceMetrics.totalRequests > 0
        ? (this.performanceMetrics.errorCount /
            this.performanceMetrics.totalRequests) *
          100
        : 0;

    // Update hot keys
    this.updateHotKeys();

    return {
      ...this.performanceMetrics,
      hitRate: Math.round(hitRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTime:
        Math.round(this.performanceMetrics.averageResponseTime * 100) / 100,
    };
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      hitCount: 0,
      missCount: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      errorCount: 0,
      lastResetAt: new Date(),
      cacheSize: 0,
      hotKeys: [],
      slowOperations: [],
    };

    this.keyAccessCount.clear();
    this.keyLastAccess.clear();
    this.logger.log('Performance metrics reset');
  }

  /**
   * Update cache optimization strategy
   */
  updateOptimizationStrategy(strategy: CacheOptimizationStrategy): void {
    this.cacheConfig.strategy = strategy;

    // Adjust cache settings based on strategy
    switch (strategy) {
      case CacheOptimizationStrategy.CONSERVATIVE:
        this.cacheConfig.defaultTTL = RBAC_CACHE_TTL.SHORT;
        this.cacheConfig.enablePrefetch = false;
        this.cacheConfig.maxCacheSize = 5000;
        break;

      case CacheOptimizationStrategy.BALANCED:
        this.cacheConfig.defaultTTL = RBAC_CACHE_TTL.MEDIUM;
        this.cacheConfig.enablePrefetch = false;
        this.cacheConfig.maxCacheSize = 10000;
        break;

      case CacheOptimizationStrategy.AGGRESSIVE:
        this.cacheConfig.defaultTTL = RBAC_CACHE_TTL.LONG;
        this.cacheConfig.enablePrefetch = true;
        this.cacheConfig.maxCacheSize = 20000;
        break;

      case CacheOptimizationStrategy.ADAPTIVE:
        // Adaptive strategy adjusts based on performance metrics
        this.adaptCacheSettings();
        break;
    }

    this.logger.log('Cache optimization strategy updated', { strategy });
  }

  /**
   * Get cache health status
   */
  getCacheHealthStatus(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
    metrics: CachePerformanceMetrics & {
      hitRate: number;
      errorRate: number;
      avgResponseTime: number;
    };
  } {
    const metrics = this.getPerformanceMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check hit rate
    if (metrics.hitRate < 70) {
      issues.push('Low cache hit rate');
      recommendations.push(
        'Consider increasing cache TTL or optimizing cache keys',
      );
    }

    // Check error rate
    if (metrics.errorRate > 5) {
      issues.push('High cache error rate');
      recommendations.push('Investigate cache connectivity and error patterns');
    }

    // Check response time
    if (metrics.avgResponseTime > 100) {
      issues.push('High cache response time');
      recommendations.push(
        'Check cache server performance and network latency',
      );
    }

    const healthy = issues.length === 0;

    return {
      healthy,
      issues,
      recommendations,
      metrics,
    };
  }

  /**
   * Private helper methods
   */
  private generatePermissionKey(context: EnhancedPermissionContext): string {
    const parts = [
      RBAC_CACHE_KEYS.PERMISSION_RESULT,
      context.userContext?.workspaceId || 'unknown',
      context.userContext?.workspaceMemberId || 'unknown',
      context.resourceContext?.resourceType || 'unknown',
      context.action || 'unknown',
      context.resourceContext?.recordId || 'all',
    ];

    return parts.join(':');
  }

  private getCacheTTL(type: string): number {
    switch (type) {
      case 'permission':
        return RBAC_CACHE_TTL.MEDIUM;
      case 'user_context':
        return RBAC_CACHE_TTL.LONG;
      case 'template':
        return RBAC_CACHE_TTL.EXTENDED;
      case 'performance':
        return RBAC_CACHE_TTL.PERFORMANCE;
      default:
        return this.cacheConfig.defaultTTL;
    }
  }

  private trackCacheOperation(
    operation: 'hit' | 'miss' | 'set',
    key: string,
    responseTime: number,
  ): void {
    // Track key access for hot key detection
    const currentCount = this.keyAccessCount.get(key) || 0;

    this.keyAccessCount.set(key, currentCount + 1);
    this.keyLastAccess.set(key, new Date());

    // Update average response time
    if (responseTime > 0) {
      const currentAvg = this.performanceMetrics.averageResponseTime;
      const totalOps =
        this.performanceMetrics.hitCount +
        this.performanceMetrics.missCount +
        1;

      this.performanceMetrics.averageResponseTime =
        (currentAvg * (totalOps - 1) + responseTime) / totalOps;
    }

    // Track slow operations
    if (responseTime > 100) {
      this.performanceMetrics.slowOperations.push(
        `${operation}:${key}:${responseTime}ms`,
      );
      // Keep only last 10 slow operations
      if (this.performanceMetrics.slowOperations.length > 10) {
        this.performanceMetrics.slowOperations =
          this.performanceMetrics.slowOperations.slice(-10);
      }
    }
  }

  private updateHotKeys(): void {
    this.performanceMetrics.hotKeys = Array.from(this.keyAccessCount.entries())
      .filter(([_, count]) => count >= this.cacheConfig.hotKeyThreshold)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 10)
      .map(([key, _]) => key);
  }

  private adaptCacheSettings(): void {
    const metrics = this.getPerformanceMetrics();

    // Adjust TTL based on hit rate
    if (metrics.hitRate > 90) {
      this.cacheConfig.defaultTTL = RBAC_CACHE_TTL.LONG;
    } else if (metrics.hitRate > 70) {
      this.cacheConfig.defaultTTL = RBAC_CACHE_TTL.MEDIUM;
    } else {
      this.cacheConfig.defaultTTL = RBAC_CACHE_TTL.SHORT;
    }

    // Enable prefetch for high-traffic scenarios
    this.cacheConfig.enablePrefetch = metrics.totalRequests > 1000;

    this.logger.debug('Cache settings adapted', {
      hitRate: metrics.hitRate,
      defaultTTL: this.cacheConfig.defaultTTL,
      enablePrefetch: this.cacheConfig.enablePrefetch,
    });
  }

  private startPerformanceMonitoring(): void {
    if (!this.cacheConfig.performanceMonitoring) {
      return;
    }

    // Log performance metrics every 5 minutes
    setInterval(
      () => {
        const metrics = this.getPerformanceMetrics();

        this.logger.debug('RBAC Cache Performance Metrics', {
          hitRate: `${metrics.hitRate}%`,
          totalRequests: metrics.totalRequests,
          errorRate: `${metrics.errorRate}%`,
          avgResponseTime: `${metrics.avgResponseTime}ms`,
          hotKeysCount: metrics.hotKeys.length,
          slowOperationsCount: metrics.slowOperations.length,
        });
      },
      5 * 60 * 1000,
    ); // 5 minutes
  }
}
