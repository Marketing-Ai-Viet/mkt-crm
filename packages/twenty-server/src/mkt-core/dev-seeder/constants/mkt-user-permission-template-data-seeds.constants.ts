import { parseISO, formatISO } from 'date-fns';

import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';

import { MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS } from './mkt-permission-template-data-seeds.constants';

type MktUserPermissionTemplateDataSeed = {
  id: string;
  workspaceMemberId: string;
  templateId: string;
  isActive: boolean;
  assignedAt: string; // ISO string for database storage
  assignedById?: string;
  expiresAt?: string; // ISO string for database storage
  assignmentReason?: string;
  position: number; // For seeding order
};

export const MKT_USER_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS: (keyof MktUserPermissionTemplateDataSeed)[] =
  [
    'id',
    'workspaceMemberId',
    'templateId',
    'isActive',
    'assignedAt',
    'assignedById',
    'expiresAt',
    'assignmentReason',
    'position',
  ];

export const MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS: MktUserPermissionTemplateDataSeed[] =
  [
    {
      id: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      isActive: true,
      assignedAt: formatISO(parseISO('2024-01-15T09:00:00.000Z')),
      assignedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Self-assigned during initial setup
      expiresAt: formatISO(parseISO('2029-12-31T23:59:59.000Z')), // Long-term CEO assignment
      assignmentReason: 'Initial CEO role assignment during system setup',
      position: 1,
    },
    {
      id: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.DIRECTOR,
      isActive: true,
      assignedAt: formatISO(parseISO('2024-01-16T10:30:00.000Z')),
      assignedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Assigned by CEO
      expiresAt: formatISO(parseISO('2027-12-31T23:59:59.000Z')), // Long-term Director assignment
      assignmentReason: 'Director role assignment for department leadership',
      position: 2,
    },
    {
      id: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      isActive: true,
      assignedAt: formatISO(parseISO('2024-01-17T14:15:00.000Z')),
      assignedById: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY, // Assigned by Director
      expiresAt: formatISO(parseISO('2026-12-31T23:59:59.000Z')), // Long-term Manager assignment
      assignmentReason:
        'Manager role assignment for team management responsibilities',
      position: 3,
    },
    {
      id: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.SENIOR_STAFF,
      isActive: true,
      assignedAt: formatISO(parseISO('2024-01-18T11:45:00.000Z')),
      assignedById: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL, // Assigned by Manager
      expiresAt: formatISO(parseISO('2025-12-31T23:59:59.000Z')), // Long-term Senior Staff assignment
      assignmentReason:
        'Senior staff role assignment based on experience and performance',
      position: 4,
    },
    {
      id: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      isActive: true,
      assignedAt: formatISO(parseISO('2024-02-01T08:00:00.000Z')),
      assignedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Self-assigned
      expiresAt: formatISO(parseISO('2024-03-31T23:59:59.000Z')), // Temporary assignment
      assignmentReason:
        'Temporary manager permissions for cross-department project leadership',
      position: 5,
    },
    {
      id: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      isActive: false, // Expired temporary assignment
      assignedAt: formatISO(parseISO('2024-01-01T08:00:00.000Z')),
      assignedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      expiresAt: formatISO(parseISO('2024-01-31T23:59:59.000Z')), // Expired
      assignmentReason:
        'Temporary team lead permissions for Q1 special project (expired)',
      position: 6,
    },
  ];
