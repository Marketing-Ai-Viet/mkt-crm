/**
 * Hierarchy Level Enumeration
 * Defines the organizational hierarchy levels from CEO to Intern
 */
export enum HierarchyLevel {
  CEO = 1, // Chief Executive Officer
  C_LEVEL = 2, // C-Level Executives (CTO, CFO, COO, etc.)
  VP = 3, // Vice Presidents
  SENIOR_DIRECTOR = 4, // Senior Directors
  DIRECTOR = 5, // Directors
  SENIOR_MANAGER = 6, // Senior Managers
  MANAGER = 7, // Managers
  SENIOR_SPECIALIST = 8, // Senior Specialists/Lead
  SPECIALIST = 9, // Specialists/Senior
  JUNIOR_SPECIALIST = 10, // Junior Specialists
  INTERN = 11, // Interns/Entry Level
}

/**
 * Department Types in Organization
 * Defines all possible department types within the organization
 */
export enum DepartmentType {
  EXECUTIVE = 'EXECUTIVE',
  ENGINEERING = 'ENGINEERING',
  PRODUCT = 'PRODUCT',
  SALES = 'SALES',
  MARKETING = 'MARKETING',
  FINANCE = 'FINANCE',
  HR = 'HR',
  OPERATIONS = 'OPERATIONS',
  LEGAL = 'LEGAL',
  SECURITY = 'SECURITY',
  CUSTOMER_SUCCESS = 'CUSTOMER_SUCCESS',
  SUPPORT = 'SUPPORT',
  OTHER = 'OTHER',
}

/**
 * Reporting Relationship Types
 * Defines the types of relationships between users in the hierarchy
 */
export enum ReportingRelationship {
  DIRECT_REPORT = 'DIRECT_REPORT', // Direct subordinate
  INDIRECT_REPORT = 'INDIRECT_REPORT', // Subordinate through hierarchy
  PEER = 'PEER', // Same level, same department
  CROSS_DEPARTMENT_PEER = 'CROSS_DEPARTMENT_PEER', // Same level, different department
  MANAGER = 'MANAGER', // Direct manager
  SENIOR_MANAGER = 'SENIOR_MANAGER', // Manager through hierarchy
  UNRELATED = 'UNRELATED', // No reporting relationship
}

/**
 * Hierarchy Constants
 * Configuration values for hierarchy-related functionality
 */
export const HIERARCHY_CONSTANTS = {
  MAX_HIERARCHY_LEVELS: 11,
  MAX_REPORTING_CHAIN_LENGTH: 10,
  MAX_SUBORDINATES_PER_MANAGER: 50,
  DEFAULT_CACHE_TTL: 300, // 5 minutes
  EMERGENCY_ACCESS_DURATION: 60, // 1 hour in minutes
  MAX_CROSS_DEPARTMENT_REQUESTS_PER_DAY: 10,
} as const;
