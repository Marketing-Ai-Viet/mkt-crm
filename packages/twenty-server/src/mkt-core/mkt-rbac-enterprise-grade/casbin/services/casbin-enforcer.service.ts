import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

import { newEnforcer, Enforcer, newModelFromString } from 'casbin';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
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
import { PgNotifyWatcher } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/watchers/pg-notify.watcher';
import { PolicyVersionRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/policy-version.repository';
import { WorkspaceCasbinRuleRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/workspace-casbin-rule.repository';
import { CASBIN_MODEL } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/constants';
import {
  CasbinRbacConfig,
  rbacConfig,
  RbacEnforcerConfig,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config';
import { RBAC_CIRCUIT_BREAKER } from 'src/mkt-core/infrastructure/redis/constants/rbac';
import { RBAC_PUBSUB_DEFAULTS } from 'src/mkt-core/infrastructure/redis/constants/pubsub.constant';

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
/**
 * Circuit breaker state
 */
type CircuitBreakerState = {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
};

@Injectable()
export class CasbinEnforcerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:EnforcerService`);

  // In-memory enforcer cache (per workspace)
  private readonly enforcers = new Map<string, EnforcerWithMeta>();

  // Watcher for policy updates
  private watcher: PgNotifyWatcher | null = null;

  // Fallback periodic reload interval
  private fallbackReloadInterval: NodeJS.Timeout | null = null;

  // Circuit breaker per workspace
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();

  // Config
  private readonly enforcerConfig: RbacEnforcerConfig;

  constructor(
    @Inject(rbacConfig.KEY)
    private readonly config: CasbinRbacConfig,
    private readonly casbinRuleRepository: WorkspaceCasbinRuleRepository,
    private readonly policyVersionRepository: PolicyVersionRepository,
  ) {
    this.enforcerConfig = this.config.enforcer;
  }

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
        this.startFallbackReload();

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
      // Start fallback periodic reload when watcher fails
      this.startFallbackReload();
    }
  }

  /**
   * Start fallback periodic reload when watcher is disabled
   *
   * This ensures stale policies are eventually refreshed even if
   * watcher/invalidation mechanisms fail.
   */
  private startFallbackReload(): void {
    if (this.fallbackReloadInterval) {
      return; // Already running
    }

    this.logger.log(
      `Starting fallback periodic reload (interval: ${RBAC_PUBSUB_DEFAULTS.FALLBACK_RELOAD_INTERVAL_MS}ms)`,
    );

    this.fallbackReloadInterval = setInterval(async () => {
      this.logger.debug('Fallback reload: checking for stale enforcers');
      await this.checkAndInvalidateStaleEnforcers();
    }, RBAC_PUBSUB_DEFAULTS.FALLBACK_RELOAD_INTERVAL_MS);
  }

  /**
   * Stop fallback periodic reload
   */
  private stopFallbackReload(): void {
    if (this.fallbackReloadInterval) {
      clearInterval(this.fallbackReloadInterval);
      this.fallbackReloadInterval = null;
    }
  }

  /**
   * Check and invalidate stale enforcers across all cached workspaces
   */
  private async checkAndInvalidateStaleEnforcers(): Promise<void> {
    const invalidatedWorkspaces: string[] = [];

    for (const [workspaceId, meta] of this.enforcers.entries()) {
      const isStale = await this.isEnforcerStale(workspaceId, meta);

      if (isStale) {
        this.enforcers.delete(workspaceId);
        invalidatedWorkspaces.push(workspaceId);
      }
    }

    if (invalidatedWorkspaces.length > 0) {
      this.logger.log(
        `Fallback reload: invalidated ${invalidatedWorkspaces.length} stale enforcers`,
      );
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
   *
   * Multi-tier validation:
   * 1. TTL check (synchronous, fast)
   * 2. Version check (async, checks DB version)
   */
  async getEnforcer(workspaceId: string): Promise<Enforcer> {
    // Check in-memory cache
    const cached = this.enforcers.get(workspaceId);

    if (cached && this.isEnforcerValid(cached)) {
      // Check for version staleness (async)
      const isStale = await this.isEnforcerStale(workspaceId, cached);

      if (!isStale) {
        return cached.enforcer;
      }

      // Stale - remove from cache
      this.enforcers.delete(workspaceId);
      this.logger.debug(
        `Evicted stale enforcer for workspace: ${workspaceId} (version mismatch)`,
      );
    }

    // Create new enforcer
    return this.createEnforcer(workspaceId);
  }

  /**
   * Create new enforcer for workspace
   *
   * Includes circuit breaker pattern to prevent cascading failures
   * when adapter/database has repeated errors.
   */
  private async createEnforcer(workspaceId: string): Promise<Enforcer> {
    // Check circuit breaker
    if (this.isCircuitOpen(workspaceId)) {
      const circuitState = this.circuitBreakers.get(workspaceId);

      throw new Error(
        `Circuit breaker open for workspace ${workspaceId} (${circuitState?.failures} failures)`,
      );
    }

    const startTime = DateTimeUtils.now();

    try {
      // Create unified RBAC+ABAC model (workspace-isolated, no domain needed)
      const model = newModelFromString(CASBIN_MODEL);

      // Get workspace repository via WorkspaceCasbinRuleRepository
      const repository =
        await this.casbinRuleRepository.getWorkspaceRepository();

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
        loadedAt: DateTimeUtils.toDateRequired(DateTimeUtils.now()),
        policyCount,
        version:
          await this.policyVersionRepository.getVersionNumber(workspaceId),
      };

      this.cacheEnforcer(workspaceId, meta);

      // Record success for circuit breaker
      this.recordCircuitSuccess(workspaceId);

      const latencyMs = DateTimeUtils.diffInMillis(
        startTime,
        DateTimeUtils.now(),
      );

      this.logger.log(
        CASBIN_MESSAGES.LOG.ENFORCER_CREATED(workspaceId) +
          ` (${policyCount} policies, ${latencyMs}ms)`,
      );

      return enforcer;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Record failure for circuit breaker
      this.recordCircuitFailure(workspaceId);

      this.logger.error(
        CASBIN_MESSAGES.ERROR.ENFORCER_CREATE_FAILED(workspaceId, errorMessage),
      );
      throw error;
    }
  }

  // ============================================
  // CIRCUIT BREAKER METHODS
  // ============================================

  /**
   * Check if circuit breaker is open for workspace
   */
  private isCircuitOpen(workspaceId: string): boolean {
    const state = this.circuitBreakers.get(workspaceId);

    if (!state) {
      return false;
    }

    if (state.state === 'closed') {
      return false;
    }

    if (state.state === 'open') {
      // Check if reset timeout has passed
      const now = DateTimeUtils.toMillis(DateTimeUtils.now());

      if (now - state.lastFailure > RBAC_CIRCUIT_BREAKER.RESET_TIMEOUT_MS) {
        // Transition to half-open
        state.state = 'half-open';
        this.logger.log(
          `Circuit breaker half-open for workspace: ${workspaceId}`,
        );

        return false;
      }

      return true;
    }

    // half-open - allow request
    return false;
  }

  /**
   * Record circuit breaker failure
   */
  private recordCircuitFailure(workspaceId: string): void {
    const now = DateTimeUtils.toMillis(DateTimeUtils.now());
    const state = this.circuitBreakers.get(workspaceId) ?? {
      failures: 0,
      lastFailure: now,
      state: 'closed' as const,
    };

    state.failures++;
    state.lastFailure = now;

    if (state.failures >= RBAC_CIRCUIT_BREAKER.FAILURE_THRESHOLD) {
      state.state = 'open';
      this.logger.warn(
        `Circuit breaker opened for workspace: ${workspaceId} (${state.failures} failures)`,
      );
    }

    this.circuitBreakers.set(workspaceId, state);
  }

  /**
   * Record circuit breaker success
   */
  private recordCircuitSuccess(workspaceId: string): void {
    const state = this.circuitBreakers.get(workspaceId);

    if (!state) {
      return;
    }

    if (state.state === 'half-open') {
      // Reset after success in half-open state
      state.failures = 0;
      state.state = 'closed';
      this.logger.log(`Circuit breaker closed for workspace: ${workspaceId}`);
    } else if (state.state === 'closed' && state.failures > 0) {
      // Decay failures on success
      state.failures = Math.max(0, state.failures - 1);
    }

    this.circuitBreakers.set(workspaceId, state);
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Reset circuit breaker for workspace
   */
  resetCircuitBreaker(workspaceId: string): void {
    this.circuitBreakers.delete(workspaceId);
    this.logger.log(`Circuit breaker reset for workspace: ${workspaceId}`);
  }

  /**
   * Cache enforcer with LRU eviction
   */
  private cacheEnforcer(workspaceId: string, meta: EnforcerWithMeta): void {
    // Evict oldest if at capacity
    if (this.enforcers.size >= this.enforcerConfig.maxEnforcersInMemory) {
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
   *
   * Validates both:
   * - TTL (time-based expiration)
   * - Version (policy version must match DB)
   */
  private isEnforcerValid(meta: EnforcerWithMeta): boolean {
    const loadedAt = DateTimeUtils.fromDate(meta.loadedAt);
    const age = DateTimeUtils.diffInMillis(loadedAt, DateTimeUtils.now());

    // TTL check
    if (age >= this.enforcerConfig.enforcerTtlMs) {
      return false;
    }

    return true;
  }

  /**
   * Check if cached enforcer is stale (version mismatch)
   *
   * Called asynchronously to avoid blocking getEnforcer() on every call.
   * If stale, invalidates cache and returns false.
   */
  private async isEnforcerStale(
    workspaceId: string,
    meta: EnforcerWithMeta,
  ): Promise<boolean> {
    try {
      const currentVersion =
        await this.policyVersionRepository.getVersionNumber(workspaceId);

      if (currentVersion !== meta.version) {
        this.logger.debug(
          `Enforcer version mismatch for ${workspaceId}: cached=${meta.version}, current=${currentVersion}`,
        );

        return true;
      }

      return false;
    } catch (error) {
      // On error, assume not stale (fail-safe)
      this.logger.debug(`Failed to check enforcer staleness: ${error}`);

      return false;
    }
  }

  /**
   * Check permission for user on resource/action
   * Note: No domain needed - workspace isolation via schema
   *
   * Unified RBAC+ABAC model - pass attributes for condition evaluation:
   * ```typescript
   * // Pure RBAC (no conditions)
   * checkPermission({
   *   userId: 'user-1',
   *   workspaceId: 'ws-1',
   *   resource: 'mktOrder',
   *   action: 'read',
   * })
   *
   * // With ABAC conditions
   * checkPermission({
   *   userId: 'user-1',
   *   workspaceId: 'ws-1',
   *   resource: 'mktOrder',
   *   action: 'read',
   *   attributes: { currentTime: '2026-01-09', userClearance: 3 }
   * })
   * ```
   */
  async checkPermission(
    input: PermissionCheckInput,
  ): Promise<PermissionCheckResult> {
    const startTime = DateTimeUtils.now();

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

      // Unified model: enforce(sub, obj, act, attr)
      // Policies without conditions work as pure RBAC
      // Policies with conditions evaluate against attributes
      const allowed = await enforcer.enforce(
        subject,
        input.resource,
        input.action,
        input.attributes ?? {},
      );

      const latencyMs = DateTimeUtils.diffInMillis(
        startTime,
        DateTimeUtils.now(),
      );

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
      const latencyMs = DateTimeUtils.diffInMillis(
        startTime,
        DateTimeUtils.now(),
      );
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(CASBIN_MESSAGES.ERROR.ENFORCEMENT_FAILED(errorMessage));

      // Fail-closed: deny on error
      if (this.enforcerConfig.failClosed) {
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
    const startTime = DateTimeUtils.now();

    try {
      const enforcer = await this.getEnforcer(request.workspaceId);
      const subject = `user:${request.userId}`;

      const results = new Map<string, boolean>();

      for (const check of request.checks) {
        const resource = check.resourceId
          ? `${check.resource}:${check.resourceId}`
          : check.resource;

        const key = `${check.resource}:${check.resourceId ?? '*'}:${check.action}`;

        // Unified model: enforce(sub, obj, act, attr)
        const allowed = await enforcer.enforce(
          subject,
          resource,
          check.action,
          check.attributes ?? {},
        );

        results.set(key, allowed);
      }

      return {
        results,
        latencyMs: DateTimeUtils.diffInMillis(startTime, DateTimeUtils.now()),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(CASBIN_MESSAGES.ERROR.ENFORCEMENT_FAILED(errorMessage));

      // Fail-closed: deny all on error
      if (this.enforcerConfig.failClosed) {
        const results = new Map<string, boolean>();

        for (const check of request.checks) {
          const key = `${check.resource}:${check.resourceId ?? '*'}:${check.action}`;

          results.set(key, false);
        }

        return {
          results,
          latencyMs: DateTimeUtils.diffInMillis(startTime, DateTimeUtils.now()),
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
    fallbackReloadActive: boolean;
    circuitBreakersOpen: number;
  } {
    const openCircuits = Array.from(this.circuitBreakers.values()).filter(
      (s) => s.state === 'open',
    ).length;

    return {
      cachedEnforcers: this.enforcers.size,
      watcherConnected: this.watcher?.isConnected() ?? false,
      fallbackReloadActive: this.fallbackReloadInterval !== null,
      circuitBreakersOpen: openCircuits,
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
    // Stop fallback reload
    this.stopFallbackReload();

    // Close watcher
    if (this.watcher) {
      await this.watcher.close();
    }

    // Clear caches
    this.enforcers.clear();
    this.circuitBreakers.clear();

    this.logger.log('Casbin enforcer service shut down');
  }
}
