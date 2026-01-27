import { Injectable } from '@nestjs/common';

import omit from 'lodash.omit';
import {
  Equal,
  FindOptionsOrder,
  FindOptionsWhere,
  In,
  IsNull,
  Or,
} from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
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
   * Note: isActive NULL is treated as true (default active)
   */
  async findParentHierarchy(
    childDepartmentId: string,
    relationshipTypes?: string[],
  ): Promise<MktDepartmentHierarchyWorkspaceEntity | null> {
    const repository = await this.getRepository();

    const where: FindOptionsWhere<MktDepartmentHierarchyWorkspaceEntity> = {
      childDepartmentId,
      // Treat NULL as active (isActive = true OR isActive IS NULL)
      isActive: Or(Equal(true), IsNull()),
    };

    // Handle relationship types - use In() for array of enums
    if (relationshipTypes && relationshipTypes.length > 0) {
      if (!relationshipTypes.includes('any')) {
        where.relationshipType = In(
          relationshipTypes,
        ) as typeof where.relationshipType;
      }
    }

    return repository.findOne({
      where,
      relations: [...HIERARCHY_PARENT_RELATION],
    });
  }

  /**
   * Find children hierarchies for a parent department
   * Returns hierarchy entries where this department is parent
   * Note: isActive NULL is treated as true (default active)
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

    // Treat NULL as active (isActive = true OR isActive IS NULL)
    if (!includeInactive) {
      where.isActive = Or(Equal(true), IsNull());
    }

    // Use In() for array of relationship types
    if (relationshipTypes && relationshipTypes.length > 0) {
      where.relationshipType = In(
        relationshipTypes,
      ) as typeof where.relationshipType;
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
   * Note: isActive NULL is treated as true (default active)
   */
  async findAllWithFilters(options?: {
    isActive?: boolean;
    relationshipTypes?: string[];
  }): Promise<MktDepartmentHierarchyWorkspaceEntity[]> {
    const where: FindOptionsWhere<MktDepartmentHierarchyWorkspaceEntity> = {};

    // Handle isActive filter - treat NULL as true
    if (options?.isActive === true) {
      where.isActive = Or(Equal(true), IsNull());
    } else if (options?.isActive === false) {
      where.isActive = false;
    }

    // Use In() for array of relationship types
    if (options?.relationshipTypes && options.relationshipTypes.length > 0) {
      where.relationshipType = In(
        options.relationshipTypes,
      ) as typeof where.relationshipType;
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
   * @throws Error if hierarchy not found
   */
  async updateWithContext(
    childDepartmentId: string,
    data: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<{ updated: boolean; hierarchyId?: string }> {
    const hierarchy = await this.findOne({
      childDepartmentId,
    });

    if (!hierarchy) {
      return { updated: false };
    }

    const repository = await this.getRepository();

    // Strip relation fields to prevent TypeORM type errors
    const updateData = omit(data, [
      ...HIERARCHY_PARENT_RELATION,
      ...HIERARCHY_CHILD_RELATION,
    ]);

    await repository.update(hierarchy.id, updateData);

    return { updated: true, hierarchyId: hierarchy.id };
  }

  /**
   * Count active hierarchies (treating NULL as active)
   */
  async countActive(): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: {
        isActive: Or(Equal(true), IsNull()),
      },
    });
  }

  // ============================================
  // SPECIALIZED DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete hierarchy by ID (using scoped workspace context)
   * @returns true if deleted successfully, false if not found
   */
  async softDeleteWithContext(hierarchyId: string): Promise<boolean> {
    const hierarchy = await this.findById(hierarchyId);

    if (!hierarchy) {
      return false;
    }

    await this.softDelete(hierarchyId);

    return true;
  }

  /**
   * Soft delete hierarchy by child department ID
   * @returns true if deleted successfully, false if not found
   */
  async softDeleteByChildDepartmentId(
    childDepartmentId: string,
  ): Promise<boolean> {
    const hierarchy = await this.findOne({ childDepartmentId });

    if (!hierarchy) {
      return false;
    }

    await this.softDelete(hierarchy.id);

    return true;
  }
}
