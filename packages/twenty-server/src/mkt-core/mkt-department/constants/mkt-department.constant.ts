import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

export enum DEPARTMENT_TYPE {
  DEPARTMENT = 'DEPARTMENT',
  TEAM = 'TEAM',
}

export const DEPARTMENT_TYPE_OPTIONS = [
  {
    label: 'Department',
    value: DEPARTMENT_TYPE.DEPARTMENT,
    color: 'blue' as TagColor,
    position: 1,
  },
  {
    label: 'Team',
    value: DEPARTMENT_TYPE.TEAM,
    color: 'green' as TagColor,
    position: 2,
  },
];

// ============================================================================
// DEPARTMENT CODES (Level 1)
// ============================================================================

/**
 * Department Code - Canonical department identifiers
 * Used for department-based permission templates and access control
 */
export enum DepartmentCode {
  // Core Business Departments
  SALES = 'SALES',
  SUPPORT = 'SUPPORT',
  ACCOUNTING = 'ACCOUNTING',
  FINANCE = 'FINANCE',
  MARKETING = 'MARKETING',

  // Administrative Departments
  HR = 'HR',
  ADMIN = 'ADMIN',
  LEGAL = 'LEGAL',

  // Technical Departments
  TECH = 'TECH',
  IT = 'IT',
  ENGINEERING = 'ENGINEERING',
  QA = 'QA',
  PRODUCT = 'PRODUCT',
  SECURITY = 'SECURITY',

  // Executive Level
  EXECUTIVE = 'EXECUTIVE',

  // Operations
  OPERATIONS = 'OPERATIONS',
  LOGISTICS = 'LOGISTICS',
  PROCUREMENT = 'PROCUREMENT',

  // Customer Facing
  CUSTOMER_SUCCESS = 'CUSTOMER_SUCCESS',
  PARTNERSHIPS = 'PARTNERSHIPS',

  // Other
  OTHER = 'OTHER',
}

/**
 * DEPARTMENT object for backward compatibility
 * Provides object-style access: DEPARTMENT.SALES, DEPARTMENT.ACCOUNTING
 * @example
 * import { DEPARTMENT } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
 * const allowedDepts = [DEPARTMENT.SALES, DEPARTMENT.ACCOUNTING];
 */
export const DEPARTMENT = {
  ...DepartmentCode,
} as const;

// ============================================================================
// DEPARTMENT GROUPS
// ============================================================================

/**
 * Department Code Groups - Logical groupings of departments
 */
export const DEPARTMENT_CODE_GROUP = {
  REVENUE_GENERATING: [
    DepartmentCode.SALES,
    DepartmentCode.MARKETING,
    DepartmentCode.PARTNERSHIPS,
  ] as const,
  CUSTOMER_FACING: [
    DepartmentCode.SALES,
    DepartmentCode.SUPPORT,
    DepartmentCode.CUSTOMER_SUCCESS,
  ] as const,
  FINANCIAL: [DepartmentCode.ACCOUNTING, DepartmentCode.FINANCE] as const,
  TECHNICAL: [
    DepartmentCode.TECH,
    DepartmentCode.IT,
    DepartmentCode.ENGINEERING,
    DepartmentCode.QA,
  ] as const,
  ADMINISTRATIVE: [
    DepartmentCode.HR,
    DepartmentCode.ADMIN,
    DepartmentCode.LEGAL,
  ] as const,
  OPERATIONS: [
    DepartmentCode.OPERATIONS,
    DepartmentCode.LOGISTICS,
    DepartmentCode.PROCUREMENT,
  ] as const,
} as const;

// ============================================================================
// DEPARTMENT CROSS-ACCESS
// ============================================================================

/**
 * Department Cross-Access Level
 * Defines how departments can access data from other departments
 */
export enum DepartmentCrossAccessLevel {
  FULL = 'FULL', // Can access all data from other departments
  LIMITED = 'LIMITED', // Can access some data with restrictions
  RESTRICTED = 'RESTRICTED', // Minimal cross-department access
  NONE = 'NONE', // No cross-department access
}

/**
 * Department Cross-Access Configuration
 * Maps department codes to their cross-access levels
 */
export const DEPARTMENT_CROSS_ACCESS: Record<
  DepartmentCode,
  DepartmentCrossAccessLevel
> = {
  [DepartmentCode.SALES]: DepartmentCrossAccessLevel.LIMITED,
  [DepartmentCode.SUPPORT]: DepartmentCrossAccessLevel.LIMITED,
  [DepartmentCode.ACCOUNTING]: DepartmentCrossAccessLevel.RESTRICTED,
  [DepartmentCode.FINANCE]: DepartmentCrossAccessLevel.RESTRICTED,
  [DepartmentCode.MARKETING]: DepartmentCrossAccessLevel.LIMITED,
  [DepartmentCode.HR]: DepartmentCrossAccessLevel.RESTRICTED,
  [DepartmentCode.ADMIN]: DepartmentCrossAccessLevel.FULL,
  [DepartmentCode.LEGAL]: DepartmentCrossAccessLevel.RESTRICTED,
  [DepartmentCode.TECH]: DepartmentCrossAccessLevel.FULL,
  [DepartmentCode.IT]: DepartmentCrossAccessLevel.FULL,
  [DepartmentCode.ENGINEERING]: DepartmentCrossAccessLevel.LIMITED,
  [DepartmentCode.QA]: DepartmentCrossAccessLevel.LIMITED,
  [DepartmentCode.PRODUCT]: DepartmentCrossAccessLevel.LIMITED,
  [DepartmentCode.SECURITY]: DepartmentCrossAccessLevel.RESTRICTED,
  [DepartmentCode.EXECUTIVE]: DepartmentCrossAccessLevel.FULL,
  [DepartmentCode.OPERATIONS]: DepartmentCrossAccessLevel.LIMITED,
  [DepartmentCode.LOGISTICS]: DepartmentCrossAccessLevel.LIMITED,
  [DepartmentCode.PROCUREMENT]: DepartmentCrossAccessLevel.LIMITED,
  [DepartmentCode.CUSTOMER_SUCCESS]: DepartmentCrossAccessLevel.LIMITED,
  [DepartmentCode.PARTNERSHIPS]: DepartmentCrossAccessLevel.LIMITED,
  [DepartmentCode.OTHER]: DepartmentCrossAccessLevel.NONE,
};

// Level 2
export const TEAM = {
  // Level 2 of SALES
  SALES_DOMESTIC: 'SALES_DOMESTIC',
  SALES_INTERNATIONAL: 'SALES_INTERNATIONAL',
  SALES_PARTNER: 'SALES_PARTNER',
  SALES_ONLINE: 'SALES_ONLINE',

  // Level 2 of SUPPORT
  SUPPORT_CUSTOMER: 'SUPPORT_CUSTOMER',
  SUPPORT_TECHNICAL: 'SUPPORT_TECHNICAL',
  SUPPORT_INTERNAL: 'SUPPORT_INTERNAL',

  // Level 2 of ACCOUNTING
  ACCOUNTING_PAYABLE: 'ACCOUNTING_PAYABLE',
  ACCOUNTING_RECEIVABLE: 'ACCOUNTING_RECEIVABLE',
  ACCOUNTING_AUDIT: 'ACCOUNTING_AUDIT',
  ACCOUNTING_TAX: 'ACCOUNTING_TAX',

  // Level 2 of HR
  HR_RECRUITMENT: 'HR_RECRUITMENT',
  HR_TRAINING: 'HR_TRAINING',
  HR_PAYROLL: 'HR_PAYROLL',

  // Level 2 of TECH
  TECH_BACKEND: 'TECH_BACKEND',
  TECH_FRONTEND: 'TECH_FRONTEND',
  TECH_DEVOPS: 'TECH_DEVOPS',
  TECH_QA: 'TECH_QA',
  TECH_DATA: 'TECH_DATA',
};

// ============================================================================
// DEPARTMENT WITH CHILD TEAMS MAPPING
// ============================================================================

/**
 * Mapping từ parent department sang tất cả child teams
 * Used for authorization rules where child teams inherit parent permissions
 *
 * @example
 * DEPARTMENT_CHILDREN_MAP[DEPARTMENT.TECH]
 * // → ['TECH', 'TECH_BACKEND', 'TECH_FRONTEND', 'TECH_DEVOPS', 'TECH_QA', 'TECH_DATA']
 */
export const DEPARTMENT_CHILDREN_MAP: Record<string, readonly string[]> = {
  [DepartmentCode.SALES]: [
    DepartmentCode.SALES,
    TEAM.SALES_DOMESTIC,
    TEAM.SALES_INTERNATIONAL,
    TEAM.SALES_PARTNER,
    TEAM.SALES_ONLINE,
  ],
  [DepartmentCode.SUPPORT]: [
    DepartmentCode.SUPPORT,
    TEAM.SUPPORT_CUSTOMER,
    TEAM.SUPPORT_TECHNICAL,
    TEAM.SUPPORT_INTERNAL,
  ],
  [DepartmentCode.ACCOUNTING]: [
    DepartmentCode.ACCOUNTING,
    TEAM.ACCOUNTING_PAYABLE,
    TEAM.ACCOUNTING_RECEIVABLE,
    TEAM.ACCOUNTING_AUDIT,
    TEAM.ACCOUNTING_TAX,
  ],
  [DepartmentCode.HR]: [
    DepartmentCode.HR,
    TEAM.HR_RECRUITMENT,
    TEAM.HR_TRAINING,
    TEAM.HR_PAYROLL,
  ],
  [DepartmentCode.TECH]: [
    DepartmentCode.TECH,
    TEAM.TECH_BACKEND,
    TEAM.TECH_FRONTEND,
    TEAM.TECH_DEVOPS,
    TEAM.TECH_QA,
    TEAM.TECH_DATA,
  ],
} as const;

export const MKT_DEPARTMENT_DATA_SEEDS_IDS = {
  //Level 1,
  [DepartmentCode.SALES]: 'ad95f81e-bda5-4a98-b72a-880c0b5c204c',
  [DepartmentCode.SUPPORT]: '7d95bc7c-0e33-4514-9f77-143e98affdf6',
  [DepartmentCode.ACCOUNTING]: '5ee8a0af-2aef-4eb4-865c-d4bc143ee97b',
  [DepartmentCode.HR]: '00b72fe7-77d0-429c-87b9-d88b671ea502',
  [DepartmentCode.TECH]: 'e4fd8648-3739-4fec-8e37-44c90ee54a0c',
  // Level 2 of SALES,
  [TEAM.SALES_DOMESTIC]: '566d23d5-1498-4f7f-b61e-a7101772344a',
  [TEAM.SALES_INTERNATIONAL]: 'e1d75cc3-fd9c-4664-b921-a407b990fb81',
  [TEAM.SALES_PARTNER]: 'cd2a87e4-4be0-4fd1-8453-83c5ee5db84e',
  [TEAM.SALES_ONLINE]: '74bb89e9-5cd6-477c-97b7-d45aeeabe35f',
  // Level 2 of SUPPORT,
  [TEAM.SUPPORT_CUSTOMER]: 'ce3d9a7a-070d-4d61-b428-b26e2871c051',
  [TEAM.SUPPORT_TECHNICAL]: '678bb017-def6-434e-9b51-5c93d1e75586',
  [TEAM.SUPPORT_INTERNAL]: 'e735516e-caff-4353-bfcd-f3888f8c680e',
  // Level 2 of ACCOUNTING,
  [TEAM.ACCOUNTING_PAYABLE]: '4e58de05-cb22-4458-aab4-d3419474dd87',
  [TEAM.ACCOUNTING_RECEIVABLE]: 'dfbb7e24-2bf6-4931-9931-bd4ee6ddf5c4',
  [TEAM.ACCOUNTING_AUDIT]: 'a0c628da-9e89-49d2-adf7-5cd72e52f7fc',
  [TEAM.ACCOUNTING_TAX]: '5e0f8637-9237-4c04-9e4e-7aaf05ca1ee2',
  // Level 2 of HR,
  [TEAM.HR_RECRUITMENT]: '34b5a6e7-018d-490b-8b8b-3e6ae7ea5b2a',
  [TEAM.HR_TRAINING]: 'a1db2f35-32d8-4966-8bc2-5d196a9dac44',
  [TEAM.HR_PAYROLL]: 'd8df85db-32c9-4b57-bd46-5674f33c37f5',
  // Level 2 of TECH,
  [TEAM.TECH_BACKEND]: '9f9c5ea1-9f04-4f30-9a4d-e0cd8881064b',
  [TEAM.TECH_FRONTEND]: 'ec185734-d04e-4959-bb01-45185c65c00d',
  [TEAM.TECH_DEVOPS]: 'd13d2b30-6c87-48f1-b5ff-db1ca7931b05',
  [TEAM.TECH_QA]: 'f9577f42-498d-471f-a401-2b5959287a01',
  [TEAM.TECH_DATA]: '5e2748cc-0276-4fed-b8b2-df47fc1d1414',
};

// Sub-manager assignment seed IDs
export const MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS = {
  // SALES department sub-managers
  SALES_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456001',
  SALES_SUB_MANAGER_2: 'a1b2c3d4-e5f6-7890-abcd-ef0123456002',
  // SUPPORT department sub-managers
  SUPPORT_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456003',
  SUPPORT_SUB_MANAGER_2: 'a1b2c3d4-e5f6-7890-abcd-ef0123456030',
  // ACCOUNTING department sub-managers
  ACCOUNTING_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456004',
  ACCOUNTING_SUB_MANAGER_2: 'a1b2c3d4-e5f6-7890-abcd-ef0123456005',
  // HR department sub-managers
  HR_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456006',
  HR_SUB_MANAGER_2: 'a1b2c3d4-e5f6-7890-abcd-ef0123456031',
  // TECH department sub-managers
  TECH_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456007',
  TECH_SUB_MANAGER_2: 'a1b2c3d4-e5f6-7890-abcd-ef0123456008',
  TECH_SUB_MANAGER_3: 'a1b2c3d4-e5f6-7890-abcd-ef0123456009',

  // SALES TEAMS sub-managers
  SALES_DOMESTIC_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456010',
  SALES_DOMESTIC_SUB_MANAGER_2: 'a1b2c3d4-e5f6-7890-abcd-ef0123456011',
  SALES_INTERNATIONAL_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456012',
  SALES_PARTNER_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456013',
  SALES_ONLINE_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456014',

  // SUPPORT TEAMS sub-managers
  SUPPORT_CUSTOMER_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456015',
  SUPPORT_TECHNICAL_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456016',
  SUPPORT_INTERNAL_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456017',

  // ACCOUNTING TEAMS sub-managers
  ACCOUNTING_PAYABLE_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456018',
  ACCOUNTING_RECEIVABLE_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456019',
  ACCOUNTING_AUDIT_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456020',
  ACCOUNTING_TAX_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456021',

  // HR TEAMS sub-managers
  HR_RECRUITMENT_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456022',
  HR_TRAINING_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456023',
  HR_PAYROLL_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456024',

  // TECH TEAMS sub-managers
  TECH_BACKEND_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456025',
  TECH_FRONTEND_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456026',
  TECH_DEVOPS_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456027',
  TECH_QA_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456028',
  TECH_DATA_SUB_MANAGER_1: 'a1b2c3d4-e5f6-7890-abcd-ef0123456029',
};

// Department ancestry seed IDs (for RBAC hierarchy)
export const MKT_DEPARTMENT_ANCESTRY_DATA_SEEDS_IDS = {
  // SALES team ancestries (teams -> SALES department)
  SALES_DOMESTIC_TO_SALES: 'b2c3d4e5-f6a7-8901-bcde-f01234567101',
  SALES_INTERNATIONAL_TO_SALES: 'b2c3d4e5-f6a7-8901-bcde-f01234567102',
  SALES_PARTNER_TO_SALES: 'b2c3d4e5-f6a7-8901-bcde-f01234567103',
  SALES_ONLINE_TO_SALES: 'b2c3d4e5-f6a7-8901-bcde-f01234567104',
  // SUPPORT team ancestries (teams -> SUPPORT department)
  SUPPORT_CUSTOMER_TO_SUPPORT: 'b2c3d4e5-f6a7-8901-bcde-f01234567105',
  SUPPORT_TECHNICAL_TO_SUPPORT: 'b2c3d4e5-f6a7-8901-bcde-f01234567106',
  SUPPORT_INTERNAL_TO_SUPPORT: 'b2c3d4e5-f6a7-8901-bcde-f01234567107',
  // ACCOUNTING team ancestries (teams -> ACCOUNTING department)
  ACCOUNTING_PAYABLE_TO_ACCOUNTING: 'b2c3d4e5-f6a7-8901-bcde-f01234567108',
  ACCOUNTING_RECEIVABLE_TO_ACCOUNTING: 'b2c3d4e5-f6a7-8901-bcde-f01234567109',
  ACCOUNTING_AUDIT_TO_ACCOUNTING: 'b2c3d4e5-f6a7-8901-bcde-f01234567110',
  ACCOUNTING_TAX_TO_ACCOUNTING: 'b2c3d4e5-f6a7-8901-bcde-f01234567111',
  // HR team ancestries (teams -> HR department)
  HR_RECRUITMENT_TO_HR: 'b2c3d4e5-f6a7-8901-bcde-f01234567112',
  HR_TRAINING_TO_HR: 'b2c3d4e5-f6a7-8901-bcde-f01234567113',
  HR_PAYROLL_TO_HR: 'b2c3d4e5-f6a7-8901-bcde-f01234567114',
  // TECH team ancestries (teams -> TECH department)
  TECH_BACKEND_TO_TECH: 'b2c3d4e5-f6a7-8901-bcde-f01234567115',
  TECH_FRONTEND_TO_TECH: 'b2c3d4e5-f6a7-8901-bcde-f01234567116',
  TECH_DEVOPS_TO_TECH: 'b2c3d4e5-f6a7-8901-bcde-f01234567117',
  TECH_QA_TO_TECH: 'b2c3d4e5-f6a7-8901-bcde-f01234567118',
  TECH_DATA_TO_TECH: 'b2c3d4e5-f6a7-8901-bcde-f01234567119',
};

// ============================================================================
// HIERARCHY LEVELS
// ============================================================================

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

// ============================================================================
// TEMPLATE PRIORITY
// ============================================================================

/**
 * Template Priority Thresholds
 * Maps to permission template priorities in mktPermissionTemplate table
 *
 * Priority ordering (higher = more permissions):
 * - CEO: 1000
 * - VP: 900
 * - DIRECTOR: 800
 * - MANAGER: 700
 * - TEAM_LEAD: 600
 * - SENIOR: 500
 * - JUNIOR: 400
 */
export const TEMPLATE_PRIORITY = {
  /** CEO template priority - full access */
  CEO: 1000,
  /** VP template priority - near full access */
  VP: 900,
  /** Director template priority */
  DIRECTOR: 800,
  /** Manager template priority - used as default threshold for allowHighPriorityTemplates */
  MANAGER: 700,
  /** Team Lead template priority */
  TEAM_LEAD: 600,
  /** Finance Analyst template priority (department-specific) */
  FINANCE_ANALYST: 550,
  /** Senior staff template priority */
  SENIOR: 500,
  /** Junior staff template priority */
  JUNIOR: 400,
  /** Base priority for implicit permissions (department membership) */
  BASE: 100,
  /** User override priority (highest, always wins) */
  USER_OVERRIDE: 2000,
} as const;

// ============================================================================
// RESOLUTION STRATEGY
// ============================================================================

/**
 * Permission Resolution Strategy
 * Determines how to resolve conflicts when user has multiple permission sources
 */
export const RESOLUTION_STRATEGY = {
  /** Highest priority wins */
  PRIORITY_BASED: 'PRIORITY_BASED',
  /** If any source allows, access is granted */
  MOST_PERMISSIVE: 'MOST_PERMISSIVE',
  /** All sources must allow */
  MOST_RESTRICTIVE: 'MOST_RESTRICTIVE',
} as const;

export type ResolutionStrategyType =
  (typeof RESOLUTION_STRATEGY)[keyof typeof RESOLUTION_STRATEGY];
