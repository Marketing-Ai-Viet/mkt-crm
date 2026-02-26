/**
 * User Permission Template Seed Data Constants
 *
 * Assigns permission templates to workspace members
 * Links workspace members with their permission templates
 */

import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';
import {
  DEPARTMENT,
  MKT_DEPARTMENT_DATA_SEEDS_IDS,
} from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
import { MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-template/mkt-permission-template-data-seeds.constants';

const WORKSPACE_MEMBERS = WORKSPACE_MEMBER_DATA_SEED_IDS;
const TEMPLATES = MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS;
const DEPARTMENTS = MKT_DEPARTMENT_DATA_SEEDS_IDS;

type MktUserPermissionTemplateDataSeed = {
  id: string;
  workspaceMemberId: string;
  templateId: string;
  departmentId: string | null;
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
    'departmentId',
    'isActive',
    'assignedAt',
    'assignedById',
    'expiresAt',
    'assignmentReason',
    'position',
  ];

// Pre-generated UUIDs for consistent seed data
export const MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS_IDS = {
  // Tim (orgLevel: MANAGER=7) → template: MANAGER
  TIM_MANAGER_TEMPLATE: '55555555-0001-4000-8000-000000000001',

  // Jony (orgLevel: CEO/ADMIN=1) → template: CEO
  JONY_CEO_TEMPLATE: '55555555-0002-4000-8000-000000000001',

  // Phil (orgLevel: SENIOR_SPECIALIST/TEAM_LEAD=8) → template: SENIOR
  PHIL_SENIOR_TEMPLATE: '55555555-0003-4000-8000-000000000001',

  // Jane (orgLevel: SPECIALIST/STAFF=9) → template: JUNIOR
  JANE_JUNIOR_TEMPLATE: '55555555-0004-4000-8000-000000000001',

  // Sarah (orgLevel: DIRECTOR=5, SALES) → template: SALES_DIRECTOR
  SARAH_SALES_DIRECTOR_TEMPLATE: '55555555-0005-4000-8000-000000000001',

  // Michael (orgLevel: SENIOR_DIRECTOR=4, TECH) → template: MANAGER
  MICHAEL_MANAGER_TEMPLATE: '55555555-0006-4000-8000-000000000001',

  // Emily (orgLevel: SENIOR_MANAGER=6, ACCOUNTING) → template: FINANCE_ANALYST
  EMILY_FINANCE_ANALYST_TEMPLATE: '55555555-0007-4000-8000-000000000001',

  // Extended test users covering all org levels and departments
  CRAIG_VP_TEMPLATE: '6e03476e-4223-43ee-b6a7-bc325dd6386b',
  ANGELA_DIRECTOR_TEMPLATE: 'c7f95e34-3732-4cf1-9671-1bde2016ca40',
  DAN_TEAM_LEAD_TEMPLATE: '15e39688-0639-443a-83c5-33a2319a8275',
  EDDY_SALES_MANAGER_TEMPLATE: '69899930-cb79-41ca-bbf0-820d308bbb3e',
  DEIRDRE_MANAGER_TEMPLATE: 'ec17df9d-3ae7-4e40-b977-935f8dd3adfc',
  LISA_ACCOUNTANT_STAFF_TEMPLATE: 'e3f352a7-ec68-4eb1-8036-8243ac2c033a',
  JOHN_T_SUPPORT_STAFF_TEMPLATE: 'd33933ee-2768-44ba-9977-be2db1b3e4c4',
  GREG_SALES_STAFF_TEMPLATE: 'd89edf49-7cf8-4838-aa1a-7c233bb377ea',
  LUCA_JUNIOR_TEMPLATE: 'a974a152-efb8-4ab6-983b-33b5742eef4c',
  JEFF_JUNIOR_TEMPLATE: '812089d4-149d-48d3-ad05-99cc99150da4',
};

const IDS = MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS_IDS;

export const MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS: MktUserPermissionTemplateDataSeed[] =
  [
    // ============================================
    // Jony Ive - CEO Template Assignment
    // orgLevel: CEO (ADMIN alias, hierarchyLevel=1)
    // → dataAccessScope: ALL_DEPARTMENTS
    // ============================================
    {
      id: IDS.JONY_CEO_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.JONY,
      templateId: TEMPLATES.CEO,
      departmentId: null, // CEO - global role, not department-specific
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: null, // System assigned
      expiresAt: null, // No expiration
      assignmentReason: 'CEO role - full access to all resources',
      position: 1,
    },

    // ============================================
    // Tim Apple - Manager Template Assignment
    // orgLevel: MANAGER (hierarchyLevel=7)
    // → dataAccessScope: OWN_DEPARTMENT_AND_TEAM
    // ============================================
    {
      id: IDS.TIM_MANAGER_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.TIM,
      templateId: TEMPLATES.MANAGER,
      departmentId: DEPARTMENTS[DEPARTMENT.TECH], // Tech department manager
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.JONY, // Assigned by CEO
      expiresAt: null,
      assignmentReason: 'Tech department manager - team-level access',
      position: 1,
    },

    // ============================================
    // Phil Schiler - Senior Template Assignment
    // orgLevel: SENIOR_SPECIALIST (TEAM_LEAD alias, hierarchyLevel=8)
    // → dataAccessScope: OWN_RECORDS
    // ============================================
    {
      id: IDS.PHIL_SENIOR_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.PHIL,
      templateId: TEMPLATES.SENIOR,
      departmentId: DEPARTMENTS[DEPARTMENT.TECH], // Tech Frontend
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.TIM, // Assigned by Manager
      expiresAt: null,
      assignmentReason: 'Senior specialist - own records access',
      position: 1,
    },

    // ============================================
    // Jane Austen - Junior Template Assignment
    // orgLevel: SPECIALIST (STAFF alias, hierarchyLevel=9)
    // → dataAccessScope: OWN_RECORDS
    // ============================================
    {
      id: IDS.JANE_JUNIOR_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.JANE,
      templateId: TEMPLATES.JUNIOR,
      departmentId: DEPARTMENTS[DEPARTMENT.TECH], // Tech DevOps
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.TIM, // Assigned by Manager
      expiresAt: null,
      assignmentReason: 'Junior staff - basic own records access',
      position: 1,
    },

    // ============================================
    // Sarah Chen - Sales Director Template (Level 4-6 test user)
    // orgLevel: DIRECTOR (hierarchyLevel=5)
    // → dataAccessScope: OWN_AND_CHILD_DEPARTMENTS
    // ============================================
    {
      id: IDS.SARAH_SALES_DIRECTOR_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.SARAH,
      templateId: TEMPLATES.SALES_DIRECTOR,
      departmentId: DEPARTMENTS[DEPARTMENT.SALES], // Sales department
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.JONY, // Assigned by CEO
      expiresAt: null,
      assignmentReason:
        'Sales director - department and child departments access',
      position: 1,
    },

    // ============================================
    // Michael Brown - Manager Template (Level 4-6 test user)
    // orgLevel: SENIOR_DIRECTOR (hierarchyLevel=4)
    // → dataAccessScope: OWN_AND_CHILD_DEPARTMENTS
    // ============================================
    {
      id: IDS.MICHAEL_MANAGER_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.MICHAEL,
      templateId: TEMPLATES.MANAGER,
      departmentId: DEPARTMENTS[DEPARTMENT.TECH], // Tech department
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.JONY, // Assigned by CEO
      expiresAt: null,
      assignmentReason:
        'Senior director Tech - department and child departments access',
      position: 1,
    },

    // ============================================
    // Emily Wilson - Finance Analyst Template (Level 4-6 test user)
    // orgLevel: SENIOR_MANAGER (hierarchyLevel=6)
    // → dataAccessScope: OWN_AND_CHILD_DEPARTMENTS
    // ============================================
    {
      id: IDS.EMILY_FINANCE_ANALYST_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.EMILY,
      templateId: TEMPLATES.FINANCE_ANALYST,
      departmentId: DEPARTMENTS[DEPARTMENT.ACCOUNTING], // Accounting department
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.JONY, // Assigned by CEO
      expiresAt: null,
      assignmentReason:
        'Senior manager Finance - department and child departments access',
      position: 1,
    },

    // ============================================
    // Craig Federighi - VP Template
    // orgLevel: C_LEVEL (hierarchyLevel=2)
    // → dataAccessScope: ALL_DEPARTMENTS
    // ============================================
    {
      id: IDS.CRAIG_VP_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.CRAIG,
      templateId: TEMPLATES.VP,
      departmentId: DEPARTMENTS[DEPARTMENT.TECH], // CTO of Tech
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.JONY, // Assigned by CEO
      expiresAt: null,
      assignmentReason: 'C-Level executive - full access to all resources',
      position: 1,
    },

    // ============================================
    // Angela Ahrendts - Director Template
    // orgLevel: VP (hierarchyLevel=3)
    // → dataAccessScope: ALL_DEPARTMENTS
    // ============================================
    {
      id: IDS.ANGELA_DIRECTOR_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.ANGELA,
      templateId: TEMPLATES.DIRECTOR,
      departmentId: DEPARTMENTS[DEPARTMENT.SALES], // Sales VP
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.JONY, // Assigned by CEO
      expiresAt: null,
      assignmentReason: 'VP Sales - department-level management access',
      position: 1,
    },

    // ============================================
    // Dan Riccio - Team Lead Template
    // orgLevel: SENIOR_MANAGER (hierarchyLevel=6)
    // → dataAccessScope: OWN_AND_CHILD_DEPARTMENTS
    // ============================================
    {
      id: IDS.DAN_TEAM_LEAD_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.DAN,
      templateId: TEMPLATES.TEAM_LEAD,
      departmentId: DEPARTMENTS[DEPARTMENT.SUPPORT], // Support department
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.JONY, // Assigned by CEO
      expiresAt: null,
      assignmentReason: 'Senior manager Support - team coordination access',
      position: 1,
    },

    // ============================================
    // Eddy Cue - Sales Manager Template
    // orgLevel: MANAGER (hierarchyLevel=7)
    // → dataAccessScope: OWN_DEPARTMENT_AND_TEAM
    // ============================================
    {
      id: IDS.EDDY_SALES_MANAGER_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.EDDY,
      templateId: TEMPLATES.SALES_MANAGER,
      departmentId: DEPARTMENTS[DEPARTMENT.SALES], // Sales department
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.SARAH, // Assigned by Sales Director
      expiresAt: null,
      assignmentReason:
        'Sales manager - team-level access to customers and orders',
      position: 1,
    },

    // ============================================
    // Deirdre O'Brien - Manager Template
    // orgLevel: MANAGER (hierarchyLevel=7)
    // → dataAccessScope: OWN_DEPARTMENT_AND_TEAM
    // ============================================
    {
      id: IDS.DEIRDRE_MANAGER_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.DEIRDRE,
      templateId: TEMPLATES.MANAGER,
      departmentId: DEPARTMENTS[DEPARTMENT.HR], // HR department
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.JONY, // Assigned by CEO
      expiresAt: null,
      assignmentReason: 'HR manager - team management and operational access',
      position: 1,
    },

    // ============================================
    // Lisa Jackson - Accountant Staff Template
    // orgLevel: SENIOR_SPECIALIST (hierarchyLevel=8)
    // → dataAccessScope: OWN_RECORDS
    // ============================================
    {
      id: IDS.LISA_ACCOUNTANT_STAFF_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.LISA,
      templateId: TEMPLATES.ACCOUNTANT_STAFF,
      departmentId: DEPARTMENTS[DEPARTMENT.ACCOUNTING], // Accounting department
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.EMILY, // Assigned by Senior Manager
      expiresAt: null,
      assignmentReason: 'Accountant staff - invoices and payments access',
      position: 1,
    },

    // ============================================
    // John Ternus - Support Staff Template
    // orgLevel: SPECIALIST (hierarchyLevel=9)
    // → dataAccessScope: OWN_RECORDS
    // ============================================
    {
      id: IDS.JOHN_T_SUPPORT_STAFF_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.JOHN_T,
      templateId: TEMPLATES.SUPPORT_STAFF,
      departmentId: DEPARTMENTS[DEPARTMENT.SUPPORT], // Support department
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.DAN, // Assigned by Senior Manager
      expiresAt: null,
      assignmentReason:
        'Support staff - read access to customer data for support cases',
      position: 1,
    },

    // ============================================
    // Greg Joswiak - Sales Staff Template
    // orgLevel: SPECIALIST (hierarchyLevel=9)
    // → dataAccessScope: OWN_RECORDS
    // ============================================
    {
      id: IDS.GREG_SALES_STAFF_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.GREG,
      templateId: TEMPLATES.SALES_STAFF,
      departmentId: DEPARTMENTS[DEPARTMENT.SALES], // Sales Domestic team
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.EDDY, // Assigned by Sales Manager
      expiresAt: null,
      assignmentReason:
        'Sales staff - own record access to customers and orders',
      position: 1,
    },

    // ============================================
    // Luca Maestri - Junior Template
    // orgLevel: JUNIOR_SPECIALIST (hierarchyLevel=10)
    // → dataAccessScope: OWN_RECORDS
    // ============================================
    {
      id: IDS.LUCA_JUNIOR_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.LUCA,
      templateId: TEMPLATES.JUNIOR,
      departmentId: DEPARTMENTS[DEPARTMENT.TECH], // Tech QA team
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.TIM, // Assigned by Tech Manager
      expiresAt: null,
      assignmentReason: 'Junior specialist - basic own records access',
      position: 1,
    },

    // ============================================
    // Jeff Williams - Junior Template
    // orgLevel: INTERN (hierarchyLevel=11)
    // → dataAccessScope: OWN_RECORDS
    // ============================================
    {
      id: IDS.JEFF_JUNIOR_TEMPLATE,
      workspaceMemberId: WORKSPACE_MEMBERS.JEFF,
      templateId: TEMPLATES.JUNIOR,
      departmentId: DEPARTMENTS[DEPARTMENT.TECH], // Tech Data team
      isActive: true,
      assignedAt: '2024-01-01T00:00:00.000Z',
      assignedById: WORKSPACE_MEMBERS.TIM, // Assigned by Tech Manager
      expiresAt: null,
      assignmentReason: 'Intern - minimal own records access',
      position: 1,
    },
  ];
