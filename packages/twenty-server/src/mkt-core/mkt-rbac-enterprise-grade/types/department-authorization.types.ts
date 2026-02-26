/**
 * Department Authorization Types
 *
 * Types cho phân quyền dựa trên department, hierarchy level, và assigned templates.
 *
 * Permission Resolution Flow:
 * 1. Assigned Templates - mktUserPermissionTemplate
 * 2. Executive Level (hierarchyLevel <= 3)
 * 3. Manager Level (hierarchyLevel <= 7)
 * 4. Department Membership (departmentCode)
 */

import { DepartmentCode } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
import { MktPermissionTemplateWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

// Re-export DepartmentCode for consumers of this module
export { DepartmentCode };

/**
 * Metadata key cho department authorization
 */
export const DEPARTMENT_AUTH_KEY = 'department_authorization';

/**
 * Permission source types for tracking which source granted access
 */
export type PermissionSourceType =
  | 'template'
  | 'executive'
  | 'manager'
  | 'department';

/**
 * Template info for authorization result
 */
export type TemplateAuthInfo = {
  templateKey: string;
  templateName: string;
  priority: number;
};

/**
 * Options cho @RequireDepartment decorator
 */
export type DepartmentAuthOptions = {
  /**
   * Danh sách department/team codes được phép truy cập.
   * Kiểm tra cả departmentCode trực tiếp và qua department ancestors.
   * Supports both DepartmentCode (SALES, TECH) và TEAM codes (TECH_BACKEND).
   * @example [DEPARTMENT.SALES] hoặc withChildTeams(DEPARTMENT.SALES)
   */
  allowedDepartments?: string[];

  /**
   * Cho phép managers (hierarchyLevel <= 7) từ bất kỳ phòng ban nào.
   * @default false
   */
  allowManagers?: boolean;

  /**
   * Cho phép executives (CEO, C-Level, VP - hierarchyLevel <= 3).
   * @default true
   */
  allowExecutives?: boolean;

  /**
   * Cho phép users có assigned templates với priority >= threshold.
   * Nếu true, user có template priority >= TEMPLATE_PRIORITY.MANAGER sẽ được phép.
   * @default true
   */
  allowHighPriorityTemplates?: boolean;

  /**
   * Minimum template priority cần có để được phép (nếu allowHighPriorityTemplates = true).
   * @default TEMPLATE_PRIORITY.MANAGER (700)
   */
  minTemplatePriority?: number;

  /**
   * Custom message khi bị từ chối quyền truy cập.
   */
  deniedMessage?: string;
};

/**
 * Kết quả kiểm tra department authorization
 */
export type DepartmentAuthResult = {
  allowed: boolean;
  reason?: string;
  userDepartment?: string;
  userHierarchyLevel?: number;
  checkedBy?: PermissionSourceType;
  /** Template info nếu access được cấp qua template */
  grantedByTemplate?: TemplateAuthInfo;
};

/**
 * Context cho department authorization check
 */
export type DepartmentAuthContext = {
  userId: string;
  workspaceId: string;
  workspaceMemberId: string;
  departmentCode: string | null;
  departmentAncestorCodes: string[];
  hierarchyLevel: number;
  isManager: boolean;
  /** Assigned templates từ RbacContextService */
  templates: MktPermissionTemplateWorkspaceEntity[];
  /** Template keys cho quick lookup */
  templateKeys: string[];
};
