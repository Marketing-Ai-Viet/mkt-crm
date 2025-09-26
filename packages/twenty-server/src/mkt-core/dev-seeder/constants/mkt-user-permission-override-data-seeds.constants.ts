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
  PHIL_EMERGENCY_DELETE: '9be381b5-a7f1-481f-98f8-0b1efb4d64ee',
  TIM_TEMP_ADMIN: '39980c55-bd82-4606-b6bf-054ad824bbd4',
  JONY_AUDIT_ACCESS: '9c2aa9fa-85f6-4366-8fce-3a304d3000a9',
  JANE_PROJECT_ESCALATE: 'caed5c54-da78-413b-a124-a5bc09e1fe07',
  PHIL_COMPLIANCE_READ: 'cb3ab71d-8de3-4960-8764-b7e0df3dd6c0',
  TIM_MAINT_OVERRIDE: '2cd0dc5a-9fb3-4612-8a12-6044b0f1905f',
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
