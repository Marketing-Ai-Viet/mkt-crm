import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { WorkspaceCasbinRuleRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/workspace-casbin-rule.repository';
import { PolicyVersionRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/policy-version.repository';
import {
  PermissionCheckMetric,
  AggregatedMetrics,
  HealthStatus,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types';
import {
  RBAC_MAX_METRICS_ENTRIES,
  RBAC_METRICS_KEY,
  RBAC_METRICS_RETENTION_MS,
} from 'src/mkt-core/infrastructure/redis/constants/rbac/rbac.constant';

import { CasbinEnforcerService } from './casbin-enforcer.service';

// ============================================
// STRUCTURED METRICS TYPES
// ============================================

/**
 * Histogram bucket for latency distribution
 */
type HistogramBucket = {
  le: number; // less than or equal
  count: number;
};

/**
 * Policy operation metric
 */
type PolicyOperationMetric = {
  operation: 'load' | 'save' | 'sync';
  workspaceId: string;
  latencyMs: number;
  success: boolean;
  policyCount?: number;
  timestamp: number;
};

/**
 * Sync retry metric
 */
type SyncRetryMetric = {
  workspaceId: string;
  attempt: number;
  success: boolean;
  error?: string;
  timestamp: number;
};

/**
 * Structured metrics summary
 */
type StructuredMetricsSummary = {
  counters: {
    permissionChecks: { total: number; allowed: number; denied: number };
    cacheHits: number;
    cacheMisses: number;
    policyLoads: { total: number; success: number; failed: number };
    policySaves: { total: number; success: number; failed: number };
    syncRetries: { total: number; success: number; failed: number };
    circuitBreakerTrips: number;
  };
  histograms: {
    permissionCheckLatency: HistogramBucket[];
    policyLoadLatency: HistogramBucket[];
    policySaveLatency: HistogramBucket[];
  };
  gauges: {
    cachedEnforcers: number;
    openCircuitBreakers: number;
    deadLetterQueueSize: number;
    activeSyncs: number;
  };
};

/**
 * RBAC Metrics Service
 *
 * Thu thập và phân tích metrics cho RBAC system.
 *
 * Features:
 * - Permission check latency tracking
 * - Cache hit rate monitoring
 * - Percentile calculations (P50, P95, P99)
 * - Health checks
 * - Dead letter queue monitoring
 *
 * Usage:
 * ```typescript
 * await metricsService.recordCheck({
 *   workspaceId: 'ws-uuid',
 *   latencyMs: 5,
 *   allowed: true,
 *   cached: true,
 * });
 *
 * const metrics = await metricsService.getMetrics();
 * ```
 */
/**
 * Default histogram buckets for latency (in ms)
 */
const DEFAULT_LATENCY_BUCKETS = [
  1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000,
];

@Injectable()
export class RbacMetricsService implements OnModuleDestroy {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:MetricsService`);

  // In-memory metrics buffer (flushed periodically to Redis)
  private metricsBuffer: PermissionCheckMetric[] = [];
  private lastFlush = DateTimeUtils.toMillis(DateTimeUtils.now());

  // Flush interval reference for cleanup
  private flushInterval: NodeJS.Timeout | null = null;

  // Structured metrics - in-memory counters
  private readonly counters = {
    cacheHits: 0,
    cacheMisses: 0,
    policyLoadsTotal: 0,
    policyLoadsSuccess: 0,
    policyLoadsFailed: 0,
    policySavesTotal: 0,
    policySavesSuccess: 0,
    policySavesFailed: 0,
    syncRetriesTotal: 0,
    syncRetriesSuccess: 0,
    syncRetriesFailed: 0,
    circuitBreakerTrips: 0,
  };

  // Policy operation metrics buffer
  private policyOperationBuffer: PolicyOperationMetric[] = [];
  private syncRetryBuffer: SyncRetryMetric[] = [];

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.RbacPolicy)
    private readonly cacheStorage: CacheStorageService,
    private readonly casbinRuleRepository: WorkspaceCasbinRuleRepository,
    private readonly policyVersionRepository: PolicyVersionRepository,
    private readonly enforcerService: CasbinEnforcerService,
  ) {
    // Schedule periodic flush
    this.flushInterval = setInterval(() => this.flushMetrics(), 60000); // Every minute
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Final flush
    await this.flushMetrics();
    this.logger.log('RbacMetricsService shutdown complete');
  }

  /**
   * Record permission check metric
   */
  async recordCheck(
    metric: Omit<PermissionCheckMetric, 'timestamp'>,
  ): Promise<void> {
    this.metricsBuffer.push({
      ...metric,
      timestamp: DateTimeUtils.toMillis(DateTimeUtils.now()),
    });

    // Flush if buffer is full
    if (this.metricsBuffer.length >= 100) {
      await this.flushMetrics();
    }
  }

  /**
   * Flush metrics buffer to Redis
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    try {
      // Get existing metrics
      const existing = await this.getStoredMetrics();

      // Combine and trim old entries
      const cutoff =
        DateTimeUtils.toMillis(DateTimeUtils.now()) - RBAC_METRICS_RETENTION_MS;
      const combined = [...existing, ...this.metricsBuffer]
        .filter((m) => m.timestamp > cutoff)
        .slice(-RBAC_MAX_METRICS_ENTRIES);

      // Store
      await this.cacheStorage.set(
        RBAC_METRICS_KEY,
        combined,
        RBAC_METRICS_RETENTION_MS,
      );

      // Clear buffer
      this.metricsBuffer = [];
      this.lastFlush = DateTimeUtils.toMillis(DateTimeUtils.now());
    } catch (error) {
      this.logger.error(`Failed to flush metrics: ${error}`);
    }
  }

  /**
   * Get stored metrics from Redis
   */
  private async getStoredMetrics(): Promise<PermissionCheckMetric[]> {
    try {
      const data =
        await this.cacheStorage.get<PermissionCheckMetric[]>(RBAC_METRICS_KEY);

      return data ?? [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get aggregated metrics
   */
  async getMetrics(options?: {
    workspaceId?: string;
    timeRangeMs?: number;
  }): Promise<AggregatedMetrics> {
    // Flush current buffer first
    await this.flushMetrics();

    let metrics = await this.getStoredMetrics();

    // Filter by workspace if specified
    if (options?.workspaceId) {
      metrics = metrics.filter((m) => m.workspaceId === options.workspaceId);
    }

    // Filter by time range
    if (options?.timeRangeMs) {
      const cutoff =
        DateTimeUtils.toMillis(DateTimeUtils.now()) - options.timeRangeMs;

      metrics = metrics.filter((m) => m.timestamp > cutoff);
    }

    if (metrics.length === 0) {
      return {
        totalChecks: 0,
        allowedCount: 0,
        deniedCount: 0,
        avgLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        cacheHitRate: 0,
      };
    }

    // Calculate stats
    const latencies = metrics.map((m) => m.latencyMs).sort((a, b) => a - b);
    const allowedCount = metrics.filter((m) => m.allowed).length;
    const cachedCount = metrics.filter((m) => m.cached).length;

    return {
      totalChecks: metrics.length,
      allowedCount,
      deniedCount: metrics.length - allowedCount,
      avgLatencyMs: this.average(latencies),
      p50LatencyMs: this.percentile(latencies, 50),
      p95LatencyMs: this.percentile(latencies, 95),
      p99LatencyMs: this.percentile(latencies, 99),
      cacheHitRate: (cachedCount / metrics.length) * 100,
    };
  }

  /**
   * Get metrics by workspace
   */
  async getMetricsByWorkspace(): Promise<Map<string, AggregatedMetrics>> {
    await this.flushMetrics();

    const metrics = await this.getStoredMetrics();
    const workspaces = new Set(metrics.map((m) => m.workspaceId));
    const result = new Map<string, AggregatedMetrics>();

    for (const workspaceId of workspaces) {
      const wsMetrics = await this.getMetrics({ workspaceId });

      result.set(workspaceId, wsMetrics);
    }

    return result;
  }

  /**
   * Get system health status
   *
   * Note: In workspace-per-schema model, this returns health for current workspace context.
   * For cross-workspace health monitoring, use admin endpoints with workspace iteration.
   */
  async getHealth(): Promise<HealthStatus> {
    const components = {
      enforcer: await this.checkEnforcerHealth(),
      watcher: await this.checkWatcherHealth(),
      cache: await this.checkCacheHealth(),
      database: await this.checkDatabaseHealth(),
    };

    const healthy = Object.values(components).every((c) => c.healthy);

    // Get workspace-scoped metrics
    const [policyCount, deadLetterEntries, enforcerStats] = await Promise.all([
      this.casbinRuleRepository.count(),
      this.policyVersionRepository.getDeadLetterEntries(),
      this.getEnforcerStats(),
    ]);

    return {
      healthy,
      components,
      metrics: {
        activeWorkspaces: 1, // Current workspace only
        totalPolicies: policyCount,
        cachedEnforcers: enforcerStats.cachedEnforcers,
        deadLetterCount: deadLetterEntries.length,
      },
    };
  }

  /**
   * Check enforcer health
   */
  private async checkEnforcerHealth(): Promise<{
    healthy: boolean;
    message?: string;
  }> {
    try {
      const stats = this.enforcerService.getStats();

      return {
        healthy: true,
        message: `${stats.cachedEnforcers} enforcers cached`,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Enforcer error: ${error}`,
      };
    }
  }

  /**
   * Check watcher health
   */
  private async checkWatcherHealth(): Promise<{
    healthy: boolean;
    message?: string;
  }> {
    try {
      const stats = this.enforcerService.getStats();

      if (!stats.watcherConnected) {
        return {
          healthy: false,
          message: 'Watcher not connected',
        };
      }

      return {
        healthy: true,
        message: 'Watcher connected',
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Watcher error: ${error}`,
      };
    }
  }

  /**
   * Check cache health
   */
  private async checkCacheHealth(): Promise<{
    healthy: boolean;
    message?: string;
  }> {
    try {
      // Try a simple set/get
      const testKey = 'rbac-seeder:health:test';

      await this.cacheStorage.set(testKey, 'ok', 1000);
      const value = await this.cacheStorage.get<string>(testKey);

      if (value !== 'ok') {
        return {
          healthy: false,
          message: 'Cache read/write mismatch',
        };
      }

      return {
        healthy: true,
        message: 'Cache operational',
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Cache error: ${error}`,
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<{
    healthy: boolean;
    message?: string;
  }> {
    try {
      // Check database connectivity by counting policies in current workspace
      const policyCount = await this.casbinRuleRepository.count();

      return {
        healthy: true,
        message: `${policyCount} policies in current workspace`,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Database error: ${error}`,
      };
    }
  }

  /**
   * Get enforcer stats
   */
  private getEnforcerStats(): {
    cachedEnforcers: number;
    watcherConnected: boolean;
  } {
    return this.enforcerService.getStats();
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;

    const sum = values.reduce((a, b) => a + b, 0);

    return Math.round(sum / values.length);
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil((p / 100) * sortedValues.length) - 1;

    return sortedValues[Math.max(0, index)];
  }

  /**
   * Get latency histogram
   */
  async getLatencyHistogram(options?: {
    workspaceId?: string;
    buckets?: number[];
  }): Promise<Map<string, number>> {
    await this.flushMetrics();

    let metrics = await this.getStoredMetrics();

    if (options?.workspaceId) {
      metrics = metrics.filter((m) => m.workspaceId === options.workspaceId);
    }

    const buckets = options?.buckets ?? [1, 5, 10, 25, 50, 100, 250, 500, 1000];
    const histogram = new Map<string, number>();

    // Initialize buckets
    for (let i = 0; i < buckets.length; i++) {
      const label =
        i === 0 ? `<=${buckets[i]}ms` : `${buckets[i - 1] + 1}-${buckets[i]}ms`;

      histogram.set(label, 0);
    }

    histogram.set(`>${buckets[buckets.length - 1]}ms`, 0);

    // Count
    for (const metric of metrics) {
      const bucketIndex = buckets.findIndex((b) => metric.latencyMs <= b);

      if (bucketIndex === -1) {
        histogram.set(
          `>${buckets[buckets.length - 1]}ms`,
          (histogram.get(`>${buckets[buckets.length - 1]}ms`) ?? 0) + 1,
        );
      } else {
        const label =
          bucketIndex === 0
            ? `<=${buckets[0]}ms`
            : `${buckets[bucketIndex - 1] + 1}-${buckets[bucketIndex]}ms`;

        histogram.set(label, (histogram.get(label) ?? 0) + 1);
      }
    }

    return histogram;
  }

  /**
   * Clear all metrics
   */
  async clearMetrics(): Promise<void> {
    this.metricsBuffer = [];
    this.policyOperationBuffer = [];
    this.syncRetryBuffer = [];

    // Reset counters
    this.counters.cacheHits = 0;
    this.counters.cacheMisses = 0;
    this.counters.policyLoadsTotal = 0;
    this.counters.policyLoadsSuccess = 0;
    this.counters.policyLoadsFailed = 0;
    this.counters.policySavesTotal = 0;
    this.counters.policySavesSuccess = 0;
    this.counters.policySavesFailed = 0;
    this.counters.syncRetriesTotal = 0;
    this.counters.syncRetriesSuccess = 0;
    this.counters.syncRetriesFailed = 0;
    this.counters.circuitBreakerTrips = 0;

    await this.cacheStorage.del(RBAC_METRICS_KEY);
    this.logger.log('Metrics cleared');
  }

  // ============================================
  // STRUCTURED METRICS - RECORD METHODS
  // ============================================

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.counters.cacheHits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.counters.cacheMisses++;
  }

  /**
   * Record policy load operation
   */
  recordPolicyLoad(
    workspaceId: string,
    latencyMs: number,
    success: boolean,
    policyCount?: number,
  ): void {
    this.counters.policyLoadsTotal++;

    if (success) {
      this.counters.policyLoadsSuccess++;
    } else {
      this.counters.policyLoadsFailed++;
    }

    this.policyOperationBuffer.push({
      operation: 'load',
      workspaceId,
      latencyMs,
      success,
      policyCount,
      timestamp: DateTimeUtils.toMillis(DateTimeUtils.now()),
    });

    // Trim buffer if too large
    if (this.policyOperationBuffer.length > 1000) {
      this.policyOperationBuffer = this.policyOperationBuffer.slice(-500);
    }
  }

  /**
   * Record policy save operation
   */
  recordPolicySave(
    workspaceId: string,
    latencyMs: number,
    success: boolean,
    policyCount?: number,
  ): void {
    this.counters.policySavesTotal++;

    if (success) {
      this.counters.policySavesSuccess++;
    } else {
      this.counters.policySavesFailed++;
    }

    this.policyOperationBuffer.push({
      operation: 'save',
      workspaceId,
      latencyMs,
      success,
      policyCount,
      timestamp: DateTimeUtils.toMillis(DateTimeUtils.now()),
    });

    // Trim buffer if too large
    if (this.policyOperationBuffer.length > 1000) {
      this.policyOperationBuffer = this.policyOperationBuffer.slice(-500);
    }
  }

  /**
   * Record sync retry
   */
  recordSyncRetry(
    workspaceId: string,
    attempt: number,
    success: boolean,
    error?: string,
  ): void {
    this.counters.syncRetriesTotal++;

    if (success) {
      this.counters.syncRetriesSuccess++;
    } else {
      this.counters.syncRetriesFailed++;
    }

    this.syncRetryBuffer.push({
      workspaceId,
      attempt,
      success,
      error,
      timestamp: DateTimeUtils.toMillis(DateTimeUtils.now()),
    });

    // Trim buffer if too large
    if (this.syncRetryBuffer.length > 500) {
      this.syncRetryBuffer = this.syncRetryBuffer.slice(-250);
    }
  }

  /**
   * Record circuit breaker trip
   */
  recordCircuitBreakerTrip(): void {
    this.counters.circuitBreakerTrips++;
  }

  // ============================================
  // STRUCTURED METRICS - QUERY METHODS
  // ============================================

  /**
   * Get structured metrics summary
   */
  async getStructuredMetrics(): Promise<StructuredMetricsSummary> {
    await this.flushMetrics();
    const metrics = await this.getStoredMetrics();

    // Permission check stats
    const allowedCount = metrics.filter((m) => m.allowed).length;

    // Build histograms
    const permCheckLatencies = metrics.map((m) => m.latencyMs);
    const policyLoadLatencies = this.policyOperationBuffer
      .filter((m) => m.operation === 'load')
      .map((m) => m.latencyMs);
    const policySaveLatencies = this.policyOperationBuffer
      .filter((m) => m.operation === 'save')
      .map((m) => m.latencyMs);

    // Get gauge values
    const enforcerStats = this.enforcerService.getStats();
    const deadLetterEntries =
      await this.policyVersionRepository.getDeadLetterEntries();

    return {
      counters: {
        permissionChecks: {
          total: metrics.length,
          allowed: allowedCount,
          denied: metrics.length - allowedCount,
        },
        cacheHits: this.counters.cacheHits,
        cacheMisses: this.counters.cacheMisses,
        policyLoads: {
          total: this.counters.policyLoadsTotal,
          success: this.counters.policyLoadsSuccess,
          failed: this.counters.policyLoadsFailed,
        },
        policySaves: {
          total: this.counters.policySavesTotal,
          success: this.counters.policySavesSuccess,
          failed: this.counters.policySavesFailed,
        },
        syncRetries: {
          total: this.counters.syncRetriesTotal,
          success: this.counters.syncRetriesSuccess,
          failed: this.counters.syncRetriesFailed,
        },
        circuitBreakerTrips: this.counters.circuitBreakerTrips,
      },
      histograms: {
        permissionCheckLatency: this.buildHistogram(permCheckLatencies),
        policyLoadLatency: this.buildHistogram(policyLoadLatencies),
        policySaveLatency: this.buildHistogram(policySaveLatencies),
      },
      gauges: {
        cachedEnforcers: enforcerStats.cachedEnforcers,
        openCircuitBreakers: enforcerStats.circuitBreakersOpen,
        deadLetterQueueSize: deadLetterEntries.length,
        activeSyncs: 0, // Would need PolicySyncService reference
      },
    };
  }

  /**
   * Build histogram from latency values
   */
  private buildHistogram(
    latencies: number[],
    buckets: number[] = DEFAULT_LATENCY_BUCKETS,
  ): HistogramBucket[] {
    const histogram: HistogramBucket[] = buckets.map((le) => ({
      le,
      count: 0,
    }));

    // Add infinity bucket
    histogram.push({ le: Infinity, count: 0 });

    for (const latency of latencies) {
      for (const bucket of histogram) {
        if (latency <= bucket.le) {
          bucket.count++;
          break;
        }
      }
    }

    return histogram;
  }

  /**
   * Get sync retry health metrics
   */
  getSyncRetryHealth(): {
    totalRetries: number;
    successRate: number;
    recentFailures: SyncRetryMetric[];
    workspacesWithFailures: string[];
  } {
    const total = this.counters.syncRetriesTotal;
    const successRate =
      total > 0 ? (this.counters.syncRetriesSuccess / total) * 100 : 100;

    // Recent failures (last 10)
    const recentFailures = this.syncRetryBuffer
      .filter((m) => !m.success)
      .slice(-10);

    // Unique workspaces with failures
    const workspacesWithFailures = [
      ...new Set(
        this.syncRetryBuffer
          .filter((m) => !m.success)
          .map((m) => m.workspaceId),
      ),
    ];

    return {
      totalRetries: total,
      successRate,
      recentFailures,
      workspacesWithFailures,
    };
  }

  /**
   * Get cache effectiveness metrics
   */
  getCacheEffectiveness(): {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    efficiency: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const total = this.counters.cacheHits + this.counters.cacheMisses;
    const hitRate = total > 0 ? (this.counters.cacheHits / total) * 100 : 0;

    let efficiency: 'excellent' | 'good' | 'fair' | 'poor';

    if (hitRate >= 90) {
      efficiency = 'excellent';
    } else if (hitRate >= 70) {
      efficiency = 'good';
    } else if (hitRate >= 50) {
      efficiency = 'fair';
    } else {
      efficiency = 'poor';
    }

    return {
      hitRate,
      totalHits: this.counters.cacheHits,
      totalMisses: this.counters.cacheMisses,
      efficiency,
    };
  }

  /**
   * Get policy operation metrics by type
   */
  getPolicyOperationMetrics(operation: 'load' | 'save'): {
    total: number;
    successRate: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    recentOperations: PolicyOperationMetric[];
  } {
    const ops = this.policyOperationBuffer.filter(
      (m) => m.operation === operation,
    );

    const successCount = ops.filter((m) => m.success).length;
    const latencies = ops.map((m) => m.latencyMs).sort((a, b) => a - b);

    return {
      total: ops.length,
      successRate: ops.length > 0 ? (successCount / ops.length) * 100 : 100,
      avgLatencyMs: this.average(latencies),
      p95LatencyMs: this.percentile(latencies, 95),
      recentOperations: ops.slice(-10),
    };
  }
}
