import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { TwentyORMManager } from 'src/engine/twenty-orm/twenty-orm.manager';
import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MktDepartmentAncestryWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department-ancestry.workspace-entity';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department-hierarchy.workspace-entity';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department.workspace-entity';

/**
 * Ancestry cache TTL in seconds (1 hour)
 */
const ANCESTRY_CACHE_TTL_SECONDS = 3600;

/**
 * Staleness threshold in milliseconds (5 minutes)
 */
const STALENESS_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Cache key prefix for ancestry data
 */
const ANCESTRY_CACHE_KEY_PREFIX = 'rbac:dept:ancestors:';

/**
 * Ancestor data with distance
 */
export type AncestorData = {
  ancestorId: string;
  distance: number;
  departmentCode?: string;
  departmentName?: string;
};

/**
 * Ancestry staleness result
 */
export type AncestryStaleResult = {
  stale: boolean;
  ageMs: number;
  computedAt?: Date;
};

/**
 * Rebuild result
 */
export type RebuildResult = {
  departmentId: string;
  ancestorsCount: number;
  durationMs: number;
};

/**
 * Full rebuild result
 */
export type FullRebuildResult = {
  totalDepartments: number;
  totalAncestryRecords: number;
  durationMs: number;
  errors: Array<{ departmentId: string; error: string }>;
};

/**
 * Department Ancestry Service
 *
 * Manages materialized department ancestry for RBAC hierarchy checks.
 *
 * Features:
 * - Event-driven ancestry rebuild on hierarchy changes
 * - Fast O(1) ancestry lookups via cache
 * - Stale cache fallback (serve stale + async rebuild)
 * - Staleness monitoring for SLA compliance
 *
 * Cache Contract:
 * - Key: rbac:dept:ancestors:{deptId}
 * - Value: JSON array of ancestor IDs with distances
 * - TTL: 1 hour
 * - Refresh: On department.hierarchy.changed event
 *
 * SLA:
 * - Ancestry data should not be stale > 5 minutes
 * - Alert metric: ancestry_stale_warning
 */
@Injectable()
export class DepartmentAncestryService {
  private readonly logger = new Logger(DepartmentAncestryService.name);

  constructor(
    private readonly twentyORMManager: TwentyORMManager,
    @InjectCacheStorage(CacheStorageNamespace.MktDepartment)
    private readonly cacheStorageService: CacheStorageService,
  ) {}

  // ==================== Event Handlers ====================

  /**
   * Handle department hierarchy change event
   * Triggers ancestry rebuild for affected departments
   */
  @OnEvent('department.hierarchy.changed')
  async onHierarchyChanged(event: {
    workspaceId: string;
    departmentId: string;
    parentDepartmentId?: string;
    changeType: 'created' | 'updated' | 'deleted';
  }): Promise<void> {
    this.logger.log(
      `Hierarchy changed: ${event.changeType} for department ${event.departmentId}`,
    );

    try {
      // Rebuild ancestry for affected department and its subtree
      await this.rebuildAncestryForSubtree(event.departmentId);

      // Clear cache
      await this.clearAncestryCache(event.departmentId);

      if (event.parentDepartmentId) {
        await this.clearAncestryCache(event.parentDepartmentId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to rebuild ancestry for department ${event.departmentId}: ${error}`,
      );
    }
  }

  /**
   * Handle department created event
   */
  @OnEvent('department.created')
  async onDepartmentCreated(event: {
    workspaceId: string;
    departmentId: string;
    parentDepartmentId?: string;
  }): Promise<void> {
    await this.onHierarchyChanged({
      ...event,
      changeType: 'created',
    });
  }

  /**
   * Handle department deleted event
   */
  @OnEvent('department.deleted')
  async onDepartmentDeleted(event: {
    workspaceId: string;
    departmentId: string;
  }): Promise<void> {
    // Remove all ancestry records for this department
    await this.deleteAncestryRecords(event.departmentId);
    await this.clearAncestryCache(event.departmentId);
  }

  // ==================== Public Methods ====================

  /**
   * Get ancestors with fallback to recomputation
   *
   * Strategy:
   * 1. Check cache
   * 2. If miss, query materialized table
   * 3. If table is stale, serve stale + async rebuild
   */
  async getAncestorsWithFallback(
    departmentId: string,
  ): Promise<AncestorData[]> {
    // Try cache first
    const cached = await this.getAncestorsFromCache(departmentId);

    if (cached) {
      return cached;
    }

    // Query materialized table
    const ancestors = await this.getAncestorsFromTable(departmentId);

    // Check staleness
    const staleness = await this.checkAncestryAge(departmentId);

    if (staleness.stale) {
      // Serve stale data but trigger async rebuild
      this.logger.warn(
        `Ancestry data stale for ${departmentId}, age: ${staleness.ageMs}ms`,
      );
      void this.rebuildAncestryForDepartment(departmentId);
    }

    // Cache the result
    await this.cacheAncestors(departmentId, ancestors);

    return ancestors;
  }

  /**
   * Get ancestors (IDs only) for quick lookups
   */
  async getAncestorIds(departmentId: string): Promise<string[]> {
    const ancestors = await this.getAncestorsWithFallback(departmentId);

    return ancestors.map((a) => a.ancestorId);
  }

  /**
   * Check if departmentA is an ancestor of departmentB
   */
  async isAncestor(
    potentialAncestorId: string,
    departmentId: string,
  ): Promise<boolean> {
    const ancestors = await this.getAncestorIds(departmentId);

    return ancestors.includes(potentialAncestorId);
  }

  /**
   * Get distance between two departments (if one is ancestor of other)
   */
  async getDistance(
    ancestorId: string,
    descendantId: string,
  ): Promise<number | null> {
    const ancestors = await this.getAncestorsWithFallback(descendantId);
    const found = ancestors.find((a) => a.ancestorId === ancestorId);

    return found?.distance ?? null;
  }

  /**
   * Check ancestry age for staleness monitoring
   */
  async checkAncestryAge(departmentId: string): Promise<AncestryStaleResult> {
    const repository = await this.getAncestryRepository();

    // Get most recent ancestry record for this department
    const latestRecord = await repository.findOne({
      where: { departmentId },
      order: { computedAt: 'DESC' },
    });

    if (!latestRecord) {
      return {
        stale: true,
        ageMs: Infinity,
      };
    }

    const now = DateTimeUtils.now();
    const computedAt = DateTimeUtils.fromDate(latestRecord.computedAt);
    const ageMs = DateTimeUtils.diffInMillis(computedAt, now);

    return {
      stale: ageMs > STALENESS_THRESHOLD_MS,
      ageMs,
      computedAt: latestRecord.computedAt,
    };
  }

  /**
   * Rebuild ancestry for a single department
   */
  async rebuildAncestryForDepartment(
    departmentId: string,
  ): Promise<RebuildResult> {
    const startTime = DateTimeUtils.now();

    const repository = await this.getAncestryRepository();
    const hierarchyRepository = await this.getHierarchyRepository();

    // Delete existing ancestry records for this department
    await repository.delete({ departmentId });

    // Compute ancestors by traversing hierarchy
    const ancestors = await this.computeAncestors(
      departmentId,
      hierarchyRepository,
    );

    // Insert new ancestry records
    const now = DateTimeUtils.toDateRequired(DateTimeUtils.now());
    const records = ancestors.map((a) => ({
      departmentId,
      ancestorId: a.ancestorId,
      distance: a.distance,
      computedAt: now,
    }));

    if (records.length > 0) {
      await repository.save(records);
    }

    // Clear and update cache
    await this.clearAncestryCache(departmentId);
    await this.cacheAncestors(departmentId, ancestors);

    const durationMs = DateTimeUtils.diffInMillis(
      startTime,
      DateTimeUtils.now(),
    );

    this.logger.debug(
      `Rebuilt ancestry for ${departmentId}: ${ancestors.length} ancestors in ${durationMs}ms`,
    );

    return {
      departmentId,
      ancestorsCount: ancestors.length,
      durationMs,
    };
  }

  /**
   * Rebuild ancestry for department and all its descendants
   */
  async rebuildAncestryForSubtree(
    departmentId: string,
  ): Promise<RebuildResult[]> {
    const results: RebuildResult[] = [];

    // Rebuild for this department
    const result = await this.rebuildAncestryForDepartment(departmentId);

    results.push(result);

    // Get all descendants and rebuild their ancestry
    const descendants = await this.getDescendantIds(departmentId);

    for (const descendantId of descendants) {
      try {
        const descendantResult =
          await this.rebuildAncestryForDepartment(descendantId);

        results.push(descendantResult);
      } catch (error) {
        this.logger.error(
          `Failed to rebuild ancestry for descendant ${descendantId}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * Full rebuild of all ancestry data
   * Use during deployment or data repair
   */
  async rebuildAllAncestry(): Promise<FullRebuildResult> {
    const startTime = DateTimeUtils.now();
    const errors: Array<{ departmentId: string; error: string }> = [];

    const departmentRepository = await this.getDepartmentRepository();
    const ancestryRepository = await this.getAncestryRepository();

    // Get all departments
    const departments = await departmentRepository.find({
      select: ['id'],
    });

    // Clear all existing ancestry records
    await ancestryRepository.delete({});

    let totalRecords = 0;

    // Rebuild for each department
    for (const dept of departments) {
      try {
        const result = await this.rebuildAncestryForDepartment(dept.id);

        totalRecords += result.ancestorsCount;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        errors.push({ departmentId: dept.id, error: errorMessage });
      }
    }

    const durationMs = DateTimeUtils.diffInMillis(
      startTime,
      DateTimeUtils.now(),
    );

    this.logger.log(
      `Full ancestry rebuild complete: ${departments.length} departments, ${totalRecords} records, ${durationMs}ms`,
    );

    return {
      totalDepartments: departments.length,
      totalAncestryRecords: totalRecords,
      durationMs,
      errors,
    };
  }

  // ==================== Private Methods ====================

  /**
   * Get ancestry repository
   */
  private async getAncestryRepository() {
    return this.twentyORMManager.getRepository<MktDepartmentAncestryWorkspaceEntity>(
      'mktDepartmentAncestry',
    );
  }

  /**
   * Get hierarchy repository
   */
  private async getHierarchyRepository() {
    return this.twentyORMManager.getRepository<MktDepartmentHierarchyWorkspaceEntity>(
      'mktDepartmentHierarchy',
    );
  }

  /**
   * Get department repository
   */
  private async getDepartmentRepository() {
    return this.twentyORMManager.getRepository<MktDepartmentWorkspaceEntity>(
      'mktDepartment',
    );
  }

  /**
   * Get ancestors from cache
   */
  private async getAncestorsFromCache(
    departmentId: string,
  ): Promise<AncestorData[] | null> {
    try {
      const cacheKey = `${ANCESTRY_CACHE_KEY_PREFIX}${departmentId}`;
      const cached =
        await this.cacheStorageService.get<AncestorData[]>(cacheKey);

      return cached ?? null;
    } catch (error) {
      this.logger.debug(`Cache miss for ancestry ${departmentId}: ${error}`);

      return null;
    }
  }

  /**
   * Get ancestors from materialized table
   */
  private async getAncestorsFromTable(
    departmentId: string,
  ): Promise<AncestorData[]> {
    const repository = await this.getAncestryRepository();

    const records = await repository.find({
      where: { departmentId },
      order: { distance: 'ASC' },
    });

    return records.map((r) => ({
      ancestorId: r.ancestorId,
      distance: r.distance,
    }));
  }

  /**
   * Cache ancestors
   */
  private async cacheAncestors(
    departmentId: string,
    ancestors: AncestorData[],
  ): Promise<void> {
    try {
      const cacheKey = `${ANCESTRY_CACHE_KEY_PREFIX}${departmentId}`;

      await this.cacheStorageService.set<AncestorData[]>(
        cacheKey,
        ancestors,
        ANCESTRY_CACHE_TTL_SECONDS * 1000, // Convert to milliseconds
      );
    } catch (error) {
      this.logger.debug(
        `Failed to cache ancestry for ${departmentId}: ${error}`,
      );
    }
  }

  /**
   * Clear ancestry cache
   */
  private async clearAncestryCache(departmentId: string): Promise<void> {
    try {
      const cacheKey = `${ANCESTRY_CACHE_KEY_PREFIX}${departmentId}`;

      await this.cacheStorageService.del(cacheKey);
    } catch (error) {
      this.logger.debug(
        `Failed to clear ancestry cache for ${departmentId}: ${error}`,
      );
    }
  }

  /**
   * Delete ancestry records for a department
   */
  private async deleteAncestryRecords(departmentId: string): Promise<void> {
    const repository = await this.getAncestryRepository();

    // Delete where this department is descendant
    await repository.delete({ departmentId });

    // Delete where this department is ancestor
    await repository.delete({ ancestorId: departmentId });
  }

  /**
   * Compute ancestors by traversing hierarchy
   */
  private async computeAncestors(
    departmentId: string,
    hierarchyRepository: Awaited<
      ReturnType<typeof this.getHierarchyRepository>
    >,
  ): Promise<AncestorData[]> {
    const ancestors: AncestorData[] = [];
    let currentId = departmentId;
    let distance = 0;
    const visited = new Set<string>();

    // Traverse up the hierarchy
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      // Find parent
      const parentHierarchy = await hierarchyRepository.findOne({
        where: { childDepartmentId: currentId },
        relations: ['parentDepartment'],
      });

      if (!parentHierarchy?.parentDepartmentId) {
        break;
      }

      distance++;

      ancestors.push({
        ancestorId: parentHierarchy.parentDepartmentId,
        distance,
        departmentCode: parentHierarchy.parentDepartment?.departmentCode,
        departmentName: parentHierarchy.parentDepartment?.departmentName,
      });

      currentId = parentHierarchy.parentDepartmentId;
    }

    return ancestors;
  }

  /**
   * Get all descendant IDs for a department
   */
  private async getDescendantIds(departmentId: string): Promise<string[]> {
    const hierarchyRepository = await this.getHierarchyRepository();
    const descendants: string[] = [];
    const queue: string[] = [departmentId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (!currentId || visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      // Find children
      const children = await hierarchyRepository.find({
        where: { parentDepartmentId: currentId },
        select: ['childDepartmentId'],
      });

      for (const child of children) {
        if (child.childDepartmentId && !visited.has(child.childDepartmentId)) {
          descendants.push(child.childDepartmentId);
          queue.push(child.childDepartmentId);
        }
      }
    }

    return descendants;
  }
}
