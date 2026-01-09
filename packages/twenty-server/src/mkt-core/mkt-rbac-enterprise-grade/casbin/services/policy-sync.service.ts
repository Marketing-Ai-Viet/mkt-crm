import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

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
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/policy-sync.types';
import {
  CasbinPolicy,
  GroupingPolicy,
  CasbinPolicyType,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/casbin.types';
import { CasbinRuleRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/casbin-rule.repository';
import { PolicyVersionRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/policy-version.repository';
import { PolicyValidator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/validators/policy.validator';
import { MktPermissionTemplateRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories/mkt-permission-template.repository';
import { MktUserPermissionTemplateRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories/mkt-user-permission-template.repository';

import { CasbinEnforcerService } from './casbin-enforcer.service';

/**
 * Sync configuration
 */
const SYNC_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  debounceMs: 500,
  maxPoliciesPerWorkspace: 10000,
};

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

  constructor(
    private readonly casbinRuleRepository: CasbinRuleRepository,
    private readonly policyVersionRepository: PolicyVersionRepository,
    private readonly policyValidator: PolicyValidator,
    private readonly enforcerService: CasbinEnforcerService,
    private readonly templateRepository: MktPermissionTemplateRepository,
    private readonly userTemplateRepository: MktUserPermissionTemplateRepository,
  ) {}

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
    }, SYNC_CONFIG.debounceMs);

    this.debounceTimers.set(workspaceId, timer);
  }

  /**
   * Sync policies for workspace
   */
  async syncWorkspace(workspaceId: string): Promise<SyncResult> {
    const startTime = Date.now();

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
      if (policyRules.length > SYNC_CONFIG.maxPoliciesPerWorkspace) {
        this.logger.warn(
          CASBIN_MESSAGES.WARN.POLICY_LIMIT_EXCEEDED(
            workspaceId,
            policyRules.length,
            SYNC_CONFIG.maxPoliciesPerWorkspace,
          ),
        );
      }

      // Bulk replace rules
      const rules = policies.map((p) => ({
        ptype: p.ptype as CasbinPolicyType,
        rule: this.policyToRule(p),
      }));

      const count = await this.casbinRuleRepository.bulkReplace(
        rules,
        workspaceId,
      );

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

      const latencyMs = Date.now() - startTime;

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
        latencyMs: Date.now() - startTime,
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
    maxRetries: number = SYNC_CONFIG.maxRetries,
  ): Promise<SyncResult> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.syncWorkspace(workspaceId);

      if (result.status === 'success' || result.status === 'skipped') {
        return result;
      }

      lastError = result.reason;

      if (attempt < maxRetries) {
        const delay = SYNC_CONFIG.retryDelayMs * Math.pow(2, attempt - 1);

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
    // Get current rules
    const currentRules =
      await this.casbinRuleRepository.findByWorkspace(workspaceId);
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
   */
  private async generatePolicies(
    workspaceId: string,
  ): Promise<Array<CasbinPolicy | GroupingPolicy>> {
    const policies: Array<CasbinPolicy | GroupingPolicy> = [];
    const domain = `ws:${workspaceId}`;

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

          for (const action of actions) {
            policies.push({
              ptype: 'p',
              subject: roleName,
              domain,
              object: resourceKey,
              action,
              effect: 'allow',
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
              domain,
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
        domain,
      });
    }

    // Add resource groupings (g2 policies)
    // These are global, not per-workspace
    // ... resource groupings từ CASBIN_RESOURCE_GROUPS

    return policies;
  }

  /**
   * Convert policy to rule array
   */
  private policyToRule(policy: CasbinPolicy | GroupingPolicy): string[] {
    if (policy.ptype === 'p') {
      return [
        policy.subject,
        policy.domain,
        policy.object,
        policy.action,
        policy.effect ?? 'allow',
      ];
    }

    // g policy
    return [policy.subject, policy.role, policy.domain];
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
   */
  async syncAllWorkspaces(): Promise<Map<string, SyncResult>> {
    const results = new Map<string, SyncResult>();

    const workspaces = await this.casbinRuleRepository.getActiveWorkspaces();

    for (const workspaceId of workspaces) {
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
