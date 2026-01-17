/**
 * Permission Action Seed Data Constants
 *
 * Defines available actions that can be performed on resources
 * Actions: READ, CREATE, UPDATE, DELETE, MANAGE, EXPORT, IMPORT, etc.
 */

import {
  PERMISSION_ACTION_CATEGORY,
  PERMISSION_RISK_LEVEL,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/permission-template/options.constants';

type MktPermissionActionDataSeed = {
  id: string;
  actionKey: string;
  actionName: string;
  actionCategory: string;
  description: string | null;
  riskLevel: string;
  requiresApproval: boolean;
  isSystemAction: boolean;
  isActive: boolean;
  position: number;
};

export const MKT_PERMISSION_ACTION_DATA_SEED_COLUMNS: (keyof MktPermissionActionDataSeed)[] =
  [
    'id',
    'actionKey',
    'actionName',
    'actionCategory',
    'description',
    'riskLevel',
    'requiresApproval',
    'isSystemAction',
    'isActive',
    'position',
  ];

export const MKT_PERMISSION_ACTION_DATA_SEEDS_IDS = {
  READ: '00a4b076-3f47-436a-a0ce-f14603e80074',
  CREATE: '54f6d6d6-d227-4e8c-961c-b9570e839a0b',
  UPDATE: '02ac50e3-9eeb-4611-b24f-2475d2ce76c6',
  DELETE: 'b3f4057e-c726-4293-8a11-9c1139ca44bf',
  MANAGE: '6c4c55c5-787b-4860-8a6a-67c1f323d8aa',
  EXPORT: '2d56fd40-fdc7-45a1-ab54-bd32aa265028',
  IMPORT: '3c6e68a3-0848-499a-bd73-eebc571e83e8',
  APPROVE: '87d2fd54-3e10-48b6-9f16-267c581c37ff',
  REJECT: '7a19f7a8-5be3-4d0a-9d7c-9f183b12064c',
  ARCHIVE: '25ede0ff-99e1-4aee-97a0-a940404aae7d',
  RESTORE: 'a450f7fa-44a7-447b-8c0a-e2cc3a02526b',
  ASSIGN: 'c845a776-2481-4e13-a60c-55630933d231',
};

export const MKT_PERMISSION_ACTION_DATA_SEEDS: MktPermissionActionDataSeed[] = [
  // Basic CRUD actions
  {
    id: MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
    actionKey: 'READ',
    actionName: 'Read',
    actionCategory: PERMISSION_ACTION_CATEGORY.BASIC_CRUD,
    description: 'View and read data records',
    riskLevel: PERMISSION_RISK_LEVEL.LOW,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
    position: 1,
  },
  {
    id: MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
    actionKey: 'CREATE',
    actionName: 'Create',
    actionCategory: PERMISSION_ACTION_CATEGORY.BASIC_CRUD,
    description: 'Create new records',
    riskLevel: PERMISSION_RISK_LEVEL.LOW,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
    position: 2,
  },
  {
    id: MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
    actionKey: 'UPDATE',
    actionName: 'Update',
    actionCategory: PERMISSION_ACTION_CATEGORY.BASIC_CRUD,
    description: 'Modify existing records',
    riskLevel: PERMISSION_RISK_LEVEL.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
    position: 3,
  },
  {
    id: MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
    actionKey: 'DELETE',
    actionName: 'Delete',
    actionCategory: PERMISSION_ACTION_CATEGORY.BASIC_CRUD,
    description: 'Delete records (soft or hard delete)',
    riskLevel: PERMISSION_RISK_LEVEL.HIGH,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
    position: 4,
  },
  {
    id: MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.MANAGE,
    actionKey: 'MANAGE',
    actionName: 'Manage',
    actionCategory: PERMISSION_ACTION_CATEGORY.CONFIGURATION,
    description: 'Full management access (all CRUD operations)',
    riskLevel: PERMISSION_RISK_LEVEL.HIGH,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
    position: 5,
  },

  // Data operations
  {
    id: MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.EXPORT,
    actionKey: 'EXPORT',
    actionName: 'Export',
    actionCategory: PERMISSION_ACTION_CATEGORY.REPORTING,
    description: 'Export data to external formats',
    riskLevel: PERMISSION_RISK_LEVEL.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
    position: 6,
  },
  {
    id: MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.IMPORT,
    actionKey: 'IMPORT',
    actionName: 'Import',
    actionCategory: PERMISSION_ACTION_CATEGORY.BASIC_CRUD,
    description: 'Import data from external sources',
    riskLevel: PERMISSION_RISK_LEVEL.HIGH,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
    position: 7,
  },

  // Workflow actions
  {
    id: MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.APPROVE,
    actionKey: 'APPROVE',
    actionName: 'Approve',
    actionCategory: PERMISSION_ACTION_CATEGORY.SYSTEM,
    description: 'Approve pending requests or records',
    riskLevel: PERMISSION_RISK_LEVEL.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
    position: 8,
  },
  {
    id: MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.REJECT,
    actionKey: 'REJECT',
    actionName: 'Reject',
    actionCategory: PERMISSION_ACTION_CATEGORY.SYSTEM,
    description: 'Reject pending requests or records',
    riskLevel: PERMISSION_RISK_LEVEL.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
    position: 9,
  },

  // Archive operations
  {
    id: MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.ARCHIVE,
    actionKey: 'ARCHIVE',
    actionName: 'Archive',
    actionCategory: PERMISSION_ACTION_CATEGORY.BASIC_CRUD,
    description: 'Archive records for long-term storage',
    riskLevel: PERMISSION_RISK_LEVEL.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
    position: 10,
  },
  {
    id: MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.RESTORE,
    actionKey: 'RESTORE',
    actionName: 'Restore',
    actionCategory: PERMISSION_ACTION_CATEGORY.BASIC_CRUD,
    description: 'Restore archived or deleted records',
    riskLevel: PERMISSION_RISK_LEVEL.HIGH,
    requiresApproval: true,
    isSystemAction: true,
    isActive: true,
    position: 11,
  },

  // Assignment
  {
    id: MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.ASSIGN,
    actionKey: 'ASSIGN',
    actionName: 'Assign',
    actionCategory: PERMISSION_ACTION_CATEGORY.CONFIGURATION,
    description: 'Assign records or permissions to users',
    riskLevel: PERMISSION_RISK_LEVEL.MEDIUM,
    requiresApproval: false,
    isSystemAction: true,
    isActive: true,
    position: 12,
  },
];
