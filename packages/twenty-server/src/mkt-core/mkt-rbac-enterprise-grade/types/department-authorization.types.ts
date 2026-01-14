/**
 * Department Authorization Types
 *
 * Types cho phân quyền dựa trên department và hierarchy level.
 */

import { DEPARTMENT } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';

/**
 * Type cho department code values
 */
export type DepartmentCode = (typeof DEPARTMENT)[keyof typeof DEPARTMENT];

/**
 * Metadata key cho department authorization
 */
export const DEPARTMENT_AUTH_KEY = 'department_authorization';

/**
 * Options cho @RequireDepartment decorator
 */
export type DepartmentAuthOptions = {
  /**
   * Danh sách department codes được phép truy cập.
   * Kiểm tra cả departmentCode trực tiếp và qua department ancestors.
   * @example [DEPARTMENT.SALES, DEPARTMENT.ACCOUNTING]
   */
  allowedDepartments?: DepartmentCode[];

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
  checkedBy?: 'department' | 'manager' | 'executive';
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
};
