import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

import { newEnforcer, Enforcer, newModelFromString } from 'casbin';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { TwentyORMManager } from 'src/engine/twenty-orm/twenty-orm.manager';
import {
  CASBIN_LOG_CONTEXT,
  CASBIN_MESSAGES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import {
  PermissionCheckInput,
  PermissionCheckResult,
  EnforcerWithMeta,
  BatchPermissionRequest,
  BatchPermissionResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types';
import { WorkspaceCasbinAdapter } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/adapters/workspace-casbin.adapter';
import { MktCasbinRuleWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { PgNotifyWatcher } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/watchers/pg-notify.watcher';
import { PolicyVersionRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/policy-version.repository';
import { WorkspaceCasbinRuleRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/workspace-casbin-rule.repository';
import { PolicyValidator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/validators/policy.validator';
import { RBAC_MODEL } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/constants';
import { ENFORCER_CONFIG } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config';

/**
 * Casbin Enforcer Service
 *
 * Core service quản lý Casbin enforcers cho multi-tenant RBAC.
 *
 * Features:
 * - Per-workspace enforcer isolation
 * - In-memory caching với LRU eviction
 * - Auto-reload via PG NOTIFY watcher
 * - Fail-closed security pattern
 * - Batch permission checks
 *
 * Usage:
 * ```typescript
 * const result = await enforcerService.checkPermission({
 *   userId: 'user-uuid',
 *   workspaceId: 'ws-uuid',
 *   resource: 'mktOrder',
 *   action: 'read',
 * });
 * ```
 */
@Injectable()
export class CasbinEnforcerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:EnforcerService`);

  // In-memory enforcer cache (per workspace)
  private readonly enforcers = new Map<string, EnforcerWithMeta>();

  // Watcher for policy updates
  private watcher: PgNotifyWatcher | null = null;

  // Config
  private readonly config = ENFORCER_CONFIG;

  constructor(
    private readonly twentyORMManager: TwentyORMManager,
    @InjectCacheStorage(CacheStorageNamespace.RbacPolicy)
    private readonly cacheStorage: CacheStorageService,
    private readonly policyVersionRepository: PolicyVersionRepository,
    private readonly casbinRuleRepository: WorkspaceCasbinRuleRepository,
    private readonly policyValidator: PolicyValidator,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeWatcher();
    this.logger.log(CASBIN_MESSAGES.LOG.MODULE_INITIALIZED);
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  /**
   * Initialize PG NOTIFY watcher
   */
  private async initializeWatcher(): Promise<void> {
    try {
      // Get connection string from environment
      const connectionString = process.env.PG_DATABASE_URL;

      if (!connectionString) {
        this.logger.warn('PG_DATABASE_URL not set, watcher disabled');

        return;
      }

      this.watcher = new PgNotifyWatcher(connectionString, {
        channel: 'casbin_policy_update',
        maxReconnectAttempts: 5,
        baseDelayMs: 1000,
      });

      // Setup callback to reload policies
      this.watcher.setUpdateCallback(() => {
        this.handlePolicyUpdate();
      });

      await this.watcher.init();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        CASBIN_MESSAGES.ERROR.WATCHER_CONNECTION_FAILED(errorMessage),
      );
      // Continue without watcher - rely on polling fallback
    }
  }

  /**
   * Handle policy update notification
   */
  private handlePolicyUpdate(): void {
    // Clear all enforcers to force reload on next check
    this.logger.log('Policy update received, clearing enforcer cache');
    this.enforcers.clear();
  }

  /**
   * Get or create enforcer for workspace
   */
  async getEnforcer(workspaceId: string): Promise<Enforcer> {
    // Check in-memory cache
    const cached = this.enforcers.get(workspaceId);

    if (cached && this.isEnforcerValid(cached)) {
      return cached.enforcer;
    }

    // Create new enforcer
    return this.createEnforcer(workspaceId);
  }

  /**
   * Create new enforcer for workspace
   */
  private async createEnforcer(workspaceId: string): Promise<Enforcer> {
    const startTime = Date.now();

    try {
      // Create model (workspace-isolated, no domain needed)
      const model = newModelFromString(RBAC_MODEL);

      // Get workspace repository
      const repository =
        await this.twentyORMManager.getRepository<MktCasbinRuleWorkspaceEntity>(
          'mktCasbinRule',
        );

      // Create workspace adapter
      const adapter = await WorkspaceCasbinAdapter.newAdapter(
        repository,
        workspaceId,
      );

      // Create enforcer
      const enforcer = await newEnforcer(model, adapter);

      // Enable auto-build role links
      await enforcer.buildRoleLinks();

      // Get policy count
      const policyCount = await adapter.getPolicyCount();

      // Cache enforcer
      const meta: EnforcerWithMeta = {
        enforcer,
        workspaceId,
        loadedAt: new Date(),
        policyCount,
        version:
          await this.policyVersionRepository.getVersionNumber(workspaceId),
      };

      this.cacheEnforcer(workspaceId, meta);

      const latencyMs = Date.now() - startTime;

      this.logger.log(
        CASBIN_MESSAGES.LOG.ENFORCER_CREATED(workspaceId) +
          ` (${policyCount} policies, ${latencyMs}ms)`,
      );

      return enforcer;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        CASBIN_MESSAGES.ERROR.ENFORCER_CREATE_FAILED(workspaceId, errorMessage),
      );
      throw error;
    }
  }

  /**
   * Cache enforcer with LRU eviction
   */
  private cacheEnforcer(workspaceId: string, meta: EnforcerWithMeta): void {
    // Evict oldest if at capacity
    if (this.enforcers.size >= this.config.maxEnforcersInMemory) {
      const oldestKey = this.findOldestEnforcer();

      if (oldestKey) {
        this.enforcers.delete(oldestKey);
        this.logger.debug(`Evicted enforcer for workspace: ${oldestKey}`);
      }
    }

    this.enforcers.set(workspaceId, meta);
  }

  /**
   * Find oldest enforcer for eviction
   */
  private findOldestEnforcer(): string | null {
    let oldest: { key: string; time: number } | null = null;

    for (const [key, meta] of this.enforcers.entries()) {
      const time = meta.loadedAt.getTime();

      if (!oldest || time < oldest.time) {
        oldest = { key, time };
      }
    }

    return oldest?.key ?? null;
  }

  /**
   * Check if cached enforcer is still valid
   */
  private isEnforcerValid(meta: EnforcerWithMeta): boolean {
    const age = Date.now() - meta.loadedAt.getTime();

    return age < this.config.enforcerTtlMs;
  }

  /**
   * Check permission for user on resource/action
   * Note: No domain needed - workspace isolation via schema
   */
  async checkPermission(
    input: PermissionCheckInput,
  ): Promise<PermissionCheckResult> {
    const startTime = Date.now();

    try {
      const enforcer = await this.getEnforcer(input.workspaceId);
      const subject = `user:${input.userId}`;

      this.logger.debug(
        CASBIN_MESSAGES.LOG.PERMISSION_CHECK_START(
          input.userId,
          input.resource,
          input.action,
        ),
      );

      // Check permission (sub, obj, act - no domain)
      const allowed = await enforcer.enforce(
        subject,
        input.resource,
        input.action,
      );

      const latencyMs = Date.now() - startTime;

      this.logger.debug(
        CASBIN_MESSAGES.LOG.PERMISSION_CHECK_RESULT(allowed, latencyMs),
      );

      return {
        allowed,
        latencyMs,
        reason: allowed
          ? CASBIN_MESSAGES.INFO.PERMISSION_GRANTED(
              input.userId,
              input.resource,
              input.action,
            )
          : CASBIN_MESSAGES.INFO.PERMISSION_DENIED(
              input.userId,
              input.resource,
              input.action,
            ),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(CASBIN_MESSAGES.ERROR.ENFORCEMENT_FAILED(errorMessage));

      // Fail-closed: deny on error
      if (this.config.failClosed) {
        this.logger.warn(CASBIN_MESSAGES.WARN.FAIL_CLOSED_TRIGGERED);

        return {
          allowed: false,
          latencyMs,
          reason: `Enforcement failed: ${errorMessage}`,
        };
      }

      throw error;
    }
  }

  /**
   * Batch permission check
   * Note: No domain needed - workspace isolation via schema
   */
  async checkPermissionBatch(
    request: BatchPermissionRequest,
  ): Promise<BatchPermissionResult> {
    const startTime = Date.now();

    try {
      const enforcer = await this.getEnforcer(request.workspaceId);
      const subject = `user:${request.userId}`;

      const results = new Map<string, boolean>();

      for (const check of request.checks) {
        const resource = check.resourceId
          ? `${check.resource}:${check.resourceId}`
          : check.resource;

        const key = `${check.resource}:${check.resourceId ?? '*'}:${check.action}`;

        // Enforce without domain (sub, obj, act)
        const allowed = await enforcer.enforce(subject, resource, check.action);

        results.set(key, allowed);
      }

      return {
        results,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(CASBIN_MESSAGES.ERROR.ENFORCEMENT_FAILED(errorMessage));

      // Fail-closed: deny all on error
      if (this.config.failClosed) {
        const results = new Map<string, boolean>();

        for (const check of request.checks) {
          const key = `${check.resource}:${check.resourceId ?? '*'}:${check.action}`;

          results.set(key, false);
        }

        return {
          results,
          latencyMs: Date.now() - startTime,
        };
      }

      throw error;
    }
  }

  /**
   * Check if user has any of the given roles
   * Note: No domain needed - workspace isolation via schema
   */
  async hasRole(
    userId: string,
    workspaceId: string,
    roleName: string,
  ): Promise<boolean> {
    try {
      const enforcer = await this.getEnforcer(workspaceId);
      const subject = `user:${userId}`;
      const role = `role:${roleName}`;

      // No domain parameter in workspace-isolated model
      return enforcer.hasRoleForUser(subject, role);
    } catch (error) {
      this.logger.error(`Failed to check role: ${error}`);

      return false;
    }
  }

  /**
   * Get all roles for user
   * Note: No domain needed - workspace isolation via schema
   */
  async getUserRoles(userId: string, workspaceId: string): Promise<string[]> {
    try {
      const enforcer = await this.getEnforcer(workspaceId);
      const subject = `user:${userId}`;

      // No domain parameter in workspace-isolated model
      const roles = await enforcer.getRolesForUser(subject);

      // Remove 'role:' prefix
      return roles.map((r) => r.replace('role:', ''));
    } catch (error) {
      this.logger.error(`Failed to get user roles: ${error}`);

      return [];
    }
  }

  /**
   * Get all permissions for user
   */
  async getUserPermissions(
    userId: string,
    workspaceId: string,
  ): Promise<string[][]> {
    try {
      const enforcer = await this.getEnforcer(workspaceId);
      const subject = `user:${userId}`;

      // getPermissionsForUser only takes subject
      // Policies are already filtered by workspace via adapter
      return enforcer.getPermissionsForUser(subject);
    } catch (error) {
      this.logger.error(`Failed to get user permissions: ${error}`);

      return [];
    }
  }

  /**
   * Reload policies for workspace
   */
  async reloadPolicies(workspaceId: string): Promise<void> {
    // Remove from cache to force reload
    this.enforcers.delete(workspaceId);

    // Pre-load
    await this.getEnforcer(workspaceId);

    this.logger.log(`Policies reloaded for workspace: ${workspaceId}`);
  }

  /**
   * Invalidate enforcer cache for workspace
   */
  async invalidateCache(workspaceId: string): Promise<void> {
    this.enforcers.delete(workspaceId);
    this.logger.debug(`Invalidated enforcer cache for: ${workspaceId}`);
  }

  /**
   * Invalidate all enforcer caches
   */
  async invalidateAllCaches(): Promise<void> {
    const count = this.enforcers.size;

    this.enforcers.clear();
    this.logger.log(`Invalidated all enforcer caches (${count} workspaces)`);
  }

  /**
   * Get enforcer stats
   */
  getStats(): {
    cachedEnforcers: number;
    watcherConnected: boolean;
  } {
    return {
      cachedEnforcers: this.enforcers.size,
      watcherConnected: this.watcher?.isConnected() ?? false,
    };
  }

  /**
   * Notify other instances about policy update
   */
  async notifyPolicyUpdate(): Promise<boolean> {
    if (!this.watcher) {
      this.logger.warn('Watcher not initialized, cannot notify');

      return false;
    }

    return this.watcher.update();
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }

    this.enforcers.clear();
    this.logger.log('Casbin enforcer service shut down');
  }
}
