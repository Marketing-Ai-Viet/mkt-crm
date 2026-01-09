import { Injectable, Logger } from '@nestjs/common';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CasbinRuleRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/casbin-rule.repository';
import { PolicyVersionRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/policy-version.repository';

import { CasbinEnforcerService } from './casbin-enforcer.service';

/**
 * Metrics entry for permission check
 */
type PermissionCheckMetric = {
  timestamp: number;
  workspaceId: string;
  latencyMs: number;
  allowed: boolean;
  cached: boolean;
};

/**
 * Aggregated metrics
 */
type AggregatedMetrics = {
  totalChecks: number;
  allowedCount: number;
  deniedCount: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  cacheHitRate: number;
};

/**
 * System health status
 */
type HealthStatus = {
  healthy: boolean;
  components: {
    enforcer: { healthy: boolean; message?: string };
    watcher: { healthy: boolean; message?: string };
    cache: { healthy: boolean; message?: string };
    database: { healthy: boolean; message?: string };
  };
  metrics: {
    activeWorkspaces: number;
    totalPolicies: number;
    cachedEnforcers: number;
    deadLetterCount: number;
  };
};

const METRICS_KEY = 'rbac-seeder:metrics:checks';
const METRICS_RETENTION_MS = 3600000; // 1 hour
const MAX_METRICS_ENTRIES = 10000;

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
@Injectable()
export class RbacMetricsService {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:MetricsService`);

  // In-memory metrics buffer (flushed periodically to Redis)
  private metricsBuffer: PermissionCheckMetric[] = [];
  private lastFlush = Date.now();

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.RbacPolicy)
    private readonly cacheStorage: CacheStorageService,
    private readonly casbinRuleRepository: CasbinRuleRepository,
    private readonly policyVersionRepository: PolicyVersionRepository,
    private readonly enforcerService: CasbinEnforcerService,
  ) {
    // Schedule periodic flush
    setInterval(() => this.flushMetrics(), 60000); // Every minute
  }

  /**
   * Record permission check metric
   */
  async recordCheck(
    metric: Omit<PermissionCheckMetric, 'timestamp'>,
  ): Promise<void> {
    this.metricsBuffer.push({
      ...metric,
      timestamp: Date.now(),
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
      const cutoff = Date.now() - METRICS_RETENTION_MS;
      const combined = [...existing, ...this.metricsBuffer]
        .filter((m) => m.timestamp > cutoff)
        .slice(-MAX_METRICS_ENTRIES);

      // Store
      await this.cacheStorage.set(METRICS_KEY, combined, METRICS_RETENTION_MS);

      // Clear buffer
      this.metricsBuffer = [];
      this.lastFlush = Date.now();
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
        await this.cacheStorage.get<PermissionCheckMetric[]>(METRICS_KEY);

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
      const cutoff = Date.now() - options.timeRangeMs;

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
   */
  async getHealth(): Promise<HealthStatus> {
    const components = {
      enforcer: await this.checkEnforcerHealth(),
      watcher: await this.checkWatcherHealth(),
      cache: await this.checkCacheHealth(),
      database: await this.checkDatabaseHealth(),
    };

    const healthy = Object.values(components).every((c) => c.healthy);

    // Get system metrics
    const [activeWorkspaces, deadLetterEntries, enforcerStats] =
      await Promise.all([
        this.casbinRuleRepository.getActiveWorkspaces(),
        this.policyVersionRepository.getDeadLetterEntries(),
        this.getEnforcerStats(),
      ]);

    // Count total policies across workspaces
    let totalPolicies = 0;

    for (const wsId of activeWorkspaces) {
      const count = await this.casbinRuleRepository.countByWorkspace(wsId);

      totalPolicies += count;
    }

    return {
      healthy,
      components,
      metrics: {
        activeWorkspaces: activeWorkspaces.length,
        totalPolicies,
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
      // Try to get workspace count
      const workspaces = await this.casbinRuleRepository.getActiveWorkspaces();

      return {
        healthy: true,
        message: `${workspaces.length} active workspaces`,
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
    await this.cacheStorage.del(METRICS_KEY);
    this.logger.log('Metrics cleared');
  }

  /**
   * Record discrepancy between Casbin and legacy engines
   * Used in shadow mode for migration validation
   */
  recordDiscrepancy(record: {
    resource: string;
    action: string;
    casbinResult: boolean;
    legacyResult: boolean;
  }): void {
    // Log discrepancy for analysis
    this.logger.warn('RBAC Engine Discrepancy', {
      resource: record.resource,
      action: record.action,
      casbin: record.casbinResult ? 'ALLOW' : 'DENY',
      legacy: record.legacyResult ? 'ALLOW' : 'DENY',
      timestamp: new Date().toISOString(),
    });

    // TODO: Store in Redis or emit event for aggregation
    // This can be used to track discrepancy trends before full migration
  }
}
