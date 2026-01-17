/**
 * Department Authorization Helpers
 *
 * Helper functions để xử lý department inheritance trong authorization rules.
 * Giải quyết vấn đề: team con (TECH_BACKEND) không được authorize khi chỉ khai báo parent (TECH)
 */

import { DEPARTMENT_CHILDREN_MAP } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';

/**
 * Get department code với tất cả child teams
 *
 * @param departmentCode - Parent department code
 * @returns Array chứa parent và tất cả child teams
 *
 * @example
 * withChildTeams(DEPARTMENT.TECH)
 * // Returns: ['TECH', 'TECH_BACKEND', 'TECH_FRONTEND', 'TECH_DEVOPS', 'TECH_QA', 'TECH_DATA']
 */
export const withChildTeams = (departmentCode: string): string[] => {
  const teams = DEPARTMENT_CHILDREN_MAP[departmentCode];

  return teams ? [...teams] : [departmentCode];
};

/**
 * Get department với child teams, loại trừ một số teams cụ thể
 *
 * @param departmentCode - Parent department code
 * @param excludeTeams - Teams cần loại trừ
 * @returns Array chứa parent và child teams (trừ những teams bị exclude)
 *
 * @example
 * withChildTeamsExcept(DEPARTMENT.SALES, [TEAM.SALES_INTERNATIONAL])
 * // Returns: ['SALES', 'SALES_DOMESTIC', 'SALES_PARTNER', 'SALES_ONLINE']
 */
export const withChildTeamsExcept = (
  departmentCode: string,
  excludeTeams: string[],
): string[] => {
  const allTeams = withChildTeams(departmentCode);

  return allTeams.filter((team) => !excludeTeams.includes(team));
};

/**
 * Get chỉ child teams của một department (không bao gồm parent)
 *
 * @param departmentCode - Parent department code
 * @returns Array chứa chỉ child teams
 *
 * @example
 * childTeamsOnly(DEPARTMENT.TECH)
 * // Returns: ['TECH_BACKEND', 'TECH_FRONTEND', 'TECH_DEVOPS', 'TECH_QA', 'TECH_DATA']
 */
export const childTeamsOnly = (departmentCode: string): string[] => {
  const allTeams = DEPARTMENT_CHILDREN_MAP[departmentCode];

  if (!allTeams) {
    return [];
  }

  return [...allTeams].filter((team: string) => team !== departmentCode);
};

/**
 * Combine multiple departments với child teams
 *
 * @param departmentCodes - Array of department codes
 * @returns Flattened array của tất cả departments và child teams
 *
 * @example
 * combineWithChildTeams([DEPARTMENT.SALES, DEPARTMENT.TECH])
 * // Returns: ['SALES', 'SALES_DOMESTIC', ..., 'TECH', 'TECH_BACKEND', ...]
 */
export const combineWithChildTeams = (departmentCodes: string[]): string[] => {
  const result = new Set<string>();

  for (const code of departmentCodes) {
    const teams = withChildTeams(code);

    for (const team of teams) {
      result.add(team);
    }
  }

  return [...result];
};

/**
 * Check if a team belongs to a department
 *
 * @param teamCode - Team code to check
 * @param departmentCode - Parent department code
 * @returns true if team belongs to department
 *
 * @example
 * isTeamOfDepartment(TEAM.TECH_BACKEND, DEPARTMENT.TECH) // true
 * isTeamOfDepartment(TEAM.SALES_DOMESTIC, DEPARTMENT.TECH) // false
 */
export const isTeamOfDepartment = (
  teamCode: string,
  departmentCode: string,
): boolean => {
  const teams = withChildTeams(departmentCode);

  return teams.includes(teamCode);
};

/**
 * Get parent department của một team
 *
 * @param teamCode - Team code
 * @returns Parent department code hoặc null
 *
 * @example
 * getParentDepartment(TEAM.TECH_BACKEND) // 'TECH'
 * getParentDepartment(DEPARTMENT.TECH) // null (đã là parent)
 */
export const getParentDepartment = (teamCode: string): string | null => {
  for (const [dept, teams] of Object.entries(DEPARTMENT_CHILDREN_MAP)) {
    if ((teams as readonly string[]).includes(teamCode) && teamCode !== dept) {
      return dept;
    }
  }

  return null;
};
