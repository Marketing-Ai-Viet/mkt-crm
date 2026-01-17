/**
 * Organization Level Data Seeds - 11 Levels
 * Based on DEPARTMENT_RBAC_IMPLEMENTATION.md
 *
 * Hierarchy:
 * Level 1-3: Executive (ALL DEPARTMENTS access)
 * Level 4-6: Director/Senior Manager (OWN + CHILD DEPARTMENTS)
 * Level 7: Manager (OWN DEPARTMENT + TEAM)
 * Level 8-11: Staff/Specialist (OWN RECORDS only)
 */

type MktOrganizationLevelDataSeed = {
  id: string;
  levelCode: string;
  levelName: string;
  levelNameEn?: string;
  description?: string;
  hierarchyLevel: number;
  parentLevelId?: string | null;
  displayOrder: number;
  isActive?: boolean;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export const MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS: (keyof MktOrganizationLevelDataSeed)[] =
  [
    'id',
    'levelCode',
    'levelName',
    'levelNameEn',
    'description',
    'hierarchyLevel',
    'parentLevelId',
    'displayOrder',
    'isActive',
    'position',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',
  ];

/**
 * Organization Level Codes
 */
export const ORGANIZATION_LEVEL_CODE = {
  // Executive levels (1-3) - ALL DEPARTMENTS access
  CEO: 'CEO',
  C_LEVEL: 'C_LEVEL',
  VP: 'VP',

  // Director levels (4-6) - OWN + CHILD DEPARTMENTS access
  SENIOR_DIRECTOR: 'SENIOR_DIRECTOR',
  DIRECTOR: 'DIRECTOR',
  SENIOR_MANAGER: 'SENIOR_MANAGER',

  // Manager level (7) - OWN DEPARTMENT + TEAM access
  MANAGER: 'MANAGER',

  // Staff levels (8-11) - OWN RECORDS only
  SENIOR_SPECIALIST: 'SENIOR_SPECIALIST',
  SPECIALIST: 'SPECIALIST',
  JUNIOR_SPECIALIST: 'JUNIOR_SPECIALIST',
  INTERN: 'INTERN',
} as const;

export type OrganizationLevelCode =
  (typeof ORGANIZATION_LEVEL_CODE)[keyof typeof ORGANIZATION_LEVEL_CODE];

/**
 * Organization Level IDs - 11 Levels
 */
export const MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS = {
  // Executive levels
  [ORGANIZATION_LEVEL_CODE.CEO]: '1a2b3c4d-5e6f-7a8b-9c0d-e1f2a3b4c5d6',
  [ORGANIZATION_LEVEL_CODE.C_LEVEL]: '2b3c4d5e-6f7a-8b9c-0d1e-f2a3b4c5d6e7',
  [ORGANIZATION_LEVEL_CODE.VP]: '3c4d5e6f-7a8b-9c0d-1e2f-a3b4c5d6e7f8',

  // Director levels
  [ORGANIZATION_LEVEL_CODE.SENIOR_DIRECTOR]:
    '3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f8a',
  [ORGANIZATION_LEVEL_CODE.DIRECTOR]: '4d5e6f7a-8b9c-0d1e-2f3a-b4c5d6e7f8a9',
  [ORGANIZATION_LEVEL_CODE.SENIOR_MANAGER]:
    '4e5f6a7b-8c9d-0e1f-2a3b-4c5d6e7f8a9b',

  // Manager level
  [ORGANIZATION_LEVEL_CODE.MANAGER]: '5e6f7a8b-9c0d-1e2f-3a4b-c5d6e7f8a9b0',

  // Staff levels
  [ORGANIZATION_LEVEL_CODE.SENIOR_SPECIALIST]:
    '5f6a7b8c-9d0e-1f2a-3b4c-5d6e7f8a9b0c',
  [ORGANIZATION_LEVEL_CODE.SPECIALIST]: '6f7a8b9c-0d1e-2f3a-4b5c-d6e7f8a9b0c1',
  [ORGANIZATION_LEVEL_CODE.JUNIOR_SPECIALIST]:
    '7a8b9c0d-1e2f-3a4b-5c6d-e7f8a9b0c1d2',
  [ORGANIZATION_LEVEL_CODE.INTERN]: '8b9c0d1e-2f3a-4b5c-6d7e-f8a9b0c1d2e3',

  // Legacy aliases (for backward compatibility)
  ADMIN: '1a2b3c4d-5e6f-7a8b-9c0d-e1f2a3b4c5d6', // Maps to CEO
  TEAM_LEAD: '5f6a7b8c-9d0e-1f2a-3b4c-5d6e7f8a9b0c', // Maps to SENIOR_SPECIALIST
  STAFF: '6f7a8b9c-0d1e-2f3a-4b5c-d6e7f8a9b0c1', // Maps to SPECIALIST
};

/**
 * Data Access Scope by Hierarchy Level
 */
export const DATA_ACCESS_SCOPE = {
  ALL_DEPARTMENTS: 'ALL_DEPARTMENTS',
  OWN_AND_CHILD_DEPARTMENTS: 'OWN_AND_CHILD_DEPARTMENTS',
  OWN_DEPARTMENT_AND_TEAM: 'OWN_DEPARTMENT_AND_TEAM',
  OWN_RECORDS: 'OWN_RECORDS',
} as const;

/**
 * Organization Level Data Seeds - 11 Levels
 */
export const MKT_ORGANIZATION_LEVEL_DATA_SEEDS: MktOrganizationLevelDataSeed[] =
  [
    // ============================================
    // EXECUTIVE LEVELS (1-3) - ALL DEPARTMENTS
    // ============================================

    // Level 1: CEO - Tổng Giám Đốc
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.CEO,
      levelCode: ORGANIZATION_LEVEL_CODE.CEO,
      levelName: 'Tổng Giám Đốc',
      levelNameEn: 'Chief Executive Officer',
      description:
        'Cấp cao nhất - Toàn quyền quản trị, truy cập tất cả dữ liệu và phê duyệt mọi quyết định',
      hierarchyLevel: 1,
      parentLevelId: null,
      displayOrder: 1,
      isActive: true,
      position: 1,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'System',
    },

    // Level 2: C_LEVEL - C-Suite Executive
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.C_LEVEL,
      levelCode: ORGANIZATION_LEVEL_CODE.C_LEVEL,
      levelName: 'Giám đốc điều hành',
      levelNameEn: 'C-Suite Executive (CFO, CTO, COO)',
      description:
        'Ban lãnh đạo cấp cao - CFO, CTO, COO với quyền truy cập toàn bộ hệ thống',
      hierarchyLevel: 2,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.CEO,
      displayOrder: 2,
      isActive: true,
      position: 2,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'System',
    },

    // Level 3: VP - Vice President
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.VP,
      levelCode: ORGANIZATION_LEVEL_CODE.VP,
      levelName: 'Phó Tổng Giám Đốc',
      levelNameEn: 'Vice President',
      description:
        'Phó Tổng Giám Đốc - Quản lý nhóm phòng ban, truy cập toàn bộ dữ liệu',
      hierarchyLevel: 3,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.C_LEVEL,
      displayOrder: 3,
      isActive: true,
      position: 3,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'System',
    },

    // ============================================
    // DIRECTOR LEVELS (4-6) - OWN + CHILD DEPARTMENTS
    // ============================================

    // Level 4: SENIOR_DIRECTOR - Giám đốc cấp cao
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SENIOR_DIRECTOR,
      levelCode: ORGANIZATION_LEVEL_CODE.SENIOR_DIRECTOR,
      levelName: 'Giám đốc cấp cao',
      levelNameEn: 'Senior Director',
      description:
        'Giám đốc cấp cao - Quản lý nhiều phòng ban, truy cập dữ liệu phòng ban và cấp dưới',
      hierarchyLevel: 4,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.VP,
      displayOrder: 4,
      isActive: true,
      position: 4,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'System',
    },

    // Level 5: DIRECTOR - Giám đốc
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.DIRECTOR,
      levelCode: ORGANIZATION_LEVEL_CODE.DIRECTOR,
      levelName: 'Giám đốc',
      levelNameEn: 'Director',
      description:
        'Giám đốc phòng ban - Trưởng phòng ban với quyền phê duyệt và quản lý nhân sự',
      hierarchyLevel: 5,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SENIOR_DIRECTOR,
      displayOrder: 5,
      isActive: true,
      position: 5,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'System',
    },

    // Level 6: SENIOR_MANAGER - Quản lý cấp cao
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SENIOR_MANAGER,
      levelCode: ORGANIZATION_LEVEL_CODE.SENIOR_MANAGER,
      levelName: 'Quản lý cấp cao',
      levelNameEn: 'Senior Manager',
      description:
        'Quản lý cấp cao - Phó phòng ban hoặc trưởng bộ phận với quyền nâng cao',
      hierarchyLevel: 6,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.DIRECTOR,
      displayOrder: 6,
      isActive: true,
      position: 6,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'System',
    },

    // ============================================
    // MANAGER LEVEL (7) - OWN DEPARTMENT + TEAM
    // ============================================

    // Level 7: MANAGER - Quản lý
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      levelCode: ORGANIZATION_LEVEL_CODE.MANAGER,
      levelName: 'Quản lý',
      levelNameEn: 'Manager',
      description:
        'Quản lý team - Quản lý nhóm nhân viên, xem dữ liệu team và phân công công việc',
      hierarchyLevel: 7,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SENIOR_MANAGER,
      displayOrder: 7,
      isActive: true,
      position: 7,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'System',
    },

    // ============================================
    // STAFF LEVELS (8-11) - OWN RECORDS ONLY
    // ============================================

    // Level 8: SENIOR_SPECIALIST - Chuyên viên cao cấp
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SENIOR_SPECIALIST,
      levelCode: ORGANIZATION_LEVEL_CODE.SENIOR_SPECIALIST,
      levelName: 'Chuyên viên cao cấp',
      levelNameEn: 'Senior Specialist',
      description:
        'Chuyên viên cao cấp - Nhân viên có kinh nghiệm với quyền truy cập dữ liệu cá nhân',
      hierarchyLevel: 8,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      displayOrder: 8,
      isActive: true,
      position: 8,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'System',
    },

    // Level 9: SPECIALIST - Chuyên viên
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SPECIALIST,
      levelCode: ORGANIZATION_LEVEL_CODE.SPECIALIST,
      levelName: 'Chuyên viên',
      levelNameEn: 'Specialist',
      description:
        'Chuyên viên - Nhân viên chính thức với quyền truy cập dữ liệu cá nhân',
      hierarchyLevel: 9,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SENIOR_SPECIALIST,
      displayOrder: 9,
      isActive: true,
      position: 9,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'System',
    },

    // Level 10: JUNIOR_SPECIALIST - Chuyên viên sơ cấp
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.JUNIOR_SPECIALIST,
      levelCode: ORGANIZATION_LEVEL_CODE.JUNIOR_SPECIALIST,
      levelName: 'Chuyên viên sơ cấp',
      levelNameEn: 'Junior Specialist',
      description:
        'Chuyên viên sơ cấp - Nhân viên mới với quyền hạn cơ bản, đang phát triển kỹ năng',
      hierarchyLevel: 10,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SPECIALIST,
      displayOrder: 10,
      isActive: true,
      position: 10,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'System',
    },

    // Level 11: INTERN - Thực tập sinh
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.INTERN,
      levelCode: ORGANIZATION_LEVEL_CODE.INTERN,
      levelName: 'Thực tập sinh',
      levelNameEn: 'Intern',
      description:
        'Thực tập sinh - Quyền hạn hạn chế nhất, đang học tập và làm quen môi trường',
      hierarchyLevel: 11,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.JUNIOR_SPECIALIST,
      displayOrder: 11,
      isActive: true,
      position: 11,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'System',
    },
  ];
