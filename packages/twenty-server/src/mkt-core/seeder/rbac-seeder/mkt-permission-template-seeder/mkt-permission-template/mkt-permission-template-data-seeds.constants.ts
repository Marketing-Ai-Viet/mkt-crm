/**
 * Permission Template Seed Data Constants
 *
 * Defines permission templates for organization levels
 * Templates: CEO, VP, DIRECTOR, MANAGER, TEAM_LEAD, SENIOR, JUNIOR, etc.
 */

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
  CEO: '45b17cbf-c650-47ec-9e18-b6ee7688d2a0',
  VP: '36484001-77f6-4256-80c9-f45c5fe622cc',
  DIRECTOR: '9a5d7c26-48f2-4617-b33c-798ce17df80d',
  MANAGER: '77739473-30c5-44ec-90d5-0eff1e77f53c',
  TEAM_LEAD: '093bd5ff-a606-4bb3-ae66-c5b17b02f72c',
  SENIOR: '36f95d97-7217-4333-9940-ed1a11d8d06f',
  JUNIOR: 'c9c7058b-b12c-40b6-9b7f-9ce96033470d',
  FINANCE_ANALYST: 'b75fadca-0d2a-4bba-bf9c-efb0fe558ad7',
};

export const MKT_PERMISSION_TEMPLATE_DATA_SEEDS: MktPermissionTemplateDataSeed[] =
  [
    // Executive Level
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.CEO,
      templateKey: 'CEO',
      templateName: 'Chief Executive Officer',
      description: 'Full access to all resources and actions',
      templateType: TEMPLATE_TYPE.HIERARCHY_BASED,
      departmentType: 'EXECUTIVE',
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
      templateName: 'Vice President',
      description:
        'High-level access with some restrictions on system settings',
      templateType: TEMPLATE_TYPE.HIERARCHY_BASED,
      departmentType: 'EXECUTIVE',
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
      templateName: 'Director',
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
      templateName: 'Manager',
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
      templateName: 'Team Lead',
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
      templateName: 'Senior Staff',
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
      templateName: 'Junior Staff',
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
      templateName: 'Finance Analyst',
      description: 'Specialized access to financial data and reports',
      templateType: TEMPLATE_TYPE.DEPARTMENT_BASED,
      departmentType: 'FINANCE',
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
  ];
