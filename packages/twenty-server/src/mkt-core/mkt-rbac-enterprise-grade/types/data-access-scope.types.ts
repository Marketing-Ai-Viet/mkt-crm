/**
 * Data Access Scope Types và Helper Functions
 *
 * Định nghĩa các scope truy cập dữ liệu dựa trên hierarchy level của user.
 *
 * Mapping với Hierarchy Level:
 * - Level 1-3 (CEO, C_LEVEL, VP): ALL_DEPARTMENTS
 * - Level 4-6 (Director, Senior Manager, Manager): OWN_AND_CHILD_DEPARTMENTS
 * - Level 7 (Team Lead): OWN_DEPARTMENT_AND_TEAM
 * - Level 8-11 (Senior, Staff, Junior, Intern): OWN_RECORDS
 */

import { HierarchyLevel } from './hierarchy.types';

/**
 * Các loại Data Access Scope
 */
export const DATA_ACCESS_SCOPE = {
  /** Truy cập tất cả departments (CEO, C-Level, VP) */
  ALL_DEPARTMENTS: 'ALL_DEPARTMENTS',
  /** Truy cập phòng ban hiện tại và các phòng ban con (Director, Manager) */
  OWN_AND_CHILD_DEPARTMENTS: 'OWN_AND_CHILD_DEPARTMENTS',
  /** Truy cập phòng ban hiện tại và team members (Team Lead) */
  OWN_DEPARTMENT_AND_TEAM: 'OWN_DEPARTMENT_AND_TEAM',
  /** Chỉ truy cập records của chính mình (Staff, Intern) */
  OWN_RECORDS: 'OWN_RECORDS',
} as const;

export type DataAccessScopeType =
  (typeof DATA_ACCESS_SCOPE)[keyof typeof DATA_ACCESS_SCOPE];

// ============================================
// HIERARCHY LEVEL THRESHOLDS
// ============================================

/**
 * Các ngưỡng hierarchy level cho các loại quyền
 */
export const HIERARCHY_THRESHOLDS = {
  /** Level tối đa để có full access (1-3) */
  FULL_ACCESS_MAX_LEVEL: 3,
  /** Level tối đa để có child departments access (1-6) */
  CHILD_DEPARTMENTS_MAX_LEVEL: 6,
  /** Level để có team access (7) */
  TEAM_ACCESS_LEVEL: 7,
  /** Level tối đa để có thể manage team (1-7) */
  MANAGE_TEAM_MAX_LEVEL: 7,
  /** Level tối đa để xem subordinates (1-7) */
  VIEW_SUBORDINATES_MAX_LEVEL: 7,
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get data access scope dựa trên hierarchy level
 *
 * @param hierarchyLevel - Hierarchy level của user (1-11)
 * @returns DataAccessScopeType tương ứng
 *
 * @example
 * getDataAccessScopeByLevel(1) // 'ALL_DEPARTMENTS' (CEO)
 * getDataAccessScopeByLevel(5) // 'OWN_AND_CHILD_DEPARTMENTS' (Senior Manager)
 * getDataAccessScopeByLevel(7) // 'OWN_DEPARTMENT_AND_TEAM' (Team Lead)
 * getDataAccessScopeByLevel(9) // 'OWN_RECORDS' (Staff)
 */
export const getDataAccessScopeByLevel = (
  hierarchyLevel: HierarchyLevel,
): DataAccessScopeType => {
  if (hierarchyLevel <= HIERARCHY_THRESHOLDS.FULL_ACCESS_MAX_LEVEL) {
    return DATA_ACCESS_SCOPE.ALL_DEPARTMENTS;
  }

  if (hierarchyLevel <= HIERARCHY_THRESHOLDS.CHILD_DEPARTMENTS_MAX_LEVEL) {
    return DATA_ACCESS_SCOPE.OWN_AND_CHILD_DEPARTMENTS;
  }

  if (hierarchyLevel === HIERARCHY_THRESHOLDS.TEAM_ACCESS_LEVEL) {
    return DATA_ACCESS_SCOPE.OWN_DEPARTMENT_AND_TEAM;
  }

  return DATA_ACCESS_SCOPE.OWN_RECORDS;
};

/**
 * Check xem user có full access không (level 1-3: CEO, C_LEVEL, VP)
 *
 * @param hierarchyLevel - Hierarchy level của user
 * @returns true nếu user có full access
 */
export const hasFullAccess = (hierarchyLevel: HierarchyLevel): boolean =>
  hierarchyLevel <= HIERARCHY_THRESHOLDS.FULL_ACCESS_MAX_LEVEL;

/**
 * Check xem user có thể manage team không (level 1-7)
 *
 * @param hierarchyLevel - Hierarchy level của user
 * @returns true nếu user có thể manage team
 */
export const canManageTeam = (hierarchyLevel: HierarchyLevel): boolean =>
  hierarchyLevel <= HIERARCHY_THRESHOLDS.MANAGE_TEAM_MAX_LEVEL;

/**
 * Check xem user có thể xem subordinates không (level 1-7)
 *
 * @param hierarchyLevel - Hierarchy level của user
 * @returns true nếu user có thể xem subordinates
 */
export const canViewSubordinates = (hierarchyLevel: HierarchyLevel): boolean =>
  hierarchyLevel <= HIERARCHY_THRESHOLDS.VIEW_SUBORDINATES_MAX_LEVEL;

/**
 * Check xem scope có phải ALL_DEPARTMENTS không
 */
export const isAllDepartmentsScope = (
  scope: DataAccessScopeType,
): scope is typeof DATA_ACCESS_SCOPE.ALL_DEPARTMENTS =>
  scope === DATA_ACCESS_SCOPE.ALL_DEPARTMENTS;

/**
 * Check xem scope có phải OWN_RECORDS không
 */
export const isOwnRecordsOnlyScope = (
  scope: DataAccessScopeType,
): scope is typeof DATA_ACCESS_SCOPE.OWN_RECORDS =>
  scope === DATA_ACCESS_SCOPE.OWN_RECORDS;

/**
 * Check xem scope có thể access child departments không
 * (ALL_DEPARTMENTS hoặc OWN_AND_CHILD_DEPARTMENTS)
 */
export const canAccessChildDepartments = (
  scope: DataAccessScopeType,
): boolean =>
  scope === DATA_ACCESS_SCOPE.ALL_DEPARTMENTS ||
  scope === DATA_ACCESS_SCOPE.OWN_AND_CHILD_DEPARTMENTS;
