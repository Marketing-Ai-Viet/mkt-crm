import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  CASBIN_LOG_CONTEXT,
  CASBIN_MESSAGES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CasbinRuleRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/casbin-rule.repository';

import { CasbinEnforcerService } from './casbin-enforcer.service';
import { PolicySyncService } from './policy-sync.service';

/**
 * Warm cache configuration
 */
type WarmCacheConfig = {
  enabled: boolean;
  warmOnStartup: boolean;
  concurrency: number;
  priorityWorkspaces: string[];
};

const DEFAULT_CONFIG: WarmCacheConfig = {
  enabled: true,
  warmOnStartup: true,
  concurrency: 5,
  priorityWorkspaces: [],
};

/**
 * Warm cache result
 */
type WarmResult = {
  totalWorkspaces: number;
  warmed: number;
  failed: number;
  latencyMs: number;
  errors: Array<{ workspaceId: string; error: string }>;
};

/**
 * Cache Warmer Service
 *
 * Warm caches on application startup và scheduled intervals.
 *
 * Features:
 * - Warm enforcers on startup
 * - Priority workspaces first
 * - Concurrent warming with rate limiting
 * - Scheduled resync
 *
 * Usage:
 * ```typescript
 * // Warm all caches
 * const result = await cacheWarmerService.warmAllCaches();
 *
 * // Warm specific workspaces
 * await cacheWarmerService.warmWorkspaces(['ws-1', 'ws-2']);
 * ```
 */
@Injectable()
export class CacheWarmerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:CacheWarmer`);

  private readonly config: WarmCacheConfig;
  private isWarming = false;

  constructor(
    private readonly casbinRuleRepository: CasbinRuleRepository,
    private readonly enforcerService: CasbinEnforcerService,
    private readonly policySyncService: PolicySyncService,
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      enabled: process.env.RBAC_CACHE_WARM_ENABLED !== 'false',
      warmOnStartup: process.env.RBAC_CACHE_WARM_ON_STARTUP !== 'false',
    };
  }

  /**
   * Warm caches on application bootstrap
   */
  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.enabled || !this.config.warmOnStartup) {
      this.logger.log('Cache warming disabled on startup');

      return;
    }

    // Delay warming to allow other services to initialize
    setTimeout(async () => {
      await this.warmAllCaches();
    }, 5000);
  }

  /**
   * Scheduled hourly resync
   * Fallback mechanism if PG NOTIFY misses updates
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledResync(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    this.logger.log('Starting scheduled hourly resync');
    await this.warmAllCaches();
  }

  /**
   * Warm all caches for all active workspaces
   */
  async warmAllCaches(): Promise<WarmResult> {
    if (this.isWarming) {
      this.logger.warn('Cache warming already in progress');

      return {
        totalWorkspaces: 0,
        warmed: 0,
        failed: 0,
        latencyMs: 0,
        errors: [],
      };
    }

    this.isWarming = true;
    const startTime = Date.now();

    try {
      // Get all active workspaces
      const workspaces = await this.casbinRuleRepository.getActiveWorkspaces();

      this.logger.log(CASBIN_MESSAGES.LOG.CACHE_WARM_START(workspaces.length));

      // Prioritize configured workspaces
      const prioritized = this.prioritizeWorkspaces(workspaces);

      // Warm caches
      const result = await this.warmWorkspaces(prioritized);

      result.latencyMs = Date.now() - startTime;

      this.logger.log(
        CASBIN_MESSAGES.LOG.CACHE_WARM_COMPLETE(result.latencyMs),
      );

      return result;
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm caches for specific workspaces
   */
  async warmWorkspaces(workspaceIds: string[]): Promise<WarmResult> {
    const result: WarmResult = {
      totalWorkspaces: workspaceIds.length,
      warmed: 0,
      failed: 0,
      latencyMs: 0,
      errors: [],
    };

    const startTime = Date.now();

    // Process in batches for concurrency control
    const batches = this.chunk(workspaceIds, this.config.concurrency);

    for (const batch of batches) {
      const warmPromises = batch.map((workspaceId) =>
        this.warmSingleWorkspace(workspaceId),
      );

      const batchResults = await Promise.allSettled(warmPromises);

      for (let i = 0; i < batchResults.length; i++) {
        const batchResult = batchResults[i];
        const workspaceId = batch[i];

        if (batchResult.status === 'fulfilled') {
          if (batchResult.value.success) {
            result.warmed++;
          } else {
            result.failed++;
            result.errors.push({
              workspaceId,
              error: batchResult.value.error ?? 'Unknown error',
            });
          }
        } else {
          result.failed++;
          result.errors.push({
            workspaceId,
            error: batchResult.reason?.message ?? 'Unknown error',
          });
        }
      }
    }

    result.latencyMs = Date.now() - startTime;

    this.logger.log(
      `Cache warming complete: ${result.warmed}/${result.totalWorkspaces} succeeded`,
    );

    return result;
  }

  /**
   * Warm cache for single workspace
   */
  private async warmSingleWorkspace(
    workspaceId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Sync policies first
      const syncResult =
        await this.policySyncService.syncWorkspace(workspaceId);

      if (syncResult.status === 'failed') {
        return {
          success: false,
          error: syncResult.reason,
        };
      }

      // Load enforcer into cache
      await this.enforcerService.getEnforcer(workspaceId);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Failed to warm cache for ${workspaceId}: ${errorMessage}`,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Prioritize workspaces
   * Priority workspaces come first, then sort by policy count (descending)
   */
  private prioritizeWorkspaces(workspaces: string[]): string[] {
    const priority = new Set(this.config.priorityWorkspaces);

    // Split into priority and non-priority
    const priorityWs = workspaces.filter((ws) => priority.has(ws));
    const otherWs = workspaces.filter((ws) => !priority.has(ws));

    return [...priorityWs, ...otherWs];
  }

  /**
   * Split array into chunks
   */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }

    return chunks;
  }

  /**
   * Invalidate and re-warm cache for workspace
   */
  async refreshWorkspace(
    workspaceId: string,
  ): Promise<{ success: boolean; error?: string }> {
    this.logger.log(`Refreshing cache for workspace: ${workspaceId}`);

    // Invalidate existing cache
    await this.enforcerService.invalidateCache(workspaceId);

    // Re-warm
    return this.warmSingleWorkspace(workspaceId);
  }

  /**
   * Get warming status
   */
  getStatus(): {
    isWarming: boolean;
    enabled: boolean;
    config: WarmCacheConfig;
  } {
    return {
      isWarming: this.isWarming,
      enabled: this.config.enabled,
      config: this.config,
    };
  }

  /**
   * Set priority workspaces
   */
  setPriorityWorkspaces(workspaceIds: string[]): void {
    this.config.priorityWorkspaces = workspaceIds;
  }

  /**
   * Enable/disable cache warming
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}
