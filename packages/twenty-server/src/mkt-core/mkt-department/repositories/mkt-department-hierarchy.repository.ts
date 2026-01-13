import { Injectable } from '@nestjs/common';

import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES } from 'src/mkt-core/mkt-department/constants/relationship-type.constants';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department-hierarchy.workspace-entity';

// Relations for hierarchy entity
const HIERARCHY_PARENT_RELATION = ['parentDepartment'] as const;
const HIERARCHY_CHILD_RELATION = ['childDepartment'] as const;

/**
 * MktDepartmentHierarchyRepository - Data access layer for Department Hierarchy entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for parent/child relationship queries.
 */
@Injectable()
export class MktDepartmentHierarchyRepository extends BaseWorkspaceRepository<MktDepartmentHierarchyWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktDepartmentHierarchyWorkspaceEntity,
      MktDepartmentHierarchyRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  /**
   * Find parent hierarchy for a child department
   * Returns hierarchy entry where this department is child
   */
  async findParentHierarchy(
    workspaceId: string,
    childDepartmentId: string,
    relationshipTypes?: string[],
  ): Promise<MktDepartmentHierarchyWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    const where: FindOptionsWhere<MktDepartmentHierarchyWorkspaceEntity> = {
      childDepartmentId,
      isActive: true,
    };

    // Handle relationship types
    if (relationshipTypes && relationshipTypes.length > 0) {
      if (!relationshipTypes.includes('any')) {
        where.relationshipType =
          relationshipTypes as unknown as typeof where.relationshipType;
      }
    } else {
      where.relationshipType =
        DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES.PARENT_CHILD;
    }

    return repository.findOne({
      where,
      relations: [...HIERARCHY_PARENT_RELATION],
    });
  }

  /**
   * Find children hierarchies for a parent department
   * Returns hierarchy entries where this department is parent
   */
  async findChildHierarchies(
    workspaceId: string,
    parentDepartmentId: string,
    options?: {
      includeInactive?: boolean;
      relationshipTypes?: string[];
      sortBy?: string;
      sortDirection?: 'ASC' | 'DESC';
    },
  ): Promise<MktDepartmentHierarchyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const {
      includeInactive = false,
      relationshipTypes,
      sortBy = 'displayOrder',
      sortDirection = 'ASC',
    } = options ?? {};

    const where: FindOptionsWhere<MktDepartmentHierarchyWorkspaceEntity> = {
      parentDepartmentId,
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    if (relationshipTypes && relationshipTypes.length > 0) {
      where.relationshipType =
        relationshipTypes as unknown as typeof where.relationshipType;
    }

    const order: FindOptionsOrder<MktDepartmentHierarchyWorkspaceEntity> = {};

    if (sortBy) {
      order[sortBy as keyof MktDepartmentHierarchyWorkspaceEntity] =
        sortDirection;
    }

    return repository.find({
      where,
      relations: [...HIERARCHY_CHILD_RELATION],
      order,
    });
  }

  /**
   * Find all hierarchies (with optional filters)
   */
  async findAllWithFilters(
    workspaceId: string,
    options?: {
      isActive?: boolean;
      relationshipTypes?: string[];
    },
  ): Promise<MktDepartmentHierarchyWorkspaceEntity[]> {
    const where: FindOptionsWhere<MktDepartmentHierarchyWorkspaceEntity> = {};

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options?.relationshipTypes && options.relationshipTypes.length > 0) {
      where.relationshipType =
        options.relationshipTypes as unknown as typeof where.relationshipType;
    }

    return this.findMany(workspaceId, where);
  }

  /**
   * Find hierarchy by child department ID
   */
  async findByChildDepartmentId(
    workspaceId: string,
    childDepartmentId: string,
  ): Promise<MktDepartmentHierarchyWorkspaceEntity | null> {
    return this.findOne(workspaceId, { childDepartmentId });
  }

  /**
   * Find hierarchies by level
   */
  async findByLevel(
    workspaceId: string,
    level: number,
    isActive = true,
  ): Promise<MktDepartmentHierarchyWorkspaceEntity[]> {
    return this.findMany(workspaceId, { hierarchyLevel: level, isActive });
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get max hierarchy level
   */
  async getMaxLevel(workspaceId: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('h')
      .select('MAX(h.hierarchyLevel)', 'maxDepth')
      .getRawOne();

    return parseInt(result?.maxDepth ?? '0', 10);
  }

  /**
   * Get average hierarchy level
   */
  async getAverageLevel(workspaceId: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('h')
      .select('AVG(h.hierarchyLevel)', 'avgDepth')
      .getRawOne();

    return parseFloat(result?.avgDepth ?? '0');
  }

  // ============================================
  // SPECIALIZED CREATE OPERATIONS
  // ============================================

  /**
   * Create hierarchy (using scoped workspace context)
   * Used by services that don't need to pass workspaceId
   */
  async createWithContext(
    data: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<MktDepartmentHierarchyWorkspaceEntity> {
    const repository = await this.getRepository();
    const hierarchy = repository.create(data);

    return repository.save(hierarchy);
  }

  // ============================================
  // SPECIALIZED UPDATE OPERATIONS
  // ============================================

  /**
   * Update hierarchy by child department ID
   */
  async updateByChildDepartmentId(
    workspaceId: string,
    childDepartmentId: string,
    data: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<void> {
    const hierarchy = await this.findOne(workspaceId, { childDepartmentId });

    if (hierarchy) {
      await this.update(workspaceId, hierarchy.id, data);
    }
  }

  /**
   * Update hierarchy (using scoped workspace context)
   */
  async updateWithContext(
    childDepartmentId: string,
    data: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<void> {
    const hierarchy = await this.findOne(undefined as unknown as string, {
      childDepartmentId,
    });

    if (hierarchy) {
      const repository = await this.getRepository();

      await repository.update(hierarchy.id, data);
    }
  }
}
