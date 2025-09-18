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

export const MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS = {
  CEO: '1a2b3c4d-5e6f-7a8b-9c0d-e1f2a3b4c5d6',
  VICE_PRESIDENT: '2b3c4d5e-6f7a-8b9c-0d1e-f2a3b4c5d6e7',
  DIRECTOR: '3c4d5e6f-7a8b-9c0d-1e2f-a3b4c5d6e7f8',
  SUB_DIRECTOR: '3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f8a',
  MANAGER: '4d5e6f7a-8b9c-0d1e-2f3a-b4c5d6e7f8a9',
  SUB_MANAGER: '4e5f6a7b-8c9d-0e1f-2a3b-4c5d6e7f8a9b',
  TEAM_LEAD: '5e6f7a8b-9c0d-1e2f-3a4b-c5d6e7f8a9b0',
  SUB_TEAM_LEAD: '5f6a7b8c-9d0e-1f2a-3b4c-5d6e7f8a9b0c',
  SENIOR_STAFF: '6f7a8b9c-0d1e-2f3a-4b5c-d6e7f8a9b0c1',
  JUNIOR_STAFF: '7a8b9c0d-1e2f-3a4b-5c6d-e7f8a9b0c1d2',
  INTERN: '8b9c0d1e-2f3a-4b5c-6d7e-f8a9b0c1d2e3',
};

export const MKT_ORGANIZATION_LEVEL_DATA_SEEDS: MktOrganizationLevelDataSeed[] =
  [
    // Level 1: CEO (Highest level)
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.CEO,
      levelCode: 'CEO',
      levelName: 'Tổng Giám đốc điều hành',
      levelNameEn: 'Chief Executive Officer',
      description:
        'Cấp cao nhất trong tổ chức, có thẩm quyền quyết định tổng thể chiến lược và điều hành công ty',
      hierarchyLevel: 1,
      parentLevelId: null, // Top level
      displayOrder: 1,
      isActive: true,
      position: 1,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 2: Vice President
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.VICE_PRESIDENT,
      levelCode: 'VP',
      levelName: 'Phó Tổng Giám đốc',
      levelNameEn: 'Vice President',
      description:
        'Cấp phó của CEO, hỗ trợ điều hành và có thẩm quyền quyết định chiến lược các mảng lớn',
      hierarchyLevel: 2,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.CEO,
      displayOrder: 2,
      isActive: true,
      position: 2,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 3: Director
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.DIRECTOR,
      levelCode: 'DIR',
      levelName: 'Giám đốc',
      levelNameEn: 'Director',
      description:
        'Giám đốc điều hành các phòng ban lớn, có thẩm quyền quyết định chiến lược cấp phòng ban',
      hierarchyLevel: 3,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.VICE_PRESIDENT,
      displayOrder: 3,
      isActive: true,
      position: 3,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 3.1: Sub Director
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SUB_DIRECTOR,
      levelCode: 'SUB_DIR',
      levelName: 'Phó Giám đốc',
      levelNameEn: 'Sub Director',
      description:
        'Phụ tá cho Giám đốc, tham gia vào việc ra quyết định chiến lược và điều hành phòng ban',
      hierarchyLevel: 3.1,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.DIRECTOR,
      displayOrder: 3.1,
      isActive: true,
      position: 3.1,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 4: Manager
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      levelCode: 'MGR',
      levelName: 'Quản lý',
      levelNameEn: 'Manager',
      description:
        'Cấp quản lý trung gian, phụ trách một hoặc nhiều team và báo cáo lên Director',
      hierarchyLevel: 4,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.DIRECTOR,
      displayOrder: 4,
      isActive: true,
      position: 4,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 4.1: Sub Manager
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SUB_MANAGER,
      levelCode: 'SUB_MGR',
      levelName: 'Trợ lý Quản lý',
      levelNameEn: 'Sub Manager',
      description:
        'Hỗ trợ Quản lý trong việc điều hành team, có thể phụ trách một số dự án hoặc nhiệm vụ cụ thể',
      hierarchyLevel: 4.1,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      displayOrder: 4.1,
      isActive: true,
      position: 4.1,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 5: Team Lead
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.TEAM_LEAD,
      levelCode: 'TL',
      levelName: 'Trưởng nhóm',
      levelNameEn: 'Team Lead',
      description:
        'Người dẫn dắt một team nhỏ, có thẩm quyền quản lý công việc và hỗ trợ team members',
      hierarchyLevel: 5,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      displayOrder: 5,
      isActive: true,
      position: 5,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 5.1: Sub Team Lead
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SUB_TEAM_LEAD,
      levelCode: 'SUB_TL',
      levelName: 'Phó nhóm',
      levelNameEn: 'Sub Team Lead',
      description:
        'Hỗ trợ Trưởng nhóm trong việc quản lý team, có thể phụ trách một số thành viên hoặc nhiệm vụ cụ thể',
      hierarchyLevel: 5.1,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.TEAM_LEAD,
      displayOrder: 5.1,
      isActive: true,
      position: 5.1,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 6: Senior Staff
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SENIOR_STAFF,
      levelCode: 'SR',
      levelName: 'Nhân viên cao cấp',
      levelNameEn: 'Senior Staff',
      description:
        'Nhân viên có kinh nghiệm, có thể mentor junior staff và handle các task phức tạp',
      hierarchyLevel: 6,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.TEAM_LEAD,
      displayOrder: 6,
      isActive: true,
      position: 6,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 7: Junior Staff
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.JUNIOR_STAFF,
      levelCode: 'JR',
      levelName: 'Nhân viên',
      levelNameEn: 'Junior Staff',
      description:
        'Nhân viên chính thức, thực hiện các công việc được giao và học hỏi từ senior staff',
      hierarchyLevel: 7,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SENIOR_STAFF,
      displayOrder: 7,
      isActive: true,
      position: 7,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 8: Intern (Lowest level)
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.INTERN,
      levelCode: 'INT',
      levelName: 'Thực tập sinh',
      levelNameEn: 'Intern',
      description:
        'Nhân viên thực tập, đang học hỏi và làm quen với môi trường làm việc, thực hiện công việc cơ bản',
      hierarchyLevel: 8,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.JUNIOR_STAFF,
      displayOrder: 8,
      isActive: true,
      position: 8,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },
  ];
