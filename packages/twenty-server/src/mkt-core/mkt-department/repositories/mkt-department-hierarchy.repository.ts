import { Injectable } from '@nestjs/common';

import omit from 'lodash.omit';
import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES } from 'src/mkt-core/mkt-department/constants/relationship-type.constants';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department-hierarchy.workspace-entity';

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
    childDepartmentId: string,
    relationshipTypes?: string[],
  ): Promise<MktDepartmentHierarchyWorkspaceEntity | null> {
    const repository = await this.getRepository();

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
    parentDepartmentId: string,
    options?: {
      includeInactive?: boolean;
      relationshipTypes?: string[];
      sortBy?: string;
      sortDirection?: 'ASC' | 'DESC';
    },
  ): Promise<MktDepartmentHierarchyWorkspaceEntity[]> {
    const repository = await this.getRepository();

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
  async findAllWithFilters(options?: {
    isActive?: boolean;
    relationshipTypes?: string[];
  }): Promise<MktDepartmentHierarchyWorkspaceEntity[]> {
    const where: FindOptionsWhere<MktDepartmentHierarchyWorkspaceEntity> = {};

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options?.relationshipTypes && options.relationshipTypes.length > 0) {
      where.relationshipType =
        options.relationshipTypes as unknown as typeof where.relationshipType;
    }

    return this.findMany(where);
  }

  /**
   * Find hierarchy by child department ID
   */
  async findByChildDepartmentId(
    childDepartmentId: string,
  ): Promise<MktDepartmentHierarchyWorkspaceEntity | null> {
    return this.findOne({ childDepartmentId });
  }

  /**
   * Find hierarchies by level
   */
  async findByLevel(
    level: number,
    isActive = true,
  ): Promise<MktDepartmentHierarchyWorkspaceEntity[]> {
    return this.findMany({ hierarchyLevel: level, isActive });
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get max hierarchy level
   */
  async getMaxLevel(): Promise<number> {
    const repository = await this.getRepository();

    const result = await repository
      .createQueryBuilder('h')
      .select('MAX(h.hierarchyLevel)', 'maxDepth')
      .getRawOne();

    return parseInt(result?.maxDepth ?? '0', 10);
  }

  /**
   * Get average hierarchy level
   */
  async getAverageLevel(): Promise<number> {
    const repository = await this.getRepository();

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
    childDepartmentId: string,
    data: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<void> {
    const hierarchy = await this.findOne({ childDepartmentId });

    if (hierarchy) {
      await this.update(hierarchy.id, data);
    }
  }

  /**
   * Update hierarchy (using scoped workspace context)
   */
  async updateWithContext(
    childDepartmentId: string,
    data: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<void> {
    const hierarchy = await this.findOne({
      childDepartmentId,
    });

    if (hierarchy) {
      const repository = await this.getRepository();

      // Strip relation fields to prevent TypeORM type errors
      const updateData = omit(data, [
        ...HIERARCHY_PARENT_RELATION,
        ...HIERARCHY_CHILD_RELATION,
      ]);

      await repository.update(hierarchy.id, updateData);
    }
  }
}
