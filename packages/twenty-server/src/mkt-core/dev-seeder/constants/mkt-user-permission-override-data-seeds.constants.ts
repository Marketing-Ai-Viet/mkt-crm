import { parseISO, formatISO } from 'date-fns';

import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';

import { MKT_PERMISSION_RESOURCE_DATA_SEEDS } from './mkt-permission-resource-data-seeds.constants';
import { MKT_PERMISSION_ACTION_DATA_SEEDS } from './mkt-permission-action-data-seeds.constants';

type MktUserPermissionOverrideDataSeed = {
  id: string;
  workspaceMemberId: string;
  resourceId: string;
  actionId: string;
  isAllowed: boolean;
  contextFilter?: string;
  expiresAt?: string; // ISO string for database storage
  reason: string;
  reasonDescription?: string;
  approvedById?: string;
  approvedAt?: string; // ISO string for database storage
  isActive: boolean;
  position: number; // For seeding order
};

export const MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_COLUMNS: (keyof MktUserPermissionOverrideDataSeed)[] =
  [
    'id',
    'workspaceMemberId',
    'resourceId',
    'actionId',
    'isAllowed',
    'contextFilter',
    'expiresAt',
    'reason',
    'reasonDescription',
    'approvedById',
    'approvedAt',
    'isActive',
    'position',
  ];

export const MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS = {
  PHIL_EMERGENCY_DELETE: '10101010-1a2b-4c3d-8e9f-123456789abc',
  TIM_TEMP_ADMIN: '20202020-2b3c-4d5e-9f0a-234567890bcd',
  JONY_AUDIT_ACCESS: '30303030-3c4d-5e6f-0a1b-345678901cde',
  JANE_PROJECT_ESCALATE: '40404040-4d5e-6f70-1b2c-456789012def',
  PHIL_COMPLIANCE_READ: '50505050-5e6f-7081-2c3d-567890123ef0',
  TIM_MAINT_OVERRIDE: '60606060-6f70-8192-3d4e-678901234f01',
};

export const MKT_USER_PERMISSION_OVERRIDE_DATA_SEEDS: MktUserPermissionOverrideDataSeed[] =
  [
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.PHIL_EMERGENCY_DELETE,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS[0].id, // First resource from seeds
      actionId: MKT_PERMISSION_ACTION_DATA_SEEDS[0].id, // First action from seeds
      isAllowed: true,
      contextFilter: JSON.stringify({
        field: 'departmentId',
        operator: 'eq',
        value: '{{currentUserDepartmentId}}',
      }),
      expiresAt: formatISO(parseISO('2024-12-31T23:59:59.000Z')),
      reason: 'EMERGENCY_ACCESS',
      reasonDescription:
        'Emergency delete access for critical data cleanup during system outage',
      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      approvedAt: formatISO(parseISO('2024-09-15T10:30:00.000Z')),
      isActive: true,
      position: 1,
    },
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.TIM_TEMP_ADMIN,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS[1].id, // Second resource from seeds
      actionId: MKT_PERMISSION_ACTION_DATA_SEEDS[1].id, // Second action from seeds
      isAllowed: true,
      contextFilter: JSON.stringify({
        logic: 'AND',
        conditions: [
          { field: 'priority', operator: 'gte', value: 'high' },
          { field: 'status', operator: 'in', values: ['active', 'pending'] },
        ],
      }),
      expiresAt: formatISO(parseISO('2024-11-30T23:59:59.000Z')),
      reason: 'TEMPORARY_ESCALATION',
      reasonDescription:
        'Temporary admin privileges for Q4 system migration project',
      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
      approvedAt: formatISO(parseISO('2024-09-10T14:15:00.000Z')),
      isActive: true,
      position: 2,
    },
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.JONY_AUDIT_ACCESS,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS[2].id, // Third resource from seeds
      actionId: MKT_PERMISSION_ACTION_DATA_SEEDS[2].id, // Third action from seeds
      isAllowed: true,
      contextFilter: JSON.stringify({
        logic: 'OR',
        conditions: [
          { field: 'auditRequired', operator: 'eq', value: true },
          {
            field: 'complianceLevel',
            operator: 'in',
            values: ['high', 'critical'],
          },
        ],
      }),
      expiresAt: formatISO(parseISO('2025-03-31T23:59:59.000Z')),
      reason: 'AUDIT_REQUIREMENT',
      reasonDescription: 'Extended audit access for annual compliance review',
      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      approvedAt: formatISO(parseISO('2024-09-12T09:45:00.000Z')),
      isActive: true,
      position: 3,
    },
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.JANE_PROJECT_ESCALATE,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS[0].id, // First resource from seeds
      actionId: MKT_PERMISSION_ACTION_DATA_SEEDS[3].id, // Fourth action from seeds
      isAllowed: true,
      contextFilter: JSON.stringify({
        field: 'projectId',
        operator: 'eq',
        value: 'special-project-2024',
      }),
      expiresAt: formatISO(parseISO('2024-10-15T23:59:59.000Z')),
      reason: 'SPECIAL_PROJECT',
      reasonDescription:
        'Project-specific escalated permissions for client presentation preparation',
      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
      approvedAt: formatISO(parseISO('2024-09-14T16:20:00.000Z')),
      isActive: true,
      position: 4,
    },
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.PHIL_COMPLIANCE_READ,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS[3].id, // Fourth resource from seeds
      actionId: MKT_PERMISSION_ACTION_DATA_SEEDS[0].id, // First action from seeds
      isAllowed: false, // Deny override
      contextFilter: JSON.stringify({
        logic: 'AND',
        conditions: [
          { field: 'dataClassification', operator: 'eq', value: 'financial' },
          { field: 'restrictionActive', operator: 'eq', value: true },
        ],
      }),
      expiresAt: formatISO(parseISO('2025-06-30T23:59:59.000Z')),
      reason: 'COMPLIANCE_REQUIREMENT',
      reasonDescription:
        'Temporary restriction on financial data access per compliance audit findings',
      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      approvedAt: formatISO(parseISO('2024-09-13T11:10:00.000Z')),
      isActive: true,
      position: 5,
    },
    {
      id: MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_IDS.TIM_MAINT_OVERRIDE,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS[1].id, // Second resource from seeds
      actionId: MKT_PERMISSION_ACTION_DATA_SEEDS[4].id, // Fifth action from seeds
      isAllowed: true,
      contextFilter: JSON.stringify({
        timeRange: {
          startHour: 2,
          endHour: 6,
          timezone: 'UTC',
          workdays: ['saturday', 'sunday'],
        },
      }),
      expiresAt: formatISO(parseISO('2024-12-15T23:59:59.000Z')),
      reason: 'SYSTEM_MAINTENANCE',
      reasonDescription:
        'Weekend maintenance window access for system upgrades',
      approvedById: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
      approvedAt: formatISO(parseISO('2024-09-11T13:00:00.000Z')),
      isActive: false, // Inactive for testing purposes
      position: 6,
    },
  ];
