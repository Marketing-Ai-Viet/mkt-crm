import {
  DEPARTMENT,
  MKT_DEPARTMENT_DATA_SEEDS_IDS,
  MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS,
} from 'src/mkt-core/mkt-department/constants/mkt-department.constant';

export const MKT_DEPARTMENT_SUB_MANAGER_DATA_SEED_COLUMNS = [
  'id',
  'isPrimary',
  'assignedAt',
  'note',
  'isActive',
  'departmentId',
  'workspaceMemberId',
];

/**
 * Seed data for department sub-manager assignments.
 * Note: workspaceMemberId is null because workspace members are created dynamically.
 * In a real scenario, these would be populated with actual workspace member IDs.
 */
export const MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS = [
  // SALES department - 2 sub-managers
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SALES_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-01-15T09:00:00Z'),
    note: 'Primary sub-manager for domestic sales operations',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.SALES],
    workspaceMemberId: null,
  },
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SALES_SUB_MANAGER_2,
    isPrimary: false,
    assignedAt: new Date('2024-02-01T09:00:00Z'),
    note: 'Sub-manager for international sales coordination',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.SALES],
    workspaceMemberId: null,
  },

  // SUPPORT department - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SUPPORT_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-01-20T09:00:00Z'),
    note: 'Primary sub-manager for customer support escalations',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.SUPPORT],
    workspaceMemberId: null,
  },

  // ACCOUNTING department - 2 sub-managers
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.ACCOUNTING_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-01-10T09:00:00Z'),
    note: 'Primary sub-manager for accounts payable',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.ACCOUNTING],
    workspaceMemberId: null,
  },
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.ACCOUNTING_SUB_MANAGER_2,
    isPrimary: false,
    assignedAt: new Date('2024-03-01T09:00:00Z'),
    note: 'Sub-manager for audit and compliance',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.ACCOUNTING],
    workspaceMemberId: null,
  },

  // HR department - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.HR_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-01-25T09:00:00Z'),
    note: 'Primary sub-manager for recruitment and training',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.HR],
    workspaceMemberId: null,
  },

  // TECH department - 3 sub-managers
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.TECH_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-01-05T09:00:00Z'),
    note: 'Primary sub-manager for backend development',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.TECH],
    workspaceMemberId: null,
  },
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.TECH_SUB_MANAGER_2,
    isPrimary: false,
    assignedAt: new Date('2024-01-05T09:00:00Z'),
    note: 'Sub-manager for frontend development',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.TECH],
    workspaceMemberId: null,
  },
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.TECH_SUB_MANAGER_3,
    isPrimary: false,
    assignedAt: new Date('2024-02-15T09:00:00Z'),
    note: 'Sub-manager for DevOps and infrastructure',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.TECH],
    workspaceMemberId: null,
  },
];
