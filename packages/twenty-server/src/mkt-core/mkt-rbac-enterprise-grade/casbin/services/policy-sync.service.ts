import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  DateTimeUtils,
  DATE_TIME_FORMATS,
} from 'src/mkt-core/utils/date-time.utils';
import {
  CASBIN_LOG_CONTEXT,
  CASBIN_MESSAGES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CASBIN_RESOURCES } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/casbin-resources.constant';
import {
  SyncResult,
  PolicyDiff,
  ManualSyncResult,
  PermissionChangeEvent,
  CasbinPolicy,
  GroupingPolicy,
  CasbinPolicyType,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types';
import { WorkspaceCasbinRuleRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/workspace-casbin-rule.repository';
import { PolicyVersionRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/policy-version.repository';
import { PolicyValidator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/validators/policy.validator';
import { MktPermissionTemplateRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories/mkt-permission-template.repository';
import { MktUserPermissionTemplateRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories/mkt-user-permission-template.repository';
import {
  CasbinRbacConfig,
  rbacConfig,
  RbacSyncConfig,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config';

import { CasbinEnforcerService } from './casbin-enforcer.service';

/**
 * Policy Sync Service
 *
 * Đồng bộ policies từ Permission Templates sang Casbin.
 *
 * Flow:
 * 1. Listen to permission change events
 * 2. Convert templates to Casbin policies
 * 3. Validate policies
 * 4. Update Casbin rules
 * 5. Notify other instances via PG NOTIFY
 *
 * Features:
 * - Event-driven sync
 * - Debouncing to batch rapid changes
 * - Retry with exponential backoff
 * - Dead letter queue for failures
 * - Dry-run for previewing changes
 */
@Injectable()
export class PolicySyncService {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:PolicySyncService`,
  );

  // Debounce timers per workspace
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();

  // Active syncs tracking
  private readonly activeSyncs = new Set<string>();

  // Config
  private readonly syncConfig: RbacSyncConfig;

  constructor(
    @Inject(rbacConfig.KEY)
    private readonly config: CasbinRbacConfig,
    private readonly casbinRuleRepository: WorkspaceCasbinRuleRepository,
    private readonly policyVersionRepository: PolicyVersionRepository,
    private readonly policyValidator: PolicyValidator,
    private readonly enforcerService: CasbinEnforcerService,
    private readonly templateRepository: MktPermissionTemplateRepository,
    private readonly userTemplateRepository: MktUserPermissionTemplateRepository,
  ) {
    this.syncConfig = this.config.sync;
  }

  /**
   * Handle permission change event
   */
  @OnEvent('permission.changed')
  async handlePermissionChange(event: PermissionChangeEvent): Promise<void> {
    this.logger.debug(
      `Permission change event: ${event.action} for workspace ${event.workspaceId}`,
    );

    // Debounce rapid changes
    this.debouncedSync(event.workspaceId);
  }

  /**
   * Debounced sync to batch rapid changes
   */
  private debouncedSync(workspaceId: string): void {
    // Cancel existing timer
    const existing = this.debounceTimers.get(workspaceId);

    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new sync
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(workspaceId);
      await this.syncWorkspace(workspaceId);
    }, this.syncConfig.debounceMs);

    this.debounceTimers.set(workspaceId, timer);
  }

  /**
   * Sync policies for workspace
   */
  async syncWorkspace(workspaceId: string): Promise<SyncResult> {
    const startTime = DateTimeUtils.now();

    // Check if already syncing
    if (this.activeSyncs.has(workspaceId)) {
      this.logger.warn(CASBIN_MESSAGES.WARN.SYNC_IN_PROGRESS(workspaceId));

      return {
        status: 'skipped',
        reason: 'Sync already in progress',
      };
    }

    // Try to acquire lock
    const lockAcquired =
      await this.policyVersionRepository.acquireSyncLock(workspaceId);

    if (!lockAcquired) {
      this.logger.warn(CASBIN_MESSAGES.ERROR.SYNC_LOCK_FAILED(workspaceId));

      return {
        status: 'skipped',
        reason: 'Could not acquire sync lock',
      };
    }

    this.activeSyncs.add(workspaceId);

    try {
      this.logger.log(CASBIN_MESSAGES.LOG.SYNC_START(workspaceId));

      // Generate policies from templates
      const policies = await this.generatePolicies(workspaceId);

      // Calculate hash
      const policyRules = this.policiesToRules(policies);
      const newHash = this.policyVersionRepository.calculateHash(policyRules);

      // Check if changed
      const hasChanged = await this.policyVersionRepository.hasChanged(
        workspaceId,
        newHash,
      );

      if (!hasChanged) {
        this.logger.debug(CASBIN_MESSAGES.WARN.SYNC_NO_CHANGES(workspaceId));

        return {
          status: 'skipped',
          reason: 'No policy changes detected',
        };
      }

      // Validate policies
      const validationResult = this.policyValidator.validatePolicies(
        policies.filter((p): p is CasbinPolicy => p.ptype === 'p'),
        { workspaceId },
      );

      if (!validationResult.valid) {
        this.logger.error(
          CASBIN_MESSAGES.ERROR.INVALID_POLICY(validationResult.errors),
        );

        return {
          status: 'failed',
          reason: validationResult.errors.join('; '),
        };
      }

      // Check policy limit
      if (policyRules.length > this.syncConfig.maxPoliciesPerWorkspace) {
        this.logger.warn(
          CASBIN_MESSAGES.WARN.POLICY_LIMIT_EXCEEDED(
            workspaceId,
            policyRules.length,
            this.syncConfig.maxPoliciesPerWorkspace,
          ),
        );
      }

      // Bulk replace rules
      const rules = policies.map((p) => ({
        ptype: p.ptype as CasbinPolicyType,
        rule: this.policyToRule(p),
      }));

      // Note: Workspace context is handled by TwentyORMManager
      const count = await this.casbinRuleRepository.bulkReplace(rules);

      // Update version
      const newVersion = await this.policyVersionRepository.incrementVersion(
        workspaceId,
        newHash,
        count,
      );

      // Invalidate enforcer cache
      await this.enforcerService.invalidateCache(workspaceId);

      // Notify other instances
      await this.enforcerService.notifyPolicyUpdate();

      // Remove from dead letter if present
      await this.policyVersionRepository.removeFromDeadLetter(workspaceId);

      const latencyMs = DateTimeUtils.diffInMillis(
        startTime,
        DateTimeUtils.now(),
      );

      this.logger.log(
        CASBIN_MESSAGES.LOG.SYNC_SUCCESS(workspaceId, count, latencyMs),
      );

      return {
        status: 'success',
        policiesAdded: count,
        policiesRemoved: 0, // Bulk replace
        latencyMs,
        version: newVersion,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        CASBIN_MESSAGES.ERROR.SYNC_FAILED(workspaceId, errorMessage),
      );

      return {
        status: 'failed',
        reason: errorMessage,
        latencyMs: DateTimeUtils.diffInMillis(startTime, DateTimeUtils.now()),
      };
    } finally {
      this.activeSyncs.delete(workspaceId);
      await this.policyVersionRepository.releaseSyncLock(workspaceId);
    }
  }

  /**
   * Sync with retry
   */
  async syncWithRetry(
    workspaceId: string,
    maxRetries: number = this.syncConfig.maxRetries,
  ): Promise<SyncResult> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.syncWorkspace(workspaceId);

      if (result.status === 'success' || result.status === 'skipped') {
        return result;
      }

      lastError = result.reason;

      if (attempt < maxRetries) {
        const delay = this.syncConfig.retryDelayMs * Math.pow(2, attempt - 1);

        this.logger.warn(CASBIN_MESSAGES.LOG.SYNC_RETRY(workspaceId, attempt));

        await this.sleep(delay);
      }
    }

    // Add to dead letter queue
    await this.policyVersionRepository.addToDeadLetter(
      workspaceId,
      lastError ?? 'Unknown error',
      maxRetries,
    );

    return {
      status: 'failed',
      reason: `Failed after ${maxRetries} retries: ${lastError}`,
    };
  }

  /**
   * Manual sync with dry-run option
   */
  async manualSync(
    workspaceId: string,
    options?: { dryRun?: boolean },
  ): Promise<ManualSyncResult> {
    if (options?.dryRun) {
      return this.dryRunSync(workspaceId);
    }

    return this.syncWorkspace(workspaceId);
  }

  /**
   * Dry run - preview changes without applying
   */
  async dryRunSync(workspaceId: string): Promise<ManualSyncResult> {
    // Get current rules (workspace context handled by TwentyORMManager)
    const currentRules = await this.casbinRuleRepository.findAll();
    const current = currentRules.map((r) => [
      r.ptype,
      r.v0,
      r.v1,
      r.v2,
      r.v3,
      r.v4,
      r.v5,
    ]);

    // Generate proposed policies
    const policies = await this.generatePolicies(workspaceId);
    const proposed = this.policiesToRules(policies);

    // Calculate diff
    const diff = this.calculateDiff(current, proposed);

    return {
      dryRun: true,
      current,
      proposed,
      diff,
    };
  }

  /**
   * Generate policies from permission templates
   *
   * Note: No domain in policies - workspace isolation via schema
   * Supports ABAC conditions from template configuration
   */
  private async generatePolicies(
    workspaceId: string,
  ): Promise<Array<CasbinPolicy | GroupingPolicy>> {
    const policies: Array<CasbinPolicy | GroupingPolicy> = [];

    // Get active templates
    const templates = await this.templateRepository.findActive(workspaceId);

    // Get user-template assignments
    const userTemplates =
      await this.userTemplateRepository.findActive(workspaceId);

    // Generate role policies from templates
    for (const template of templates) {
      const templateWithRelations =
        await this.templateRepository.findWithRelations(
          template.id,
          workspaceId,
        );

      if (!templateWithRelations) continue;

      const roleName = `role:${template.templateKey}`;

      // Generate permission policies for role
      if (templateWithRelations.resourcePermissions) {
        for (const rp of templateWithRelations.resourcePermissions) {
          if (!rp.isActive) continue;

          // Get actions from allowedActions array
          const actions = rp.allowedActions ?? [];

          // Xác định resource key từ relation hoặc dùng resourceId
          const resourceKey = rp.resourceId;

          // Extract ABAC condition from resourcePermission if present
          const condition = this.extractAbacCondition(rp);

          for (const action of actions) {
            policies.push({
              ptype: 'p',
              subject: roleName,
              object: resourceKey,
              action,
              effect: 'allow',
              condition,
            });
          }
        }
      }

      // Generate system action policies for role
      if (templateWithRelations.systemActions) {
        for (const sa of templateWithRelations.systemActions) {
          if (sa.isAllowed && sa.isActive) {
            policies.push({
              ptype: 'p',
              subject: roleName,
              object: CASBIN_RESOURCES.SYSTEM_CONFIG,
              action: sa.actionKey,
              effect: 'allow',
            });
          }
        }
      }
    }

    // Generate role assignments (g policies)
    for (const ut of userTemplates) {
      if (!ut.isActive) continue;

      const template = templates.find((t) => t.id === ut.templateId);

      if (!template) continue;

      policies.push({
        ptype: 'g',
        subject: `user:${ut.workspaceMemberId}`,
        role: `role:${template.templateKey}`,
      });
    }

    // Add resource groupings (g2 policies)
    // These are global, not per-workspace
    // ... resource groupings từ CASBIN_RESOURCE_GROUPS

    return policies;
  }

  /**
   * Extract ABAC condition from resource permission
   *
   * Supports conditions from:
   * - Time-based: validFrom/validTo in permission
   * - Attribute-based: conditions field in permission
   *
   * Returns undefined for pure RBAC (no conditions)
   */
  private extractAbacCondition(resourcePermission: {
    conditions?: object | null;
    validFrom?: Date | null;
    validTo?: Date | null;
  }): string | undefined {
    const conditionParts: string[] = [];

    // Time-based conditions
    if (resourcePermission.validFrom) {
      const fromDate = DateTimeUtils.format(
        DateTimeUtils.fromDate(resourcePermission.validFrom),
        DATE_TIME_FORMATS.DATE_ONLY,
      );

      conditionParts.push(`r.attr.currentDate >= '${fromDate}'`);
    }

    if (resourcePermission.validTo) {
      const toDate = DateTimeUtils.format(
        DateTimeUtils.fromDate(resourcePermission.validTo),
        DATE_TIME_FORMATS.DATE_ONLY,
      );

      conditionParts.push(`r.attr.currentDate <= '${toDate}'`);
    }

    // Custom conditions from permission config
    if (resourcePermission.conditions) {
      const customConditions = resourcePermission.conditions as Record<
        string,
        unknown
      >;

      // Support common condition patterns
      if ('minClearance' in customConditions) {
        conditionParts.push(
          `r.attr.userClearance >= ${customConditions.minClearance}`,
        );
      }

      if ('maxAmount' in customConditions) {
        conditionParts.push(`r.attr.amount <= ${customConditions.maxAmount}`);
      }

      if ('departments' in customConditions) {
        const depts = customConditions.departments as string[];

        if (depts.length > 0) {
          conditionParts.push(
            `(${depts.map((d) => `r.attr.department == '${d}'`).join(' || ')})`,
          );
        }
      }

      // Raw condition string if provided
      if (
        'expression' in customConditions &&
        typeof customConditions.expression === 'string'
      ) {
        conditionParts.push(customConditions.expression);
      }
    }

    // Return undefined for pure RBAC (empty conditions)
    if (conditionParts.length === 0) {
      return undefined;
    }

    // Combine conditions with AND
    return conditionParts.join(' && ');
  }

  /**
   * Convert policy to rule array
   *
   * Format (no domain - workspace isolation via schema):
   * - p: [subject, object, action, effect, condition]
   * - g: [subject, role]
   */
  private policyToRule(policy: CasbinPolicy | GroupingPolicy): string[] {
    if (policy.ptype === 'p') {
      return [
        policy.subject,
        policy.object,
        policy.action,
        policy.effect ?? 'allow',
        policy.condition ?? '',
      ];
    }

    // g policy - role assignment
    return [policy.subject, policy.role];
  }

  /**
   * Convert policies to rules array
   */
  private policiesToRules(
    policies: Array<CasbinPolicy | GroupingPolicy>,
  ): string[][] {
    return policies.map((p) => [p.ptype, ...this.policyToRule(p)]);
  }

  /**
   * Calculate diff between current and proposed policies
   */
  private calculateDiff(current: string[][], proposed: string[][]): PolicyDiff {
    const currentSet = new Set(current.map((r) => r.join('|')));
    const proposedSet = new Set(proposed.map((r) => r.join('|')));

    const added: string[][] = [];
    const removed: string[][] = [];
    let unchanged = 0;

    for (const rule of proposed) {
      const key = rule.join('|');

      if (!currentSet.has(key)) {
        added.push(rule);
      } else {
        unchanged++;
      }
    }

    for (const rule of current) {
      const key = rule.join('|');

      if (!proposedSet.has(key)) {
        removed.push(rule);
      }
    }

    return { added, removed, unchanged };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sync all active workspaces
   *
   * @deprecated This method needs redesign for workspace-per-schema model.
   * Workspace list should be obtained from core workspace repository.
   * Use CacheWarmerService.warmAllCaches() which handles this properly.
   */
  async syncAllWorkspaces(
    workspaceIds: string[],
  ): Promise<Map<string, SyncResult>> {
    const results = new Map<string, SyncResult>();

    // Note: In workspace-per-schema model, workspace list must be provided
    // by caller (e.g., from core WorkspaceRepository)
    for (const workspaceId of workspaceIds) {
      const result = await this.syncWithRetry(workspaceId);

      results.set(workspaceId, result);
    }

    return results;
  }

  /**
   * Get sync status for workspace
   */
  async getSyncStatus(workspaceId: string): Promise<{
    version: number;
    lastSync: Date | null;
    isInDeadLetter: boolean;
    isSyncing: boolean;
  }> {
    const version = await this.policyVersionRepository.getVersion(workspaceId);
    const deadLetter =
      await this.policyVersionRepository.getDeadLetterEntry(workspaceId);

    return {
      version: version?.version ?? 0,
      lastSync: version?.updatedAt ?? null,
      isInDeadLetter: deadLetter !== null,
      isSyncing: this.activeSyncs.has(workspaceId),
    };
  }
}
