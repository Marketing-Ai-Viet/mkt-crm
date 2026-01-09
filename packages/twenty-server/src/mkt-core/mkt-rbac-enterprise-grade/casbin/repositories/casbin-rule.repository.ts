import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import {
  CasbinRuleRow,
  CasbinPolicyType,
  PolicyStatistics,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/casbin.types';
import { CasbinRuleEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/entities/casbin-rule.entity';

/**
 * Repository cho Casbin Rules
 *
 * Làm việc trực tiếp với casbin_rule table trong core database.
 * Table này được tạo bởi migration và quản lý bởi Casbin adapter.
 *
 * Schema:
 * - id: serial primary key
 * - ptype: varchar - policy type (p, g, g2)
 * - v0-v5: varchar - policy values
 *
 * Policy format:
 * - p: subject, domain, object, action, effect
 * - g: subject, role, domain
 * - g2: resource, group
 */
@Injectable()
export class CasbinRuleRepository {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:CasbinRuleRepository`,
  );

  constructor(
    @InjectRepository(CasbinRuleEntity, 'core')
    private readonly repository: Repository<CasbinRuleEntity>,
  ) {}

  /**
   * Find all rules for a workspace
   */
  async findByWorkspace(workspaceId: string): Promise<CasbinRuleRow[]> {
    const domain = `ws:${workspaceId}`;

    const rules = await this.repository.find({
      where: { v1: domain },
      order: { ptype: 'ASC', id: 'ASC' },
    });

    return rules.map((r) => this.toRuleRow(r));
  }

  /**
   * Find rules by policy type for a workspace
   */
  async findByTypeAndWorkspace(
    ptype: CasbinPolicyType,
    workspaceId: string,
  ): Promise<CasbinRuleRow[]> {
    const domain = `ws:${workspaceId}`;

    const rules = await this.repository.find({
      where: { ptype, v1: domain },
      order: { id: 'ASC' },
    });

    return rules.map((r) => this.toRuleRow(r));
  }

  /**
   * Find permission policies (p type) for workspace
   */
  async findPermissionPolicies(workspaceId: string): Promise<CasbinRuleRow[]> {
    return this.findByTypeAndWorkspace('p', workspaceId);
  }

  /**
   * Find role assignments (g type) for workspace
   */
  async findRoleAssignments(workspaceId: string): Promise<CasbinRuleRow[]> {
    return this.findByTypeAndWorkspace('g', workspaceId);
  }

  /**
   * Find resource groupings (g2 type)
   */
  async findResourceGroupings(): Promise<CasbinRuleRow[]> {
    const rules = await this.repository.find({
      where: { ptype: 'g2' },
      order: { id: 'ASC' },
    });

    return rules.map((r) => this.toRuleRow(r));
  }

  /**
   * Find rules for a specific subject (user or role)
   */
  async findBySubject(
    subject: string,
    workspaceId: string,
  ): Promise<CasbinRuleRow[]> {
    const domain = `ws:${workspaceId}`;

    const rules = await this.repository.find({
      where: { v0: subject, v1: domain },
      order: { ptype: 'ASC', id: 'ASC' },
    });

    return rules.map((r) => this.toRuleRow(r));
  }

  /**
   * Find rules for a specific user
   */
  async findByUser(
    userId: string,
    workspaceId: string,
  ): Promise<CasbinRuleRow[]> {
    return this.findBySubject(`user:${userId}`, workspaceId);
  }

  /**
   * Find rules for a specific role
   */
  async findByRole(
    roleName: string,
    workspaceId: string,
  ): Promise<CasbinRuleRow[]> {
    return this.findBySubject(`role:${roleName}`, workspaceId);
  }

  /**
   * Find rules for a specific resource
   */
  async findByResource(
    resource: string,
    workspaceId: string,
  ): Promise<CasbinRuleRow[]> {
    const domain = `ws:${workspaceId}`;

    const rules = await this.repository
      .createQueryBuilder('rule')
      .where('rule.v1 = :domain', { domain })
      .andWhere('(rule.v2 = :resource OR rule.v2 LIKE :resourcePattern)', {
        resource,
        resourcePattern: `${resource}:%`,
      })
      .orderBy('rule.ptype', 'ASC')
      .addOrderBy('rule.id', 'ASC')
      .getMany();

    return rules.map((r) => this.toRuleRow(r));
  }

  /**
   * Count rules by workspace
   */
  async countByWorkspace(workspaceId: string): Promise<number> {
    const domain = `ws:${workspaceId}`;

    return this.repository.count({
      where: { v1: domain },
    });
  }

  /**
   * Count rules by type for workspace
   */
  async countByTypeAndWorkspace(
    ptype: CasbinPolicyType,
    workspaceId: string,
  ): Promise<number> {
    const domain = `ws:${workspaceId}`;

    return this.repository.count({
      where: { ptype, v1: domain },
    });
  }

  /**
   * Get policy statistics for workspace
   */
  async getStatistics(workspaceId: string): Promise<PolicyStatistics> {
    const domain = `ws:${workspaceId}`;

    const [totalPolicies, roleAssignments, resourceGroups] = await Promise.all([
      this.repository.count({ where: { ptype: 'p', v1: domain } }),
      this.repository.count({ where: { ptype: 'g', v1: domain } }),
      this.repository.count({ where: { ptype: 'g2' } }),
    ]);

    return {
      totalPolicies,
      roleAssignments,
      resourceGroups,
      workspaceId,
    };
  }

  /**
   * Add a rule
   */
  async addRule(
    ptype: CasbinPolicyType,
    rule: string[],
    workspaceId: string,
  ): Promise<CasbinRuleRow> {
    const domain = `ws:${workspaceId}`;

    // Ensure domain is set correctly
    const adjustedRule = [...rule];

    if (ptype === 'p' || ptype === 'g') {
      adjustedRule[1] = domain;
    }

    const entity = this.createEntity(ptype, adjustedRule);
    const saved = await this.repository.save(entity);

    this.logger.debug(`Added rule: ${ptype} ${adjustedRule.join(', ')}`);

    return this.toRuleRow(saved);
  }

  /**
   * Add multiple rules
   */
  async addRules(
    ptype: CasbinPolicyType,
    rules: string[][],
    workspaceId: string,
  ): Promise<number> {
    const domain = `ws:${workspaceId}`;

    const entities = rules.map((rule) => {
      const adjustedRule = [...rule];

      if (ptype === 'p' || ptype === 'g') {
        adjustedRule[1] = domain;
      }

      return this.createEntity(ptype, adjustedRule);
    });

    await this.repository.save(entities);

    this.logger.debug(`Added ${entities.length} rules of type: ${ptype}`);

    return entities.length;
  }

  /**
   * Remove a rule
   */
  async removeRule(
    ptype: CasbinPolicyType,
    rule: string[],
    workspaceId: string,
  ): Promise<boolean> {
    const domain = `ws:${workspaceId}`;

    const result = await this.repository.delete({
      ptype,
      v0: rule[0] ?? '',
      v1: rule[1] ?? domain,
      v2: rule[2] ?? '',
      v3: rule[3] ?? '',
      v4: rule[4] ?? '',
      v5: rule[5] ?? '',
    });

    const deleted = (result.affected ?? 0) > 0;

    if (deleted) {
      this.logger.debug(`Removed rule: ${ptype} ${rule.join(', ')}`);
    }

    return deleted;
  }

  /**
   * Remove all rules for workspace
   */
  async removeAllByWorkspace(workspaceId: string): Promise<number> {
    const domain = `ws:${workspaceId}`;

    const result = await this.repository.delete({ v1: domain });

    const count = result.affected ?? 0;

    this.logger.debug(`Removed ${count} rules for workspace: ${workspaceId}`);

    return count;
  }

  /**
   * Remove rules by subject for workspace
   */
  async removeBySubject(subject: string, workspaceId: string): Promise<number> {
    const domain = `ws:${workspaceId}`;

    const result = await this.repository.delete({
      v0: subject,
      v1: domain,
    });

    return result.affected ?? 0;
  }

  /**
   * Remove rules by user
   */
  async removeByUser(userId: string, workspaceId: string): Promise<number> {
    return this.removeBySubject(`user:${userId}`, workspaceId);
  }

  /**
   * Check if rule exists
   */
  async exists(
    ptype: CasbinPolicyType,
    rule: string[],
    workspaceId: string,
  ): Promise<boolean> {
    const domain = `ws:${workspaceId}`;

    const count = await this.repository.count({
      where: {
        ptype,
        v0: rule[0] ?? '',
        v1: rule[1] ?? domain,
        v2: rule[2] ?? '',
        v3: rule[3] ?? '',
        v4: rule[4] ?? '',
        v5: rule[5] ?? '',
      },
    });

    return count > 0;
  }

  /**
   * Get all unique workspaces with policies
   */
  async getActiveWorkspaces(): Promise<string[]> {
    const result = await this.repository
      .createQueryBuilder('rule')
      .select('DISTINCT rule.v1', 'domain')
      .where("rule.v1 LIKE 'ws:%'")
      .getRawMany();

    return result
      .map((r) => r.domain.substring(3)) // Remove 'ws:'
      .filter((id: string) => id.length > 0);
  }

  /**
   * Bulk replace rules for workspace
   * Atomic operation: delete all then insert new
   */
  async bulkReplace(
    rules: Array<{ ptype: CasbinPolicyType; rule: string[] }>,
    workspaceId: string,
  ): Promise<number> {
    const domain = `ws:${workspaceId}`;

    return this.repository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(CasbinRuleEntity);

      // Delete all existing rules for workspace
      await repo.delete({ v1: domain });

      // Insert new rules
      const entities = rules.map(({ ptype, rule }) => {
        const adjustedRule = [...rule];

        if (ptype === 'p' || ptype === 'g') {
          adjustedRule[1] = domain;
        }

        return this.createEntity(ptype, adjustedRule);
      });

      if (entities.length > 0) {
        await repo.save(entities);
      }

      this.logger.log(
        `Bulk replaced ${entities.length} rules for workspace: ${workspaceId}`,
      );

      return entities.length;
    });
  }

  // ==================== Private Methods ====================

  /**
   * Create entity from rule array
   */
  private createEntity(
    ptype: string,
    rule: string[],
  ): Partial<CasbinRuleEntity> {
    return {
      ptype,
      v0: rule[0] ?? '',
      v1: rule[1] ?? '',
      v2: rule[2] ?? '',
      v3: rule[3] ?? '',
      v4: rule[4] ?? '',
      v5: rule[5] ?? '',
    };
  }

  /**
   * Convert entity to CasbinRuleRow
   */
  private toRuleRow(entity: CasbinRuleEntity): CasbinRuleRow {
    return {
      id: entity.id,
      ptype: entity.ptype,
      v0: entity.v0,
      v1: entity.v1,
      v2: entity.v2,
      v3: entity.v3,
      v4: entity.v4,
      v5: entity.v5,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
