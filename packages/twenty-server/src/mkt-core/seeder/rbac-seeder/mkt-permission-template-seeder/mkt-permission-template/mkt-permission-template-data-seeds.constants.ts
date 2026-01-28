/**
 * Permission Template Seed Data Constants
 *
 * Defines permission templates for organization levels
 * Templates: CEO, VP, DIRECTOR, MANAGER, TEAM_LEAD, SENIOR, JUNIOR, etc.
 */

import { DepartmentCode } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';

// Template Types
const TEMPLATE_TYPE = {
  ROLE_BASED: 'ROLE_BASED',
  HIERARCHY_BASED: 'HIERARCHY_BASED',
  DEPARTMENT_BASED: 'DEPARTMENT_BASED',
  CUSTOM: 'CUSTOM',
} as const;

// Resolution Strategies
const RESOLUTION_STRATEGY = {
  PRIORITY_BASED: 'PRIORITY_BASED',
  MOST_RESTRICTIVE: 'MOST_RESTRICTIVE',
  MOST_PERMISSIVE: 'MOST_PERMISSIVE',
} as const;

// Created By Source
const CREATED_BY_SOURCE = {
  SYSTEM: 'SYSTEM',
  ADMIN: 'ADMIN',
  MIGRATION: 'MIGRATION',
} as const;

type MktPermissionTemplateDataSeed = {
  id: string;
  templateKey: string;
  templateName: string;
  templateNameEn: string | null;
  description: string | null;
  templateType: string;
  departmentType: string | null;
  hierarchyLevel: number | null;
  applicableToLevels: string; // JSON string array of hierarchy levels
  version: string;
  isSystemTemplate: boolean;
  isActive: boolean;
  priority: number;
  resolutionStrategy: string;
  createdBySource: string;
  position: number;
};

export const MKT_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS: (keyof MktPermissionTemplateDataSeed)[] =
  [
    'id',
    'templateKey',
    'templateName',
    'templateNameEn',
    'description',
    'templateType',
    'departmentType',
    'hierarchyLevel',
    'applicableToLevels',
    'version',
    'isSystemTemplate',
    'isActive',
    'priority',
    'resolutionStrategy',
    'createdBySource',
    'position',
  ];

export const MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS = {
  CEO: '356cdc25-9675-4bac-a919-4212a0b8fdf4',
  VP: '1abd97ab-3486-4ec9-a385-8bda9e46f472',
  DIRECTOR: 'a5ac0dd5-5060-4060-ad66-6c775ea769e5',
  MANAGER: 'ba8a28d0-4055-4897-b491-f72f4d08ceda',
  TEAM_LEAD: '9be61b0e-21d0-418a-b97c-5fa9a2695aa8',
  SENIOR: '419cc0a6-936a-456d-b7ba-8f5fdfc065e9',
  JUNIOR: 'f221b26d-a33f-437c-b3af-b0883ca0267b',
  FINANCE_ANALYST: 'd28fae85-ad68-4e10-864d-074544dbacd8',
  // SALES Department Templates
  SALES_DIRECTOR: 'd1871397-c96f-48fe-a250-7288c4890e34',
  SALES_MANAGER: 'ae3c6beb-9ced-407b-9b71-7468dddbf2a1',
  SALES_STAFF: '21e0c01d-6497-4696-a764-ec42b482ba46',
  // FINANCE Department Templates
  ACCOUNTANT_STAFF: 'f48ca42f-e151-43cb-b800-1a9648a47a2b',
  // SUPPORT Department Templates
  SUPPORT_STAFF: 'e9af0836-e894-4d96-b412-eddea6dee05f',
};

export const MKT_PERMISSION_TEMPLATE_DATA_SEEDS: MktPermissionTemplateDataSeed[] =
  [
    // Executive Level
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.CEO,
      templateKey: 'CEO',
      templateName: 'Tổng Giám đốc',
      templateNameEn: 'Chief Executive Officer',
      description: 'Full access to all resources and actions',
      templateType: TEMPLATE_TYPE.HIERARCHY_BASED,
      departmentType: DepartmentCode.EXECUTIVE,
      hierarchyLevel: 1,
      applicableToLevels: JSON.stringify([1]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 1000,
      resolutionStrategy: RESOLUTION_STRATEGY.PRIORITY_BASED,
      createdBySource: CREATED_BY_SOURCE.SYSTEM,
      position: 1,
    },
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.VP,
      templateKey: 'VP',
      templateName: 'Phó Tổng Giám đốc',
      templateNameEn: 'Vice President',
      description:
        'High-level access with some restrictions on system settings',
      templateType: TEMPLATE_TYPE.HIERARCHY_BASED,
      departmentType: DepartmentCode.EXECUTIVE,
      hierarchyLevel: 2,
      applicableToLevels: JSON.stringify([2]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 900,
      resolutionStrategy: RESOLUTION_STRATEGY.PRIORITY_BASED,
      createdBySource: CREATED_BY_SOURCE.SYSTEM,
      position: 2,
    },

    // Management Level
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.DIRECTOR,
      templateKey: 'DIRECTOR',
      templateName: 'Giám đốc',
      templateNameEn: 'Director',
      description: 'Department-level management access',
      templateType: TEMPLATE_TYPE.HIERARCHY_BASED,
      departmentType: null,
      hierarchyLevel: 3,
      applicableToLevels: JSON.stringify([3]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 800,
      resolutionStrategy: RESOLUTION_STRATEGY.PRIORITY_BASED,
      createdBySource: CREATED_BY_SOURCE.SYSTEM,
      position: 3,
    },
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.MANAGER,
      templateKey: 'MANAGER',
      templateName: 'Trưởng phòng',
      templateNameEn: 'Manager',
      description: 'Team management and operational access',
      templateType: TEMPLATE_TYPE.HIERARCHY_BASED,
      departmentType: null,
      hierarchyLevel: 4,
      applicableToLevels: JSON.stringify([4]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 700,
      resolutionStrategy: RESOLUTION_STRATEGY.PRIORITY_BASED,
      createdBySource: CREATED_BY_SOURCE.SYSTEM,
      position: 4,
    },
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.TEAM_LEAD,
      templateKey: 'TEAM_LEAD',
      templateName: 'Trưởng nhóm',
      templateNameEn: 'Team Lead',
      description: 'Team coordination and limited management access',
      templateType: TEMPLATE_TYPE.HIERARCHY_BASED,
      departmentType: null,
      hierarchyLevel: 5,
      applicableToLevels: JSON.stringify([5]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 600,
      resolutionStrategy: RESOLUTION_STRATEGY.PRIORITY_BASED,
      createdBySource: CREATED_BY_SOURCE.SYSTEM,
      position: 5,
    },

    // Staff Level
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SENIOR,
      templateKey: 'SENIOR',
      templateName: 'Nhân viên cao cấp',
      templateNameEn: 'Senior Staff',
      description: 'Full operational access with limited management features',
      templateType: TEMPLATE_TYPE.ROLE_BASED,
      departmentType: null,
      hierarchyLevel: 6,
      applicableToLevels: JSON.stringify([6]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 500,
      resolutionStrategy: RESOLUTION_STRATEGY.PRIORITY_BASED,
      createdBySource: CREATED_BY_SOURCE.SYSTEM,
      position: 6,
    },
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.JUNIOR,
      templateKey: 'JUNIOR',
      templateName: 'Nhân viên',
      templateNameEn: 'Junior Staff',
      description: 'Basic operational access with read-heavy permissions',
      templateType: TEMPLATE_TYPE.ROLE_BASED,
      departmentType: null,
      hierarchyLevel: 7,
      applicableToLevels: JSON.stringify([7]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 400,
      resolutionStrategy: RESOLUTION_STRATEGY.PRIORITY_BASED,
      createdBySource: CREATED_BY_SOURCE.SYSTEM,
      position: 7,
    },

    // Specialized Roles
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.FINANCE_ANALYST,
      templateKey: 'FINANCE_ANALYST',
      templateName: 'Chuyên viên tài chính',
      templateNameEn: 'Finance Analyst',
      description: 'Specialized access to financial data and reports',
      templateType: TEMPLATE_TYPE.DEPARTMENT_BASED,
      departmentType: DepartmentCode.FINANCE,
      hierarchyLevel: 6,
      applicableToLevels: JSON.stringify([5, 6, 7]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 550,
      resolutionStrategy: RESOLUTION_STRATEGY.MOST_RESTRICTIVE,
      createdBySource: CREATED_BY_SOURCE.SYSTEM,
      position: 8,
    },

    // ===========================================
    // SALES Department Templates
    // ===========================================
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_DIRECTOR,
      templateKey: 'SALES_DIRECTOR',
      templateName: 'Giám đốc kinh doanh',
      templateNameEn: 'Sales Director',
      description:
        'Full department access to customers, orders, with read access to licenses and invoices',
      templateType: TEMPLATE_TYPE.DEPARTMENT_BASED,
      departmentType: DepartmentCode.SALES,
      hierarchyLevel: 5,
      applicableToLevels: JSON.stringify([5]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 800,
      resolutionStrategy: RESOLUTION_STRATEGY.PRIORITY_BASED,
      createdBySource: CREATED_BY_SOURCE.SYSTEM,
      position: 9,
    },
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_MANAGER,
      templateKey: 'SALES_MANAGER',
      templateName: 'Trưởng phòng kinh doanh',
      templateNameEn: 'Sales Manager',
      description:
        'Team-level access to customers and orders, limited license update, read invoices',
      templateType: TEMPLATE_TYPE.DEPARTMENT_BASED,
      departmentType: DepartmentCode.SALES,
      hierarchyLevel: 7,
      applicableToLevels: JSON.stringify([6, 7]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 700,
      resolutionStrategy: RESOLUTION_STRATEGY.PRIORITY_BASED,
      createdBySource: CREATED_BY_SOURCE.SYSTEM,
      position: 10,
    },
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_STAFF,
      templateKey: 'SALES_STAFF',
      templateName: 'Nhân viên kinh doanh',
      templateNameEn: 'Sales Staff',
      description:
        'Own record access to customers and orders, read-only licenses and invoices',
      templateType: TEMPLATE_TYPE.DEPARTMENT_BASED,
      departmentType: DepartmentCode.SALES,
      hierarchyLevel: 9,
      applicableToLevels: JSON.stringify([8, 9, 10]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 500,
      resolutionStrategy: RESOLUTION_STRATEGY.PRIORITY_BASED,
      createdBySource: CREATED_BY_SOURCE.SYSTEM,
      position: 11,
    },

    // ===========================================
    // FINANCE Department Templates
    // ===========================================
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.ACCOUNTANT_STAFF,
      templateKey: 'ACCOUNTANT_STAFF',
      templateName: 'Nhân viên kế toán',
      templateNameEn: 'Accountant Staff',
      description:
        'Full access to invoices and payments, read access to orders, customers, and licenses for financial reconciliation',
      templateType: TEMPLATE_TYPE.DEPARTMENT_BASED,
      departmentType: DepartmentCode.FINANCE,
      hierarchyLevel: 8,
      applicableToLevels: JSON.stringify([7, 8, 9, 10]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 550,
      resolutionStrategy: RESOLUTION_STRATEGY.PRIORITY_BASED,
      createdBySource: CREATED_BY_SOURCE.SYSTEM,
      position: 12,
    },

    // ===========================================
    // SUPPORT Department Templates
    // ===========================================
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SUPPORT_STAFF,
      templateKey: 'SUPPORT_STAFF',
      templateName: 'Nhân viên hỗ trợ',
      templateNameEn: 'Support Staff',
      description:
        'Read access to customers, orders, licenses, payments; update order status for support cases',
      templateType: TEMPLATE_TYPE.DEPARTMENT_BASED,
      departmentType: DepartmentCode.SUPPORT,
      hierarchyLevel: 8,
      applicableToLevels: JSON.stringify([7, 8, 9, 10]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 500,
      resolutionStrategy: RESOLUTION_STRATEGY.PRIORITY_BASED,
      createdBySource: CREATED_BY_SOURCE.SYSTEM,
      position: 13,
    },
  ];
