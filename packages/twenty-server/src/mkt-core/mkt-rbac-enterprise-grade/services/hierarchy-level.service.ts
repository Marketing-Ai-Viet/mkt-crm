/**
 * Hierarchy Level Service
 * Dynamic hierarchy level management từ database
 * Thay thế hardcoded HIERARCHY_LEVELS constants
 */

import { Injectable, Logger, Optional } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import {
  RBAC_CACHE_KEYS,
  RBAC_CACHE_TTL,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

import { RbacCacheManagerService } from './rbac-cache-manager.service';

export type OrganizationLevel = {
  id: string;
  levelCode: string;
  levelName: string;
  levelNameEn: string;
  hierarchyLevel: number;
  displayOrder: number;
  isActive: boolean;
};

/**
 * Cached hierarchy levels per workspace
 */
type HierarchyLevelCache = {
  levels: OrganizationLevel[];
  levelMap: Map<string, OrganizationLevel>; // levelCode -> level
  hierarchyMap: Map<number, OrganizationLevel>; // hierarchyLevel -> level
  lastUpdated: Date;
};

@Injectable()
export class HierarchyLevelService {
  private readonly logger = new Logger(HierarchyLevelService.name);
  private readonly cache = new Map<string, HierarchyLevelCache>();
  private readonly CACHE_TTL_MS = 3600000; // 1 hour

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    @Optional() private readonly cacheManager?: RbacCacheManagerService,
  ) {}

  /**
   * Get organization level repository for workspace
   */
  private async getOrganizationLevelRepository(workspaceId: string) {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      'mktOrganizationLevel',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Load hierarchy levels from database with multi-layer caching
   * Layer 1: RbacCacheManager (shared Redis cache)
   * Layer 2: In-memory cache (instance-specific)
   * Layer 3: Database (fallback)
   */
  async getHierarchyLevels(
    workspaceId: string,
    forceRefresh = false,
  ): Promise<OrganizationLevel[]> {
    const cacheKey = `${RBAC_CACHE_KEYS.HIERARCHY_CACHE}:org-levels:${workspaceId}`;

    // Layer 1: Try RbacCacheManager (Redis) first
    if (!forceRefresh && this.cacheManager) {
      const cached = await this.cacheManager.get<OrganizationLevel[]>(cacheKey);

      if (cached) {
        this.logger.debug(
          `Cache HIT: Hierarchy levels for workspace ${workspaceId} (Redis)`,
        );

        // Update in-memory cache for faster subsequent access
        this.updateMemoryCache(workspaceId, cached);

        return cached;
      }
    }

    // Layer 2: Check in-memory cache
    if (!forceRefresh) {
      const memCached = this.cache.get(workspaceId);

      if (memCached) {
        const age = Date.now() - memCached.lastUpdated.getTime();

        if (age < this.CACHE_TTL_MS) {
          this.logger.debug(
            `Cache HIT: Hierarchy levels for workspace ${workspaceId} (Memory)`,
          );

          return memCached.levels;
        }
      }
    }

    // Layer 3: Load from database
    try {
      const repository = await this.getOrganizationLevelRepository(workspaceId);

      const levels = (await repository.find({
        where: { isActive: true },
        order: { hierarchyLevel: 'ASC' },
      })) as unknown as OrganizationLevel[];

      // Update both caches
      this.updateMemoryCache(workspaceId, levels);

      if (this.cacheManager) {
        // Use EXTENDED TTL for org levels (using centralized constant) - rarely changes
        await this.cacheManager.set(cacheKey, levels, RBAC_CACHE_TTL.EXTENDED);
      }

      this.logger.log(
        `Cache MISS: Loaded ${levels.length} hierarchy levels from DB for workspace ${workspaceId}`,
      );

      return levels;
    } catch (error) {
      this.logger.error(
        `Error loading hierarchy levels: ${error.message}`,
        error.stack,
      );

      // Return empty array if error
      return [];
    }
  }

  /**
   * Update in-memory cache with hierarchy levels
   */
  private updateMemoryCache(
    workspaceId: string,
    levels: OrganizationLevel[],
  ): void {
    const levelMap = new Map<string, OrganizationLevel>();
    const hierarchyMap = new Map<number, OrganizationLevel>();

    levels.forEach((level) => {
      levelMap.set(level.levelCode, level);
      hierarchyMap.set(level.hierarchyLevel, level);
    });

    this.cache.set(workspaceId, {
      levels,
      levelMap,
      hierarchyMap,
      lastUpdated: new Date(),
    });
  }

  /**
   * Get hierarchy level by code (e.g., 'MANAGER')
   */
  async getHierarchyLevelByCode(
    workspaceId: string,
    levelCode: string,
  ): Promise<OrganizationLevel | undefined> {
    const cached = this.cache.get(workspaceId);

    if (cached) {
      return cached.levelMap.get(levelCode);
    }

    // Load and cache
    await this.getHierarchyLevels(workspaceId);

    return this.cache.get(workspaceId)?.levelMap.get(levelCode);
  }

  /**
   * Get hierarchy level by numeric level (e.g., 1, 2, 3)
   */
  async getHierarchyLevelByNumber(
    workspaceId: string,
    hierarchyLevel: number,
  ): Promise<OrganizationLevel | undefined> {
    const cached = this.cache.get(workspaceId);

    if (cached) {
      return cached.hierarchyMap.get(hierarchyLevel);
    }

    // Load and cache
    await this.getHierarchyLevels(workspaceId);

    return this.cache.get(workspaceId)?.hierarchyMap.get(hierarchyLevel);
  }

  /**
   * Get minimum hierarchy level for action
   * Based on action risk level and category
   * With caching for computed results
   */
  async getMinimumHierarchyLevel(
    workspaceId: string,
    actionRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    actionCategory: string,
  ): Promise<number | undefined> {
    const cacheKey = `${RBAC_CACHE_KEYS.HIERARCHY_CACHE}:min-level:${workspaceId}:${actionRiskLevel}:${actionCategory}`;

    // Try cache first
    if (this.cacheManager) {
      const cached = await this.cacheManager.get<number>(cacheKey);

      if (cached !== null && cached !== undefined) {
        this.logger.debug(
          `Cache HIT: Min hierarchy level ${cached} for ${actionRiskLevel}/${actionCategory}`,
        );

        return cached;
      }
    }

    const levels = await this.getHierarchyLevels(workspaceId);

    if (levels.length === 0) {
      return undefined;
    }

    // Map risk levels to hierarchy requirements
    const riskLevelMap: Record<string, number> = {
      LOW: levels.length, // Lowest level (e.g., INTERN = 5)
      MEDIUM: Math.ceil(levels.length * 0.6), // Middle tier (e.g., STAFF = 4)
      HIGH: Math.ceil(levels.length * 0.4), // Upper tier (e.g., TEAM_LEAD = 3)
      CRITICAL: Math.min(2, levels.length), // Top tier (e.g., MANAGER = 2)
    };

    // Special cases for financial and system actions
    let minLevel: number;

    if (actionCategory === 'FINANCIAL' || actionCategory === 'SYSTEM') {
      minLevel = Math.min(2, levels.length); // Require top tier
    } else {
      minLevel = riskLevelMap[actionRiskLevel];
    }

    // Cache the computed result (using centralized TTL constant)
    if (this.cacheManager && minLevel !== undefined) {
      await this.cacheManager.set(
        cacheKey,
        minLevel,
        RBAC_CACHE_TTL.RESOURCE_META,
      );
    }

    this.logger.debug(
      `Cache MISS: Computed min hierarchy level ${minLevel} for ${actionRiskLevel}/${actionCategory}`,
    );

    return minLevel;
  }

  /**
   * Check if user has sufficient hierarchy level
   * Lower number = higher level (CEO = 1, Intern = 11)
   */
  hasMinimumHierarchyLevel(userLevel: number, requiredLevel: number): boolean {
    return userLevel <= requiredLevel;
  }

  /**
   * Invalidate cache for workspace (both Redis and in-memory)
   */
  async invalidateCache(workspaceId: string): Promise<void> {
    // Invalidate in-memory cache
    this.cache.delete(workspaceId);

    // Invalidate Redis cache using RbacCacheManager
    if (this.cacheManager) {
      const patterns = [
        `rbac:hierarchy:org-levels:${workspaceId}`,
        `rbac:hierarchy:min-level:${workspaceId}:*`,
      ];

      for (const pattern of patterns) {
        await this.cacheManager.invalidateByPattern(pattern);
      }
    }

    this.logger.log(
      `Cache invalidated for workspace ${workspaceId} (both Redis and in-memory)`,
    );
  }
}
