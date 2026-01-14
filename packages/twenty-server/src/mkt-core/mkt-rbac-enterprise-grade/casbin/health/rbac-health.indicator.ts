import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
import { RbacMetricsService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/rbac-metrics.service';
import { RBAC_HEALTH_THRESHOLDS } from 'src/mkt-core/infrastructure/redis/constants/rbac';

/**
 * Health details for RBAC system
 */
type RbacHealthDetails = {
  enforcer: {
    status: 'up' | 'down';
    cachedEnforcers: number;
    fallbackReloadActive: boolean;
  };
  watcher: {
    status: 'up' | 'down';
    connected: boolean;
  };
  cache: {
    status: 'up' | 'down';
    hitRate: number;
    efficiency: 'excellent' | 'good' | 'fair' | 'poor';
    message?: string;
  };
  circuitBreaker: {
    status: 'up' | 'down' | 'degraded';
    openCount: number;
    totalTrips: number;
  };
  database: {
    status: 'up' | 'down';
    activeWorkspaces?: number;
    totalPolicies?: number;
  };
  syncHealth: {
    status: 'up' | 'down' | 'degraded';
    successRate: number;
    totalRetries: number;
    workspacesWithFailures: string[];
  };
  deadLetterQueue: {
    status: 'up' | 'down' | 'warning';
    size: number;
  };
  metrics: {
    totalChecks: number;
    allowedCount: number;
    deniedCount: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
  };
  policyOperations: {
    loads: {
      total: number;
      successRate: number;
      avgLatencyMs: number;
    };
    saves: {
      total: number;
      successRate: number;
      avgLatencyMs: number;
    };
  };
};

/**
 * RBAC Health Indicator
 *
 * Health check cho RBAC system dùng với @nestjs/terminus.
 *
 * Kiểm tra:
 * - Enforcer service availability
 * - PG NOTIFY watcher connection
 * - Cache connectivity
 * - Database connectivity
 * - Performance metrics
 *
 * Usage:
 * ```typescript
 * @Controller('health')
 * export class HealthController {
 *   constructor(
 *     private health: HealthCheckService,
 *     private rbacHealth: RbacHealthIndicator,
 *   ) {}
 *
 *   @Get()
 *   @HealthCheck()
 *   check() {
 *     return this.health.check([
 *       () => this.rbacHealth.isHealthy(),
 *     ]);
 *   }
 * }
 * ```
 */
@Injectable()
export class RbacHealthIndicator {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:HealthIndicator`);

  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly enforcerService: CasbinEnforcerService,
    private readonly metricsService: RbacMetricsService,
  ) {}

  /**
   * Check overall RBAC system health
   */
  async isHealthy(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('rbac');

    try {
      const health = await this.checkAllComponents();
      const isSystemHealthy = this.evaluateHealth(health);

      if (isSystemHealthy) {
        return indicator.up({ details: health });
      }

      return indicator.down({
        message: 'RBAC system unhealthy',
        details: health,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`RBAC health check failed: ${errorMessage}`);

      return indicator.down({
        message: errorMessage,
        details: { error: errorMessage },
      });
    }
  }

  /**
   * Check all system components
   */
  private async checkAllComponents(): Promise<RbacHealthDetails> {
    const [
      enforcerHealth,
      watcherHealth,
      metricsHealth,
      fullHealth,
      structuredMetrics,
    ] = await Promise.all([
      this.checkEnforcer(),
      this.checkWatcher(),
      this.checkMetrics(),
      this.metricsService.getHealth(),
      this.metricsService.getStructuredMetrics(),
    ]);

    // Get additional health metrics
    const cacheEffectiveness = this.metricsService.getCacheEffectiveness();
    const syncRetryHealth = this.metricsService.getSyncRetryHealth();
    const policyLoadMetrics =
      this.metricsService.getPolicyOperationMetrics('load');
    const policySaveMetrics =
      this.metricsService.getPolicyOperationMetrics('save');

    return {
      enforcer: enforcerHealth,
      watcher: watcherHealth,
      cache: {
        status: fullHealth.components.cache.healthy ? 'up' : 'down',
        hitRate: cacheEffectiveness.hitRate,
        efficiency: cacheEffectiveness.efficiency,
        message: fullHealth.components.cache.message,
      },
      circuitBreaker: this.evaluateCircuitBreakerHealth(
        structuredMetrics.gauges.openCircuitBreakers,
        structuredMetrics.counters.circuitBreakerTrips,
      ),
      database: {
        status: fullHealth.components.database.healthy ? 'up' : 'down',
        activeWorkspaces: fullHealth.metrics.activeWorkspaces,
        totalPolicies: fullHealth.metrics.totalPolicies,
      },
      syncHealth: this.evaluateSyncHealth(syncRetryHealth),
      deadLetterQueue: this.evaluateDeadLetterHealth(
        fullHealth.metrics.deadLetterCount,
      ),
      metrics: metricsHealth,
      policyOperations: {
        loads: {
          total: policyLoadMetrics.total,
          successRate: policyLoadMetrics.successRate,
          avgLatencyMs: policyLoadMetrics.avgLatencyMs,
        },
        saves: {
          total: policySaveMetrics.total,
          successRate: policySaveMetrics.successRate,
          avgLatencyMs: policySaveMetrics.avgLatencyMs,
        },
      },
    };
  }

  /**
   * Check enforcer service health
   */
  private async checkEnforcer(): Promise<{
    status: 'up' | 'down';
    cachedEnforcers: number;
    fallbackReloadActive: boolean;
  }> {
    try {
      const stats = this.enforcerService.getStats();

      return {
        status: 'up',
        cachedEnforcers: stats.cachedEnforcers,
        fallbackReloadActive: stats.fallbackReloadActive,
      };
    } catch (error) {
      this.logger.error(`Enforcer health check failed: ${error}`);

      return {
        status: 'down',
        cachedEnforcers: 0,
        fallbackReloadActive: false,
      };
    }
  }

  /**
   * Check watcher connection health
   */
  private async checkWatcher(): Promise<{
    status: 'up' | 'down';
    connected: boolean;
  }> {
    try {
      const stats = this.enforcerService.getStats();

      return {
        status: stats.watcherConnected ? 'up' : 'down',
        connected: stats.watcherConnected,
      };
    } catch (error) {
      this.logger.error(`Watcher health check failed: ${error}`);

      return {
        status: 'down',
        connected: false,
      };
    }
  }

  /**
   * Check performance metrics
   */
  private async checkMetrics(): Promise<{
    totalChecks: number;
    allowedCount: number;
    deniedCount: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
  }> {
    try {
      // Get metrics for last 5 minutes
      const metrics = await this.metricsService.getMetrics({
        timeRangeMs: 5 * 60 * 1000,
      });

      return {
        totalChecks: metrics.totalChecks,
        allowedCount: metrics.allowedCount,
        deniedCount: metrics.deniedCount,
        avgLatencyMs: metrics.avgLatencyMs,
        p50LatencyMs: metrics.p50LatencyMs,
        p95LatencyMs: metrics.p95LatencyMs,
        p99LatencyMs: metrics.p99LatencyMs,
      };
    } catch (error) {
      this.logger.error(`Metrics health check failed: ${error}`);

      return {
        totalChecks: 0,
        allowedCount: 0,
        deniedCount: 0,
        avgLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
      };
    }
  }

  /**
   * Evaluate circuit breaker health
   */
  private evaluateCircuitBreakerHealth(
    openCount: number,
    totalTrips: number,
  ): {
    status: 'up' | 'down' | 'degraded';
    openCount: number;
    totalTrips: number;
  } {
    let status: 'up' | 'down' | 'degraded' = 'up';

    if (openCount >= RBAC_HEALTH_THRESHOLDS.MAX_OPEN_CIRCUIT_BREAKERS) {
      status = 'down';
      this.logger.error(`Too many open circuit breakers: ${openCount}`);
    } else if (openCount > 0) {
      status = 'degraded';
      this.logger.warn(`Circuit breakers open: ${openCount}`);
    }

    return { status, openCount, totalTrips };
  }

  /**
   * Evaluate sync health
   */
  private evaluateSyncHealth(syncRetryHealth: {
    totalRetries: number;
    successRate: number;
    workspacesWithFailures: string[];
  }): {
    status: 'up' | 'down' | 'degraded';
    successRate: number;
    totalRetries: number;
    workspacesWithFailures: string[];
  } {
    let status: 'up' | 'down' | 'degraded' = 'up';

    if (
      syncRetryHealth.successRate <
        RBAC_HEALTH_THRESHOLDS.MIN_SYNC_SUCCESS_RATE &&
      syncRetryHealth.totalRetries > 0
    ) {
      if (syncRetryHealth.successRate < 50) {
        status = 'down';
        this.logger.error(
          `Sync success rate critical: ${syncRetryHealth.successRate.toFixed(1)}%`,
        );
      } else {
        status = 'degraded';
        this.logger.warn(
          `Sync success rate low: ${syncRetryHealth.successRate.toFixed(1)}%`,
        );
      }
    }

    return {
      status,
      successRate: syncRetryHealth.successRate,
      totalRetries: syncRetryHealth.totalRetries,
      workspacesWithFailures: syncRetryHealth.workspacesWithFailures,
    };
  }

  /**
   * Evaluate dead letter queue health
   */
  private evaluateDeadLetterHealth(size: number): {
    status: 'up' | 'down' | 'warning';
    size: number;
  } {
    let status: 'up' | 'down' | 'warning' = 'up';

    if (size > RBAC_HEALTH_THRESHOLDS.MAX_DEAD_LETTER_SIZE * 2) {
      status = 'down';
      this.logger.error(`Dead letter queue critical: ${size} entries`);
    } else if (size > RBAC_HEALTH_THRESHOLDS.MAX_DEAD_LETTER_SIZE) {
      status = 'warning';
      this.logger.warn(`Dead letter queue growing: ${size} entries`);
    }

    return { status, size };
  }

  /**
   * Evaluate overall health based on components
   */
  private evaluateHealth(health: RbacHealthDetails): boolean {
    // Enforcer must be up
    if (health.enforcer.status === 'down') {
      return false;
    }

    // Database must be up
    if (health.database.status === 'down') {
      return false;
    }

    // Circuit breaker critical failure
    if (health.circuitBreaker.status === 'down') {
      this.logger.error('Too many circuit breakers open - system degraded');

      return false;
    }

    // Sync health critical failure
    if (health.syncHealth.status === 'down') {
      this.logger.error('Sync health critical - policy updates failing');

      return false;
    }

    // Dead letter queue critical
    if (health.deadLetterQueue.status === 'down') {
      this.logger.error(
        'Dead letter queue critical - investigate failed syncs',
      );

      return false;
    }

    // Cache should be up (warning if down but not critical)
    if (health.cache.status === 'down') {
      this.logger.warn('Cache is down - performance may be degraded');
    }

    // Cache efficiency warning
    if (
      health.cache.hitRate < RBAC_HEALTH_THRESHOLDS.MIN_CACHE_HIT_RATE &&
      health.metrics.totalChecks > 100
    ) {
      this.logger.warn(
        `Cache hit rate (${health.cache.hitRate.toFixed(1)}%) below threshold (${RBAC_HEALTH_THRESHOLDS.MIN_CACHE_HIT_RATE}%)`,
      );
    }

    // Watcher can be down (fallback to polling)
    if (health.watcher.status === 'down') {
      this.logger.warn('Watcher is down - policy updates may be delayed');

      // Check if fallback is active
      if (health.enforcer.fallbackReloadActive) {
        this.logger.log('Fallback periodic reload is active');
      } else {
        this.logger.warn(
          'Fallback reload not active - policies may become stale',
        );
      }
    }

    // Circuit breaker degraded warning
    if (health.circuitBreaker.status === 'degraded') {
      this.logger.warn(
        `${health.circuitBreaker.openCount} circuit breakers open`,
      );
    }

    // Sync health degraded warning
    if (health.syncHealth.status === 'degraded') {
      this.logger.warn(
        `Sync success rate degraded: ${health.syncHealth.successRate.toFixed(1)}%`,
      );
    }

    // Dead letter queue warning
    if (health.deadLetterQueue.status === 'warning') {
      this.logger.warn(
        `Dead letter queue growing: ${health.deadLetterQueue.size} entries`,
      );
    }

    // Check latency threshold
    if (
      health.metrics.totalChecks > 0 &&
      health.metrics.p95LatencyMs > RBAC_HEALTH_THRESHOLDS.MAX_P95_LATENCY_MS
    ) {
      this.logger.warn(
        `P95 latency (${health.metrics.p95LatencyMs}ms) exceeds threshold (${RBAC_HEALTH_THRESHOLDS.MAX_P95_LATENCY_MS}ms)`,
      );
      // Not critical, just warning
    }

    return true;
  }

  /**
   * Quick health check - just enforcer availability
   */
  async isReady(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('rbac-ready');

    try {
      const stats = this.enforcerService.getStats();

      return indicator.up({
        status: 'ready',
        cachedEnforcers: stats.cachedEnforcers,
        watcherConnected: stats.watcherConnected,
        fallbackReloadActive: stats.fallbackReloadActive,
        circuitBreakersOpen: stats.circuitBreakersOpen,
      });
    } catch (error) {
      return indicator.down({ status: 'not_ready' });
    }
  }

  /**
   * Get detailed health report for admin/monitoring
   */
  async getDetailedHealth(): Promise<RbacHealthDetails> {
    return this.checkAllComponents();
  }

  /**
   * Liveness check - basic service alive
   */
  async isAlive(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('rbac-alive');

    return indicator.up({ status: 'alive' });
  }
}
