import { Inject, Injectable, Logger } from '@nestjs/common';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import {
  CASBIN_CACHE_KEYS,
  CASBIN_CACHE_TTL,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/constants/cache-keys.constant';
import {
  CasbinRbacConfig,
  rbacConfig,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config';

import { CasbinEnforcerService } from './casbin-enforcer.service';

/**
 * Role inheritance graph node
 */
type RoleNode = {
  role: string;
  parents: string[];
  children: string[];
};

/**
 * Role inheritance graph structure
 */
type RoleInheritanceGraph = {
  nodes: Map<string, RoleNode>;
  version: number;
  buildAt: number;
};

/**
 * Serializable graph for cache storage
 */
type SerializedGraph = {
  nodes: Array<[string, RoleNode]>;
  version: number;
  buildAt: number;
};

/**
 * Role Inheritance Cache Service
 *
 * Precomputes and caches role inheritance graph for fast permission checks.
 *
 * Features:
 * - Build inheritance graph from Casbin policies
 * - Cache graph per workspace (24h TTL)
 * - Cache effective roles per user (15min TTL)
 * - Auto-invalidation on policy changes
 * - Efficient ancestor/descendant lookups
 *
 * Usage:
 * ```typescript
 * // Get all effective roles for user (includes inherited)
 * const roles = await service.getEffectiveRoles(userId, workspaceId);
 *
 * // Invalidate on policy change
 * await service.invalidateWorkspace(workspaceId);
 * ```
 */
@Injectable()
export class RoleInheritanceCacheService {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:RoleInheritanceCache`,
  );

  // In-memory cache for hot workspaces
  private readonly localCache = new Map<string, RoleInheritanceGraph>();
  private readonly localCacheTtlMs = 5 * 60 * 1000; // 5 minutes
  private readonly localCacheTimestamps = new Map<string, number>();

  constructor(
    @Inject(rbacConfig.KEY)
    private readonly config: CasbinRbacConfig,
    @InjectCacheStorage(CacheStorageNamespace.EngineWorkspace)
    private readonly cacheStorage: CacheStorageService,
    private readonly enforcerService: CasbinEnforcerService,
  ) {}

  /**
   * Get effective roles for user (includes inherited roles)
   *
   * Uses multi-tier caching:
   * 1. Local in-memory cache (5min)
   * 2. Redis cache (15min)
   * 3. Compute from inheritance graph
   */
  async getEffectiveRoles(
    userId: string,
    workspaceId: string,
  ): Promise<string[]> {
    const cacheKey = CASBIN_CACHE_KEYS.USER_EFFECTIVE_ROLES(
      workspaceId,
      userId,
    );

    // Check Redis cache
    const cached = await this.cacheStorage.get<string[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get user's direct roles from enforcer
    const directRoles = await this.enforcerService.getUserRoles(
      userId,
      workspaceId,
    );

    // Get inheritance graph
    const graph = await this.getOrBuildGraph(workspaceId);

    // Compute effective roles (direct + inherited)
    const effectiveRoles = this.computeEffectiveRoles(directRoles, graph);

    // Cache result
    await this.cacheStorage.set(
      cacheKey,
      effectiveRoles,
      CASBIN_CACHE_TTL.USER_EFFECTIVE_ROLES * 1000,
    );

    return effectiveRoles;
  }

  /**
   * Get role ancestors (parent roles)
   */
  async getRoleAncestors(role: string, workspaceId: string): Promise<string[]> {
    const graph = await this.getOrBuildGraph(workspaceId);
    const ancestors = new Set<string>();

    this.collectAncestors(role, graph, ancestors);

    return Array.from(ancestors);
  }

  /**
   * Get role descendants (child roles)
   */
  async getRoleDescendants(
    role: string,
    workspaceId: string,
  ): Promise<string[]> {
    const graph = await this.getOrBuildGraph(workspaceId);
    const descendants = new Set<string>();

    this.collectDescendants(role, graph, descendants);

    return Array.from(descendants);
  }

  /**
   * Invalidate cache for workspace
   *
   * Called when policies change (e.g., role assignments, policy sync)
   */
  async invalidateWorkspace(workspaceId: string): Promise<void> {
    // Clear local cache
    this.localCache.delete(workspaceId);
    this.localCacheTimestamps.delete(workspaceId);

    // Clear Redis cache
    const graphKey = CASBIN_CACHE_KEYS.ROLE_INHERITANCE(workspaceId);

    await this.cacheStorage.del(graphKey);

    this.logger.debug(
      `Invalidated role inheritance cache for workspace: ${workspaceId}`,
    );
  }

  /**
   * Invalidate user's effective roles cache
   */
  async invalidateUser(userId: string, workspaceId: string): Promise<void> {
    const cacheKey = CASBIN_CACHE_KEYS.USER_EFFECTIVE_ROLES(
      workspaceId,
      userId,
    );

    await this.cacheStorage.del(cacheKey);

    this.logger.debug(
      `Invalidated effective roles cache for user: ${userId} in workspace: ${workspaceId}`,
    );
  }

  /**
   * Warm up cache for workspace
   */
  async warmCache(workspaceId: string): Promise<void> {
    await this.getOrBuildGraph(workspaceId);
    this.logger.debug(
      `Warmed up role inheritance cache for workspace: ${workspaceId}`,
    );
  }

  /**
   * Get cache stats
   */
  getStats(): {
    localCacheSize: number;
    workspaces: string[];
  } {
    return {
      localCacheSize: this.localCache.size,
      workspaces: Array.from(this.localCache.keys()),
    };
  }

  // ==================== Private Methods ====================

  /**
   * Get or build inheritance graph for workspace
   */
  private async getOrBuildGraph(
    workspaceId: string,
  ): Promise<RoleInheritanceGraph> {
    // Check local cache
    const localCached = this.getFromLocalCache(workspaceId);

    if (localCached) {
      return localCached;
    }

    // Check Redis cache
    const cacheKey = CASBIN_CACHE_KEYS.ROLE_INHERITANCE(workspaceId);
    const redisCached = await this.cacheStorage.get<SerializedGraph>(cacheKey);

    if (redisCached) {
      const graph = this.deserializeGraph(redisCached);

      this.setLocalCache(workspaceId, graph);

      return graph;
    }

    // Build graph
    const graph = await this.buildGraph(workspaceId);

    // Cache in Redis
    const serialized = this.serializeGraph(graph);

    await this.cacheStorage.set(
      cacheKey,
      serialized,
      CASBIN_CACHE_TTL.ROLE_INHERITANCE * 1000,
    );

    // Cache locally
    this.setLocalCache(workspaceId, graph);

    return graph;
  }

  /**
   * Build inheritance graph from Casbin policies
   */
  private async buildGraph(workspaceId: string): Promise<RoleInheritanceGraph> {
    const startTime = Date.now();

    const enforcer = await this.enforcerService.getEnforcer(workspaceId);

    // Get all grouping policies (g policies = role assignments)
    // Format: [subject, role] e.g., ["user:123", "role:admin"]
    const allGroupingPolicies = await enforcer.getGroupingPolicy();

    // Build graph nodes
    const nodes = new Map<string, RoleNode>();

    // Process grouping policies to build inheritance relationships
    for (const policy of allGroupingPolicies) {
      const [subject, role] = policy;

      // Only process role-to-role inheritance (roles inheriting from other roles)
      // Skip user-to-role assignments (handled separately)
      if (subject.startsWith('role:') && role.startsWith('role:')) {
        const childRole = subject.replace('role:', '');
        const parentRole = role.replace('role:', '');

        // Ensure child node exists
        if (!nodes.has(childRole)) {
          nodes.set(childRole, {
            role: childRole,
            parents: [],
            children: [],
          });
        }

        // Ensure parent node exists
        if (!nodes.has(parentRole)) {
          nodes.set(parentRole, {
            role: parentRole,
            parents: [],
            children: [],
          });
        }

        // Add relationships
        const childNode = nodes.get(childRole)!;
        const parentNode = nodes.get(parentRole)!;

        if (!childNode.parents.includes(parentRole)) {
          childNode.parents.push(parentRole);
        }

        if (!parentNode.children.includes(childRole)) {
          parentNode.children.push(childRole);
        }
      } else if (role.startsWith('role:')) {
        // Add role node even if it has no parent relationships
        const roleName = role.replace('role:', '');

        if (!nodes.has(roleName)) {
          nodes.set(roleName, {
            role: roleName,
            parents: [],
            children: [],
          });
        }
      }
    }

    const graph: RoleInheritanceGraph = {
      nodes,
      version: Date.now(),
      buildAt: Date.now(),
    };

    const buildTimeMs = Date.now() - startTime;

    this.logger.debug(
      `Built inheritance graph for workspace ${workspaceId}: ${nodes.size} roles, ${buildTimeMs}ms`,
    );

    return graph;
  }

  /**
   * Compute effective roles by traversing inheritance graph
   */
  private computeEffectiveRoles(
    directRoles: string[],
    graph: RoleInheritanceGraph,
  ): string[] {
    const effectiveRoles = new Set<string>(directRoles);

    // For each direct role, collect all ancestors (inherited roles)
    for (const role of directRoles) {
      this.collectAncestors(role, graph, effectiveRoles);
    }

    return Array.from(effectiveRoles);
  }

  /**
   * Recursively collect ancestor roles
   */
  private collectAncestors(
    role: string,
    graph: RoleInheritanceGraph,
    ancestors: Set<string>,
    visited: Set<string> = new Set(),
  ): void {
    // Prevent cycles
    if (visited.has(role)) {
      return;
    }
    visited.add(role);

    const node = graph.nodes.get(role);

    if (!node) {
      return;
    }

    for (const parent of node.parents) {
      ancestors.add(parent);
      this.collectAncestors(parent, graph, ancestors, visited);
    }
  }

  /**
   * Recursively collect descendant roles
   */
  private collectDescendants(
    role: string,
    graph: RoleInheritanceGraph,
    descendants: Set<string>,
    visited: Set<string> = new Set(),
  ): void {
    // Prevent cycles
    if (visited.has(role)) {
      return;
    }
    visited.add(role);

    const node = graph.nodes.get(role);

    if (!node) {
      return;
    }

    for (const child of node.children) {
      descendants.add(child);
      this.collectDescendants(child, graph, descendants, visited);
    }
  }

  /**
   * Get from local cache if valid
   */
  private getFromLocalCache(
    workspaceId: string,
  ): RoleInheritanceGraph | undefined {
    const timestamp = this.localCacheTimestamps.get(workspaceId);

    if (!timestamp || Date.now() - timestamp > this.localCacheTtlMs) {
      this.localCache.delete(workspaceId);
      this.localCacheTimestamps.delete(workspaceId);

      return undefined;
    }

    return this.localCache.get(workspaceId);
  }

  /**
   * Set local cache
   */
  private setLocalCache(
    workspaceId: string,
    graph: RoleInheritanceGraph,
  ): void {
    this.localCache.set(workspaceId, graph);
    this.localCacheTimestamps.set(workspaceId, Date.now());
  }

  /**
   * Serialize graph for Redis storage
   */
  private serializeGraph(graph: RoleInheritanceGraph): SerializedGraph {
    return {
      nodes: Array.from(graph.nodes.entries()),
      version: graph.version,
      buildAt: graph.buildAt,
    };
  }

  /**
   * Deserialize graph from Redis storage
   */
  private deserializeGraph(serialized: SerializedGraph): RoleInheritanceGraph {
    return {
      nodes: new Map(serialized.nodes),
      version: serialized.version,
      buildAt: serialized.buildAt,
    };
  }
}
