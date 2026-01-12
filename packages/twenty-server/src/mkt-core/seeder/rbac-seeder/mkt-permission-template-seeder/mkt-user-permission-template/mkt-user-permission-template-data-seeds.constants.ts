/**
 * User Permission Template Seed Data Constants
 *
 * Assigns permission templates to workspace members
 * Links workspace members with their permission templates
 */

import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';
import { MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-template/mkt-permission-template-data-seeds.constants';

const WORKSPACE_MEMBERS = WORKSPACE_MEMBER_DATA_SEED_IDS;
const TEMPLATES = MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS;

type MktUserPermissionTemplateDataSeed = {
  id: string;
  workspaceMemberId: string;
  templateId: string;
  isActive: boolean;
  assignedAt: string;
  assignedById: string | null;
  expiresAt: string | null;
  assignmentReason: string | null;
  position: number;
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

// Pre-generated UUIDs for consistent seed data
export const MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS_IDS = {
  // Tim (CEO)
  TIM_CEO_TEMPLATE: '55555555-0001-4000-8000-000000000001',

  // Jony (usually a design lead/director level)
  JONY_DIRECTOR_TEMPLATE: '55555555-0002-4000-8000-000000000001',

  // Phil (usually executive level - VP)
  PHIL_VP_TEMPLATE: '55555555-0003-4000-8000-000000000001',
};

const IDS = MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS_IDS;

export const MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS: MktUserPermissionTemplateDataSeed[] =
  [
    // ============================================
    // Tim - CEO Template Assignment
    // ============================================
    {
      id: IDS.TIM_CEO_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.TIM,
      templateId: TEMPLATES.CEO,
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: null, // System assigned
      expiresAt: null, // No expiration
      assignmentReason: 'Initial system setup - CEO role',
      position: 1,
    },

    // ============================================
    // Jony - Director Template Assignment
    // ============================================
    {
      id: IDS.JONY_DIRECTOR_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.JONY,
      templateId: TEMPLATES.DIRECTOR,
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.TIM, // Assigned by CEO
      expiresAt: null,
      assignmentReason: 'Design department director',
      position: 1,
    },

    // ============================================
    // Phil - VP Template Assignment
    // ============================================
    {
      id: IDS.PHIL_VP_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.PHIL,
      templateId: TEMPLATES.VP,
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.TIM, // Assigned by CEO
      expiresAt: null,
      assignmentReason: 'VP Operations role',
      position: 1,
    },
  ];
