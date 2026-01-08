/**
 * Simplified Organization Level Data Seeds - Only 5 core levels
 * Based on RBAC_SIMPLIFIED_SETUP_GUIDE.md
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
 * Simplified Organization Level IDs - Only 5 core levels
 * Priority mapping: ADMIN(1000) > MANAGER(700) > TEAM_LEAD(600) > STAFF(500) > INTERN(300)
 */
export const MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS = {
  ADMIN: '1a2b3c4d-5e6f-7a8b-9c0d-e1f2a3b4c5d6',
  MANAGER: '4d5e6f7a-8b9c-0d1e-2f3a-b4c5d6e7f8a9',
  TEAM_LEAD: '5e6f7a8b-9c0d-1e2f-3a4b-c5d6e7f8a9b0',
  STAFF: '6f7a8b9c-0d1e-2f3a-4b5c-d6e7f8a9b0c1',
  INTERN: '8b9c0d1e-2f3a-4b5c-6d7e-f8a9b0c1d2e3',

  // Deprecated IDs (for backward compatibility during migration)
  CEO: '1a2b3c4d-5e6f-7a8b-9c0d-e1f2a3b4c5d6', // Maps to ADMIN
  VICE_PRESIDENT: '2b3c4d5e-6f7a-8b9c-0d1e-f2a3b4c5d6e7', // Deprecated
  DIRECTOR: '3c4d5e6f-7a8b-9c0d-1e2f-a3b4c5d6e7f8', // Maps to MANAGER
  SUB_DIRECTOR: '3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f8a', // Deprecated
  SUB_MANAGER: '4e5f6a7b-8c9d-0e1f-2a3b-4c5d6e7f8a9b', // Deprecated
  SUB_TEAM_LEAD: '5f6a7b8c-9d0e-1f2a-3b4c-5d6e7f8a9b0c', // Deprecated
  SENIOR_STAFF: '6f7a8b9c-0d1e-2f3a-4b5c-d6e7f8a9b0c1', // Maps to STAFF
  JUNIOR_STAFF: '7a8b9c0d-1e2f-3a4b-5c6d-e7f8a9b0c1d2', // Maps to STAFF
};

/**
 * Simplified Organization Level Data Seeds
 * Only 5 levels: ADMIN > MANAGER > TEAM_LEAD > STAFF > INTERN
 */
export const MKT_ORGANIZATION_LEVEL_DATA_SEEDS: MktOrganizationLevelDataSeed[] =
  [
    // Level 1: ADMIN (Highest level - Priority 1000)
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.ADMIN,
      levelCode: 'ADMIN',
      levelName: 'Quản trị viên',
      levelNameEn: 'Admin / Administrator',
      description:
        'Cấp cao nhất - Toàn quyền quản trị hệ thống, truy cập tất cả dữ liệu và chức năng',
      hierarchyLevel: 1,
      parentLevelId: null, // Top level
      displayOrder: 1,
      isActive: true,
      position: 1,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 2: MANAGER (Priority 700)
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      levelCode: 'MANAGER',
      levelName: 'Quản lý',
      levelNameEn: 'Manager',
      description:
        'Quản lý team, có quyền duyệt các thao tác quan trọng và giám sát nhân viên',
      hierarchyLevel: 2,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.ADMIN,
      displayOrder: 2,
      isActive: true,
      position: 2,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 3: TEAM_LEAD (Priority 600)
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.TEAM_LEAD,
      levelCode: 'TEAM_LEAD',
      levelName: 'Trưởng nhóm',
      levelNameEn: 'Team Lead',
      description:
        'Dẫn dắt nhóm nhỏ, phân công công việc và hỗ trợ team members',
      hierarchyLevel: 3,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      displayOrder: 3,
      isActive: true,
      position: 3,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 4: STAFF (Priority 500)
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.STAFF,
      levelCode: 'STAFF',
      levelName: 'Nhân viên',
      levelNameEn: 'Staff',
      description:
        'Nhân viên chính thức, thực hiện công việc hàng ngày theo phân công',
      hierarchyLevel: 4,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.TEAM_LEAD,
      displayOrder: 4,
      isActive: true,
      position: 4,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 5: INTERN (Lowest level - Priority 300)
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.INTERN,
      levelCode: 'INTERN',
      levelName: 'Thực tập sinh',
      levelNameEn: 'Intern',
      description:
        'Nhân viên thực tập với quyền hạn hạn chế, đang học tập và làm quen môi trường',
      hierarchyLevel: 5,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.STAFF,
      displayOrder: 5,
      isActive: true,
      position: 5,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },
  ];
