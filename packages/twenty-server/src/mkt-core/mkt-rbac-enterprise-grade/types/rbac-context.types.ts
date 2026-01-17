/**
 * RBAC Context Types
 *
 * Định nghĩa các types liên quan đến RBAC Context (ngữ cảnh RBAC)
 * được sử dụng trong quá trình evaluate permissions.
 *
 * Lưu ý: RBAC Context KHÁC với Permission Context:
 * - RBAC Context: Thông tin về user (department, hierarchy, subordinates)
 * - Permission Context (MktPermissionContextWorkspaceEntity): Phạm vi áp dụng permission
 */

import { MktPermissionTemplateWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

import { HierarchyLevel } from './hierarchy.types';
import { DataAccessScopeType } from './data-access-scope.types';

/**
 * User context đầy đủ cho RBAC permission checks
 */
export type RBACUserContext = {
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
 * Department tree structure cho hierarchy navigation
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

/**
 * Options cho việc resolve RBAC context
 */
export type ResolveRBACContextOptions = {
  /** Bỏ qua cache và resolve từ DB */
  skipCache?: boolean;
  /** Chỉ resolve các fields cơ bản (không resolve subordinates, templates) */
  basicOnly?: boolean;
  /** Include inactive templates */
  includeInactiveTemplates?: boolean;
};

/**
 * Result của việc check accessible members
 */
export type AccessibleMembersResult = {
  /** List member IDs có thể truy cập */
  memberIds: string[];
  /** true nếu user có quyền truy cập tất cả (không cần filter) */
  hasFullAccess: boolean;
};

/**
 * Result của việc check accessible departments
 */
export type AccessibleDepartmentsResult = {
  /** List department IDs có thể truy cập */
  departmentIds: string[];
  /** true nếu user có quyền truy cập tất cả departments */
  hasAllDepartmentsAccess: boolean;
};
