/**
 * Hierarchy Resolution Domain Service
 *
 * Business logic for resolving user hierarchy levels and permissions inheritance
 */

import { Injectable, Logger } from '@nestjs/common';

import { HierarchyLevelService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/hierarchy-level.service';
import {
  MktPermissionTemplateRepository,
  MktUserPermissionTemplateRepository,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktPermissionTemplateWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

export type HierarchyResolutionInput = {
  workspaceMemberId: string;
  workspaceId: string;
};

export type UserHierarchyInfo = {
  hierarchyLevel: number;
  levelCode: string;
  levelName: string;
  isTopLevel: boolean;
  canManageLevels: number[];
  inheritedTemplateIds: string[];
};

export type HierarchyComparisonResult = {
  isHigher: boolean;
  isSame: boolean;
  isLower: boolean;
  levelDifference: number;
};

@Injectable()
export class HierarchyResolutionService {
  private readonly logger = new Logger(HierarchyResolutionService.name);

  constructor(
    private readonly hierarchyLevelService: HierarchyLevelService,
    private readonly permissionTemplateRepository: MktPermissionTemplateRepository,
    private readonly userPermissionTemplateRepository: MktUserPermissionTemplateRepository,
  ) {}

  /**
   * Get hierarchy information for a user
   */
  async getUserHierarchyInfo(
    input: HierarchyResolutionInput,
  ): Promise<UserHierarchyInfo | null> {
    const { workspaceMemberId, workspaceId } = input;

    // Get user's assigned templates
    const userTemplates =
      await this.userPermissionTemplateRepository.findActiveByWorkspaceMemberId(
        workspaceMemberId,
        new Date(),
        workspaceId,
      );

    if (userTemplates.length === 0) {
      return null;
    }

    // Get the highest priority template with hierarchy level
    const templateIds = userTemplates.map((ut) => ut.templateId);
    const templates = await this.permissionTemplateRepository.findByIds(
      templateIds,
      workspaceId,
    );

    // Find the template with the highest hierarchy level
    const templatesWithHierarchy = templates.filter(
      (t) => t.hierarchyLevel !== undefined && t.hierarchyLevel !== null,
    );

    if (templatesWithHierarchy.length === 0) {
      return null;
    }

    // Sort by hierarchy level (lower number = higher in hierarchy)
    templatesWithHierarchy.sort(
      (a, b) => (a.hierarchyLevel ?? 999) - (b.hierarchyLevel ?? 999),
    );

    const primaryTemplate = templatesWithHierarchy[0];
    const hierarchyLevel = primaryTemplate.hierarchyLevel ?? 0;

    // Get organization level info
    const orgLevels =
      await this.hierarchyLevelService.getHierarchyLevels(workspaceId);

    const currentLevel = orgLevels.find(
      (l) => l.hierarchyLevel === hierarchyLevel,
    );

    // Calculate levels this user can manage (lower in hierarchy = higher number)
    const canManageLevels = orgLevels
      .filter((l) => l.hierarchyLevel > hierarchyLevel)
      .map((l) => l.hierarchyLevel);

    // Get inherited template IDs
    const inheritedTemplateIds = await this.getInheritedTemplates(
      hierarchyLevel,
      workspaceId,
    );

    return {
      hierarchyLevel,
      levelCode: currentLevel?.levelCode ?? `LEVEL_${hierarchyLevel}`,
      levelName: currentLevel?.levelName ?? `Level ${hierarchyLevel}`,
      isTopLevel: hierarchyLevel === 1,
      canManageLevels,
      inheritedTemplateIds,
    };
  }

  /**
   * Compare hierarchy levels between two users
   */
  async compareHierarchy(
    user1MemberId: string,
    user2MemberId: string,
    workspaceId: string,
  ): Promise<HierarchyComparisonResult> {
    const user1Info = await this.getUserHierarchyInfo({
      workspaceMemberId: user1MemberId,
      workspaceId,
    });

    const user2Info = await this.getUserHierarchyInfo({
      workspaceMemberId: user2MemberId,
      workspaceId,
    });

    // If either user has no hierarchy, consider them at the lowest level
    const level1 = user1Info?.hierarchyLevel ?? 999;
    const level2 = user2Info?.hierarchyLevel ?? 999;

    const levelDifference = level2 - level1; // Positive means user1 is higher

    return {
      isHigher: level1 < level2,
      isSame: level1 === level2,
      isLower: level1 > level2,
      levelDifference,
    };
  }

  /**
   * Check if user can manage another user based on hierarchy
   */
  async canManageUser(
    managerMemberId: string,
    targetMemberId: string,
    workspaceId: string,
  ): Promise<boolean> {
    const comparison = await this.compareHierarchy(
      managerMemberId,
      targetMemberId,
      workspaceId,
    );

    return comparison.isHigher;
  }

  /**
   * Get templates inherited from higher hierarchy levels
   */
  private async getInheritedTemplates(
    userHierarchyLevel: number,
    workspaceId: string,
  ): Promise<string[]> {
    // Get all templates that apply to this level or higher
    const activeTemplates =
      await this.permissionTemplateRepository.findActive(workspaceId);

    const inheritedIds: string[] = [];

    for (const template of activeTemplates) {
      if (!template.applicableToLevels) {
        continue;
      }

      // Check if this template applies to the user's level
      const applicableLevels = template.applicableToLevels as number[];

      if (applicableLevels.includes(userHierarchyLevel)) {
        inheritedIds.push(template.id);
      }
    }

    return inheritedIds;
  }

  /**
   * Get all users at a specific hierarchy level
   */
  async getUsersAtLevel(
    hierarchyLevel: number,
    workspaceId: string,
  ): Promise<string[]> {
    // Get templates for this hierarchy level
    const templates =
      await this.permissionTemplateRepository.findByHierarchyLevel(
        hierarchyLevel,
        workspaceId,
      );

    if (templates.length === 0) {
      return [];
    }

    const userMemberIds = new Set<string>();

    for (const template of templates) {
      const userTemplates =
        await this.userPermissionTemplateRepository.findByTemplateId(
          template.id,
          workspaceId,
        );

      for (const ut of userTemplates) {
        userMemberIds.add(ut.workspaceMemberId);
      }
    }

    return Array.from(userMemberIds);
  }

  /**
   * Get templates applicable to a hierarchy level
   */
  async getTemplatesForLevel(
    hierarchyLevel: number,
    workspaceId: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const templates =
      await this.permissionTemplateRepository.findByHierarchyLevel(
        hierarchyLevel,
        workspaceId,
      );

    // Also include templates with applicableToLevels that include this level
    const allTemplates =
      await this.permissionTemplateRepository.findActive(workspaceId);

    const additionalTemplates = allTemplates.filter((t) => {
      if (!t.applicableToLevels) {
        return false;
      }

      const levels = t.applicableToLevels as number[];

      return levels.includes(hierarchyLevel);
    });

    // Merge and dedupe
    const templateMap = new Map<string, MktPermissionTemplateWorkspaceEntity>();

    for (const t of [...templates, ...additionalTemplates]) {
      templateMap.set(t.id, t);
    }

    return Array.from(templateMap.values());
  }
}
