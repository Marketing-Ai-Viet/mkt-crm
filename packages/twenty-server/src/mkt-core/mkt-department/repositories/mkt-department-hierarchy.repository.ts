import { Injectable, Logger } from '@nestjs/common';

import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES } from 'src/mkt-core/mkt-department/constants/relationship-type.constants';
import {
  DEPARTMENT_MESSAGES,
  MKT_DEPARTMENT_HIERARCHY_LOG_CONTEXT,
} from 'src/mkt-core/mkt-department/messages';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department-hierarchy.workspace-entity';

// Relations for hierarchy entity
const HIERARCHY_PARENT_RELATION = ['parentDepartment'] as const;
const HIERARCHY_CHILD_RELATION = ['childDepartment'] as const;

/**
 * MktDepartmentHierarchyRepository - Data access layer for Department Hierarchy entity
 *
 * Responsibilities:
 * - Database operations for MktDepartmentHierarchy entity
 * - Query building with parent/child relations
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktDepartmentHierarchyRepository {
  private readonly logger = new Logger(
    `${MKT_DEPARTMENT_HIERARCHY_LOG_CONTEXT}:Repository`,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get repository for specific workspace
   */
  async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktDepartmentHierarchyWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new Error(DEPARTMENT_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktDepartmentHierarchyWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find hierarchy by ID
   */
  async findById(
    workspaceId: string,
    hierarchyId: string,
  ): Promise<MktDepartmentHierarchyWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id: hierarchyId } });
  }

  /**
   * Find parent hierarchy for a child department
   * Trả về hierarchy entry mà department này là child
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

    // Xử lý relationship types
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
   * Trả về các hierarchy entries mà department này là parent
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
  async findAll(
    workspaceId: string,
    options?: {
      isActive?: boolean;
      relationshipTypes?: string[];
    },
  ): Promise<MktDepartmentHierarchyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const where: FindOptionsWhere<MktDepartmentHierarchyWorkspaceEntity> = {};

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options?.relationshipTypes && options.relationshipTypes.length > 0) {
      where.relationshipType =
        options.relationshipTypes as unknown as typeof where.relationshipType;
    }

    return repository.find({ where });
  }

  /**
   * Find hierarchy by child department ID
   */
  async findByChildDepartmentId(
    workspaceId: string,
    childDepartmentId: string,
  ): Promise<MktDepartmentHierarchyWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { childDepartmentId } });
  }

  /**
   * Find hierarchies by level
   */
  async findByLevel(
    workspaceId: string,
    level: number,
    isActive = true,
  ): Promise<MktDepartmentHierarchyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { hierarchyLevel: level, isActive },
    });
  }

  /**
   * Count hierarchies
   */
  async count(
    workspaceId: string,
    where?: FindOptionsWhere<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }

  /**
   * Get max hierarchy level
   */
  async getMaxLevel(workspaceId: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('h')
      .select('MAX(h.hierarchyLevel)', 'maxDepth')
      .getRawOne();

    return parseInt(result?.maxDepth || '0');
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

    return parseFloat(result?.avgDepth || '0');
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new hierarchy
   */
  async create(
    workspaceId: string,
    data: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<MktDepartmentHierarchyWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);
    const hierarchy = repository.create(data);

    return repository.save(hierarchy);
  }

  /**
   * Create hierarchy (using scoped workspace context)
   * Dùng cho các service không cần truyền workspaceId
   */
  async createWithContext(
    data: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<MktDepartmentHierarchyWorkspaceEntity> {
    const repository = await this.getRepository();
    const hierarchy = repository.create(data);

    return repository.save(hierarchy);
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update hierarchy by ID
   */
  async update(
    workspaceId: string,
    hierarchyId: string,
    data: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(hierarchyId, data);
  }

  /**
   * Update hierarchy by child department ID
   */
  async updateByChildDepartmentId(
    workspaceId: string,
    childDepartmentId: string,
    data: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const hierarchy = await repository.findOne({
      where: { childDepartmentId },
    });

    if (hierarchy) {
      await repository.update(hierarchy.id, data);
    }
  }

  /**
   * Update hierarchy (using scoped workspace context)
   */
  async updateWithContext(
    childDepartmentId: string,
    data: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<void> {
    const repository = await this.getRepository();
    const hierarchy = await repository.findOne({
      where: { childDepartmentId },
    });

    if (hierarchy) {
      await repository.update(hierarchy.id, data);
    }
  }

  /**
   * Update and return the updated hierarchy
   */
  async updateAndReturn(
    workspaceId: string,
    hierarchyId: string,
    data: Partial<MktDepartmentHierarchyWorkspaceEntity>,
  ): Promise<MktDepartmentHierarchyWorkspaceEntity | null> {
    await this.update(workspaceId, hierarchyId, data);

    return this.findById(workspaceId, hierarchyId);
  }
}
