import { Injectable, Logger } from '@nestjs/common';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { DepartmentService } from 'src/mkt-core/mkt-department/services/department.service';
import {
  RBAC_CACHE_KEYS,
  RBAC_CACHE_TTL_MS,
} from 'src/mkt-core/infrastructure/redis/constants/rbac';
import { RBAC_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  LocalCacheEntry,
  RbacDepartmentNode,
  SerializedDepartmentTree,
  WorkspaceDepartmentTree,
} from 'src/mkt-core/mkt-department/types';

/**
 * Cache TTL constants - imported from centralized location
 */
const TREE_CACHE_TTL_MS = RBAC_CACHE_TTL_MS.DEPT_TREE;
const LOCAL_CACHE_TTL_MS = RBAC_CACHE_TTL_MS.LOCAL_CACHE;

/**
 * Department Tree Service for RBAC
 *
 * Provides optimized department hierarchy operations for RBAC:
 * - Fast ancestor/descendant ID lookups
 * - Cached department tree structure
 * - Multi-tier caching (in-memory + Redis)
 *
 * Usage:
 * ```typescript
 * // Get ancestor IDs for permission filtering
 * const ancestorIds = await service.getAncestorIds(deptId, workspaceId);
 *
 * // Get descendant IDs for data scoping
 * const descendantIds = await service.getDescendantIds(deptId, workspaceId);
 *
 * // Get full tree for workspace
 * const tree = await service.getDepartmentTree(workspaceId);
 * ```
 */
@Injectable()
export class DepartmentTreeService {
  private readonly logger = new Logger(`${RBAC_LOG_CONTEXT}:DepartmentTree`);

  // Local caches for hot data
  private readonly ancestorCache = new Map<string, LocalCacheEntry<string[]>>();
  private readonly descendantCache = new Map<
    string,
    LocalCacheEntry<string[]>
  >();
  private readonly treeCache = new Map<
    string,
    LocalCacheEntry<WorkspaceDepartmentTree>
  >();

  constructor(
    private readonly departmentService: DepartmentService,
    @InjectCacheStorage(CacheStorageNamespace.MktDepartment)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  // ============================================
  // Ancestor Methods
  // ============================================

  /**
   * Get ancestor department IDs
   *
   * @param departmentId - Department ID
   * @param workspaceId - Workspace ID
   * @returns Array of ancestor department IDs (root first)
   */
  async getAncestorIds(
    departmentId: string,
    workspaceId: string,
  ): Promise<string[]> {
    const cacheKey = RBAC_CACHE_KEYS.DEPT_ANCESTORS(departmentId);

    // Check local cache
    const localResult = this.getFromLocalCache(this.ancestorCache, cacheKey);

    if (localResult !== null) {
      return localResult;
    }

    // Check Redis cache
    const redisResult = await this.cacheStorage.get<string[]>(cacheKey);

    if (redisResult) {
      this.setLocalCache(this.ancestorCache, cacheKey, redisResult);

      return redisResult;
    }

    // Compute from DepartmentService
    const ancestors = await this.departmentService.getDepartmentAncestors(
      workspaceId,
      departmentId,
    );

    const ancestorIds = ancestors.map((a) => a.id);

    // Cache result
    await this.cacheStorage.set(cacheKey, ancestorIds, TREE_CACHE_TTL_MS);
    this.setLocalCache(this.ancestorCache, cacheKey, ancestorIds);

    return ancestorIds;
  }

  /**
   * Check if departmentA is an ancestor of departmentB
   */
  async isAncestor(
    potentialAncestorId: string,
    departmentId: string,
    workspaceId: string,
  ): Promise<boolean> {
    const ancestors = await this.getAncestorIds(departmentId, workspaceId);

    return ancestors.includes(potentialAncestorId);
  }

  // ============================================
  // Descendant Methods
  // ============================================

  /**
   * Get descendant department IDs
   *
   * @param departmentId - Department ID
   * @param workspaceId - Workspace ID
   * @returns Array of descendant department IDs
   */
  async getDescendantIds(
    departmentId: string,
    workspaceId: string,
  ): Promise<string[]> {
    const cacheKey = RBAC_CACHE_KEYS.DEPT_DESCENDANTS(departmentId);

    // Check local cache
    const localResult = this.getFromLocalCache(this.descendantCache, cacheKey);

    if (localResult !== null) {
      return localResult;
    }

    // Check Redis cache
    const redisResult = await this.cacheStorage.get<string[]>(cacheKey);

    if (redisResult) {
      this.setLocalCache(this.descendantCache, cacheKey, redisResult);

      return redisResult;
    }

    // Compute from DepartmentService
    const descendants = await this.departmentService.getDepartmentDescendants(
      workspaceId,
      departmentId,
    );

    const descendantIds = descendants.map((d) => d.id);

    // Cache result
    await this.cacheStorage.set(cacheKey, descendantIds, TREE_CACHE_TTL_MS);
    this.setLocalCache(this.descendantCache, cacheKey, descendantIds);

    return descendantIds;
  }

  /**
   * Check if departmentA is a descendant of departmentB
   */
  async isDescendant(
    potentialDescendantId: string,
    departmentId: string,
    workspaceId: string,
  ): Promise<boolean> {
    const descendants = await this.getDescendantIds(departmentId, workspaceId);

    return descendants.includes(potentialDescendantId);
  }

  /**
   * Get all related department IDs (ancestors + descendants + self)
   */
  async getAllRelatedIds(
    departmentId: string,
    workspaceId: string,
  ): Promise<{
    ancestors: string[];
    descendants: string[];
    all: string[];
  }> {
    const [ancestors, descendants] = await Promise.all([
      this.getAncestorIds(departmentId, workspaceId),
      this.getDescendantIds(departmentId, workspaceId),
    ]);

    const all = [...new Set([...ancestors, departmentId, ...descendants])];

    return {
      ancestors,
      descendants,
      all,
    };
  }

  // ============================================
  // Tree Methods
  // ============================================

  /**
   * Get department tree for workspace
   *
   * @param workspaceId - Workspace ID
   * @returns Complete department tree structure
   */
  async getDepartmentTree(
    workspaceId: string,
  ): Promise<WorkspaceDepartmentTree> {
    const cacheKey = RBAC_CACHE_KEYS.DEPT_TREE(workspaceId);

    // Check local cache
    const localResult = this.getFromLocalCache(this.treeCache, cacheKey);

    if (localResult !== null) {
      return localResult;
    }

    // Check Redis cache
    const redisResult =
      await this.cacheStorage.get<SerializedDepartmentTree>(cacheKey);

    if (redisResult) {
      const tree = this.deserializeTree(redisResult);

      this.setLocalCache(this.treeCache, cacheKey, tree);

      return tree;
    }

    // Build tree from DepartmentService
    const tree = await this.buildTree(workspaceId);

    // Cache result
    const serialized = this.serializeTree(tree);

    await this.cacheStorage.set(cacheKey, serialized, TREE_CACHE_TTL_MS);
    this.setLocalCache(this.treeCache, cacheKey, tree);

    return tree;
  }

  /**
   * Get department node by ID
   */
  async getDepartmentNode(
    departmentId: string,
    workspaceId: string,
  ): Promise<RbacDepartmentNode | null> {
    const tree = await this.getDepartmentTree(workspaceId);

    return tree.flatMap.get(departmentId) ?? null;
  }

  // ============================================
  // Cache Invalidation
  // ============================================

  /**
   * Invalidate cache for a specific department
   */
  async invalidateDepartment(departmentId: string): Promise<void> {
    const ancestorKey = RBAC_CACHE_KEYS.DEPT_ANCESTORS(departmentId);
    const descendantKey = RBAC_CACHE_KEYS.DEPT_DESCENDANTS(departmentId);

    // Clear local caches
    this.ancestorCache.delete(ancestorKey);
    this.descendantCache.delete(descendantKey);

    // Clear Redis caches
    await Promise.all([
      this.cacheStorage.del(ancestorKey),
      this.cacheStorage.del(descendantKey),
    ]);

    this.logger.debug(`Invalidated cache for department: ${departmentId}`);
  }

  /**
   * Invalidate tree cache for workspace
   */
  async invalidateWorkspaceTree(workspaceId: string): Promise<void> {
    const treeKey = RBAC_CACHE_KEYS.DEPT_TREE(workspaceId);

    // Clear local cache
    this.treeCache.delete(treeKey);

    // Clear Redis cache
    await this.cacheStorage.del(treeKey);

    // Clear all ancestor/descendant caches for this workspace
    await this.cacheStorage.flushByPattern('rbac:dept:ancestors:*');
    await this.cacheStorage.flushByPattern('rbac:dept:descendants:*');

    // Clear local caches
    this.ancestorCache.clear();
    this.descendantCache.clear();

    this.logger.debug(
      `Invalidated department tree cache for workspace: ${workspaceId}`,
    );
  }

  /**
   * Invalidate all department caches
   */
  async invalidateAll(): Promise<void> {
    // Clear all local caches
    this.ancestorCache.clear();
    this.descendantCache.clear();
    this.treeCache.clear();

    // Clear Redis caches
    await Promise.all([
      this.cacheStorage.flushByPattern('rbac:dept:ancestors:*'),
      this.cacheStorage.flushByPattern('rbac:dept:descendants:*'),
      this.cacheStorage.flushByPattern('rbac:dept:tree:*'),
    ]);

    this.logger.log('Invalidated all department tree caches');
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get cache statistics
   */
  getStats(): {
    localCacheSize: number;
    ancestorCacheSize: number;
    descendantCacheSize: number;
    treeCacheSize: number;
  } {
    return {
      localCacheSize:
        this.ancestorCache.size +
        this.descendantCache.size +
        this.treeCache.size,
      ancestorCacheSize: this.ancestorCache.size,
      descendantCacheSize: this.descendantCache.size,
      treeCacheSize: this.treeCache.size,
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Get current timestamp in milliseconds
   */
  private getCurrentTimestamp(): number {
    return DateTimeUtils.toMillis(DateTimeUtils.now());
  }

  /**
   * Get value from local cache if valid
   */
  private getFromLocalCache<T>(
    cache: Map<string, LocalCacheEntry<T>>,
    key: string,
  ): T | null {
    const entry = cache.get(key);

    if (!entry) {
      return null;
    }

    const currentTime = this.getCurrentTimestamp();
    const isExpired = currentTime - entry.timestamp > LOCAL_CACHE_TTL_MS;

    if (isExpired) {
      cache.delete(key);

      return null;
    }

    return entry.data;
  }

  /**
   * Set value in local cache
   */
  private setLocalCache<T>(
    cache: Map<string, LocalCacheEntry<T>>,
    key: string,
    data: T,
  ): void {
    cache.set(key, {
      data,
      timestamp: this.getCurrentTimestamp(),
    });

    // Cleanup if cache is too large
    if (cache.size > 5000) {
      this.cleanupOldestEntries(cache, 1000);
    }
  }

  /**
   * Cleanup oldest entries from cache
   */
  private cleanupOldestEntries<T>(
    cache: Map<string, LocalCacheEntry<T>>,
    count: number,
  ): void {
    const entries = Array.from(cache.entries());

    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    for (let i = 0; i < count && i < entries.length; i++) {
      cache.delete(entries[i][0]);
    }
  }

  /**
   * Build department tree from DepartmentService
   */
  private async buildTree(
    workspaceId: string,
  ): Promise<WorkspaceDepartmentTree> {
    const startTime = this.getCurrentTimestamp();

    // Get complete structure from DepartmentService
    const treeNodes =
      await this.departmentService.getCompleteDepartmentStructure(workspaceId);

    // Convert to RBAC format
    const roots: RbacDepartmentNode[] = [];
    const flatMap = new Map<string, RbacDepartmentNode>();

    for (const node of treeNodes) {
      const rbacNode = this.convertToRbacNode(node, flatMap);

      roots.push(rbacNode);
    }

    const buildDuration = this.getCurrentTimestamp() - startTime;

    this.logger.debug(
      `Built department tree for workspace ${workspaceId}: ${flatMap.size} departments in ${buildDuration}ms`,
    );

    return {
      roots,
      flatMap,
      buildAt: this.getCurrentTimestamp(),
      version: this.getCurrentTimestamp(),
    };
  }

  /**
   * Convert DepartmentTreeNode to RbacDepartmentNode
   */
  private convertToRbacNode(
    node: {
      id: string;
      departmentCode: string;
      departmentName: string;
      level: number;
      children?: Array<{
        id: string;
        departmentCode: string;
        departmentName: string;
        level: number;
        children?: unknown[];
      }>;
    },
    flatMap: Map<string, RbacDepartmentNode>,
  ): RbacDepartmentNode {
    const rbacNode: RbacDepartmentNode = {
      id: node.id,
      code: node.departmentCode,
      name: node.departmentName,
      level: node.level,
      children: [],
    };

    flatMap.set(node.id, rbacNode);

    if (node.children && node.children.length > 0) {
      rbacNode.children = node.children.map((child) =>
        this.convertToRbacNode(
          child as {
            id: string;
            departmentCode: string;
            departmentName: string;
            level: number;
            children?: Array<{
              id: string;
              departmentCode: string;
              departmentName: string;
              level: number;
              children?: unknown[];
            }>;
          },
          flatMap,
        ),
      );
    }

    return rbacNode;
  }

  /**
   * Serialize tree for Redis storage
   */
  private serializeTree(
    tree: WorkspaceDepartmentTree,
  ): SerializedDepartmentTree {
    return {
      roots: tree.roots,
      flatMapEntries: Array.from(tree.flatMap.entries()),
      buildAt: tree.buildAt,
      version: tree.version,
    };
  }

  /**
   * Deserialize tree from Redis storage
   */
  private deserializeTree(
    serialized: SerializedDepartmentTree,
  ): WorkspaceDepartmentTree {
    return {
      roots: serialized.roots,
      flatMap: new Map(serialized.flatMapEntries),
      buildAt: serialized.buildAt,
      version: serialized.version,
    };
  }
}
