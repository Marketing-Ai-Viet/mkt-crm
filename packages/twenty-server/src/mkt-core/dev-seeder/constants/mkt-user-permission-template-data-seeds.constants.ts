import { parseISO, formatISO } from 'date-fns';

import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';

import { MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS } from './mkt-permission-template-data-seeds.constants';

/**
 * User Permission Template Data Seeds - Simplified RBAC System (5 roles)
 * Gán permission templates cho workspace members
 *
 * Mapping:
 * - TIM (MANAGER level) -> ADMIN template (highest permissions)
 * - JONY (MANAGER level) -> MANAGER template
 * - PHIL (TEAM_LEAD level) -> TEAM_LEAD template
 * - JANE (STAFF level) -> STAFF template
 *
 * Note: INTERN template tạm thời bỏ qua theo yêu cầu
 */

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

/**
 * User Permission Template Assignment IDs (UUID v4)
 * Mỗi assignment có ID riêng để track lịch sử gán permissions
 */
export const MKT_USER_PERMISSION_TEMPLATE_ASSIGNMENT_IDS = {
  TIM_ADMIN: 'a1b2c3d4-e5f6-4000-9000-100000000001',
  JONY_MANAGER: 'a1b2c3d4-e5f6-4000-9000-100000000002',
  PHIL_TEAM_LEAD: 'a1b2c3d4-e5f6-4000-9000-100000000003',
  JANE_STAFF: 'a1b2c3d4-e5f6-4000-9000-100000000004',
  // Temporary/expired assignments for testing
  JONY_TEMP_ADMIN: 'a1b2c3d4-e5f6-4000-9000-100000000005', // Temporary admin for emergency
  PHIL_EXPIRED_MANAGER: 'a1b2c3d4-e5f6-4000-9000-100000000006', // Expired manager role
};

export const MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS: MktUserPermissionTemplateDataSeed[] =
  [
    // ============================================================================
    // TIM - ADMIN Template (Highest Permissions)
    // Organization Level: MANAGER, but granted ADMIN template for full system access
    // ============================================================================
    {
      id: MKT_USER_PERMISSION_TEMPLATE_ASSIGNMENT_IDS.TIM_ADMIN,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      isActive: true,
      assignedAt: formatISO(parseISO('2024-01-15T09:00:00.000Z')),
      assignedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Self-assigned during initial setup
      expiresAt: undefined, // No expiration for permanent admin
      assignmentReason:
        'Permanent ADMIN role assignment - System administrator with full access to all resources and system configuration',
      position: 1,
    },

    // ============================================================================
    // JONY - MANAGER Template
    // Organization Level: MANAGER, standard department manager permissions
    // ============================================================================
    {
      id: MKT_USER_PERMISSION_TEMPLATE_ASSIGNMENT_IDS.JONY_MANAGER,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      isActive: true,
      assignedAt: formatISO(parseISO('2024-01-16T10:30:00.000Z')),
      assignedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Assigned by admin
      expiresAt: formatISO(parseISO('2027-12-31T23:59:59.000Z')), // Long-term assignment (3 years)
      assignmentReason:
        'MANAGER role assignment for department leadership - Department-scoped permissions with 6h-22h access window',
      position: 2,
    },

    // ============================================================================
    // PHIL - TEAM_LEAD Template
    // Organization Level: TEAM_LEAD, team management permissions
    // ============================================================================
    {
      id: MKT_USER_PERMISSION_TEMPLATE_ASSIGNMENT_IDS.PHIL_TEAM_LEAD,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      isActive: true,
      assignedAt: formatISO(parseISO('2024-01-17T14:15:00.000Z')),
      assignedById: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY, // Assigned by manager
      expiresAt: formatISO(parseISO('2026-12-31T23:59:59.000Z')), // 2-year assignment
      assignmentReason:
        'TEAM_LEAD role assignment for team management responsibilities - Team-scoped access with 8h-20h working hours',
      position: 3,
    },

    // ============================================================================
    // JANE - STAFF Template
    // Organization Level: STAFF, basic staff permissions
    // ============================================================================
    {
      id: MKT_USER_PERMISSION_TEMPLATE_ASSIGNMENT_IDS.JANE_STAFF,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      isActive: true,
      assignedAt: formatISO(parseISO('2024-01-18T11:45:00.000Z')),
      assignedById: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL, // Assigned by team lead
      expiresAt: formatISO(parseISO('2025-12-31T23:59:59.000Z')), // 1-year assignment
      assignmentReason:
        'STAFF role assignment - Own records access only with 8h-18h working hours and strict limitations',
      position: 4,
    },

    // ============================================================================
    // TEMPORARY ASSIGNMENTS - For testing permission inheritance and expiration
    // ============================================================================

    /**
     * JONY - Temporary ADMIN (For Emergency Scenarios)
     * Example: Temporarily elevated to ADMIN during system maintenance
     */
    {
      id: MKT_USER_PERMISSION_TEMPLATE_ASSIGNMENT_IDS.JONY_TEMP_ADMIN,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      isActive: true,
      assignedAt: formatISO(parseISO('2024-02-01T08:00:00.000Z')),
      assignedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM, // Granted by admin
      expiresAt: formatISO(parseISO('2024-02-15T23:59:59.000Z')), // 2-week temporary assignment
      assignmentReason:
        'Temporary ADMIN permissions for system maintenance window - Emergency access for critical system updates',
      position: 5,
    },

    /**
     * PHIL - Expired MANAGER (For Testing Expired Permissions)
     * Example: Previous manager role that has expired
     */
    {
      id: MKT_USER_PERMISSION_TEMPLATE_ASSIGNMENT_IDS.PHIL_EXPIRED_MANAGER,
      workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      isActive: false, // Marked as inactive because it expired
      assignedAt: formatISO(parseISO('2023-06-01T08:00:00.000Z')),
      assignedById: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      expiresAt: formatISO(parseISO('2023-12-31T23:59:59.000Z')), // Expired 6 months ago
      assignmentReason:
        'Previous MANAGER role for Q2-Q4 2023 project (now expired and replaced with TEAM_LEAD)',
      position: 6,
    },
  ];
