import { Injectable, Logger } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktOrganizationLevelWorkspaceEntity } from 'src/mkt-core/mkt-organization-level/workspace-entity/mkt-organization-level.workspace-entity';
import { WorkspaceMemberMktEntity } from 'src/mkt-core/mkt-entities-extends/workspace-member.mkt-entity';

/**
 * Type định nghĩa dữ liệu tạo organization level
 */
type CreateOrganizationLevelData = Partial<MktOrganizationLevelWorkspaceEntity>;

/**
 * Type định nghĩa dữ liệu cập nhật organization level
 */
type UpdateOrganizationLevelData = Partial<MktOrganizationLevelWorkspaceEntity>;

/**
 * Type định nghĩa options cho find operations
 */
type FindOrganizationLevelOptions = {
  includeInactive?: boolean;
  orderBy?: 'hierarchyLevel' | 'displayOrder' | 'createdAt';
  orderDirection?: 'ASC' | 'DESC';
};

/**
 * MktOrganizationLevelRepository - Data access layer cho Organization Level entity
 *
 * Responsibilities:
 * - Database operations cho MktOrganizationLevel entity
 * - Query building và execution
 * - Thread-safe workspace context handling
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - Validation (handled by Service layer và Hooks)
 */
@Injectable()
export class MktOrganizationLevelRepository {
  private readonly logger = new Logger('MktOrganizationLevel:Repository');

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get repository cho specific workspace
   */
  async getRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktOrganizationLevelWorkspaceEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktOrganizationLevelWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get workspace member repository
   */
  async getWorkspaceMemberRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<WorkspaceMemberMktEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      'workspaceMember',
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find organization level by ID
   */
  async findById(
    workspaceId: string,
    levelId: string,
  ): Promise<MktOrganizationLevelWorkspaceEntity | null> {
    this.logger.debug(`Finding organization level by ID: ${levelId}`);

    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id: levelId } });
  }

  /**
   * Find organization level by code
   */
  async findByCode(
    workspaceId: string,
    levelCode: string,
  ): Promise<MktOrganizationLevelWorkspaceEntity | null> {
    this.logger.debug(`Finding organization level by code: ${levelCode}`);

    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { levelCode } });
  }

  /**
   * Find all organization levels
   */
  async findAll(
    workspaceId: string,
    options?: FindOrganizationLevelOptions,
  ): Promise<MktOrganizationLevelWorkspaceEntity[]> {
    this.logger.debug('Finding all organization levels');

    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    hierarchyLevel: number,
  ): Promise<MktOrganizationLevelWorkspaceEntity[]> {
    this.logger.debug(
      `Finding organization levels by hierarchy level: ${hierarchyLevel}`,
    );

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { hierarchyLevel },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Find organization levels by multiple hierarchy levels
   */
  async findByHierarchyLevels(
    workspaceId: string,
    hierarchyLevels: number[],
  ): Promise<MktOrganizationLevelWorkspaceEntity[]> {
    if (hierarchyLevels.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { hierarchyLevel: In(hierarchyLevels) },
      order: { hierarchyLevel: 'ASC', displayOrder: 'ASC' },
    });
  }

  /**
   * Find organization levels by parent ID
   */
  async findByParentId(
    workspaceId: string,
    parentLevelId: string,
  ): Promise<MktOrganizationLevelWorkspaceEntity[]> {
    this.logger.debug(
      `Finding organization levels by parent ID: ${parentLevelId}`,
    );

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { parentLevelId },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Find root organization levels (level 1 or no parent)
   */
  async findRootLevels(
    workspaceId: string,
  ): Promise<MktOrganizationLevelWorkspaceEntity[]> {
    this.logger.debug('Finding root organization levels');

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { hierarchyLevel: 1 },
      order: { displayOrder: 'ASC' },
    });
  }

  /**
   * Find active organization levels
   */
  async findActive(
    workspaceId: string,
  ): Promise<MktOrganizationLevelWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      order: { hierarchyLevel: 'ASC', displayOrder: 'ASC' },
    });
  }

  /**
   * Check if organization level exists
   */
  async exists(workspaceId: string, levelId: string): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    return repository.existsBy({ id: levelId });
  }

  /**
   * Check if level code exists
   */
  async existsByCode(
    workspaceId: string,
    levelCode: string,
    excludeId?: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const existing = await repository.findOne({
      where: { levelCode },
      select: ['id'],
    });

    if (!existing) {
      return false;
    }

    // Nếu excludeId được cung cấp, kiểm tra xem có phải là cùng record không
    if (excludeId && existing.id === excludeId) {
      return false;
    }

    return true;
  }

  /**
   * Count organization levels
   */
  async count(
    workspaceId: string,
    where?: FindOptionsWhere<MktOrganizationLevelWorkspaceEntity>,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }

  /**
   * Count active organization levels
   */
  async countActive(workspaceId: string): Promise<number> {
    return this.count(workspaceId, { isActive: true });
  }

  /**
   * Count child levels
   */
  async countChildren(
    workspaceId: string,
    parentLevelId: string,
  ): Promise<number> {
    return this.count(workspaceId, { parentLevelId });
  }

  // ============================================
  // EMPLOYEE STATISTICS
  // ============================================

  /**
   * Count employees at a specific level
   */
  async countEmployeesAtLevel(
    workspaceId: string,
    levelId: string,
  ): Promise<number> {
    try {
      const memberRepository =
        await this.getWorkspaceMemberRepository(workspaceId);

      return memberRepository.count({
        where: { organizationLevelId: levelId },
      });
    } catch (error) {
      this.logger.warn(
        `Could not count employees at level ${levelId}: ${error.message}`,
      );

      return 0;
    }
  }

  /**
   * Get employee counts for multiple levels
   * Single query with GROUP BY to avoid N+1 problem
   */
  async getEmployeeCountsByLevels(
    workspaceId: string,
    levelIds: string[],
  ): Promise<Map<string, number>> {
    if (levelIds.length === 0) {
      return new Map();
    }

    try {
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
        `Could not get employee counts by levels: ${error.message}`,
      );

      return new Map();
    }
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new organization level
   */
  async create(
    workspaceId: string,
    data: CreateOrganizationLevelData,
  ): Promise<MktOrganizationLevelWorkspaceEntity> {
    this.logger.debug(`Creating organization level: ${data.levelCode}`);

    const repository = await this.getRepository(workspaceId);
    const level = repository.create(data);

    return repository.save(level);
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update organization level by ID
   */
  async update(
    workspaceId: string,
    levelId: string,
    data: UpdateOrganizationLevelData,
  ): Promise<void> {
    this.logger.debug(`Updating organization level: ${levelId}`);

    const repository = await this.getRepository(workspaceId);

    await repository.update(levelId, data);
  }

  /**
   * Update and return the updated organization level
   */
  async updateAndReturn(
    workspaceId: string,
    levelId: string,
    data: UpdateOrganizationLevelData,
  ): Promise<MktOrganizationLevelWorkspaceEntity | null> {
    await this.update(workspaceId, levelId, data);

    return this.findById(workspaceId, levelId);
  }

  /**
   * Update display order for multiple levels
   */
  async updateDisplayOrders(
    workspaceId: string,
    levelOrders: Array<{ levelId: string; displayOrder: number }>,
  ): Promise<void> {
    this.logger.debug(
      `Updating display orders for ${levelOrders.length} levels`,
    );

    const repository = await this.getRepository(workspaceId);

    for (const { levelId, displayOrder } of levelOrders) {
      await repository.update(levelId, { displayOrder });
    }
  }

  /**
   * Activate organization level
   */
  async activate(workspaceId: string, levelId: string): Promise<void> {
    await this.update(workspaceId, levelId, { isActive: true });
  }

  /**
   * Deactivate organization level
   */
  async deactivate(workspaceId: string, levelId: string): Promise<void> {
    await this.update(workspaceId, levelId, { isActive: false });
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete organization level by ID
   */
  async delete(workspaceId: string, levelId: string): Promise<void> {
    this.logger.warn(`Deleting organization level: ${levelId}`);

    const repository = await this.getRepository(workspaceId);

    await repository.delete(levelId);
  }

  /**
   * Soft delete organization level (set isActive = false)
   */
  async softDelete(workspaceId: string, levelId: string): Promise<void> {
    this.logger.debug(`Soft deleting organization level: ${levelId}`);

    await this.deactivate(workspaceId, levelId);
  }
}
