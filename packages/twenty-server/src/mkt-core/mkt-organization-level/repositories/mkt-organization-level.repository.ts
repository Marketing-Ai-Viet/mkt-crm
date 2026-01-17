import { Injectable } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktOrganizationLevelWorkspaceEntity } from 'src/mkt-core/mkt-organization-level/workspace-entity/mkt-organization-level.workspace-entity';
import { WorkspaceMemberMktEntity } from 'src/mkt-core/mkt-entities-extends/workspace-member.mkt-entity';

/**
 * Type for find operations options
 */
type FindOrganizationLevelOptions = {
  includeInactive?: boolean;
  orderBy?: 'hierarchyLevel' | 'displayOrder' | 'createdAt';
  orderDirection?: 'ASC' | 'DESC';
};

/**
 * MktOrganizationLevelRepository - Data access layer for Organization Level entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for MktOrganizationLevel entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - Validation (handled by Service layer and Hooks)
 */
@Injectable()
export class MktOrganizationLevelRepository extends BaseWorkspaceRepository<MktOrganizationLevelWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktOrganizationLevelWorkspaceEntity,
      MktOrganizationLevelRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  /**
   * Find organization level by code
   */
  async findByCode(
    levelCode: string,
  ): Promise<MktOrganizationLevelWorkspaceEntity | null> {
    this.logger.debug(`Finding organization level by code: ${levelCode}`);

    return this.findOne({ levelCode });
  }

  /**
   * Find all organization levels with options
   */
  async findAllWithOptions(
    options?: FindOrganizationLevelOptions,
  ): Promise<MktOrganizationLevelWorkspaceEntity[]> {
    this.logger.debug('Finding all organization levels with options');

    const repository = await this.getRepository();

    const whereConditions: FindOptionsWhere<MktOrganizationLevelWorkspaceEntity> =
      {};

    if (!options?.includeInactive) {
      whereConditions.isActive = true;
    }

    const orderBy = options?.orderBy ?? 'hierarchyLevel';
    const orderDirection = options?.orderDirection ?? 'ASC';

    return repository.find({
      where: whereConditions,
      order: { [orderBy]: orderDirection },
    });
  }

  /**
   * Find organization levels by hierarchy level
   */
  async findByHierarchyLevel(
    hierarchyLevel: number,
  ): Promise<MktOrganizationLevelWorkspaceEntity[]> {
    this.logger.debug(
      `Finding organization levels by hierarchy level: ${hierarchyLevel}`,
    );

    const repository = await this.getRepository();

    return repository.find({
      where: { hierarchyLevel },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Find organization levels by multiple hierarchy levels
   */
  async findByHierarchyLevels(
    hierarchyLevels: number[],
  ): Promise<MktOrganizationLevelWorkspaceEntity[]> {
    if (hierarchyLevels.length === 0) {
      return [];
    }

    const repository = await this.getRepository();

    return repository.find({
      where: { hierarchyLevel: In(hierarchyLevels) },
      order: { hierarchyLevel: 'ASC', displayOrder: 'ASC' },
    });
  }

  /**
   * Find organization levels by parent ID
   */
  async findByParentId(
    parentLevelId: string,
  ): Promise<MktOrganizationLevelWorkspaceEntity[]> {
    this.logger.debug(
      `Finding organization levels by parent ID: ${parentLevelId}`,
    );

    const repository = await this.getRepository();

    return repository.find({
      where: { parentLevelId },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Find root organization levels (level 1 or no parent)
   */
  async findRootLevels(): Promise<MktOrganizationLevelWorkspaceEntity[]> {
    this.logger.debug('Finding root organization levels');

    const repository = await this.getRepository();

    return repository.find({
      where: { hierarchyLevel: 1 },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Find active organization levels
   */
  async findActive(): Promise<MktOrganizationLevelWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { isActive: true },
      order: { hierarchyLevel: 'ASC', displayOrder: 'ASC' },
    });
  }

  // ============================================
  // EXISTS OPERATIONS
  // ============================================

  /**
   * Check if level code exists
   */
  async existsByCode(levelCode: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findOne({ levelCode });

    if (!existing) {
      return false;
    }

    // If excludeId is provided, check if it's the same record
    if (excludeId && existing.id === excludeId) {
      return false;
    }

    return true;
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count active organization levels
   */
  async countActive(): Promise<number> {
    return this.count({ isActive: true });
  }

  /**
   * Count child levels
   */
  async countChildren(parentLevelId: string): Promise<number> {
    return this.count({ parentLevelId });
  }

  // ============================================
  // EMPLOYEE STATISTICS
  // ============================================

  /**
   * Get workspace member repository
   */
  private async getWorkspaceMemberRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<WorkspaceMemberMktEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      'workspaceMember',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Count employees at a specific level
   */
  async countEmployeesAtLevel(levelId: string): Promise<number> {
    try {
      const workspaceId =
        this.scopedWorkspaceContextFactory.create().workspaceId;

      if (!workspaceId) {
        return 0;
      }

      const memberRepository =
        await this.getWorkspaceMemberRepository(workspaceId);

      return memberRepository.count({
        where: { organizationLevelId: levelId },
      });
    } catch (error) {
      this.logger.warn(
        `Could not count employees at level ${levelId}: ${(error as Error).message}`,
      );

      return 0;
    }
  }

  /**
   * Get employee counts for multiple levels
   * Single query with GROUP BY to avoid N+1 problem
   */
  async getEmployeeCountsByLevels(
    levelIds: string[],
  ): Promise<Map<string, number>> {
    if (levelIds.length === 0) {
      return new Map();
    }

    try {
      const workspaceId =
        this.scopedWorkspaceContextFactory.create().workspaceId;

      if (!workspaceId) {
        return new Map();
      }

      const memberRepository =
        await this.getWorkspaceMemberRepository(workspaceId);

      const stats = await memberRepository
        .createQueryBuilder('member')
        .select('member.organizationLevelId', 'levelId')
        .addSelect('COUNT(member.id)', 'employeeCount')
        .where('member.organizationLevelId IN (:...levelIds)', { levelIds })
        .groupBy('member.organizationLevelId')
        .getRawMany();

      const result = new Map<string, number>();

      for (const stat of stats) {
        result.set(stat.levelId, parseInt(stat.employeeCount, 10) || 0);
      }

      return result;
    } catch (error) {
      this.logger.warn(
        `Could not get employee counts by levels: ${(error as Error).message}`,
      );

      return new Map();
    }
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update display order for multiple levels
   */
  async updateDisplayOrders(
    levelOrders: Array<{ levelId: string; displayOrder: number }>,
  ): Promise<void> {
    this.logger.debug(
      `Updating display orders for ${levelOrders.length} levels`,
    );

    for (const { levelId, displayOrder } of levelOrders) {
      await this.update(levelId, { displayOrder });
    }
  }

  /**
   * Activate organization level
   */
  async activate(levelId: string): Promise<void> {
    await this.update(levelId, { isActive: true });
  }

  /**
   * Deactivate organization level
   */
  async deactivate(levelId: string): Promise<void> {
    await this.update(levelId, { isActive: false });
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete organization level by ID
   */
  async deleteLevel(levelId: string): Promise<void> {
    this.logger.warn(`Deleting organization level: ${levelId}`);

    const repository = await this.getRepository();

    await repository.delete(levelId);
  }

  /**
   * Soft delete organization level (set isActive = false)
   * Note: This is different from base class softDelete which sets deletedAt
   */
  async deactivateLevel(levelId: string): Promise<void> {
    this.logger.debug(`Deactivating organization level: ${levelId}`);

    await this.deactivate(levelId);
  }
}
