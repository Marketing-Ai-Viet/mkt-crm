import {
  DEPARTMENT,
  MKT_DEPARTMENT_DATA_SEEDS_IDS,
  MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS,
  TEAM,
} from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
import { WORKSPACE_MEMBER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';

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
 * Each department and team has sub-managers assigned with real workspace member IDs.
 */
export const MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS = [
  // ============================================================================
  // DEPARTMENTS (Level 1)
  // ============================================================================

  // SALES department - 2 sub-managers
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SALES_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-01-15T09:00:00Z'),
    note: 'Phó trưởng phòng kinh doanh - phụ trách bán hàng trong nước',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.SALES],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
  },
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SALES_SUB_MANAGER_2,
    isPrimary: false,
    assignedAt: new Date('2024-02-01T09:00:00Z'),
    note: 'Phó trưởng phòng kinh doanh - phụ trách bán hàng quốc tế',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.SALES],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },

  // SUPPORT department - 2 sub-managers
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SUPPORT_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-01-20T09:00:00Z'),
    note: 'Phó trưởng bộ phận hỗ trợ - xử lý escalation khách hàng',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.SUPPORT],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
  },
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SUPPORT_SUB_MANAGER_2,
    isPrimary: false,
    assignedAt: new Date('2024-03-01T09:00:00Z'),
    note: 'Phó trưởng bộ phận hỗ trợ - phụ trách kỹ thuật',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.SUPPORT],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
  },

  // ACCOUNTING department - 2 sub-managers
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.ACCOUNTING_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-01-10T09:00:00Z'),
    note: 'Phó trưởng phòng kế toán - phụ trách công nợ phải trả',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.ACCOUNTING],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
  },
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.ACCOUNTING_SUB_MANAGER_2,
    isPrimary: false,
    assignedAt: new Date('2024-03-01T09:00:00Z'),
    note: 'Phó trưởng phòng kế toán - phụ trách kiểm toán và tuân thủ',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.ACCOUNTING],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },

  // HR department - 2 sub-managers
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.HR_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-01-25T09:00:00Z'),
    note: 'Phó trưởng phòng nhân sự - phụ trách tuyển dụng',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.HR],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
  },
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.HR_SUB_MANAGER_2,
    isPrimary: false,
    assignedAt: new Date('2024-02-15T09:00:00Z'),
    note: 'Phó trưởng phòng nhân sự - phụ trách đào tạo và phát triển',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.HR],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },

  // TECH department - 3 sub-managers
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.TECH_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-01-05T09:00:00Z'),
    note: 'Phó trưởng phòng công nghệ - phụ trách backend development',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.TECH],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
  },
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.TECH_SUB_MANAGER_2,
    isPrimary: false,
    assignedAt: new Date('2024-01-05T09:00:00Z'),
    note: 'Phó trưởng phòng công nghệ - phụ trách frontend development',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.TECH],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.TECH_SUB_MANAGER_3,
    isPrimary: false,
    assignedAt: new Date('2024-02-15T09:00:00Z'),
    note: 'Phó trưởng phòng công nghệ - phụ trách DevOps và hạ tầng',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[DEPARTMENT.TECH],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
  },

  // ============================================================================
  // TEAMS (Level 2) - SALES
  // ============================================================================

  // SALES_DOMESTIC team - 2 sub-managers
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SALES_DOMESTIC_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-02-01T09:00:00Z'),
    note: 'Phó đội trưởng bán hàng trong nước - phụ trách miền Bắc',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.SALES_DOMESTIC],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SALES_DOMESTIC_SUB_MANAGER_2,
    isPrimary: false,
    assignedAt: new Date('2024-02-15T09:00:00Z'),
    note: 'Phó đội trưởng bán hàng trong nước - phụ trách miền Nam',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.SALES_DOMESTIC],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
  },

  // SALES_INTERNATIONAL team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SALES_INTERNATIONAL_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-02-20T09:00:00Z'),
    note: 'Phó đội trưởng bán hàng quốc tế - phụ trách thị trường Đông Nam Á',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.SALES_INTERNATIONAL],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
  },

  // SALES_PARTNER team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SALES_PARTNER_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-03-01T09:00:00Z'),
    note: 'Phó đội trưởng bán hàng đối tác - phụ trách reseller channel',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.SALES_PARTNER],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
  },

  // SALES_ONLINE team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SALES_ONLINE_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-03-10T09:00:00Z'),
    note: 'Phó đội trưởng bán hàng trực tuyến - phụ trách e-commerce',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.SALES_ONLINE],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },

  // ============================================================================
  // TEAMS (Level 2) - SUPPORT
  // ============================================================================

  // SUPPORT_CUSTOMER team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SUPPORT_CUSTOMER_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-02-05T09:00:00Z'),
    note: 'Phó đội trưởng hỗ trợ khách hàng - phụ trách hotline',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.SUPPORT_CUSTOMER],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
  },

  // SUPPORT_TECHNICAL team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SUPPORT_TECHNICAL_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-02-10T09:00:00Z'),
    note: 'Phó đội trưởng hỗ trợ kỹ thuật - phụ trách xử lý sự cố',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.SUPPORT_TECHNICAL],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
  },

  // SUPPORT_INTERNAL team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.SUPPORT_INTERNAL_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-02-15T09:00:00Z'),
    note: 'Phó đội trưởng hỗ trợ nội bộ - phụ trách IT helpdesk',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.SUPPORT_INTERNAL],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
  },

  // ============================================================================
  // TEAMS (Level 2) - ACCOUNTING
  // ============================================================================

  // ACCOUNTING_PAYABLE team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.ACCOUNTING_PAYABLE_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-02-01T09:00:00Z'),
    note: 'Phó đội trưởng kế toán thanh toán - phụ trách vendor payment',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.ACCOUNTING_PAYABLE],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },

  // ACCOUNTING_RECEIVABLE team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.ACCOUNTING_RECEIVABLE_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-02-05T09:00:00Z'),
    note: 'Phó đội trưởng kế toán thu hồi - phụ trách collection',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.ACCOUNTING_RECEIVABLE],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
  },

  // ACCOUNTING_AUDIT team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.ACCOUNTING_AUDIT_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-02-10T09:00:00Z'),
    note: 'Phó đội trưởng kiểm toán - phụ trách internal audit',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.ACCOUNTING_AUDIT],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
  },

  // ACCOUNTING_TAX team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.ACCOUNTING_TAX_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-02-15T09:00:00Z'),
    note: 'Phó đội trưởng kế toán thuế - phụ trách VAT và thuế TNCN',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.ACCOUNTING_TAX],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
  },

  // ============================================================================
  // TEAMS (Level 2) - HR
  // ============================================================================

  // HR_RECRUITMENT team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.HR_RECRUITMENT_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-02-20T09:00:00Z'),
    note: 'Phó đội trưởng tuyển dụng - phụ trách tech recruitment',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.HR_RECRUITMENT],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
  },

  // HR_TRAINING team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.HR_TRAINING_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-02-25T09:00:00Z'),
    note: 'Phó đội trưởng đào tạo - phụ trách onboarding',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.HR_TRAINING],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
  },

  // HR_PAYROLL team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.HR_PAYROLL_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-03-01T09:00:00Z'),
    note: 'Phó đội trưởng tính lương - phụ trách chấm công và phúc lợi',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.HR_PAYROLL],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },

  // ============================================================================
  // TEAMS (Level 2) - TECH
  // ============================================================================

  // TECH_BACKEND team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.TECH_BACKEND_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-01-15T09:00:00Z'),
    note: 'Phó đội trưởng Backend - phụ trách API development',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.TECH_BACKEND],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
  },

  // TECH_FRONTEND team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.TECH_FRONTEND_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-01-20T09:00:00Z'),
    note: 'Phó đội trưởng Frontend - phụ trách UI/UX implementation',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.TECH_FRONTEND],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JONY,
  },

  // TECH_DEVOPS team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.TECH_DEVOPS_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-01-25T09:00:00Z'),
    note: 'Phó đội trưởng DevOps - phụ trách CI/CD và monitoring',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.TECH_DEVOPS],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
  },

  // TECH_QA team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.TECH_QA_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-02-01T09:00:00Z'),
    note: 'Phó đội trưởng QA - phụ trách automation testing',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.TECH_QA],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.PHIL,
  },

  // TECH_DATA team - 1 sub-manager
  {
    id: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS_IDS.TECH_DATA_SUB_MANAGER_1,
    isPrimary: true,
    assignedAt: new Date('2024-02-05T09:00:00Z'),
    note: 'Phó đội trưởng Data - phụ trách data pipeline và analytics',
    isActive: true,
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS[TEAM.TECH_DATA],
    workspaceMemberId: WORKSPACE_MEMBER_DATA_SEED_IDS.JANE,
  },
];
