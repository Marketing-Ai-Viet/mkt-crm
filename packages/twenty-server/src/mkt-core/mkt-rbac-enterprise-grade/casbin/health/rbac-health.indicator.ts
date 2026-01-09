import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
import { RbacMetricsService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/rbac-metrics.service';

/**
 * Health details for RBAC system
 */
type RbacHealthDetails = {
  enforcer: {
    status: 'up' | 'down';
    cachedEnforcers: number;
  };
  watcher: {
    status: 'up' | 'down';
    connected: boolean;
  };
  cache: {
    status: 'up' | 'down';
    message?: string;
  };
  database: {
    status: 'up' | 'down';
    activeWorkspaces?: number;
  };
  metrics: {
    totalChecks: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
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
 *       () => this.rbacHealth.isHealthy('rbac'),
 *     ]);
 *   }
 * }
 * ```
 */
@Injectable()
export class RbacHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:HealthIndicator`);

  // Thresholds for health checks
  private readonly MAX_P95_LATENCY_MS = 100;
  private readonly MIN_CACHE_HIT_RATE = 50;

  constructor(
    private readonly enforcerService: CasbinEnforcerService,
    private readonly metricsService: RbacMetricsService,
  ) {
    super();
  }

  /**
   * Check overall RBAC system health
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const health = await this.checkAllComponents();
      const isHealthy = this.evaluateHealth(health);

      if (isHealthy) {
        return this.getStatus(key, true, health);
      }

      throw new HealthCheckError(
        'RBAC health check failed',
        this.getStatus(key, false, health),
      );
    } catch (error) {
      if (error instanceof HealthCheckError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`RBAC health check failed: ${errorMessage}`);

      throw new HealthCheckError(
        'RBAC health check failed',
        this.getStatus(key, false, { error: errorMessage }),
      );
    }
  }

  /**
   * Check all system components
   */
  private async checkAllComponents(): Promise<RbacHealthDetails> {
    const [enforcerHealth, watcherHealth, metricsHealth, fullHealth] =
      await Promise.all([
        this.checkEnforcer(),
        this.checkWatcher(),
        this.checkMetrics(),
        this.metricsService.getHealth(),
      ]);

    return {
      enforcer: enforcerHealth,
      watcher: watcherHealth,
      cache: {
        status: fullHealth.components.cache.healthy ? 'up' : 'down',
        message: fullHealth.components.cache.message,
      },
      database: {
        status: fullHealth.components.database.healthy ? 'up' : 'down',
        activeWorkspaces: fullHealth.metrics.activeWorkspaces,
      },
      metrics: metricsHealth,
    };
  }

  /**
   * Check enforcer service health
   */
  private async checkEnforcer(): Promise<{
    status: 'up' | 'down';
    cachedEnforcers: number;
  }> {
    try {
      const stats = this.enforcerService.getStats();

      return {
        status: 'up',
        cachedEnforcers: stats.cachedEnforcers,
      };
    } catch (error) {
      this.logger.error(`Enforcer health check failed: ${error}`);

      return {
        status: 'down',
        cachedEnforcers: 0,
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
    avgLatencyMs: number;
    p95LatencyMs: number;
  }> {
    try {
      // Get metrics for last 5 minutes
      const metrics = await this.metricsService.getMetrics({
        timeRangeMs: 5 * 60 * 1000,
      });

      return {
        totalChecks: metrics.totalChecks,
        avgLatencyMs: metrics.avgLatencyMs,
        p95LatencyMs: metrics.p95LatencyMs,
      };
    } catch (error) {
      this.logger.error(`Metrics health check failed: ${error}`);

      return {
        totalChecks: 0,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
      };
    }
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

    // Cache should be up (warning if down but not critical)
    if (health.cache.status === 'down') {
      this.logger.warn('Cache is down - performance may be degraded');
    }

    // Watcher can be down (fallback to polling)
    if (health.watcher.status === 'down') {
      this.logger.warn('Watcher is down - policy updates may be delayed');
    }

    // Check latency threshold
    if (
      health.metrics.totalChecks > 0 &&
      health.metrics.p95LatencyMs > this.MAX_P95_LATENCY_MS
    ) {
      this.logger.warn(
        `P95 latency (${health.metrics.p95LatencyMs}ms) exceeds threshold (${this.MAX_P95_LATENCY_MS}ms)`,
      );
      // Not critical, just warning
    }

    return true;
  }

  /**
   * Quick health check - just enforcer availability
   */
  async isReady(key: string): Promise<HealthIndicatorResult> {
    try {
      const stats = this.enforcerService.getStats();

      return this.getStatus(key, true, {
        status: 'ready',
        cachedEnforcers: stats.cachedEnforcers,
      });
    } catch (error) {
      throw new HealthCheckError(
        'RBAC not ready',
        this.getStatus(key, false, { status: 'not_ready' }),
      );
    }
  }

  /**
   * Liveness check - basic service alive
   */
  async isAlive(key: string): Promise<HealthIndicatorResult> {
    return this.getStatus(key, true, { status: 'alive' });
  }
}
