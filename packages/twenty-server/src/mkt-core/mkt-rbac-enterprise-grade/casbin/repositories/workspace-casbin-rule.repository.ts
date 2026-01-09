import { Injectable, Logger } from '@nestjs/common';

import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { TwentyORMManager } from 'src/engine/twenty-orm/twenty-orm.manager';
import { MktCasbinRuleWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import {
  CasbinRuleRow,
  CasbinPolicyType,
  PolicyStatistics,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/types';

/**
 * Workspace-aware Repository cho Casbin Rules
 *
 * Works with mktCasbinRule table in workspace schema.
 * Each workspace has isolated policies - no domain filtering needed.
 *
 * Policy format:
 * - p: subject, object, action, effect
 * - g: subject, role
 * - g2: resource, group
 */
@Injectable()
export class WorkspaceCasbinRuleRepository {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:WorkspaceCasbinRuleRepository`,
  );

  constructor(private readonly twentyORMManager: TwentyORMManager) {}

  /**
   * Get repository for current workspace context
   */
  private async getRepository() {
    return this.twentyORMManager.getRepository<MktCasbinRuleWorkspaceEntity>(
      'mktCasbinRule',
    );
  }

  /**
   * Find all rules in current workspace
   */
  async findAll(): Promise<CasbinRuleRow[]> {
    const repository = await this.getRepository();

    const rules = await repository.find({
      order: { ptype: 'ASC', createdAt: 'ASC' },
    });

    return rules.map((r) => this.toRuleRow(r));
  }

  /**
   * Find rules by policy type
   */
  async findByType(ptype: CasbinPolicyType): Promise<CasbinRuleRow[]> {
    const repository = await this.getRepository();

    const rules = await repository.find({
      where: { ptype },
      order: { createdAt: 'ASC' },
    });

    return rules.map((r) => this.toRuleRow(r));
  }

  /**
   * Find permission policies (p type)
   */
  async findPermissionPolicies(): Promise<CasbinRuleRow[]> {
    return this.findByType('p');
  }

  /**
   * Find role assignments (g type)
   */
  async findRoleAssignments(): Promise<CasbinRuleRow[]> {
    return this.findByType('g');
  }

  /**
   * Find resource groupings (g2 type)
   */
  async findResourceGroupings(): Promise<CasbinRuleRow[]> {
    return this.findByType('g2');
  }

  /**
   * Find rules for a specific subject (user or role)
   */
  async findBySubject(subject: string): Promise<CasbinRuleRow[]> {
    const repository = await this.getRepository();

    const rules = await repository.find({
      where: { subject },
      order: { ptype: 'ASC', createdAt: 'ASC' },
    });

    return rules.map((r) => this.toRuleRow(r));
  }

  /**
   * Find rules for a specific user
   */
  async findByUser(userId: string): Promise<CasbinRuleRow[]> {
    return this.findBySubject(`user:${userId}`);
  }

  /**
   * Find rules for a specific role
   */
  async findByRole(roleName: string): Promise<CasbinRuleRow[]> {
    return this.findBySubject(`role:${roleName}`);
  }

  /**
   * Find rules for a specific resource
   */
  async findByResource(resource: string): Promise<CasbinRuleRow[]> {
    const repository = await this.getRepository();

    const rules = await repository
      .createQueryBuilder('rule')
      .where('rule.object = :resource OR rule.object LIKE :resourcePattern', {
        resource,
        resourcePattern: `${resource}:%`,
      })
      .orderBy('rule.ptype', 'ASC')
      .addOrderBy('rule.createdAt', 'ASC')
      .getMany();

    return rules.map((r) => this.toRuleRow(r));
  }

  /**
   * Count all rules
   */
  async count(): Promise<number> {
    const repository = await this.getRepository();

    return repository.count();
  }

  /**
   * Count rules by type
   */
  async countByType(ptype: CasbinPolicyType): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: { ptype },
    });
  }

  /**
   * Get policy statistics
   */
  async getStatistics(): Promise<PolicyStatistics> {
    const repository = await this.getRepository();

    const [totalPolicies, roleAssignments, resourceGroups] = await Promise.all([
      repository.count({ where: { ptype: 'p' } }),
      repository.count({ where: { ptype: 'g' } }),
      repository.count({ where: { ptype: 'g2' } }),
    ]);

    return {
      totalPolicies,
      roleAssignments,
      resourceGroups,
    };
  }

  /**
   * Add a rule
   */
  async addRule(
    ptype: CasbinPolicyType,
    rule: string[],
  ): Promise<CasbinRuleRow> {
    const repository = await this.getRepository();

    const entity = this.createEntity(ptype, rule);
    const saved = await repository.save(entity);

    this.logger.debug(`Added rule: ${ptype} ${rule.join(', ')}`);

    return this.toRuleRow(saved as MktCasbinRuleWorkspaceEntity);
  }

  /**
   * Add multiple rules
   */
  async addRules(ptype: CasbinPolicyType, rules: string[][]): Promise<number> {
    const repository = await this.getRepository();

    const entities = rules.map((rule) => this.createEntity(ptype, rule));

    await repository.save(entities);

    this.logger.debug(`Added ${entities.length} rules of type: ${ptype}`);

    return entities.length;
  }

  /**
   * Remove a rule
   */
  async removeRule(ptype: CasbinPolicyType, rule: string[]): Promise<boolean> {
    const repository = await this.getRepository();

    const result = await repository.delete({
      ptype,
      subject: rule[0] ?? '',
      object: rule[1] ?? null,
      action: rule[2] ?? null,
      effect: rule[3] ?? null,
    });

    const deleted = (result.affected ?? 0) > 0;

    if (deleted) {
      this.logger.debug(`Removed rule: ${ptype} ${rule.join(', ')}`);
    }

    return deleted;
  }

  /**
   * Remove all rules in workspace
   */
  async removeAll(): Promise<number> {
    const repository = await this.getRepository();

    const result = await repository.delete({});

    const count = result.affected ?? 0;

    this.logger.debug(`Removed ${count} rules`);

    return count;
  }

  /**
   * Remove rules by subject
   */
  async removeBySubject(subject: string): Promise<number> {
    const repository = await this.getRepository();

    const result = await repository.delete({
      subject,
    });

    return result.affected ?? 0;
  }

  /**
   * Remove rules by user
   */
  async removeByUser(userId: string): Promise<number> {
    return this.removeBySubject(`user:${userId}`);
  }

  /**
   * Check if rule exists
   */
  async exists(ptype: CasbinPolicyType, rule: string[]): Promise<boolean> {
    const repository = await this.getRepository();

    const count = await repository.count({
      where: {
        ptype,
        subject: rule[0] ?? '',
        object: rule[1] ?? null,
        action: rule[2] ?? null,
        effect: rule[3] ?? null,
      },
    });

    return count > 0;
  }

  /**
   * Bulk replace all rules
   * Atomic operation: delete all then insert new
   */
  async bulkReplace(
    rules: Array<{ ptype: CasbinPolicyType; rule: string[] }>,
  ): Promise<number> {
    const repository = await this.getRepository();
    const entityManager = repository.manager;

    return entityManager.transaction(async (manager) => {
      const repo = manager.getRepository(MktCasbinRuleWorkspaceEntity);

      // Delete all existing rules
      await repo.delete({});

      // Insert new rules
      const entities = rules.map(({ ptype, rule }) =>
        this.createEntity(ptype, rule),
      );

      if (entities.length > 0) {
        await repo.save(entities);
      }

      this.logger.log(`Bulk replaced ${entities.length} rules`);

      return entities.length;
    });
  }

  // ==================== Private Methods ====================

  /**
   * Create entity from rule array
   * Policy format: subject, object, action, effect, condition
   */
  private createEntity(
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
   * Convert entity to CasbinRuleRow
   */
  private toRuleRow(entity: MktCasbinRuleWorkspaceEntity): CasbinRuleRow {
    return {
      id: entity.id,
      ptype: entity.ptype,
      v0: entity.subject,
      v1: entity.object ?? '',
      v2: entity.action ?? '',
      v3: entity.effect ?? '',
      v4: entity.condition ?? '',
      v5: '',
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
