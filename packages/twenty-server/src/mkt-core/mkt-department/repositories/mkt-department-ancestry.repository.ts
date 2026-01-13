import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { In, IsNull } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { REPOSITORY_MESSAGES } from 'src/mkt-core/common/messages';
import { MktDepartmentAncestryWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department-ancestry.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktDepartmentAncestryRepository - Data access layer for Department Ancestry entity
 *
 * Responsibilities:
 * - Database operations for MktDepartmentAncestry entity
 * - Manage materialized ancestry data for RBAC hierarchy checks
 * - Query building and execution for ancestor/descendant lookups
 * - Thread-safe workspace context handling
 *
 * Key features:
 * - O(1) ancestor lookup via pre-computed relationships
 * - Distance-based hierarchy queries
 * - Staleness detection via computedAt timestamp
 */
@Injectable()
export class MktDepartmentAncestryRepository {
  private readonly logger = new Logger('MktDepartmentAncestry:Repository');

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
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktDepartmentAncestryWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException(
        REPOSITORY_MESSAGES.ERROR.WORKSPACE_NOT_FOUND,
      );
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktDepartmentAncestryWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find ancestry record by ID
   */
  async findById(
    workspaceId: string,
    id: string,
  ): Promise<MktDepartmentAncestryWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  /**
   * Find all ancestors of a department
   * Returns ancestors ordered by distance (closest first)
   */
  async findAncestors(
    workspaceId: string,
    departmentId: string,
  ): Promise<MktDepartmentAncestryWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        departmentId,
        deletedAt: IsNull(),
      },
      order: { distance: 'ASC' },
    });
  }

  /**
   * Find all ancestor IDs of a department
   * Lightweight operation for permission checks
   */
  async findAncestorIds(
    workspaceId: string,
    departmentId: string,
  ): Promise<string[]> {
    const repository = await this.getRepository(workspaceId);

    const results = await repository
      .createQueryBuilder('ancestry')
      .select('ancestry.ancestorId', 'ancestorId')
      .where('ancestry.departmentId = :departmentId', { departmentId })
      .andWhere('ancestry.deletedAt IS NULL')
      .orderBy('ancestry.distance', 'ASC')
      .getRawMany<{ ancestorId: string }>();

    return results.map((r) => r.ancestorId);
  }

  /**
   * Find all descendants of a department
   * Returns descendants ordered by distance (closest first)
   */
  async findDescendants(
    workspaceId: string,
    ancestorId: string,
  ): Promise<MktDepartmentAncestryWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        ancestorId,
        deletedAt: IsNull(),
      },
      order: { distance: 'ASC' },
    });
  }

  /**
   * Find all descendant IDs of a department
   * Lightweight operation for permission checks
   */
  async findDescendantIds(
    workspaceId: string,
    ancestorId: string,
  ): Promise<string[]> {
    const repository = await this.getRepository(workspaceId);

    const results = await repository
      .createQueryBuilder('ancestry')
      .select('ancestry.departmentId', 'departmentId')
      .where('ancestry.ancestorId = :ancestorId', { ancestorId })
      .andWhere('ancestry.deletedAt IS NULL')
      .orderBy('ancestry.distance', 'ASC')
      .getRawMany<{ departmentId: string }>();

    return results.map((r) => r.departmentId);
  }

  /**
   * Check if departmentA is an ancestor of departmentB
   * O(1) lookup using pre-computed ancestry
   */
  async isAncestor(
    workspaceId: string,
    ancestorId: string,
    descendantId: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    return repository.existsBy({
      departmentId: descendantId,
      ancestorId,
    });
  }

  /**
   * Get distance between two departments
   * Returns null if no relationship exists
   */
  async getDistance(
    workspaceId: string,
    ancestorId: string,
    descendantId: string,
  ): Promise<number | null> {
    const repository = await this.getRepository(workspaceId);

    const record = await repository.findOne({
      where: {
        departmentId: descendantId,
        ancestorId,
        deletedAt: IsNull(),
      },
      select: ['distance'],
    });

    return record?.distance ?? null;
  }

  /**
   * Find ancestors at a specific distance
   * e.g., distance=1 returns direct parent
   */
  async findAncestorsAtDistance(
    workspaceId: string,
    departmentId: string,
    distance: number,
  ): Promise<MktDepartmentAncestryWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        departmentId,
        distance,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find direct parent (distance = 1)
   */
  async findDirectParent(
    workspaceId: string,
    departmentId: string,
  ): Promise<string | null> {
    const repository = await this.getRepository(workspaceId);

    const record = await repository.findOne({
      where: {
        departmentId,
        distance: 1,
        deletedAt: IsNull(),
      },
      select: ['ancestorId'],
    });

    return record?.ancestorId ?? null;
  }

  /**
   * Find direct children (descendants at distance = 1)
   */
  async findDirectChildrenIds(
    workspaceId: string,
    parentId: string,
  ): Promise<string[]> {
    const repository = await this.getRepository(workspaceId);

    const results = await repository
      .createQueryBuilder('ancestry')
      .select('ancestry.departmentId', 'departmentId')
      .where('ancestry.ancestorId = :parentId', { parentId })
      .andWhere('ancestry.distance = 1')
      .andWhere('ancestry.deletedAt IS NULL')
      .getRawMany<{ departmentId: string }>();

    return results.map((r) => r.departmentId);
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new ancestry record
   */
  async create(
    workspaceId: string,
    data: Partial<MktDepartmentAncestryWorkspaceEntity>,
  ): Promise<MktDepartmentAncestryWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const record = repository.create({
      ...data,
      computedAt: data.computedAt ?? DateTimeUtils.now().toJSDate(),
    });

    return repository.save(record);
  }

  /**
   * Bulk create ancestry records
   * Used when refreshing ancestry for a department
   */
  async bulkCreate(
    workspaceId: string,
    records: Array<Partial<MktDepartmentAncestryWorkspaceEntity>>,
  ): Promise<MktDepartmentAncestryWorkspaceEntity[]> {
    if (records.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);
    const now = DateTimeUtils.now().toJSDate();

    const entities = records.map((data) =>
      repository.create({
        ...data,
        computedAt: data.computedAt ?? now,
      }),
    );

    return repository.save(entities);
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update ancestry record
   */
  async update(
    workspaceId: string,
    id: string,
    data: Partial<MktDepartmentAncestryWorkspaceEntity>,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(id, data);
  }

  /**
   * Refresh ancestry for a department
   * Deletes existing records and creates new ones
   */
  async refreshForDepartment(
    workspaceId: string,
    departmentId: string,
    newAncestors: Array<{ ancestorId: string; distance: number }>,
  ): Promise<MktDepartmentAncestryWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    // Delete existing ancestry records for this department
    await repository.softDelete({ departmentId });

    // Create new records
    const now = DateTimeUtils.now().toJSDate();
    const records = newAncestors.map((ancestor) =>
      repository.create({
        departmentId,
        ancestorId: ancestor.ancestorId,
        distance: ancestor.distance,
        computedAt: now,
      }),
    );

    const saved = await repository.save(records);

    this.logger.log(
      `Refreshed ancestry for department ${departmentId}: ${saved.length} records`,
    );

    return saved;
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete ancestry record
   */
  async softDelete(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.softDelete(id);
  }

  /**
   * Remove all ancestry records for a department (as descendant)
   */
  async removeAllForDepartment(
    workspaceId: string,
    departmentId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository.softDelete({ departmentId });

    this.logger.log(
      `Removed ${result.affected ?? 0} ancestry records for department ${departmentId}`,
    );

    return result.affected ?? 0;
  }

  /**
   * Remove all ancestry records where department is an ancestor
   */
  async removeAllWhereAncestor(
    workspaceId: string,
    ancestorId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository.softDelete({ ancestorId });

    this.logger.log(
      `Removed ${result.affected ?? 0} ancestry records where ${ancestorId} is ancestor`,
    );

    return result.affected ?? 0;
  }

  // ============================================
  // COUNT & AGGREGATION OPERATIONS
  // ============================================

  /**
   * Count ancestors for a department
   */
  async countAncestors(
    workspaceId: string,
    departmentId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: {
        departmentId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Count descendants for a department
   */
  async countDescendants(
    workspaceId: string,
    ancestorId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: {
        ancestorId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Get max depth of hierarchy under a department
   */
  async getMaxDepth(workspaceId: string, ancestorId: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('ancestry')
      .select('MAX(ancestry.distance)', 'maxDepth')
      .where('ancestry.ancestorId = :ancestorId', { ancestorId })
      .andWhere('ancestry.deletedAt IS NULL')
      .getRawOne<{ maxDepth: string }>();

    return parseInt(result?.maxDepth ?? '0', 10);
  }

  // ============================================
  // STALENESS DETECTION
  // ============================================

  /**
   * Check if ancestry data is stale for a department
   * @param maxAgeMinutes - Maximum age in minutes before considered stale
   */
  async isStale(
    workspaceId: string,
    departmentId: string,
    maxAgeMinutes = 5,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const record = await repository.findOne({
      where: {
        departmentId,
        deletedAt: IsNull(),
      },
      select: ['computedAt'],
      order: { computedAt: 'DESC' },
    });

    if (!record) {
      return true; // No records = stale
    }

    const ageInMinutes = DateTimeUtils.subtract(DateTimeUtils.now(), {
      minutes: maxAgeMinutes,
    });

    return (
      DateTimeUtils.toMillis(DateTimeUtils.fromDate(record.computedAt)) <
      DateTimeUtils.toMillis(ageInMinutes)
    );
  }

  /**
   * Find departments with stale ancestry data
   * @param maxAgeMinutes - Maximum age in minutes before considered stale
   */
  async findStale(workspaceId: string, maxAgeMinutes = 5): Promise<string[]> {
    const repository = await this.getRepository(workspaceId);

    const cutoffTime = DateTimeUtils.subtract(DateTimeUtils.now(), {
      minutes: maxAgeMinutes,
    }).toJSDate();

    const results = await repository
      .createQueryBuilder('ancestry')
      .select('DISTINCT ancestry.departmentId', 'departmentId')
      .where('ancestry.computedAt < :cutoffTime', { cutoffTime })
      .andWhere('ancestry.deletedAt IS NULL')
      .getRawMany<{ departmentId: string }>();

    return results.map((r) => r.departmentId);
  }

  // ============================================
  // BATCH OPERATIONS FOR RBAC
  // ============================================

  /**
   * Get all ancestor IDs for multiple departments in a single query
   * Returns a Map of departmentId -> ancestorIds[]
   */
  async findAncestorIdsForMany(
    workspaceId: string,
    departmentIds: string[],
  ): Promise<Map<string, string[]>> {
    if (departmentIds.length === 0) {
      return new Map();
    }

    const repository = await this.getRepository(workspaceId);

    const results = await repository.find({
      where: {
        departmentId: In(departmentIds),
        deletedAt: IsNull(),
      },
      select: ['departmentId', 'ancestorId'],
      order: { distance: 'ASC' },
    });

    const ancestorMap = new Map<string, string[]>();

    // Initialize all departments with empty arrays
    for (const deptId of departmentIds) {
      ancestorMap.set(deptId, []);
    }

    // Populate with results
    for (const record of results) {
      const ancestors = ancestorMap.get(record.departmentId) ?? [];

      ancestors.push(record.ancestorId);
      ancestorMap.set(record.departmentId, ancestors);
    }

    return ancestorMap;
  }

  /**
   * Get all descendant IDs for multiple departments in a single query
   * Returns a Map of ancestorId -> descendantIds[]
   */
  async findDescendantIdsForMany(
    workspaceId: string,
    ancestorIds: string[],
  ): Promise<Map<string, string[]>> {
    if (ancestorIds.length === 0) {
      return new Map();
    }

    const repository = await this.getRepository(workspaceId);

    const results = await repository.find({
      where: {
        ancestorId: In(ancestorIds),
        deletedAt: IsNull(),
      },
      select: ['departmentId', 'ancestorId'],
      order: { distance: 'ASC' },
    });

    const descendantMap = new Map<string, string[]>();

    // Initialize all ancestors with empty arrays
    for (const ancestorId of ancestorIds) {
      descendantMap.set(ancestorId, []);
    }

    // Populate with results
    for (const record of results) {
      const descendants = descendantMap.get(record.ancestorId) ?? [];

      descendants.push(record.departmentId);
      descendantMap.set(record.ancestorId, descendants);
    }

    return descendantMap;
  }
}
