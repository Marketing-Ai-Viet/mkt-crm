/**
 * User Context Resolution Service (Step 2)
 * Resolves detailed user information, hierarchy, department, and organizational context
 */

import { Injectable, Logger, Optional } from '@nestjs/common';

import { DateTime } from 'luxon';
import { Equal, MoreThan } from 'typeorm';

import {
  PermissionValidationStep,
  StepValidationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import {
  DepartmentTeamContext,
  EnhancedPermissionContext,
  EnhancedUserContext,
  HierarchyInheritance,
  OrganizationalHierarchyContext,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  CheckResult,
  STEP_PERFORMANCE_CONFIG,
  VALIDATION_STEPS,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import { VALIDATION_STEP_NAMES } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department-hierarchy/mkt-department-hierarchy.workspace-entity';
import { MktOrganizationLevelWorkspaceEntity } from 'src/mkt-core/mkt-organization-level/mkt-organization-level.workspace-entity';
import {
  RBAC_CACHE_KEYS,
  RBAC_CACHE_TTL,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

import { RbacCacheManagerService } from './rbac-cache-manager.service';

/**
 * User Context Resolution Service - Step 2 in the 15-step validation process
 */
@Injectable()
export class Step2UserContextResolutionService
  implements PermissionValidationStep
{
  private readonly logger = new Logger(Step2UserContextResolutionService.name);

  // Step identification
  readonly stepNumber = VALIDATION_STEPS.USER_CONTEXT_RESOLUTION;
  readonly stepName =
    VALIDATION_STEP_NAMES[VALIDATION_STEPS.USER_CONTEXT_RESOLUTION];
  readonly description =
    'Resolve detailed user information, hierarchy, department, and organizational context';

  // Step configuration
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.USER_CONTEXT_RESOLUTION].priority;

  // Dependencies
  readonly dependsOn = [VALIDATION_STEPS.PRE_VALIDATION];
  readonly conflicts = undefined;

  // Performance settings - using centralized configuration
  readonly maxExecutionTime =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.USER_CONTEXT_RESOLUTION]
      .maxExecutionTime;
  readonly enableCaching =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.USER_CONTEXT_RESOLUTION]
      .enableCaching;
  readonly cacheExpirationTime =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.USER_CONTEXT_RESOLUTION]
      .cacheExpirationTime;
  readonly retryAttempts =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.USER_CONTEXT_RESOLUTION]
      .retryAttempts;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    @Optional() private readonly cacheManager?: RbacCacheManagerService,
  ) {}

  /**
   * Determine if this step should be executed based on context
   */
  shouldExecute(context: EnhancedPermissionContext): boolean {
    // Always execute if user context needs enrichment
    // Guard now only provides basic context, so Step 2 always needs to run
    return !context.userContext?.isEnriched;
  }

  /**
   * Get estimated execution time for this step
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    return STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.USER_CONTEXT_RESOLUTION]
      .estimatedExecutionTime;
  }

  private async getWorkspaceMemberRepositories(
    workspaceId: string,
  ): Promise<WorkspaceRepository<WorkspaceMemberWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
      workspaceId,
      'workspaceMember',
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getDepartmentHierarchyRepositories(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktDepartmentHierarchyWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktDepartmentHierarchyWorkspaceEntity>(
      workspaceId,
      'mktDepartmentHierarchy',
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getOrganizationRepositories(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktOrganizationLevelWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrganizationLevelWorkspaceEntity>(
      workspaceId,
      'mktOrganizationLevel',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Execute Step 2: User Context Resolution with caching
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    this.logger.debug(
      `Starting Step 2: ${this.stepName} for user ${context.userContext.workspaceMemberId}`,
    );

    try {
      // 1. Get basic user context from input
      const baseUserContext = context.userContext;

      if (
        !baseUserContext?.workspaceMemberId ||
        !baseUserContext?.workspaceId
      ) {
        return this.createFailResult(
          'User context missing required fields (workspaceMemberId or workspaceId)',
          stepStartTime,
        );
      }

      // 2. Try to get cached user context first
      const cacheKey = `${RBAC_CACHE_KEYS.USER_CONTEXT}:${baseUserContext.workspaceMemberId}`;

      if (this.cacheManager) {
        const cachedData = await this.cacheManager.get<{
          userContext: EnhancedUserContext;
          hierarchyContext: OrganizationalHierarchyContext;
          departmentContext: DepartmentTeamContext;
        }>(cacheKey);

        if (cachedData) {
          this.logger.debug(
            `Cache HIT: User context + hierarchy + department for ${baseUserContext.workspaceMemberId}`,
          );

          // Update context with all cached data
          context.userContext = cachedData.userContext;
          context.hierarchyContext = cachedData.hierarchyContext;
          context.departmentTeamContext = cachedData.departmentContext;

          return this.createSuccessResultWithFullContext(
            cachedData.userContext,
            cachedData.hierarchyContext,
            cachedData.departmentContext,
            stepStartTime,
            'CACHE',
          );
        }
      }

      // 3. Cache MISS - Resolve detailed user information from database
      const workspaceMemberDetails = await this.getWorkspaceMemberDetails(
        baseUserContext.workspaceMemberId,
        baseUserContext.workspaceId,
      );

      if (!workspaceMemberDetails) {
        return this.createFailResult(
          'Failed to resolve workspace member details',
          stepStartTime,
        );
      }

      // 4. Build organizational hierarchy context
      const hierarchyContext = await this.buildHierarchyContext(
        workspaceMemberDetails,
        baseUserContext.workspaceId,
      );

      // 5. Build department and team context
      const departmentContext = await this.buildDepartmentContext(
        workspaceMemberDetails,
        baseUserContext.workspaceId,
      );

      // 6. Build enhanced user context
      const enhancedUserContext = await this.buildEnhancedUserContext(
        baseUserContext,
        workspaceMemberDetails,
        hierarchyContext,
        departmentContext,
      );

      // 7. Cache the enhanced user context AND hierarchy context (using centralized TTL constant)
      if (this.cacheManager) {
        // Cache user context, hierarchy context, and department context together
        const cacheData = {
          userContext: enhancedUserContext,
          hierarchyContext,
          departmentContext,
        };

        await this.cacheManager.set(
          cacheKey,
          cacheData,
          RBAC_CACHE_TTL.STEP_RESULT, // 15 minutes
        );
        this.logger.debug(
          `Cache SET: User context + hierarchy + department for ${baseUserContext.workspaceMemberId}`,
        );
      }

      // 8. Update context with enriched information
      context.userContext = enhancedUserContext;
      context.hierarchyContext = hierarchyContext;
      context.departmentTeamContext = departmentContext;

      this.logger.debug(`Step 2: ${this.stepName} completed successfully`);

      return this.createSuccessResultWithFullContext(
        enhancedUserContext,
        hierarchyContext,
        departmentContext,
        stepStartTime,
        'DATABASE',
      );
    } catch (error) {
      this.logger.error(
        `Step 2: ${this.stepName} error: ${error.message}`,
        error.stack,
      );

      return this.createFailResult(
        `User context resolution error: ${error.message}`,
        stepStartTime,
      );
    }
  }

  /**
   * Get detailed workspace member information from database
   */
  private async getWorkspaceMemberDetails(
    workspaceMemberId: string,
    workspaceId: string,
  ): Promise<WorkspaceMemberWorkspaceEntity | null> {
    try {
      const workspaceMemberRepository =
        await this.getWorkspaceMemberRepositories(workspaceId);

      const userWorkspace = await workspaceMemberRepository.findOne({
        where: { id: workspaceMemberId },
        relations: {
          department: true,
          organizationLevel: true,
          employmentStatus: true,
        },
        select: {
          // All basic fields from WorkspaceMemberWorkspaceEntity
          id: true,
          position: true,
          colorScheme: true,
          locale: true,
          avatarUrl: true,
          userEmail: true,
          calendarStartDay: true,
          userId: true,
          timeZone: true,
          dateFormat: true,
          timeFormat: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,

          // Department relation select
          department: {
            id: true,
            departmentName: true,
            departmentNameEn: true,
            departmentCode: true,
            allowsCrossDepartmentAccess: true,
          },

          // Organization Level relation select
          organizationLevel: {
            id: true,
            levelName: true,
            levelNameEn: true,
            levelCode: true,
            hierarchyLevel: true,
            parentLevelId: true,
          },

          // Employment Status relation select
          employmentStatus: {
            id: true,
            statusName: true,
            statusNameEn: true,
            isActive: true,
          },
        },
      });

      if (!userWorkspace) {
        return null;
      }

      return userWorkspace;
    } catch (error) {
      this.logger.error(
        `Error fetching workspace member details: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Build organizational hierarchy context
   */
  private async buildHierarchyContext(
    workspaceMember: WorkspaceMemberWorkspaceEntity,
    workspaceId: string,
  ): Promise<OrganizationalHierarchyContext> {
    try {
      const userLevel = workspaceMember.organizationLevel?.hierarchyLevel || 0;
      const departmentId = workspaceMember.department?.id;

      // Get department hierarchy path
      const departmentHierarchy = await this.getDepartmentHierarchyPath(
        departmentId,
        workspaceId,
      );

      // Get organization path based on organization level
      const organizationPath = await this.getOrganizationPath(
        workspaceMember.organizationLevel?.id,
        workspaceId,
      );

      // Calculate access permissions based on hierarchy
      const accessRights = await this.calculateHierarchyAccessRights(
        userLevel,
        departmentId,
        workspaceId,
      );

      // Get inheritance rules
      const inheritanceRules = await this.getInheritanceRules(
        departmentId,
        workspaceId,
      );

      return {
        // Thông tin cơ bản của user
        userLevel,
        userDepartment: workspaceMember.department?.departmentName || 'Unknown',
        userOrgLevel: workspaceMember.organizationLevel?.levelName,

        // Target hierarchy requirements (sẽ được set trong validation steps khác)
        targetLevel: undefined,
        targetDepartment: undefined,
        minimumRequired: undefined,
        maximumAllowed: undefined,

        // Quy tắc truy cập theo cấp bậc
        canAccessSubordinates: accessRights.canAccessSubordinates,
        canAccessSuperiors: accessRights.canAccessSuperiors,
        canAccessPeers: accessRights.canAccessPeers,
        crossDepartmentAccess:
          workspaceMember.department?.allowsCrossDepartmentAccess || false,
        crossOrgLevelAccess: accessRights.crossOrgLevelAccess,

        // Quy tắc điều hướng trong hierarchy
        levelDifference: accessRights.maxLevelDifference,
        reportingChainRequired: accessRights.reportingChainRequired,
        directReportOnly: accessRights.directReportOnly,
        skipLevelAllowed: accessRights.skipLevelAllowed,

        // Cấu trúc phòng ban và tổ chức
        departmentHierarchy,
        organizationPath,
        inheritanceRules,
      };
    } catch (error) {
      this.logger.error(`Error building hierarchy context: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build department and team context
   */
  private async buildDepartmentContext(
    workspaceMember: WorkspaceMemberWorkspaceEntity,
    _workspaceId: string,
  ): Promise<DepartmentTeamContext> {
    try {
      return {
        userDepartmentId: workspaceMember.department?.id || '',
        userDepartmentName: workspaceMember.department?.departmentName,
        userTeamId: undefined,
        userTeamName: undefined,

        // Target department and team
        targetDepartmentId: undefined,
        targetDepartmentName: undefined,
        targetTeamId: undefined,
        targetTeamName: undefined,

        // Cross-department access
        isCrossDepartment:
          workspaceMember.department?.allowsCrossDepartmentAccess || false,
        isCrossTeam: undefined,
        allowCrossDepartmentAccess:
          workspaceMember.department?.allowsCrossDepartmentAccess || false,
        allowCrossTeamAccess: undefined,

        // Department hierarchy and relationships
        departmentHierarchy: undefined,
      };
    } catch (error) {
      this.logger.error(`Error building department context: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build enhanced user context
   */
  private async buildEnhancedUserContext(
    baseContext: EnhancedUserContext,
    workspaceMember: WorkspaceMemberWorkspaceEntity,
    hierarchyContext: OrganizationalHierarchyContext,
    departmentContext: DepartmentTeamContext,
  ): Promise<EnhancedUserContext> {
    return {
      ...baseContext,

      // Basic user information
      userEmail: workspaceMember.userEmail,
      firstName: workspaceMember.name?.firstName,
      lastName: workspaceMember.name?.lastName,
      fullName:
        `${workspaceMember.name?.firstName || ''} ${workspaceMember.name?.lastName || ''}`.trim(),
      avatarUrl: workspaceMember.avatarUrl,

      // Status and preferences
      isActive: true, // Default to active - would need additional logic to determine
      timeZone: workspaceMember.timeZone,
      locale: workspaceMember.locale,

      // Organizational context
      organizationLevel: hierarchyContext.userLevel,
      organizationLevelId: workspaceMember.organizationLevel?.id,
      levelName: hierarchyContext.userOrgLevel,
      departmentId: departmentContext.userDepartmentId,
      departmentName: departmentContext.userDepartmentName,
      managerId: undefined, // Not available in current structure

      // Capabilities and permissions
      isManager: false, // Would need separate determination
      canDelegate: false, // Would need separate determination
      isDepartmentManager: false, // Would need separate determination
      canAccessCrossDepartment: departmentContext.isCrossDepartment,

      // Enhanced flags
      isEnriched: true,
      lastEnrichedAt: DateTime.now(),
      enrichmentSource: 'USER_CONTEXT_RESOLUTION_SERVICE',

      // Context metadata
      contextMetadata: {
        userLevel: hierarchyContext.userLevel,
        userDepartment: hierarchyContext.userDepartment,
        crossDepartmentAccess: hierarchyContext.crossDepartmentAccess ?? false,
        allowCrossDepartmentAccess:
          departmentContext.allowCrossDepartmentAccess ?? false,
      },
    };
  }

  /**
   * Helper methods for context building
   */
  private async calculateHierarchyDepth(
    workspaceMember: WorkspaceMemberWorkspaceEntity,
    _workspaceId: string,
  ): Promise<number> {
    // Implementation would traverse up the management chain
    // For now, return estimated depth based on organization level
    return Math.max(
      0,
      (workspaceMember.organizationLevel?.hierarchyLevel || 0) - 1,
    );
  }

  private calculateMaxDelegationLevel(currentLevel: number): number {
    // Can delegate to users up to 2 levels below
    return Math.max(0, currentLevel - 2);
  }

  private async checkIfDepartmentManager(
    _workspaceMember: WorkspaceMemberWorkspaceEntity,
    _workspaceId: string,
  ): Promise<boolean> {
    // Would need separate query to check if user manages other users in the department
    return false;
  }

  private async getTeamMemberCount(
    departmentId: string | undefined,
    workspaceId: string,
  ): Promise<number> {
    if (!departmentId) return 0;

    try {
      const dataSource =
        await this.twentyORMGlobalManager.getDataSourceForWorkspace({
          workspaceId,
        });
      const workspaceMemberRepository = dataSource.getRepository(
        WorkspaceMemberWorkspaceEntity,
      );

      return await workspaceMemberRepository.count({
        where: { departmentId },
      });
    } catch (error) {
      this.logger.error(`Error getting team member count: ${error.message}`);

      return 0;
    }
  }

  /**
   * Get department hierarchy path from root to current department
   */
  private async getDepartmentHierarchyPath(
    departmentId: string | undefined,
    workspaceId: string,
  ): Promise<string[]> {
    if (!departmentId) return [];

    try {
      const departmentHierarchyRepository =
        await this.getDepartmentHierarchyRepositories(workspaceId);

      // Get all hierarchy relationships for this department
      const hierarchyRelations = await departmentHierarchyRepository.find({
        where: {
          childDepartmentId: departmentId,
          isActive: true,
        },
        relations: {
          parentDepartment: true,
          childDepartment: true,
        },
        select: {
          hierarchyLevel: true,
          hierarchyPath: true,
          parentDepartment: {
            id: true,
            departmentName: true,
          },
          childDepartment: {
            id: true,
            departmentName: true,
          },
        },
      });

      // Build path from hierarchy relations
      if (hierarchyRelations.length > 0) {
        // Use hierarchyPath if available, otherwise build from relations
        const relation = hierarchyRelations[0];

        if (relation.hierarchyPath && relation.hierarchyPath.length > 0) {
          return relation.hierarchyPath;
        }

        // Fallback: build path manually from department names
        const path: string[] = [];

        if (relation.parentDepartment?.departmentName) {
          path.push(relation.parentDepartment.departmentName);
        }
        if (relation.childDepartment?.departmentName) {
          path.push(relation.childDepartment.departmentName);
        }

        return path;
      }

      return [];
    } catch (error) {
      this.logger.error(
        `Error getting department hierarchy path: ${error.message}`,
      );

      return [];
    }
  }

  /**
   * Get organization path based on organization level hierarchy
   */
  private async getOrganizationPath(
    organizationLevelId: string | undefined,
    workspaceId: string,
  ): Promise<string[]> {
    if (!organizationLevelId) return [];

    try {
      const organizationRepository =
        await this.getOrganizationRepositories(workspaceId);

      // Get current organization level
      const currentOrgLevel = await organizationRepository.findOne({
        where: { id: organizationLevelId },
        select: {
          id: true,
          levelName: true,
          parentLevelId: true,
          hierarchyLevel: true,
        },
      });

      if (!currentOrgLevel) return [];

      // Build organization path by traversing up the hierarchy
      const path: string[] = [currentOrgLevel.levelName];
      let currentParentId = currentOrgLevel.parentLevelId;

      // Traverse up to parent levels (with safety limit)
      let depth = 0;
      const maxDepth = 10;

      while (currentParentId && depth < maxDepth) {
        const parentLevel = await organizationRepository.findOne({
          where: { id: currentParentId },
          select: {
            id: true,
            levelName: true,
            parentLevelId: true,
          },
        });

        if (!parentLevel) break;

        // Add parent to beginning of path (root first)
        path.unshift(parentLevel.levelName);
        currentParentId = parentLevel.parentLevelId;
        depth++;
      }

      return path;
    } catch (error) {
      this.logger.error(`Error getting organization path: ${error.message}`);

      return [];
    }
  }

  /**
   * Calculate hierarchy access rights based on user level and department
   */
  private async calculateHierarchyAccessRights(
    userLevel: number,
    departmentId: string | undefined,
    workspaceId: string,
  ): Promise<{
    canAccessSubordinates: boolean;
    canAccessSuperiors: boolean;
    canAccessPeers: boolean;
    crossOrgLevelAccess: boolean;
    maxLevelDifference: number;
    reportingChainRequired: boolean;
    directReportOnly: boolean;
    skipLevelAllowed: boolean;
  }> {
    try {
      const workspaceMemberRepository =
        await this.getWorkspaceMemberRepositories(workspaceId);

      // Check if user has subordinates (lower hierarchy levels)
      const subordinatesCount = await workspaceMemberRepository.count({
        where: {
          departmentId: departmentId || undefined,
          organizationLevel: {
            hierarchyLevel: MoreThan(userLevel),
          },
        },
        relations: {
          organizationLevel: true,
        },
      });

      // Check if user has superiors (higher hierarchy levels)
      // const superiorsCount = await workspaceMemberRepository.count({
      //   where: {
      //     departmentId: departmentId || undefined,
      //     organizationLevel: {
      //       hierarchyLevel: LessThan(userLevel),
      //     },
      //   },
      //   relations: {
      //     organizationLevel: true,
      //   },
      // });

      // Check if user has peers (same hierarchy level)
      const peersCount = await workspaceMemberRepository.count({
        where: {
          departmentId: departmentId || undefined,
          organizationLevel: {
            hierarchyLevel: Equal(userLevel),
          },
        },
        relations: {
          organizationLevel: true,
        },
      });

      const hasSubordinates = subordinatesCount > 0;
      const hasPeers = peersCount > 1; // > 1 because includes self

      // Calculate access rights based on hierarchy rules
      return {
        canAccessSubordinates: hasSubordinates,
        canAccessSuperiors: userLevel > 1, // Only level 1 (CEO) cannot access superiors
        canAccessPeers: hasPeers,
        crossOrgLevelAccess: userLevel <= 2, // Only top 2 levels can access across org levels
        maxLevelDifference: Math.max(2, Math.floor(userLevel / 2)), // Dynamic based on user level
        reportingChainRequired: userLevel >= 3, // Middle management requires reporting chain
        directReportOnly: userLevel >= 4, // Lower levels only access direct reports
        skipLevelAllowed: userLevel <= 2, // Only senior levels can skip hierarchy levels
      };
    } catch (error) {
      this.logger.error(
        `Error calculating hierarchy access rights: ${error.message}`,
      );

      return {
        canAccessSubordinates: false,
        canAccessSuperiors: false,
        canAccessPeers: true,
        crossOrgLevelAccess: false,
        maxLevelDifference: 1,
        reportingChainRequired: true,
        directReportOnly: true,
        skipLevelAllowed: false,
      };
    }
  }

  /**
   * Get inheritance rules from department hierarchy
   */
  private async getInheritanceRules(
    departmentId: string | undefined,
    workspaceId: string,
  ): Promise<HierarchyInheritance[]> {
    if (!departmentId) return [];

    try {
      const departmentHierarchyRepository =
        await this.getDepartmentHierarchyRepositories(workspaceId);

      // Get hierarchy rules for this department
      const hierarchyRules = await departmentHierarchyRepository.find({
        where: [
          { parentDepartmentId: departmentId, isActive: true },
          { childDepartmentId: departmentId, isActive: true },
        ],
        select: {
          hierarchyLevel: true,
          inheritsPermissions: true,
          inheritsParentPermissions: true,
          canViewTeamData: true,
          canEditTeamData: true,
          canExportTeamData: true,
        },
        order: {
          hierarchyLevel: 'ASC',
        },
      });

      return hierarchyRules.map((rule) => ({
        sourceLevel: rule.hierarchyLevel,
        targetLevel: rule.hierarchyLevel + 1,
        inheritsPermissions: rule.inheritsPermissions || false,
        inheritsParentPermissions: rule.inheritsParentPermissions || false,
        permissions: {
          canViewTeamData: rule.canViewTeamData || false,
          canEditTeamData: rule.canEditTeamData || false,
          canExportTeamData: rule.canExportTeamData || false,
        },
      }));
    } catch (error) {
      this.logger.error(`Error getting inheritance rules: ${error.message}`);

      return [];
    }
  }

  /**
   * Create a success result with full context (userContext + hierarchyContext + departmentContext)
   */
  private createSuccessResultWithFullContext(
    userContext: EnhancedUserContext,
    hierarchyContext: OrganizationalHierarchyContext,
    departmentContext: DepartmentTeamContext,
    startTime: DateTime,
    source: 'CACHE' | 'DATABASE',
  ): StepValidationResult {
    return {
      result: CheckResult.PASS,
      reason: `User context resolved from ${source}`,
      continue: true,
      executionTime: DateTime.now().diff(startTime).as('milliseconds'),
      metadata: {
        userContextEnriched: true,
        hierarchyResolved: !!hierarchyContext,
        departmentResolved: !!departmentContext,
        userActive: userContext.isActive,
        userLevel: hierarchyContext?.userLevel,
        departmentId: departmentContext?.userDepartmentId,
        source,
      },
      modifyContext: {
        userContext,
        hierarchyContext,
        departmentTeamContext: departmentContext,
      },
    };
  }

  /**
   * Create a success result from cached context (legacy - deprecated)
   * @deprecated Use createSuccessResultWithFullContext instead
   */
  private createSuccessResult(
    userContext: EnhancedUserContext,
    startTime: DateTime,
    source: 'CACHE' | 'DATABASE',
  ): StepValidationResult {
    return {
      result: CheckResult.PASS,
      reason: `User context resolved from ${source}`,
      continue: true,
      executionTime: DateTime.now().diff(startTime).as('milliseconds'),
      metadata: {
        userContextEnriched: true,
        hierarchyResolved: !!userContext.hierarchyLevel,
        departmentResolved: !!userContext.departmentId,
        userActive: userContext.isActive,
        ...(userContext.hierarchyLevel !== undefined && {
          userLevel: userContext.hierarchyLevel,
        }),
        ...(userContext.departmentId !== undefined && {
          departmentId: userContext.departmentId,
        }),
        source,
      },
      modifyContext: {
        userContext,
        // Note: hierarchyContext and departmentContext might need to be reconstructed
        // if needed by subsequent steps
      },
    };
  }

  /**
   * Create a failure result
   */
  private createFailResult(
    reason: string,
    startTime: DateTime,
  ): StepValidationResult {
    return {
      result: CheckResult.FAIL,
      reason,
      continue: false, // Stop execution on user context resolution failure
      executionTime: DateTime.now().diff(startTime).as('milliseconds'),
    };
  }
}
