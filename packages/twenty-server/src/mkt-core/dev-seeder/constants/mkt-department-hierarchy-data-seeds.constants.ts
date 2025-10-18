import { DateTime } from 'luxon';

import { MKT_DEPARTMENT_DATA_SEEDS_IDS } from './mkt-department-data-seeds.constants';

export enum MktDepartmentHierarchyRelationType {
  PARENT_CHILD = 'PARENT_CHILD',
  MATRIX = 'MATRIX',
  FUNCTIONAL = 'FUNCTIONAL',
  TEMPORARY = 'TEMPORARY',
}

type MktDepartmentHierarchyDataSeed = {
  id: string;
  parentDepartmentId: string;
  childDepartmentId: string;
  hierarchyLevel: number;
  relationshipType: MktDepartmentHierarchyRelationType;
  validFrom?: Date | null;
  validTo?: Date | null;
  inheritsPermissions?: boolean;
  canEscalateToParent?: boolean;
  allowsCrossBranchAccess?: boolean;
  displayOrder?: number;
  notes?: string;
  isActive?: boolean;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
  // New RBAC fields
  hierarchyPath?: string[];
  inheritsParentPermissions?: boolean;
  canViewTeamData?: boolean;
  canEditTeamData?: boolean;
  canExportTeamData?: boolean;
};

export const MKT_DEPARTMENT_HIERARCHY_DATA_SEED_COLUMNS: (keyof MktDepartmentHierarchyDataSeed)[] =
  [
    'id',
    'parentDepartmentId',
    'childDepartmentId',
    'hierarchyLevel',
    'relationshipType',
    'validFrom',
    'validTo',
    'inheritsPermissions',
    'canEscalateToParent',
    'allowsCrossBranchAccess',
    'displayOrder',
    'notes',
    'isActive',
    'position',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',
    'hierarchyPath',
    'inheritsParentPermissions',
    'canViewTeamData',
    'canEditTeamData',
    'canExportTeamData',
  ];

export const MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS = {
  // Original relationships
  SALES_SUPPORT: '47f46eda-96e3-4877-b6e3-7f8ef0029fdd',
  SALES_ACCOUNTING: 'd55a0f7d-9d5b-4c8e-ae7a-ba4b5e49701c',
  TECH_SUPPORT: '8ed127e2-d79c-41a3-a830-d4041410aff4',
  ADMIN_HR: 'daf2bb20-b559-4d94-a50b-f63a2dcdcac4',
  ADMIN_ACCOUNTING: 'a1b1e9ac-56a6-4ba3-a8b0-279a2f212194',
  ADMIN_TECH: '81caea88-92a5-4e88-8a9a-614ec785d244',
  ADMIN_SALES: 'd17d8021-602d-4ead-a220-406b86144abc',
  SALES_TECH_MATRIX: 'aefb86cc-de87-4438-a3b7-0f7f6ac025b5',
  HR_TECH_MATRIX: 'ad2b85b0-8404-4cf1-91ef-2ccfbcd00cf2',
  HR_SUPPORT_FUNCTIONAL: '4487180c-c871-4182-884a-22d1637b8cff',
  ACCOUNTING_SUPPORT_FUNCTIONAL: 'a97bf2b1-d05f-4e76-b34c-36ea98757031',

  // ================= LEVEL 2 HIERARCHIES =================
  // Sales -> Sales Domestic & Sales Export
  SALES_TO_SALES_DOMESTIC: '5f1c143c-90c5-45c4-8cee-7464017324d1',
  SALES_TO_SALES_EXPORT: 'a6af7234-ef9e-48ef-a4ab-505d12139ef3',

  // Tech -> Tech Frontend & Tech Backend
  TECH_TO_TECH_FRONTEND: 'c027150c-b936-453b-911d-fc23ab7bb413',
  TECH_TO_TECH_BACKEND: 'baf0f447-3644-4a5e-83a5-57ced22cc7be',

  // ================= LEVEL 3 HIERARCHIES =================
  // Sales Domestic -> Sales North & Sales South
  SALES_DOMESTIC_TO_SALES_NORTH: 'a1fe2c51-05b1-4483-a37e-ade38fe43b4f',
  SALES_DOMESTIC_TO_SALES_SOUTH: '766580a5-cc1a-45fd-9092-6cdbe0f1a526',

  // Sales Export -> Sales EU & Sales Asia
  SALES_EXPORT_TO_SALES_EU: '076da3d9-2582-4b91-b09f-1adefe7e0159',
  SALES_EXPORT_TO_SALES_ASIA: '6f1fc583-56ff-4af7-8b7d-7084973a7ada',

  // Tech Frontend -> Tech React & Tech Mobile
  TECH_FRONTEND_TO_TECH_REACT: 'a93125f0-13ec-40e7-a2a3-53c4341177f8',
  TECH_FRONTEND_TO_TECH_MOBILE: 'b6fbc2d9-3a6d-4ba6-882d-e81e630f355e',

  // Tech Backend -> Tech API & Tech Database
  TECH_BACKEND_TO_TECH_API: '8060e3a1-08b5-40de-a53c-ee59f2c9d16e',
  TECH_BACKEND_TO_TECH_DATABASE: '2c0bad88-0fa6-42a6-9caf-3601a5b95364',

  // ================= LEVEL 4 HIERARCHIES =================
  // Sales North -> Sales Hanoi
  SALES_NORTH_TO_SALES_HANOI: '692f715b-9ed1-4519-ada0-9869db2714ac',

  // Sales South -> Sales HCMC
  SALES_SOUTH_TO_SALES_HCMC: 'ce5f4b2c-94ba-4bd8-8bc5-cc25357f1a84',

  // Sales EU -> Sales Germany
  SALES_EU_TO_SALES_GERMANY: 'e32ba8f5-095c-44d5-a9f6-52c8263dfdda',

  // Sales Asia -> Sales Japan
  SALES_ASIA_TO_SALES_JAPAN: 'ccabfe1e-2b55-44dd-b522-258391c31cd4',

  // Tech React -> Tech Web & Tech Components
  TECH_REACT_TO_TECH_WEB: 'dde19390-2bb8-4f76-ae3e-1550c3089cd8',
  TECH_REACT_TO_TECH_COMPONENTS: '848ca922-53aa-4050-99ce-4ad54267d11b',

  // Tech Mobile -> Tech iOS & Tech Android
  TECH_MOBILE_TO_TECH_IOS: '24409329-b5a9-458c-bdaf-644f0bf66c94',
  TECH_MOBILE_TO_TECH_ANDROID: '0df2e137-e16c-4665-a82e-fcf9867894b5',

  // ================= LEVEL 5 HIERARCHIES =================
  // Sales Hanoi -> Sales Hanoi Retail & Sales Hanoi B2B
  SALES_HANOI_TO_SALES_HANOI_RETAIL: 'd7f5d9cb-5859-4949-a924-1fcca4e239f5',
  SALES_HANOI_TO_SALES_HANOI_B2B: '63d65a63-ddf3-4931-a07d-a937966cf3fe',

  // Sales HCMC -> Sales HCMC Retail & Sales HCMC B2B
  SALES_HCMC_TO_SALES_HCMC_RETAIL: 'daf2bb20-b559-4d94-a50b-f63a2dcdcac4',
  SALES_HCMC_TO_SALES_HCMC_B2B: 'a1b1e9ac-56a6-4ba3-a8b0-279a2f212194',

  // Tech Components -> Tech UI Library & Tech Design System
  TECH_COMPONENTS_TO_TECH_UI_LIBRARY: 'aefb86cc-de87-4438-a3b7-0f7f6ac025b5',
  TECH_COMPONENTS_TO_TECH_DESIGN_SYSTEM: '81caea88-92a5-4e88-8a9a-614ec785d244',

  // ================= LEVEL 6 HIERARCHIES =================
  // Sales Hanoi Retail -> Sales Hanoi Retail Online & Sales Hanoi Retail Offline
  SALES_HANOI_RETAIL_TO_ONLINE: 'd17d8021-602d-4ead-a220-406b86144abc',
  SALES_HANOI_RETAIL_TO_OFFLINE: 'ad2b85b0-8404-4cf1-91ef-2ccfbcd00cf2',

  // Tech UI Library -> Tech Component Library
  TECH_UI_LIBRARY_TO_TECH_COMPONENT_LIB: '4487180c-c871-4182-884a-22d1637b8cff',

  // Tech Design System -> Tech Theme System
  TECH_DESIGN_SYSTEM_TO_TECH_THEME_SYSTEM:
    'a97bf2b1-d05f-4e76-b34c-36ea98757031',

  // ================= LEVEL 7 HIERARCHIES =================
  // Sales Hanoi Retail Online -> Sales Hanoi E-commerce & Sales Hanoi Social Commerce
  SALES_HANOI_RETAIL_ONLINE_TO_ECOMMERCE:
    '5f1c143c-90c5-45c4-8cee-7464017324d1',
  SALES_HANOI_RETAIL_ONLINE_TO_SOCIAL: 'a6af7234-ef9e-48ef-a4ab-505d12139ef3',
};

export const MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS: MktDepartmentHierarchyDataSeed[] =
  [
    // Sales Department supervises Support Department
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_SUPPORT,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 1,
      notes:
        'Sales department provides strategic direction for customer support operations',
      isActive: true,
      position: 1,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: false,
    },

    // Sales Department has oversight of Accounting for revenue tracking
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_ACCOUNTING,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.FUNCTIONAL,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 2,
      notes:
        'Functional relationship for revenue tracking and financial reporting',
      isActive: true,
      position: 2,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: true,
    },

    // Tech Department provides technical support to Support Department
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_SUPPORT,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.MATRIX,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 3,
      notes: 'Matrix relationship for technical escalation and product support',
      isActive: true,
      position: 3,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: false,
      canEditTeamData: false,
      canExportTeamData: false,
    },

    // Admin Department coordinates with HR Department
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ADMIN_HR,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 4,
      notes: 'Administrative oversight of human resources activities',
      isActive: true,
      position: 4,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Admin Department coordinates with Accounting for administrative compliance
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ADMIN_ACCOUNTING,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.FUNCTIONAL,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 5,
      notes: 'Administrative oversight for compliance and regulatory reporting',
      isActive: true,
      position: 5,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: true,
    },

    // Sales-Tech Matrix relationship for product development input
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_TECH_MATRIX,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.MATRIX,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: false,
      allowsCrossBranchAccess: true,
      displayOrder: 6,
      notes:
        'Matrix relationship for product roadmap and customer feedback integration',
      isActive: true,
      position: 6,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: false,
      canEditTeamData: false,
      canExportTeamData: false,
    },

    // Admin Department manages Tech Department
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ADMIN_TECH,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 7,
      notes: 'Administrative management of technology department operations',
      isActive: true,
      position: 7,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: false,
    },

    // Admin Department oversees Sales Department (strategic level)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ADMIN_SALES,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 8,
      notes: 'Strategic oversight and coordination of sales operations',
      isActive: true,
      position: 8,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // HR-Tech Matrix relationship for employee technology needs
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.HR_TECH_MATRIX,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.MATRIX,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 9,
      notes:
        'Matrix relationship for employee IT support and system access management',
      isActive: true,
      position: 9,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: false,
      canEditTeamData: false,
      canExportTeamData: false,
    },

    // HR provides functional support to Support Department (training, policies)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.HR_SUPPORT_FUNCTIONAL,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.FUNCTIONAL,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: true,
      allowsCrossBranchAccess: true,
      displayOrder: 10,
      notes:
        'Functional relationship for employee training and policy compliance',
      isActive: true,
      position: 10,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: false,
    },

    // Accounting provides functional support to Support Department (cost tracking)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.ACCOUNTING_SUPPORT_FUNCTIONAL,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      hierarchyLevel: 1,
      relationshipType: MktDepartmentHierarchyRelationType.FUNCTIONAL,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: false,
      canEscalateToParent: false,
      allowsCrossBranchAccess: false,
      displayOrder: 11,
      notes:
        'Functional relationship for cost center tracking and budget monitoring',
      isActive: true,
      position: 11,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      // New RBAC fields
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
      ],
      inheritsParentPermissions: false,
      canViewTeamData: true,
      canEditTeamData: false,
      canExportTeamData: true,
    },

    // ================= LEVEL 2 HIERARCHIES =================

    // Sales -> Sales Domestic (Level 1 -> Level 2)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_TO_SALES_DOMESTIC,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 11,
      notes: 'Sales department manages domestic sales operations',
      isActive: true,
      position: 11,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales -> Sales Export (Level 1 -> Level 2)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_TO_SALES_EXPORT,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 12,
      notes: 'Sales department manages export sales operations',
      isActive: true,
      position: 12,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech -> Tech Frontend (Level 1 -> Level 2)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_TO_TECH_FRONTEND,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 13,
      notes: 'Tech department manages frontend development',
      isActive: true,
      position: 13,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech -> Tech Backend (Level 1 -> Level 2)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_TO_TECH_BACKEND,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_BACKEND,
      hierarchyLevel: 2,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 14,
      notes: 'Tech department manages backend development',
      isActive: true,
      position: 14,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // ================= LEVEL 3 HIERARCHIES =================

    // Sales Domestic -> Sales North (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_DOMESTIC_TO_SALES_NORTH,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 21,
      notes: 'Domestic sales manages northern regional sales',
      isActive: true,
      position: 21,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Domestic -> Sales South (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_DOMESTIC_TO_SALES_SOUTH,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_SOUTH,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 22,
      notes: 'Domestic sales manages southern regional sales',
      isActive: true,
      position: 22,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Export -> Sales EU (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_EXPORT_TO_SALES_EU,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EU,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 23,
      notes: 'Export sales manages European market sales',
      isActive: true,
      position: 23,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Export -> Sales Asia (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_EXPORT_TO_SALES_ASIA,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_ASIA,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 24,
      notes: 'Export sales manages Asian market sales',
      isActive: true,
      position: 24,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Frontend -> Tech React (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_FRONTEND_TO_TECH_REACT,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 25,
      notes: 'Frontend tech manages React development',
      isActive: true,
      position: 25,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Frontend -> Tech Mobile (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_FRONTEND_TO_TECH_MOBILE,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_MOBILE,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 26,
      notes: 'Frontend tech manages mobile development',
      isActive: true,
      position: 26,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Backend -> Tech API (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_BACKEND_TO_TECH_API,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_BACKEND,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_API,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 27,
      notes: 'Backend tech manages API development',
      isActive: true,
      position: 27,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_BACKEND,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Backend -> Tech Database (Level 2 -> Level 3)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_BACKEND_TO_TECH_DATABASE,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_BACKEND,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_DATABASE,
      hierarchyLevel: 3,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 28,
      notes: 'Backend tech manages database development',
      isActive: true,
      position: 28,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_BACKEND,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // ================= LEVEL 4 HIERARCHIES =================

    // Sales North -> Sales Hanoi (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_NORTH_TO_SALES_HANOI,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 31,
      notes: 'Northern sales manages Hanoi city sales',
      isActive: true,
      position: 31,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales South -> Sales HCMC (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_SOUTH_TO_SALES_HCMC,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_SOUTH,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 32,
      notes: 'Southern sales manages Ho Chi Minh City sales',
      isActive: true,
      position: 32,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_SOUTH,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales EU -> Sales Germany (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_EU_TO_SALES_GERMANY,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EU,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_GERMANY,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 33,
      notes: 'European sales manages Germany market',
      isActive: true,
      position: 33,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EU,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Asia -> Sales Japan (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_ASIA_TO_SALES_JAPAN,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_ASIA,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_JAPAN,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 34,
      notes: 'Asian sales manages Japan market',
      isActive: true,
      position: 34,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_EXPORT,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_ASIA,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech React -> Tech Web (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_REACT_TO_TECH_WEB,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_WEB,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 35,
      notes: 'React development manages web applications',
      isActive: true,
      position: 35,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech React -> Tech Components (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_REACT_TO_TECH_COMPONENTS,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 36,
      notes: 'React development manages component libraries',
      isActive: true,
      position: 36,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Mobile -> Tech iOS (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_MOBILE_TO_TECH_IOS,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_MOBILE,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_IOS,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 37,
      notes: 'Mobile development manages iOS applications',
      isActive: true,
      position: 37,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_MOBILE,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Mobile -> Tech Android (Level 3 -> Level 4)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_MOBILE_TO_TECH_ANDROID,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_MOBILE,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_ANDROID,
      hierarchyLevel: 4,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 38,
      notes: 'Mobile development manages Android applications',
      isActive: true,
      position: 38,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_MOBILE,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // ================= LEVEL 5 HIERARCHIES =================

    // Sales Hanoi -> Sales Hanoi Retail (Level 4 -> Level 5)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HANOI_TO_SALES_HANOI_RETAIL,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
      hierarchyLevel: 5,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 41,
      notes: 'Hanoi sales manages retail operations',
      isActive: true,
      position: 41,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Hanoi -> Sales Hanoi B2B (Level 4 -> Level 5)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HANOI_TO_SALES_HANOI_B2B,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_B2B,
      hierarchyLevel: 5,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 42,
      notes: 'Hanoi sales manages B2B operations',
      isActive: true,
      position: 42,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales HCMC -> Sales HCMC Retail (Level 4 -> Level 5)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HCMC_TO_SALES_HCMC_RETAIL,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC_RETAIL,
      hierarchyLevel: 5,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 43,
      notes: 'HCMC sales manages retail operations',
      isActive: true,
      position: 43,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_SOUTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales HCMC -> Sales HCMC B2B (Level 4 -> Level 5)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HCMC_TO_SALES_HCMC_B2B,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC_B2B,
      hierarchyLevel: 5,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 44,
      notes: 'HCMC sales manages B2B operations',
      isActive: true,
      position: 44,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_SOUTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HCMC,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Components -> Tech UI Library (Level 4 -> Level 5)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_COMPONENTS_TO_TECH_UI_LIBRARY,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_UI_LIBRARY,
      hierarchyLevel: 5,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 45,
      notes: 'Component development manages UI libraries',
      isActive: true,
      position: 45,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Components -> Tech Design System (Level 4 -> Level 5)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_COMPONENTS_TO_TECH_DESIGN_SYSTEM,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_DESIGN_SYSTEM,
      hierarchyLevel: 5,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 46,
      notes: 'Component development manages design systems',
      isActive: true,
      position: 46,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // ================= LEVEL 6 HIERARCHIES =================

    // Sales Hanoi Retail -> Sales Hanoi Retail Online (Level 5 -> Level 6)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HANOI_RETAIL_TO_ONLINE,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
      childDepartmentId:
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL_ONLINE,
      hierarchyLevel: 6,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 51,
      notes: 'Hanoi retail manages online sales channels',
      isActive: true,
      position: 51,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Hanoi Retail -> Sales Hanoi Retail Offline (Level 5 -> Level 6)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HANOI_RETAIL_TO_OFFLINE,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
      childDepartmentId:
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL_OFFLINE,
      hierarchyLevel: 6,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 52,
      notes: 'Hanoi retail manages offline stores',
      isActive: true,
      position: 52,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech UI Library -> Tech Component Library (Level 5 -> Level 6)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_UI_LIBRARY_TO_TECH_COMPONENT_LIB,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_UI_LIBRARY,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENT_LIB,
      hierarchyLevel: 6,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 53,
      notes: 'UI Library manages component libraries',
      isActive: true,
      position: 53,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_UI_LIBRARY,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Tech Design System -> Tech Theme System (Level 5 -> Level 6)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.TECH_DESIGN_SYSTEM_TO_TECH_THEME_SYSTEM,
      parentDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_DESIGN_SYSTEM,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_THEME_SYSTEM,
      hierarchyLevel: 6,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 54,
      notes: 'Design System manages theming systems',
      isActive: true,
      position: 54,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_FRONTEND,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_REACT,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_COMPONENTS,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH_DESIGN_SYSTEM,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // ================= LEVEL 7 HIERARCHIES =================

    // Sales Hanoi Retail Online -> Sales Hanoi E-commerce (Level 6 -> Level 7)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HANOI_RETAIL_ONLINE_TO_ECOMMERCE,
      parentDepartmentId:
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL_ONLINE,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_ECOMMERCE,
      hierarchyLevel: 7,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 61,
      notes: 'Online retail manages e-commerce platforms',
      isActive: true,
      position: 61,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL_ONLINE,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },

    // Sales Hanoi Retail Online -> Sales Hanoi Social Commerce (Level 6 -> Level 7)
    {
      id: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_IDS.SALES_HANOI_RETAIL_ONLINE_TO_SOCIAL,
      parentDepartmentId:
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL_ONLINE,
      childDepartmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_SOCIAL,
      hierarchyLevel: 7,
      relationshipType: MktDepartmentHierarchyRelationType.PARENT_CHILD,
      validFrom: DateTime.fromISO('2024-01-01').toJSDate(),
      validTo: null,
      inheritsPermissions: true,
      canEscalateToParent: true,
      allowsCrossBranchAccess: false,
      displayOrder: 62,
      notes: 'Online retail manages social commerce channels',
      isActive: true,
      position: 62,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
      hierarchyPath: [
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_DOMESTIC,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_NORTH,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL,
        MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES_HANOI_RETAIL_ONLINE,
      ],
      inheritsParentPermissions: true,
      canViewTeamData: true,
      canEditTeamData: true,
      canExportTeamData: true,
    },
  ];

// Export for specific use cases
export const ACTIVE_DEPARTMENT_HIERARCHIES =
  MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter((hierarchy) => hierarchy.isActive);

export const PARENT_CHILD_HIERARCHIES =
  MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter(
    (hierarchy) =>
      hierarchy.relationshipType ===
      MktDepartmentHierarchyRelationType.PARENT_CHILD,
  );

export const MATRIX_HIERARCHIES = MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter(
  (hierarchy) =>
    hierarchy.relationshipType === MktDepartmentHierarchyRelationType.MATRIX,
);

export const FUNCTIONAL_HIERARCHIES =
  MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter(
    (hierarchy) =>
      hierarchy.relationshipType ===
      MktDepartmentHierarchyRelationType.FUNCTIONAL,
  );

// Export for easy lookup by department
export const HIERARCHIES_BY_PARENT_DEPARTMENT = {
  SALES: MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter(
    (h) => h.parentDepartmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
  ),
  TECH: MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter(
    (h) => h.parentDepartmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
  ),
  ADMIN: MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter(
    (h) => h.parentDepartmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.ADMIN,
  ),
  HR: MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter(
    (h) => h.parentDepartmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
  ),
  ACCOUNTING: MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter(
    (h) => h.parentDepartmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
  ),
};

export const HIERARCHIES_BY_CHILD_DEPARTMENT = {
  SUPPORT: MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter(
    (h) => h.childDepartmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
  ),
  ACCOUNTING: MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter(
    (h) => h.childDepartmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
  ),
  HR: MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter(
    (h) => h.childDepartmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.HR,
  ),
  TECH: MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter(
    (h) => h.childDepartmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.TECH,
  ),
  SALES: MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS.filter(
    (h) => h.childDepartmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.SALES,
  ),
};
