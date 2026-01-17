import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  CASBIN_LOG_CONTEXT,
  CASBIN_MESSAGES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { WarmResult } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types';
import {
  CasbinRbacConfig,
  rbacConfig,
  RbacCacheWarmerConfig,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';

import { CasbinEnforcerService } from './casbin-enforcer.service';
import { PolicySyncService } from './policy-sync.service';

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
 * Configuration via environment variables:
 * - RBAC_CACHE_WARM_ENABLED: Enable cache warming (default: true)
 * - RBAC_CACHE_WARM_ON_STARTUP: Warm on startup (default: true)
 * - RBAC_CACHE_WARM_CONCURRENCY: Concurrent workspaces (default: 5)
 * - RBAC_PRIORITY_WORKSPACES: Comma-separated priority workspace IDs
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

  private readonly cacheWarmerConfig: RbacCacheWarmerConfig;
  private isWarming = false;

  constructor(
    @Inject(rbacConfig.KEY)
    private readonly config: CasbinRbacConfig,
    @InjectRepository(Workspace, 'core')
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly enforcerService: CasbinEnforcerService,
    private readonly policySyncService: PolicySyncService,
  ) {
    this.cacheWarmerConfig = this.config.cacheWarmer;
  }

  /**
   * Warm caches on application bootstrap
   */
  async onApplicationBootstrap(): Promise<void> {
    if (
      !this.cacheWarmerConfig.enabled ||
      !this.cacheWarmerConfig.warmOnStartup
    ) {
      this.logger.log('Cache warming disabled on startup');

      return;
    }

    // Delay warming to allow other services to initialize
    setTimeout(async () => {
      await this.warmAllCaches();
    }, 5000);
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
    const startTime = DateTimeUtils.now();

    try {
      // Get all active workspaces from core schema
      const workspaces = await this.getActiveWorkspaces();

      this.logger.log(CASBIN_MESSAGES.LOG.CACHE_WARM_START(workspaces.length));

      // Prioritize configured workspaces
      const prioritized = this.prioritizeWorkspaces(workspaces);

      // Warm caches
      const result = await this.warmWorkspaces(prioritized);

      result.latencyMs = DateTimeUtils.diffInMillis(
        startTime,
        DateTimeUtils.now(),
      );

      this.logger.log(
        CASBIN_MESSAGES.LOG.CACHE_WARM_COMPLETE(result.latencyMs),
      );

      return result;
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Get all active workspace IDs from core schema
   */
  private async getActiveWorkspaces(): Promise<string[]> {
    const workspaces = await this.workspaceRepository.find({
      select: ['id'],
      where: {
        activationStatus: In([
          WorkspaceActivationStatus.ACTIVE,
          WorkspaceActivationStatus.SUSPENDED,
        ]),
      },
    });

    return workspaces.map((ws) => ws.id);
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

    const startTime = DateTimeUtils.now();

    // Process in batches for concurrency control
    const batches = this.chunk(
      workspaceIds,
      this.cacheWarmerConfig.concurrency,
    );

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

    result.latencyMs = DateTimeUtils.diffInMillis(
      startTime,
      DateTimeUtils.now(),
    );

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
    const priority = new Set(this.cacheWarmerConfig.priorityWorkspaces);

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
    config: RbacCacheWarmerConfig;
  } {
    return {
      isWarming: this.isWarming,
      enabled: this.cacheWarmerConfig.enabled,
      config: this.cacheWarmerConfig,
    };
  }
}
