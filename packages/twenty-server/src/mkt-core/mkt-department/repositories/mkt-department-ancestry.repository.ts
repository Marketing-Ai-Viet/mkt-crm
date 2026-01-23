import { Injectable } from '@nestjs/common';

import { In, IsNull } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktDepartmentAncestryWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department-ancestry.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktDepartmentAncestryRepository - Data access layer for Department Ancestry entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for RBAC hierarchy checks:
 * - O(1) ancestor lookup via pre-computed relationships
 * - Distance-based hierarchy queries
 * - Staleness detection via computedAt timestamp
 */
@Injectable()
export class MktDepartmentAncestryRepository extends BaseWorkspaceRepository<MktDepartmentAncestryWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktDepartmentAncestryWorkspaceEntity,
      MktDepartmentAncestryRepository.name,
    );
  }

  // ============================================
  // ANCESTOR OPERATIONS
  // ============================================

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
   * Find ancestors at a specific distance
   * e.g., distance=1 returns direct parent
   */
  async findAncestorsAtDistance(
    departmentId: string,
    distance: number,
  ): Promise<MktDepartmentAncestryWorkspaceEntity[]> {
    return this.findMany({
      departmentId,
      distance,
      deletedAt: IsNull(),
    });
  }

  /**
   * Find direct parent (distance = 1)
   */
  async findDirectParent(departmentId: string): Promise<string | null> {
    const record = await this.findOne({
      departmentId,
      distance: 1,
      deletedAt: IsNull(),
    });

    return record?.ancestorId ?? null;
  }

  // ============================================
  // DESCENDANT OPERATIONS
  // ============================================

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
  // HIERARCHY CHECK OPERATIONS
  // ============================================

  /**
   * Check if departmentA is an ancestor of departmentB
   * O(1) lookup using pre-computed ancestry
   */
  async isAncestor(ancestorId: string, descendantId: string): Promise<boolean> {
    return this.existsWhere({
      departmentId: descendantId,
      ancestorId,
    });
  }

  /**
   * Get distance between two departments
   * Returns null if no relationship exists
   */
  async getDistance(
    ancestorId: string,
    descendantId: string,
  ): Promise<number | null> {
    const record = await this.findOne({
      departmentId: descendantId,
      ancestorId,
      deletedAt: IsNull(),
    });

    return record?.distance ?? null;
  }

  // ============================================
  // SPECIALIZED CREATE OPERATIONS
  // ============================================

  /**
   * Create ancestry record with computedAt timestamp
   */
  async createAncestry(
    data: Partial<MktDepartmentAncestryWorkspaceEntity>,
  ): Promise<MktDepartmentAncestryWorkspaceEntity> {
    return this.create({
      ...data,
      computedAt: data.computedAt ?? DateTimeUtils.now().toJSDate(),
    });
  }

  /**
   * Bulk create ancestry records
   */
  async bulkCreateAncestries(
    records: Array<Partial<MktDepartmentAncestryWorkspaceEntity>>,
  ): Promise<MktDepartmentAncestryWorkspaceEntity[]> {
    if (records.length === 0) {
      return [];
    }

    const now = DateTimeUtils.now().toJSDate();

    const items = records.map((data) => ({
      ...data,
      computedAt: data.computedAt ?? now,
    }));

    return this.bulkCreate(items);
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
  // SPECIALIZED DELETE OPERATIONS
  // ============================================

  /**
   * Remove all ancestry records for a department (as descendant)
   */
  async removeAllForDepartment(departmentId: string): Promise<number> {
    const affected = await this.softDeleteWhere({ departmentId });

    this.logger.log(
      `Removed ${affected} ancestry records for department ${departmentId}`,
    );

    return affected;
  }

  /**
   * Remove all ancestry records where department is an ancestor
   */
  async removeAllWhereAncestor(ancestorId: string): Promise<number> {
    const affected = await this.softDeleteWhere({ ancestorId });

    this.logger.log(
      `Removed ${affected} ancestry records where ${ancestorId} is ancestor`,
    );

    return affected;
  }

  // ============================================
  // COUNT & AGGREGATION OPERATIONS
  // ============================================

  /**
   * Count ancestors for a department
   */
  async countAncestors(departmentId: string): Promise<number> {
    return this.count({
      departmentId,
      deletedAt: IsNull(),
    });
  }

  /**
   * Count descendants for a department
   */
  async countDescendants(ancestorId: string): Promise<number> {
    return this.count({
      ancestorId,
      deletedAt: IsNull(),
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

    const cutoffTime = DateTimeUtils.subtract(DateTimeUtils.now(), {
      minutes: maxAgeMinutes,
    });

    return (
      DateTimeUtils.toMillis(DateTimeUtils.fromDate(record.computedAt)) <
      DateTimeUtils.toMillis(cutoffTime)
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
