import { Logger } from '@nestjs/common';

import { FilteredAdapter, Helper, Model } from 'casbin';

import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import {
  CASBIN_LOG_CONTEXT,
  CASBIN_MESSAGES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CasbinRuleRow } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types';
import { MktCasbinRuleWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';

/**
 * Workspace-aware Casbin Adapter
 *
 * Works with mktCasbinRule table in workspace schema.
 * No domain filtering needed - each workspace has isolated policies.
 *
 * Policy format: ptype, subject, object, action, effect, condition
 *
 * Benefits:
 * - Simpler policy format (no domain column)
 * - Better isolation per workspace
 * - Uses Twenty ORM patterns
 */
export class WorkspaceCasbinAdapter implements FilteredAdapter {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:WorkspaceCasbinAdapter`,
  );
  private _isFiltered = false;

  constructor(
    private readonly repository: WorkspaceRepository<MktCasbinRuleWorkspaceEntity>,
    private readonly workspaceId: string,
  ) {}

  /**
   * Factory method to create adapter with repository
   */
  static async newAdapter(
    repository: WorkspaceRepository<MktCasbinRuleWorkspaceEntity>,
    workspaceId: string,
  ): Promise<WorkspaceCasbinAdapter> {
    return new WorkspaceCasbinAdapter(repository, workspaceId);
  }

  /**
   * Load all policies from workspace
   */
  async loadPolicy(model: Model): Promise<void> {
    try {
      const rules = await this.repository.find({
        order: { ptype: 'ASC', createdAt: 'ASC' },
      });

      for (const rule of rules) {
        this.loadPolicyLine(rule, model);
      }

      this.logger.debug(
        CASBIN_MESSAGES.LOG.ENFORCER_LOADED(this.workspaceId, rules.length),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        CASBIN_MESSAGES.ERROR.POLICY_LOAD_FAILED(
          this.workspaceId,
          errorMessage,
        ),
      );
      throw error;
    }
  }

  /**
   * Load policies with filter
   */
  async loadFilteredPolicy(
    model: Model,
    filter: Record<string, string>,
  ): Promise<void> {
    try {
      const rules = await this.repository.find({
        where: filter,
        order: { ptype: 'ASC', createdAt: 'ASC' },
      });

      for (const rule of rules) {
        this.loadPolicyLine(rule, model);
      }

      this._isFiltered = true;
      this.logger.debug(
        `Loaded ${rules.length} filtered policies for workspace: ${this.workspaceId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        CASBIN_MESSAGES.ERROR.POLICY_LOAD_FAILED(
          this.workspaceId,
          errorMessage,
        ),
      );
      throw error;
    }
  }

  /**
   * Check if adapter uses filtered policy
   */
  isFiltered(): boolean {
    return this._isFiltered;
  }

  /**
   * Save all policies to database
   * Clears existing policies and saves new ones
   */
  async savePolicy(model: Model): Promise<boolean> {
    try {
      // Delete all existing policies
      await this.repository.delete({});

      const rules: Partial<MktCasbinRuleWorkspaceEntity>[] = [];

      // Extract p policies
      const pPolicies = model.model.get('p');

      if (pPolicies) {
        for (const [ptype, ast] of pPolicies) {
          for (const rule of ast.policy) {
            rules.push(this.createRuleEntity(ptype, rule));
          }
        }
      }

      // Extract g policies (role assignments)
      const gPolicies = model.model.get('g');

      if (gPolicies) {
        for (const [ptype, ast] of gPolicies) {
          for (const rule of ast.policy) {
            rules.push(this.createRuleEntity(ptype, rule));
          }
        }
      }

      if (rules.length > 0) {
        await this.repository.save(rules);
      }

      this.logger.debug(
        `Saved ${rules.length} policies for workspace: ${this.workspaceId}`,
      );

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Failed to save policies: ${errorMessage}`);

      return false;
    }
  }

  /**
   * Add a policy rule
   */
  async addPolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    const entity = this.createRuleEntity(ptype, rule);

    await this.repository.save(entity);
    this.logger.debug(`Added policy: ${ptype} ${rule.join(', ')}`);
  }

  /**
   * Add multiple policy rules
   */
  async addPolicies(
    sec: string,
    ptype: string,
    rules: string[][],
  ): Promise<void> {
    const entities = rules.map((rule) => this.createRuleEntity(ptype, rule));

    await this.repository.save(entities);
    this.logger.debug(`Added ${entities.length} policies of type: ${ptype}`);
  }

  /**
   * Remove a policy rule
   */
  async removePolicy(
    sec: string,
    ptype: string,
    rule: string[],
  ): Promise<void> {
    await this.repository.delete({
      ptype,
      subject: rule[0] ?? '',
      object: rule[1] ?? null,
      action: rule[2] ?? null,
      effect: rule[3] ?? null,
    });
    this.logger.debug(`Removed policy: ${ptype} ${rule.join(', ')}`);
  }

  /**
   * Remove multiple policy rules
   */
  async removePolicies(
    sec: string,
    ptype: string,
    rules: string[][],
  ): Promise<void> {
    for (const rule of rules) {
      await this.removePolicy(sec, ptype, rule);
    }
  }

  /**
   * Remove policies matching filter
   */
  async removeFilteredPolicy(
    sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    const where: Record<string, string | null> = { ptype };
    const fieldNames = ['subject', 'object', 'action', 'effect', 'condition'];

    for (let i = 0; i < fieldValues.length; i++) {
      const value = fieldValues[i];
      const fieldName = fieldNames[fieldIndex + i];

      if (value && value !== '' && fieldName) {
        where[fieldName] = value;
      }
    }

    await this.repository.delete(where);
    this.logger.debug(
      `Removed filtered policies: ptype=${ptype}, filter=${safeJsonStringify(where)}`,
    );
  }

  /**
   * Update a policy rule
   */
  async updatePolicy(
    sec: string,
    ptype: string,
    oldRule: string[],
    newRule: string[],
  ): Promise<void> {
    await this.removePolicy(sec, ptype, oldRule);
    await this.addPolicy(sec, ptype, newRule);
  }

  /**
   * Update multiple policy rules
   */
  async updatePolicies(
    sec: string,
    ptype: string,
    oldRules: string[][],
    newRules: string[][],
  ): Promise<void> {
    if (oldRules.length !== newRules.length) {
      throw new Error('Old and new rules count must match');
    }

    for (let i = 0; i < oldRules.length; i++) {
      await this.updatePolicy(sec, ptype, oldRules[i], newRules[i]);
    }
  }

  /**
   * Update filtered policies
   */
  async updateFilteredPolicies(
    sec: string,
    ptype: string,
    newRules: string[][],
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<string[][]> {
    const where: Record<string, string | null> = { ptype };
    const fieldNames = ['subject', 'object', 'action', 'effect', 'condition'];

    for (let i = 0; i < fieldValues.length; i++) {
      const value = fieldValues[i];
      const fieldName = fieldNames[fieldIndex + i];

      if (value && value !== '' && fieldName) {
        where[fieldName] = value;
      }
    }

    const oldRules = await this.repository.find({ where });

    // Remove old and add new
    await this.removeFilteredPolicy(sec, ptype, fieldIndex, ...fieldValues);

    for (const rule of newRules) {
      await this.addPolicy(sec, ptype, rule);
    }

    return oldRules.map((r) => this.ruleEntityToArray(r));
  }

  // ==================== Helper Methods ====================

  /**
   * Load a policy line into the model
   */
  private loadPolicyLine(
    rule: MktCasbinRuleWorkspaceEntity,
    model: Model,
  ): void {
    const ruleArray = this.ruleEntityToArray(rule);

    Helper.loadPolicyLine(rule.ptype + ', ' + ruleArray.join(', '), model);
  }

  /**
   * Create rule entity from policy array
   * Policy format: subject, object, action, effect, condition
   */
  private createRuleEntity(
    ptype: string,
    rule: string[],
  ): Partial<MktCasbinRuleWorkspaceEntity> {
    return {
      ptype,
      subject: rule[0] ?? '',
      object: rule[1] ?? null,
      action: rule[2] ?? null,
      effect: rule[3] ?? 'allow',
      condition: rule[4] ?? null,
    };
  }

  /**
   * Convert rule entity to array
   */
  private ruleEntityToArray(rule: MktCasbinRuleWorkspaceEntity): string[] {
    const result: string[] = [];

    if (rule.subject) result.push(rule.subject);
    if (rule.object) result.push(rule.object);
    if (rule.action) result.push(rule.action);
    if (rule.effect) result.push(rule.effect);
    if (rule.condition) result.push(rule.condition);

    return result;
  }

  /**
   * Get workspace ID
   */
  getWorkspaceId(): string {
    return this.workspaceId;
  }

  /**
   * Get policy count
   */
  async getPolicyCount(): Promise<number> {
    return this.repository.count();
  }

  /**
   * Get all rules (for debugging/admin)
   */
  async getAllRules(): Promise<CasbinRuleRow[]> {
    const rules = await this.repository.find();

    return rules.map((r) => ({
      id: r.id,
      ptype: r.ptype,
      v0: r.subject,
      v1: r.object ?? '',
      v2: r.action ?? '',
      v3: r.effect ?? '',
      v4: r.condition ?? '',
      v5: '',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }
}
