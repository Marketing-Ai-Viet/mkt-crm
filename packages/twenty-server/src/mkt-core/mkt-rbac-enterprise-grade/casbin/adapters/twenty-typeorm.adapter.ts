import { Logger } from '@nestjs/common';

import { Helper, FilteredAdapter, Model } from 'casbin';
import { DataSource, Repository } from 'typeorm';

import {
  CASBIN_LOG_CONTEXT,
  CASBIN_MESSAGES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CasbinRuleRow } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/casbin.types';

/**
 * Casbin rule entity cho TypeORM
 * Tương thích với cấu trúc database của casbin
 */
type CasbinRuleEntity = {
  id?: number;
  ptype: string;
  v0: string;
  v1: string;
  v2: string;
  v3: string;
  v4: string;
  v5: string;
};

/**
 * Options cho Twenty TypeORM Adapter
 */
type TwentyTypeORMAdapterOptions = {
  tableName?: string;
  workspaceId: string;
  useFiltered?: boolean;
};

const DEFAULT_TABLE_NAME = 'casbin_rule';

/**
 * Twenty CRM TypeORM Adapter cho Casbin
 *
 * Custom adapter để:
 * - Support multi-tenant workspace isolation
 * - Filter policies by workspace (domain)
 * - Optimized batch operations
 * - Fail-closed security pattern
 *
 * Policy format: ptype, v0(subject), v1(domain), v2(object), v3(action), v4(effect)
 * Domain format: ws:{workspaceId}
 */
export class TwentyTypeORMAdapter implements FilteredAdapter {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:TypeORMAdapter`);
  private repository: Repository<CasbinRuleEntity> | null = null;
  private _isFiltered = false;
  private readonly tableName: string;
  private readonly workspaceId: string;
  private readonly domain: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly options: TwentyTypeORMAdapterOptions,
  ) {
    this.tableName = options.tableName ?? DEFAULT_TABLE_NAME;
    this.workspaceId = options.workspaceId;
    this.domain = `ws:${options.workspaceId}`;
  }

  /**
   * Initialize adapter - get repository
   */
  async init(): Promise<void> {
    this.repository = this.dataSource.getRepository(
      this.tableName,
    ) as Repository<CasbinRuleEntity>;
    this.logger.debug(`Adapter initialized for workspace: ${this.workspaceId}`);
  }

  /**
   * Factory method to create and initialize adapter
   */
  static async newAdapter(
    dataSource: DataSource,
    options: TwentyTypeORMAdapterOptions,
  ): Promise<TwentyTypeORMAdapter> {
    const adapter = new TwentyTypeORMAdapter(dataSource, options);

    await adapter.init();

    return adapter;
  }

  /**
   * Load all policies for this workspace
   */
  async loadPolicy(model: Model): Promise<void> {
    if (!this.repository) {
      throw new Error('Adapter not initialized');
    }

    try {
      // Filter by domain (workspace)
      const rules = await this.repository.find({
        where: { v1: this.domain },
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
    if (!this.repository) {
      throw new Error('Adapter not initialized');
    }

    try {
      // Always include workspace domain filter
      const whereClause = { ...filter, v1: this.domain };

      const rules = await this.repository.find({
        where: whereClause,
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
   * Clears existing policies for workspace and saves new ones
   */
  async savePolicy(model: Model): Promise<boolean> {
    if (!this.repository) {
      throw new Error('Adapter not initialized');
    }

    try {
      // Delete existing policies for this workspace
      await this.repository.delete({ v1: this.domain });

      const rules: CasbinRuleEntity[] = [];

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
    if (!this.repository) {
      throw new Error('Adapter not initialized');
    }

    // Validate domain matches workspace
    this.validateDomain(rule);

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
    if (!this.repository) {
      throw new Error('Adapter not initialized');
    }

    const entities: CasbinRuleEntity[] = [];

    for (const rule of rules) {
      this.validateDomain(rule);
      entities.push(this.createRuleEntity(ptype, rule));
    }

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
    if (!this.repository) {
      throw new Error('Adapter not initialized');
    }

    await this.repository.delete({
      ptype,
      v0: rule[0] ?? '',
      v1: rule[1] ?? this.domain,
      v2: rule[2] ?? '',
      v3: rule[3] ?? '',
      v4: rule[4] ?? '',
      v5: rule[5] ?? '',
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
    if (!this.repository) {
      throw new Error('Adapter not initialized');
    }

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
    if (!this.repository) {
      throw new Error('Adapter not initialized');
    }

    const where: Record<string, string> = { ptype, v1: this.domain };

    // Build filter based on field index
    for (let i = 0; i < fieldValues.length; i++) {
      const value = fieldValues[i];

      if (value && value !== '') {
        where[`v${fieldIndex + i}`] = value;
      }
    }

    await this.repository.delete(where);
    this.logger.debug(
      `Removed filtered policies: ptype=${ptype}, filter=${JSON.stringify(where)}`,
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
    if (!this.repository) {
      throw new Error('Adapter not initialized');
    }

    // Validate domains match workspace
    this.validateDomain(oldRule);
    this.validateDomain(newRule);

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
    if (!this.repository) {
      throw new Error('Adapter not initialized');
    }

    // Get old policies matching filter
    const where: Record<string, string> = { ptype, v1: this.domain };

    for (let i = 0; i < fieldValues.length; i++) {
      const value = fieldValues[i];

      if (value && value !== '') {
        where[`v${fieldIndex + i}`] = value;
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
  private loadPolicyLine(rule: CasbinRuleEntity, model: Model): void {
    const ruleArray = this.ruleEntityToArray(rule);

    Helper.loadPolicyLine(rule.ptype + ', ' + ruleArray.join(', '), model);
  }

  /**
   * Create rule entity from policy array
   */
  private createRuleEntity(ptype: string, rule: string[]): CasbinRuleEntity {
    return {
      ptype,
      v0: rule[0] ?? '',
      v1: rule[1] ?? this.domain, // Ensure domain is set
      v2: rule[2] ?? '',
      v3: rule[3] ?? '',
      v4: rule[4] ?? '',
      v5: rule[5] ?? '',
    };
  }

  /**
   * Convert rule entity to array
   */
  private ruleEntityToArray(rule: CasbinRuleEntity): string[] {
    const result: string[] = [];

    if (rule.v0) result.push(rule.v0);
    if (rule.v1) result.push(rule.v1);
    if (rule.v2) result.push(rule.v2);
    if (rule.v3) result.push(rule.v3);
    if (rule.v4) result.push(rule.v4);
    if (rule.v5) result.push(rule.v5);

    return result;
  }

  /**
   * Validate that rule's domain matches workspace
   * Security: Prevent cross-tenant policy injection
   */
  private validateDomain(rule: string[]): void {
    // For g policies, domain is at index 2
    const isGroupingPolicy = rule.length === 3 && !rule[1].includes(':');
    const domainIndex = isGroupingPolicy ? 2 : 1;
    const actualDomain = rule[domainIndex];

    if (actualDomain && actualDomain !== this.domain) {
      this.logger.warn(
        CASBIN_MESSAGES.WARN.CROSS_TENANT_REJECTED(actualDomain),
      );
      throw new Error(
        `Cross-tenant policy rejected: expected ${this.domain}, got ${actualDomain}`,
      );
    }
  }

  /**
   * Get workspace ID
   */
  getWorkspaceId(): string {
    return this.workspaceId;
  }

  /**
   * Get domain
   */
  getDomain(): string {
    return this.domain;
  }

  /**
   * Get policy count for workspace
   */
  async getPolicyCount(): Promise<number> {
    if (!this.repository) {
      return 0;
    }

    return this.repository.count({
      where: { v1: this.domain },
    });
  }

  /**
   * Get all rules for workspace (for debugging/admin)
   */
  async getAllRules(): Promise<CasbinRuleRow[]> {
    if (!this.repository) {
      return [];
    }

    const rules = await this.repository.find({
      where: { v1: this.domain },
    });

    return rules.map((r) => ({
      id: r.id ?? 0,
      ptype: r.ptype,
      v0: r.v0,
      v1: r.v1,
      v2: r.v2,
      v3: r.v3,
      v4: r.v4,
      v5: r.v5,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }
}
