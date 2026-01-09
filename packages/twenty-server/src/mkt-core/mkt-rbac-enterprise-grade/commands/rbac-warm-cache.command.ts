import { Logger } from '@nestjs/common';

import { Command, CommandRunner, Option } from 'nest-commander';

import { CacheWarmerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/cache-warmer.service';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
import { RbacMetricsService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/rbac-metrics.service';

/**
 * Options for rbac-seeder:warm-cache command
 */
type WarmCacheCommandOptions = {
  workspace?: string;
  all?: boolean;
  stats?: boolean;
};

/**
 * RBAC Warm Cache Command
 *
 * Warm RBAC enforcer cache for improved performance.
 *
 * Usage:
 * ```bash
 * # Warm cache for specific workspace
 * npx nx run twenty-server:command rbac-seeder:warm-cache -- --workspace=550e8400-...
 *
 * # Warm cache for all workspaces
 * npx nx run twenty-server:command rbac-seeder:warm-cache -- --all
 *
 * # Show cache stats
 * npx nx run twenty-server:command rbac-seeder:warm-cache -- --stats
 * ```
 */
@Command({
  name: 'rbac-seeder:warm-cache',
  description: 'Warm RBAC enforcer cache for workspaces',
})
export class RbacWarmCacheCommand extends CommandRunner {
  private readonly logger = new Logger(RbacWarmCacheCommand.name);

  constructor(
    private readonly cacheWarmerService: CacheWarmerService,
    private readonly enforcerService: CasbinEnforcerService,
    private readonly metricsService: RbacMetricsService,
  ) {
    super();
  }

  async run(
    _passedParams: string[],
    options?: WarmCacheCommandOptions,
  ): Promise<void> {
    const workspaceId = options?.workspace;
    const warmAll = options?.all ?? false;
    const showStats = options?.stats ?? false;

    // Show stats mode
    if (showStats) {
      await this.showStats();

      return;
    }

    // Validate options
    if (!workspaceId && !warmAll) {
      this.logger.error('Either --workspace=<id> or --all is required');
      this.logger.log('');
      this.logger.log('Examples:');
      this.logger.log('  rbac-seeder:warm-cache --workspace=550e8400-...');
      this.logger.log('  rbac-seeder:warm-cache --all');
      this.logger.log('  rbac-seeder:warm-cache --stats');

      return;
    }

    try {
      const startTime = Date.now();

      if (warmAll) {
        await this.warmAllWorkspaces();
      } else if (workspaceId) {
        await this.warmSingleWorkspace(workspaceId);
      }

      const totalTime = Date.now() - startTime;

      this.logger.log('');
      this.logger.log(`Total time: ${totalTime}ms`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Cache warming failed: ${errorMessage}`);

      if (error instanceof Error && error.stack) {
        this.logger.debug(error.stack);
      }
    }
  }

  /**
   * Warm cache for single workspace
   */
  private async warmSingleWorkspace(workspaceId: string): Promise<void> {
    this.logger.log(`Warming cache for workspace: ${workspaceId}`);

    const startTime = Date.now();

    // Get or create enforcer (this loads policies)
    await this.enforcerService.getEnforcer(workspaceId);

    const latency = Date.now() - startTime;

    this.logger.log(`Cache warmed successfully (${latency}ms)`);

    // Show stats
    const stats = this.enforcerService.getStats();

    this.logger.log('');
    this.logger.log('=== CACHE STATS ===');
    this.logger.log(`Cached enforcers: ${stats.cachedEnforcers}`);
    this.logger.log(`Watcher connected: ${stats.watcherConnected}`);
  }

  /**
   * Warm cache for all workspaces
   */
  private async warmAllWorkspaces(): Promise<void> {
    this.logger.log('Warming cache for all workspaces...');
    this.logger.log('');

    const startTime = Date.now();

    // Use cache warmer service
    await this.cacheWarmerService.warmAllCaches();

    const latency = Date.now() - startTime;

    this.logger.log(`All caches warmed (${latency}ms)`);

    // Show stats
    const stats = this.enforcerService.getStats();

    this.logger.log('');
    this.logger.log('=== CACHE STATS ===');
    this.logger.log(`Cached enforcers: ${stats.cachedEnforcers}`);
    this.logger.log(`Watcher connected: ${stats.watcherConnected}`);
  }

  /**
   * Show cache and metrics stats
   */
  private async showStats(): Promise<void> {
    this.logger.log('=== RBAC CACHE & METRICS ===');
    this.logger.log('');

    // Enforcer stats
    const enforcerStats = this.enforcerService.getStats();

    this.logger.log('Enforcer:');
    this.logger.log(`  Cached enforcers: ${enforcerStats.cachedEnforcers}`);
    this.logger.log(`  Watcher connected: ${enforcerStats.watcherConnected}`);
    this.logger.log('');

    // Get health
    try {
      const health = await this.metricsService.getHealth();

      this.logger.log('Health:');
      this.logger.log(
        `  Status: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`,
      );
      this.logger.log('  Components:');
      this.logger.log(
        `    Enforcer: ${health.components.enforcer.healthy ? '✅' : '❌'} ${health.components.enforcer.message ?? ''}`,
      );
      this.logger.log(
        `    Watcher:  ${health.components.watcher.healthy ? '✅' : '❌'} ${health.components.watcher.message ?? ''}`,
      );
      this.logger.log(
        `    Cache:    ${health.components.cache.healthy ? '✅' : '❌'} ${health.components.cache.message ?? ''}`,
      );
      this.logger.log(
        `    Database: ${health.components.database.healthy ? '✅' : '❌'} ${health.components.database.message ?? ''}`,
      );
      this.logger.log('');
      this.logger.log('Metrics:');
      this.logger.log(
        `  Active workspaces: ${health.metrics.activeWorkspaces}`,
      );
      this.logger.log(`  Total policies: ${health.metrics.totalPolicies}`);
      this.logger.log(`  Cached enforcers: ${health.metrics.cachedEnforcers}`);
      this.logger.log(`  Dead letter count: ${health.metrics.deadLetterCount}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn(`Could not get health: ${errorMessage}`);
    }

    // Get performance metrics
    try {
      const metrics = await this.metricsService.getMetrics({
        timeRangeMs: 3600000, // Last hour
      });

      this.logger.log('');
      this.logger.log('Performance (last hour):');
      this.logger.log(`  Total checks: ${metrics.totalChecks}`);
      this.logger.log(`  Allowed: ${metrics.allowedCount}`);
      this.logger.log(`  Denied: ${metrics.deniedCount}`);
      this.logger.log(`  Avg latency: ${metrics.avgLatencyMs}ms`);
      this.logger.log(`  P50 latency: ${metrics.p50LatencyMs}ms`);
      this.logger.log(`  P95 latency: ${metrics.p95LatencyMs}ms`);
      this.logger.log(`  P99 latency: ${metrics.p99LatencyMs}ms`);
      this.logger.log(`  Cache hit rate: ${metrics.cacheHitRate.toFixed(2)}%`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn(`Could not get metrics: ${errorMessage}`);
    }
  }

  @Option({
    flags: '-w, --workspace <workspace>',
    description: 'Workspace ID to warm cache for',
  })
  parseWorkspace(val: string): string {
    return val;
  }

  @Option({
    flags: '-a, --all',
    description: 'Warm cache for all workspaces',
  })
  parseAll(): boolean {
    return true;
  }

  @Option({
    flags: '-s, --stats',
    description: 'Show cache and metrics statistics',
  })
  parseStats(): boolean {
    return true;
  }
}
