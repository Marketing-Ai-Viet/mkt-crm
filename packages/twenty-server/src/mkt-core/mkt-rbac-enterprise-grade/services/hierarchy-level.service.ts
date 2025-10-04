/**
 * Hierarchy Level Service
 * Dynamic hierarchy level management từ database
 * Thay thế hardcoded HIERARCHY_LEVELS constants
 */

import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';

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
   * Load hierarchy levels from database with caching
   */
  async getHierarchyLevels(
    workspaceId: string,
    forceRefresh = false,
  ): Promise<OrganizationLevel[]> {
    // Check cache
    if (!forceRefresh) {
      const cached = this.cache.get(workspaceId);

      if (cached) {
        const age = Date.now() - cached.lastUpdated.getTime();

        if (age < this.CACHE_TTL_MS) {
          this.logger.debug(
            `Using cached hierarchy levels for workspace ${workspaceId}`,
          );

          return cached.levels;
        }
      }
    }

    // Load from database
    try {
      const repository = await this.getOrganizationLevelRepository(workspaceId);

      const levels = (await repository.find({
        where: { isActive: true },
        order: { hierarchyLevel: 'ASC' },
      })) as unknown as OrganizationLevel[];

      // Build maps
      const levelMap = new Map<string, OrganizationLevel>();
      const hierarchyMap = new Map<number, OrganizationLevel>();

      levels.forEach((level) => {
        levelMap.set(level.levelCode, level);
        hierarchyMap.set(level.hierarchyLevel, level);
      });

      // Update cache
      this.cache.set(workspaceId, {
        levels,
        levelMap,
        hierarchyMap,
        lastUpdated: new Date(),
      });

      this.logger.log(
        `Loaded ${levels.length} hierarchy levels for workspace ${workspaceId}`,
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
   */
  async getMinimumHierarchyLevel(
    workspaceId: string,
    actionRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    actionCategory: string,
  ): Promise<number | undefined> {
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
    if (actionCategory === 'FINANCIAL' || actionCategory === 'SYSTEM') {
      return Math.min(2, levels.length); // Require top tier
    }

    return riskLevelMap[actionRiskLevel];
  }

  /**
   * Check if user has sufficient hierarchy level
   * Lower number = higher level (CEO = 1, Intern = 11)
   */
  hasMinimumHierarchyLevel(userLevel: number, requiredLevel: number): boolean {
    return userLevel <= requiredLevel;
  }

  /**
   * Invalidate cache for workspace
   */
  invalidateCache(workspaceId: string): void {
    this.cache.delete(workspaceId);
    this.logger.log(`Cache invalidated for workspace ${workspaceId}`);
  }
}
