/**
 * RBAC Cache Manager Service
 * Dedicated cache management service for Enterprise RBAC system
 * Independent from database entities - uses Twenty's cache system directly
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { DateTime } from 'luxon';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import {
  EnhancedPermissionContext,
  EnhancedPermissionResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  CacheOptimizationStrategy,
  RBAC_CACHE_INTERVALS,
  RBAC_CACHE_KEYS,
  RBAC_CACHE_TTL,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

/**
 * Cache performance metrics (in-memory tracking)
 */
interface CachePerformanceMetrics {
  hitCount: number;
  missCount: number;
  totalRequests: number;
  averageResponseTime: number;
  errorCount: number;
  lastResetAt: DateTime;
  cacheSize: number;
  hotKeys: string[];
  slowOperations: string[];
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

@Injectable()
export class RbacCacheManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RbacCacheManagerService.name);

  // Timers for cleanup operations
  private performanceMonitoringTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  // In-memory performance tracking
  private performanceMetrics: CachePerformanceMetrics = {
    hitCount: 0,
    missCount: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    errorCount: 0,
    lastResetAt: DateTime.now(),
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

  // Cleanup interval
  private readonly cleanupInterval = RBAC_CACHE_INTERVALS.CLEANUP;

  // Hot keys tracking
  private keyAccessCount = new Map<string, number>();
  private keyLastAccess = new Map<string, DateTime>();

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.EngineWorkspace)
    private readonly cacheStorage: CacheStorageService,
  ) {
    this.logger.log('RBAC Cache Manager Service initialized');
  }

  onModuleInit(): void {
    this.startPerformanceMonitoring();
    this.startCleanupTimer();
    this.logger.log('RBAC Cache Manager Service module initialized');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.performanceMonitoringTimer) {
      clearInterval(this.performanceMonitoringTimer);
      this.performanceMonitoringTimer = undefined;
      this.logger.log('Performance monitoring timer cleared');
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      this.logger.log('Cleanup timer cleared');
    }

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
        userId: context.userContext?.id,
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
        userId: context.userContext?.id,
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

  // ==================== SIMPLIFIED 6-STEP VALIDATION CACHE METHODS ====================

  /**
   * Cache simplified validation result (full 6-step result)
   */
  async cacheSimplifiedValidationResult(
    context: EnhancedPermissionContext,
    result: EnhancedPermissionResult,
  ): Promise<void> {
    try {
      const key = this.generateSimplifiedValidationKey(context);
      const ttl = RBAC_CACHE_TTL.SIMPLIFIED_RESULT;

      await this.cacheStorage.set(key, result, ttl);

      this.trackCacheOperation('set', key, 0);
      this.logger.debug('Simplified validation result cached', {
        key,
        ttl,
        action: context.action,
        resource: context.resourceContext?.resourceType,
      });
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to cache simplified validation result', {
        error: error.message,
      });
    }
  }

  /**
   * Get cached simplified validation result
   */
  async getCachedSimplifiedValidationResult(
    context: EnhancedPermissionContext,
  ): Promise<EnhancedPermissionResult | null> {
    try {
      const key = this.generateSimplifiedValidationKey(context);
      const result = await this.cacheStorage.get<EnhancedPermissionResult>(key);

      if (result) {
        this.trackCacheOperation('hit', key, 0);
        this.logger.debug('Simplified validation cache hit', { key });
      } else {
        this.trackCacheOperation('miss', key, 0);
      }

      return result || null;
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to get cached simplified validation result', {
        error: error.message,
      });

      return null;
    }
  }

  /**
   * Cache individual step result
   */
  async cacheStepResult(
    stepNumber: number,
    context: EnhancedPermissionContext,
    stepResult: unknown,
  ): Promise<void> {
    try {
      const key = this.generateStepResultKey(stepNumber, context);
      const ttl = RBAC_CACHE_TTL.STEP_RESULT;

      await this.cacheStorage.set(key, stepResult, ttl);

      this.trackCacheOperation('set', key, 0);
      this.logger.debug('Step result cached', {
        stepNumber,
        key,
        ttl,
      });
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to cache step result', {
        error: error.message,
        stepNumber,
      });
    }
  }

  /**
   * Get cached step result
   */
  async getCachedStepResult<T = unknown>(
    stepNumber: number,
    context: EnhancedPermissionContext,
  ): Promise<T | null> {
    try {
      const key = this.generateStepResultKey(stepNumber, context);
      const result = await this.cacheStorage.get<T>(key);

      if (result) {
        this.trackCacheOperation('hit', key, 0);
        this.logger.debug('Step result cache hit', { stepNumber, key });
      } else {
        this.trackCacheOperation('miss', key, 0);
      }

      return result || null;
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to get cached step result', {
        error: error.message,
        stepNumber,
      });

      return null;
    }
  }

  /**
   * Cache resource metadata (Step 3)
   */
  async cacheResourceMetadata(
    resourceType: string,
    recordId: string | undefined,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      const key = `${RBAC_CACHE_KEYS.RESOURCE_METADATA}:${resourceType}:${recordId || 'all'}`;
      const ttl = RBAC_CACHE_TTL.RESOURCE_META;

      await this.cacheStorage.set(key, metadata, ttl);

      this.trackCacheOperation('set', key, 0);
      this.logger.debug('Resource metadata cached', {
        resourceType,
        recordId,
        ttl,
      });
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to cache resource metadata', {
        error: error.message,
        resourceType,
      });
    }
  }

  /**
   * Get cached resource metadata
   */
  async getCachedResourceMetadata(
    resourceType: string,
    recordId: string | undefined,
  ): Promise<Record<string, unknown> | null> {
    try {
      const key = `${RBAC_CACHE_KEYS.RESOURCE_METADATA}:${resourceType}:${recordId || 'all'}`;
      const result = await this.cacheStorage.get<Record<string, unknown>>(key);

      if (result) {
        this.trackCacheOperation('hit', key, 0);
      } else {
        this.trackCacheOperation('miss', key, 0);
      }

      return result || null;
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to get cached resource metadata', {
        error: error.message,
        resourceType,
      });

      return null;
    }
  }

  /**
   * Cache action validation result (Step 5)
   */
  async cacheActionValidation(
    action: string,
    resourceType: string,
    templateIds: string[],
    isAllowed: boolean,
  ): Promise<void> {
    try {
      const key = `${RBAC_CACHE_KEYS.ACTION_VALIDATION}:${action}:${resourceType}:${templateIds.sort().join(',')}`;
      const ttl = RBAC_CACHE_TTL.ACTION_CHECK;

      await this.cacheStorage.set(key, { isAllowed, templateIds }, ttl);

      this.trackCacheOperation('set', key, 0);
      this.logger.debug('Action validation cached', {
        action,
        resourceType,
        isAllowed,
        ttl,
      });
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to cache action validation', {
        error: error.message,
        action,
        resourceType,
      });
    }
  }

  /**
   * Get cached action validation
   */
  async getCachedActionValidation(
    action: string,
    resourceType: string,
    templateIds: string[],
  ): Promise<{ isAllowed: boolean; templateIds: string[] } | null> {
    try {
      const key = `${RBAC_CACHE_KEYS.ACTION_VALIDATION}:${action}:${resourceType}:${templateIds.sort().join(',')}`;
      const result = await this.cacheStorage.get<{
        isAllowed: boolean;
        templateIds: string[];
      }>(key);

      if (result) {
        this.trackCacheOperation('hit', key, 0);
      } else {
        this.trackCacheOperation('miss', key, 0);
      }

      return result || null;
    } catch (error) {
      this.performanceMetrics.errorCount++;
      this.logger.error('Failed to get cached action validation', {
        error: error.message,
        action,
        resourceType,
      });

      return null;
    }
  }

  /**
   * Invalidate simplified validation cache for a specific context
   */
  async invalidateSimplifiedValidationCache(
    context: EnhancedPermissionContext,
  ): Promise<void> {
    const patterns = [
      this.generateSimplifiedValidationKey(context),
      `${RBAC_CACHE_KEYS.STEP_RESULT}:*:${context.userContext?.workspaceMemberId}:*`,
    ];

    for (const pattern of patterns) {
      await this.invalidateByPattern(pattern);
    }

    this.logger.debug('Simplified validation cache invalidated', {
      userId: context.userContext?.id,
    });
  }

  /**
   * Batch invalidate cache when permission templates change
   */
  async invalidateOnTemplateChange(templateId: string): Promise<void> {
    const patterns = [
      `${RBAC_CACHE_KEYS.TEMPLATE_PERMISSIONS}:${templateId}*`,
      `${RBAC_CACHE_KEYS.SIMPLIFIED_VALIDATION}:*`,
      `${RBAC_CACHE_KEYS.STEP_RESULT}:4:*`, // Step 4: Template check
      `${RBAC_CACHE_KEYS.ACTION_VALIDATION}:*`,
    ];

    for (const pattern of patterns) {
      await this.invalidateByPattern(pattern);
    }

    this.logger.log('Cache invalidated due to template change', { templateId });
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
      lastResetAt: DateTime.now(),
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
      case 'simplified_result':
        return RBAC_CACHE_TTL.SIMPLIFIED_RESULT;
      case 'step_result':
        return RBAC_CACHE_TTL.STEP_RESULT;
      case 'resource_meta':
        return RBAC_CACHE_TTL.RESOURCE_META;
      case 'action_check':
        return RBAC_CACHE_TTL.ACTION_CHECK;
      default:
        return this.cacheConfig.defaultTTL;
    }
  }

  /**
   * Generate cache key for simplified validation result
   */
  private generateSimplifiedValidationKey(
    context: EnhancedPermissionContext,
  ): string {
    const parts = [
      RBAC_CACHE_KEYS.SIMPLIFIED_VALIDATION,
      context.userContext?.workspaceId || 'unknown',
      context.userContext?.workspaceMemberId || 'unknown',
      context.resourceContext?.resourceType || 'unknown',
      context.action || 'unknown',
      context.resourceContext?.recordId || 'all',
    ];

    return parts.join(':');
  }

  /**
   * Generate cache key for individual step result
   */
  private generateStepResultKey(
    stepNumber: number,
    context: EnhancedPermissionContext,
  ): string {
    const parts = [
      RBAC_CACHE_KEYS.STEP_RESULT,
      stepNumber.toString(),
      context.userContext?.workspaceId || 'unknown',
      context.userContext?.workspaceMemberId || 'unknown',
      context.resourceContext?.resourceType || 'unknown',
      context.action || 'unknown',
    ];

    return parts.join(':');
  }

  private trackCacheOperation(
    operation: 'hit' | 'miss' | 'set',
    key: string,
    responseTime: number,
  ): void {
    // Track key access for hot key detection
    const currentCount = this.keyAccessCount.get(key) || 0;

    this.keyAccessCount.set(key, currentCount + 1);
    this.keyLastAccess.set(key, DateTime.now());

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

    // Log performance metrics at regular intervals
    this.performanceMonitoringTimer = setInterval(() => {
      const metrics = this.getPerformanceMetrics();

      this.logger.debug('RBAC Cache Performance Metrics', {
        hitRate: `${metrics.hitRate}%`,
        totalRequests: metrics.totalRequests,
        errorRate: `${metrics.errorRate}%`,
        avgResponseTime: `${metrics.avgResponseTime}ms`,
        hotKeysCount: metrics.hotKeys.length,
        slowOperationsCount: metrics.slowOperations.length,
      });
    }, RBAC_CACHE_INTERVALS.PERFORMANCE_MONITORING);

    this.logger.debug('Performance monitoring started');
  }

  private startCleanupTimer(): void {
    // Start cleanup timer to remove expired keys and perform maintenance
    this.cleanupTimer = setInterval(
      () => this.cleanupExpiredKeys(),
      this.cleanupInterval,
    );

    this.logger.debug('Cache cleanup timer started');
  }

  private async cleanupExpiredKeys(): Promise<void> {
    try {
      // Clean up old access tracking data using retention period
      const cutoffTime = DateTime.now().minus({
        milliseconds: RBAC_CACHE_INTERVALS.ACCESS_TRACKING_RETENTION,
      });

      for (const [key, lastAccess] of this.keyLastAccess.entries()) {
        if (lastAccess < cutoffTime) {
          this.keyLastAccess.delete(key);
          this.keyAccessCount.delete(key);
        }
      }

      // Limit slow operations tracking
      if (this.performanceMetrics.slowOperations.length > 50) {
        this.performanceMetrics.slowOperations =
          this.performanceMetrics.slowOperations.slice(-25);
      }

      // Reset metrics if they get too old (weekly reset)
      const metricsResetCutoff = DateTime.now().minus({
        milliseconds: RBAC_CACHE_INTERVALS.METRICS_RESET,
      });

      if (this.performanceMetrics.lastResetAt < metricsResetCutoff) {
        this.resetPerformanceMetrics();
        this.logger.log('Weekly performance metrics reset completed');
      }

      this.logger.debug('Cache cleanup completed', {
        trackedKeys: this.keyAccessCount.size,
        slowOperations: this.performanceMetrics.slowOperations.length,
      });
    } catch (error) {
      this.logger.error('Cache cleanup failed', { error: error.message });
    }
  }
}
