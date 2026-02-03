/**
 * RbacContextService - Core RBAC User Context Resolution Service
 *
 * Resolves full user context including:
 * - Workspace member information
 * - Department hierarchy (ancestors, descendants)
 * - Organization level and hierarchy level
 * - Subordinate member IDs
 * - Supporting member IDs
 * - Assigned permission templates
 *
 * Used by RbacEnforcerService for permission checks.
 */

import { Injectable, Logger } from '@nestjs/common';

import { MktDepartmentRepository } from 'src/mkt-core/mkt-department/repositories/mkt-department.repository';
import { MktDepartmentAncestryRepository } from 'src/mkt-core/mkt-department/repositories/mkt-department-ancestry.repository';
import { MktDepartmentSubManagerRepository } from 'src/mkt-core/mkt-department/repositories/mkt-department-sub-manager.repository';
import { MktDepartmentHierarchyRepository } from 'src/mkt-core/mkt-department/repositories/mkt-department-hierarchy.repository';
import { MktOrganizationLevelRepository } from 'src/mkt-core/mkt-organization-level/repositories/mkt-organization-level.repository';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories/mkt-workspace-member.repository';
import { MktUserPermissionTemplateRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktPermissionTemplateWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { HierarchyLevel } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/hierarchy.types';

// ============================================
// DATA ACCESS SCOPE TYPES
// ============================================

export const DATA_ACCESS_SCOPE = {
  ALL_DEPARTMENTS: 'ALL_DEPARTMENTS',
  OWN_AND_CHILD_DEPARTMENTS: 'OWN_AND_CHILD_DEPARTMENTS',
  OWN_DEPARTMENT_AND_TEAM: 'OWN_DEPARTMENT_AND_TEAM',
  OWN_RECORDS: 'OWN_RECORDS',
} as const;

export type DataAccessScopeType =
  (typeof DATA_ACCESS_SCOPE)[keyof typeof DATA_ACCESS_SCOPE];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get data access scope by hierarchy level
 * Levels 1-3: Full access to all departments
 * Levels 4-6: Access to own and child departments
 * Level 7: Access to own department and team
 * Levels 8-11: Access to own records only
 */
export const getDataAccessScopeByLevel = (
  hierarchyLevel: number,
): DataAccessScopeType => {
  if (hierarchyLevel <= 3) return DATA_ACCESS_SCOPE.ALL_DEPARTMENTS;
  if (hierarchyLevel <= 6) return DATA_ACCESS_SCOPE.OWN_AND_CHILD_DEPARTMENTS;
  if (hierarchyLevel === 7) return DATA_ACCESS_SCOPE.OWN_DEPARTMENT_AND_TEAM;

  return DATA_ACCESS_SCOPE.OWN_RECORDS;
};

/**
 * Check if user has full access (level 1-3: CEO, C_LEVEL, VP)
 */
export const hasFullAccess = (hierarchyLevel: number): boolean =>
  hierarchyLevel <= 3;

/**
 * Check if user can manage team (level 1-7)
 */
export const canManageTeam = (hierarchyLevel: number): boolean =>
  hierarchyLevel <= 7;

/**
 * Check if user can view subordinates (level 1-7)
 */
export const canViewSubordinates = (hierarchyLevel: number): boolean =>
  hierarchyLevel <= 7;

// ============================================
// TYPES
// ============================================

/**
 * User context for RBAC permission checks
 */
export type UserContext = {
  // Core identifiers
  userId: string;
  workspaceMemberId: string;
  workspaceId: string;

  // Department info
  departmentId: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  departmentType: string | null;
  departmentAncestorIds: string[];
  departmentDescendantIds: string[];

  // Organization level
  organizationLevelId: string | null;
  hierarchyLevel: HierarchyLevel;
  levelCode: string;
  levelName: string;

  // Data access scope
  dataAccessScope: DataAccessScopeType;
  hasFullAccess: boolean;

  // Team info
  isManager: boolean;
  isSubManager: boolean;
  canManageTeam: boolean;
  canViewSubordinates: boolean;

  // Member relationships
  subordinateMemberIds: string[];
  teamMemberIds: string[];
  supportingMemberIds: string[];

  // Templates
  templateKeys: string[];
  templates: MktPermissionTemplateWorkspaceEntity[];

  // Metadata
  resolvedAt: string;
  cacheKey: string;
};

/**
 * Department tree structure for hierarchy navigation
 */
export type DepartmentTree = {
  id: string;
  departmentCode: string;
  departmentName: string;
  managerId: string | null;
  children: DepartmentTree[];
  depth: number;
  path: string[];
};

// ============================================
// CONSTANTS
// ============================================

const RBAC_CONTEXT_LOG_CONTEXT = 'RBAC:ContextService';

const RBAC_CONTEXT_MESSAGES = {
  RESOLVE_START: (userId: string) => `Resolving context for user ${userId}`,
  RESOLVE_SUCCESS: (userId: string, ms: number) =>
    `Context resolved for user ${userId} in ${ms}ms`,
  MEMBER_NOT_FOUND: (userId: string) =>
    `Workspace member not found for user ${userId}`,
  DEPARTMENT_NOT_FOUND: (deptId: string) => `Department ${deptId} not found`,
  CACHE_INVALIDATED: (userId: string) => `Cache invalidated for user ${userId}`,
};

// Default hierarchy level for users without organization level assigned
const DEFAULT_HIERARCHY_LEVEL: HierarchyLevel = 11; // INTERN
const DEFAULT_LEVEL_CODE = 'INTERN';
const DEFAULT_LEVEL_NAME = 'Intern';

// ============================================
// SERVICE
// ============================================

@Injectable()
export class RbacContextService {
  private readonly logger = new Logger(RBAC_CONTEXT_LOG_CONTEXT);

  constructor(
    private readonly workspaceMemberRepository: MktWorkspaceMemberRepository,
    private readonly departmentRepository: MktDepartmentRepository,
    private readonly departmentAncestryRepository: MktDepartmentAncestryRepository,
    private readonly departmentSubManagerRepository: MktDepartmentSubManagerRepository,
    private readonly departmentHierarchyRepository: MktDepartmentHierarchyRepository,
    private readonly organizationLevelRepository: MktOrganizationLevelRepository,
    private readonly userPermissionTemplateRepository: MktUserPermissionTemplateRepository,
  ) {}

  // ============================================
  // MAIN CONTEXT RESOLUTION
  // ============================================

  /**
   * Resolve full user context for RBAC permission checks
   */
  async resolveContext(
    userId: string,
    workspaceId: string,
  ): Promise<UserContext | null> {
    const startTime = DateTimeUtils.now();

    this.logger.debug(RBAC_CONTEXT_MESSAGES.RESOLVE_START(userId));

    // 1. Get workspace member (use explicit workspaceId for global interceptor context)
    const member =
      await this.workspaceMemberRepository.findByUserIdWithWorkspace(
        workspaceId,
        userId,
      );

    if (!member) {
      this.logger.warn(RBAC_CONTEXT_MESSAGES.MEMBER_NOT_FOUND(userId));

      return null;
    }

    // 2. Resolve organization level (use explicit workspaceId)
    const orgLevel = member.organizationLevelId
      ? await this.organizationLevelRepository.findByIdWithWorkspace(
          workspaceId,
          member.organizationLevelId,
        )
      : null;

    const hierarchyLevel: HierarchyLevel = (orgLevel?.hierarchyLevel ??
      DEFAULT_HIERARCHY_LEVEL) as HierarchyLevel;
    const levelCode = orgLevel?.levelCode ?? DEFAULT_LEVEL_CODE;
    const levelName = orgLevel?.levelName ?? DEFAULT_LEVEL_NAME;

    // 3. Resolve department info
    let departmentCode: string | null = null;
    let departmentName: string | null = null;
    let departmentType: string | null = null;
    let departmentAncestorIds: string[] = [];
    let departmentDescendantIds: string[] = [];

    if (member.departmentId) {
      const department = await this.departmentRepository.findByIdWithWorkspace(
        workspaceId,
        member.departmentId,
      );

      if (department) {
        departmentCode = department.departmentCode ?? null;
        departmentName = department.departmentName ?? null;
        departmentType = department.departmentType ?? null;
      }

      // Get department ancestors and descendants
      [departmentAncestorIds, departmentDescendantIds] = await Promise.all([
        this.getDepartmentAncestors(workspaceId, member.departmentId),
        this.getDepartmentDescendants(workspaceId, member.departmentId),
      ]);
    }

    // 4. Resolve subordinates and supporting members (pass workspaceId explicitly)
    const [subordinateMemberIds, teamMemberIds, supportingMemberIds] =
      await Promise.all([
        this.getSubordinates(workspaceId, member.id, hierarchyLevel),
        this.getTeamMembers(workspaceId, member.departmentId, member.id),
        this.getSupportingMembers(workspaceId, member.id),
      ]);

    // 5. Check if user is manager or sub-manager
    const [isManager, isSubManager] = await Promise.all([
      this.isUserManager(workspaceId, member.id),
      this.isUserSubManager(workspaceId, member.id),
    ]);

    // 6. Get assigned templates
    const { templateKeys, templates } = await this.getAssignedTemplates(
      workspaceId,
      member.id,
    );

    // 7. Calculate data access scope
    const dataAccessScope = getDataAccessScopeByLevel(hierarchyLevel);

    // Build context
    const context: UserContext = {
      // Core
      userId,
      workspaceMemberId: member.id,
      workspaceId,

      // Department
      departmentId: member.departmentId ?? null,
      departmentCode,
      departmentName,
      departmentType,
      departmentAncestorIds,
      departmentDescendantIds,

      // Organization level
      organizationLevelId: member.organizationLevelId ?? null,
      hierarchyLevel,
      levelCode,
      levelName,

      // Data access
      dataAccessScope,
      hasFullAccess: hasFullAccess(hierarchyLevel),

      // Team info
      isManager,
      isSubManager,
      canManageTeam: canManageTeam(hierarchyLevel),
      canViewSubordinates: canViewSubordinates(hierarchyLevel),

      // Relationships
      subordinateMemberIds,
      teamMemberIds,
      supportingMemberIds,

      // Templates
      templateKeys,
      templates,

      // Metadata
      resolvedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      cacheKey: this.buildCacheKey(userId, workspaceId),
    };

    const latencyMs = DateTimeUtils.diffInMillis(
      startTime,
      DateTimeUtils.now(),
    );

    this.logger.debug(RBAC_CONTEXT_MESSAGES.RESOLVE_SUCCESS(userId, latencyMs));

    return context;
  }

  // ============================================
  // DEPARTMENT HIERARCHY
  // ============================================

  /**
   * Get all ancestor department IDs for a department
   */
  async getDepartmentAncestors(
    workspaceId: string,
    departmentId: string,
  ): Promise<string[]> {
    return this.departmentAncestryRepository.findAncestorIds(
      workspaceId,
      departmentId,
    );
  }

  /**
   * Get all descendant department IDs for a department
   */
  async getDepartmentDescendants(
    workspaceId: string,
    departmentId: string,
  ): Promise<string[]> {
    return this.departmentAncestryRepository.findDescendantIds(
      workspaceId,
      departmentId,
    );
  }

  /**
   * Get department tree structure starting from a root department
   */
  async getDepartmentTree(
    workspaceId: string,
    rootDepartmentId?: string,
  ): Promise<DepartmentTree | null> {
    // Get all departments
    const departments = await this.departmentRepository.findMany({});

    if (departments.length === 0) {
      return null;
    }

    // Get all hierarchy records to build parent-child relationships
    const hierarchies = await this.departmentHierarchyRepository.findMany({});

    // Create a map of child -> parent relationships
    const parentMap = new Map<string, string>();

    for (const h of hierarchies) {
      if (h.childDepartmentId && h.parentDepartmentId) {
        parentMap.set(h.childDepartmentId, h.parentDepartmentId);
      }
    }

    // Build tree structure
    const deptMap = new Map<string, DepartmentTree & { parentId?: string }>();

    for (const dept of departments) {
      const parentId = parentMap.get(dept.id);

      deptMap.set(dept.id, {
        id: dept.id,
        departmentCode: dept.departmentCode ?? '',
        departmentName: dept.departmentName ?? '',
        managerId: dept.managerId ?? null,
        children: [],
        depth: 0,
        path: [dept.id],
        parentId,
      });
    }

    // Build parent-child relationships
    const rootNodes: DepartmentTree[] = [];

    for (const dept of deptMap.values()) {
      if (dept.parentId) {
        const parent = deptMap.get(dept.parentId);

        if (parent) {
          dept.path = [...parent.path, dept.id];
          dept.depth = parent.depth + 1;
          parent.children.push(dept);
        } else {
          rootNodes.push(dept);
        }
      } else {
        rootNodes.push(dept);
      }
    }

    // Find root
    if (rootDepartmentId) {
      return deptMap.get(rootDepartmentId) ?? null;
    }

    // Return first root node if no specific root requested
    return rootNodes[0] ?? null;
  }

  // ============================================
  // SUBORDINATE & TEAM MEMBERS
  // ============================================

  /**
   * Get all subordinate member IDs for a user
   * Based on:
   * - Direct reports (if user is manager of a department)
   * - Team members (if user is sub-manager)
   * - Hierarchy level (users with lower hierarchy level in same dept tree)
   */
  async getSubordinates(
    workspaceId: string,
    workspaceMemberId: string,
    hierarchyLevel: HierarchyLevel,
  ): Promise<string[]> {
    // Users at level 8-11 have no subordinates
    if (!canViewSubordinates(hierarchyLevel)) {
      return [];
    }

    const subordinateIds: string[] = [];

    // Get departments where user is manager (use workspace-scoped method)
    const managedDepts =
      await this.departmentRepository.findByManagerIdWithWorkspace(
        workspaceId,
        workspaceMemberId,
      );

    // Get departments where user is sub-manager
    const subManagedAssignments =
      await this.departmentSubManagerRepository.findByWorkspaceMemberId(
        workspaceId,
        workspaceMemberId,
        { activeOnly: true },
      );

    // Collect all department IDs managed by this user
    const allManagedDeptIds: string[] = [
      ...managedDepts.map((d) => d.id),
      ...subManagedAssignments
        .map((a) => a.departmentId)
        .filter((id): id is string => id !== null),
    ];

    // Get members from these departments (use workspace-scoped method)
    for (const deptId of allManagedDeptIds) {
      const members =
        await this.workspaceMemberRepository.findByDepartmentWithWorkspace(
          workspaceId,
          deptId,
        );

      for (const member of members) {
        // Exclude self
        if (member.id !== workspaceMemberId) {
          subordinateIds.push(member.id);
        }
      }
    }

    // If user has full access (level 1-3), get all members (use workspace-scoped method)
    if (hasFullAccess(hierarchyLevel)) {
      const allMembers =
        await this.workspaceMemberRepository.findAllActiveWithWorkspace(
          workspaceId,
        );

      for (const member of allMembers) {
        if (
          member.id !== workspaceMemberId &&
          !subordinateIds.includes(member.id)
        ) {
          subordinateIds.push(member.id);
        }
      }
    }

    return [...new Set(subordinateIds)];
  }

  /**
   * Get team members in the same department
   */
  async getTeamMembers(
    workspaceId: string,
    departmentId: string | undefined | null,
    excludeMemberId: string,
  ): Promise<string[]> {
    if (!departmentId) {
      return [];
    }

    const members =
      await this.workspaceMemberRepository.findByDepartmentWithWorkspace(
        workspaceId,
        departmentId,
      );

    return members.filter((m) => m.id !== excludeMemberId).map((m) => m.id);
  }

  /**
   * Get member IDs that this user is supporting
   * (via supportForMemberId field in workspace member)
   */
  async getSupportingMembers(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<string[]> {
    const supportedMembers =
      await this.workspaceMemberRepository.findManyMembersWithWorkspace(
        workspaceId,
        { supportForMemberId: workspaceMemberId },
      );

    return supportedMembers.map((m) => m.id);
  }

  // ============================================
  // MANAGER CHECKS
  // ============================================

  /**
   * Check if user is a manager of any department
   */
  async isUserManager(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<boolean> {
    const managedDepts =
      await this.departmentRepository.findByManagerIdWithWorkspace(
        workspaceId,
        workspaceMemberId,
      );

    return managedDepts.length > 0;
  }

  /**
   * Check if user is a sub-manager of any department
   */
  async isUserSubManager(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<boolean> {
    const subManagedCount =
      await this.departmentSubManagerRepository.countByWorkspaceMemberId(
        workspaceId,
        workspaceMemberId,
        { activeOnly: true },
      );

    return subManagedCount > 0;
  }

  // ============================================
  // PERMISSION TEMPLATES
  // ============================================

  /**
   * Get assigned permission templates for a user
   */
  async getAssignedTemplates(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<{
    templateKeys: string[];
    templates: MktPermissionTemplateWorkspaceEntity[];
  }> {
    const assignments =
      await this.userPermissionTemplateRepository.findActiveByWorkspaceMemberId(
        workspaceId,
        workspaceMemberId,
      );

    const templates: MktPermissionTemplateWorkspaceEntity[] = [];
    const templateKeys: string[] = [];

    for (const assignment of assignments) {
      if (assignment.template) {
        templates.push(assignment.template);
        templateKeys.push(assignment.template.templateKey ?? '');
      }
    }

    return { templateKeys, templates };
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  /**
   * Invalidate cached context for a user
   */
  async invalidateCache(userId: string): Promise<void> {
    // Note: Actual cache invalidation will be implemented in RbacCacheService
    this.logger.debug(RBAC_CONTEXT_MESSAGES.CACHE_INVALIDATED(userId));
  }

  /**
   * Build cache key for user context
   */
  private buildCacheKey(userId: string, workspaceId: string): string {
    return `rbac:context:${workspaceId}:${userId}`;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Check if user can access data based on their scope
   */
  canAccessAllDepartments(context: UserContext): boolean {
    return context.dataAccessScope === DATA_ACCESS_SCOPE.ALL_DEPARTMENTS;
  }

  /**
   * Check if user can access own and child departments
   */
  canAccessChildDepartments(context: UserContext): boolean {
    return (
      context.dataAccessScope === DATA_ACCESS_SCOPE.OWN_AND_CHILD_DEPARTMENTS ||
      context.dataAccessScope === DATA_ACCESS_SCOPE.ALL_DEPARTMENTS
    );
  }

  /**
   * Check if user can only access own records
   */
  canAccessOwnRecordsOnly(context: UserContext): boolean {
    return context.dataAccessScope === DATA_ACCESS_SCOPE.OWN_RECORDS;
  }

  /**
   * Get all accessible department IDs for a user
   */
  getAccessibleDepartmentIds(context: UserContext): string[] {
    if (this.canAccessAllDepartments(context)) {
      // Return empty to indicate no department filter needed
      return [];
    }

    if (this.canAccessChildDepartments(context)) {
      return [
        ...(context.departmentId ? [context.departmentId] : []),
        ...context.departmentDescendantIds,
      ];
    }

    // Own department only or own records only
    return context.departmentId ? [context.departmentId] : [];
  }

  /**
   * Get all accessible member IDs for data filtering
   */
  getAccessibleMemberIds(context: UserContext): string[] {
    if (context.hasFullAccess) {
      // Return empty to indicate no member filter needed
      return [];
    }

    const accessibleIds = new Set<string>();

    // Always include self
    accessibleIds.add(context.workspaceMemberId);

    // Include subordinates if can view
    if (context.canViewSubordinates) {
      for (const id of context.subordinateMemberIds) {
        accessibleIds.add(id);
      }
    }

    // Include team members if manager
    if (context.isManager || context.isSubManager) {
      for (const id of context.teamMemberIds) {
        accessibleIds.add(id);
      }
    }

    // Include supporting members
    for (const id of context.supportingMemberIds) {
      accessibleIds.add(id);
    }

    return [...accessibleIds];
  }
}
