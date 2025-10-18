import { PERMISSION_TEMPLATES } from 'src/mkt-core/mkt-organization-level/constants/permission-templates.constants';
import {
  AccessLimitations,
  DefaultPermissions,
} from 'src/mkt-core/mkt-organization-level/types';

type MktOrganizationLevelDataSeed = {
  id: string;
  levelCode: string;
  levelName: string;
  levelNameEn?: string;
  description?: string;
  hierarchyLevel: number;
  parentLevelId?: string | null;
  defaultPermissions?: DefaultPermissions;
  accessLimitations?: AccessLimitations;
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
    'defaultPermissions',
    'accessLimitations',
    'displayOrder',
    'isActive',
    'position',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',
  ];

export const MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS = {
  DIRECTOR: '0835587e-9dc0-47db-857d-da6caae06c83',
  MANAGER: '9c0a6ee6-4f5b-4f41-b1b5-32fe7a84ab59',
  TEAM_LEAD: 'a401d801-f3d8-4973-91f2-89537e743daa',
  SENIOR_STAFF: 'f915d505-807d-4025-91ca-4874bd6ea384',
  JUNIOR_STAFF: '80d70621-831b-468b-86b7-18110808b4a6',
};

export const MKT_ORGANIZATION_LEVEL_DATA_SEEDS: MktOrganizationLevelDataSeed[] =
  [
    // Level 1: Director (Highest level)
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.DIRECTOR,
      levelCode: 'DIRECTOR',
      levelName: 'Giám đốc',
      levelNameEn: 'Director',
      description:
        'Cấp quản lý cao nhất, có thẩm quyền quyết định chiến lược và điều hành toàn bộ tổ chức',
      hierarchyLevel: 1,
      parentLevelId: null, // Top level
      defaultPermissions: PERMISSION_TEMPLATES.DIRECTOR.defaultPermissions,
      accessLimitations: PERMISSION_TEMPLATES.DIRECTOR.accessLimitations,
      displayOrder: 1,
      isActive: true,
      position: 1,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 2: Manager
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      levelCode: 'MANAGER',
      levelName: 'Quản lý',
      levelNameEn: 'Manager',
      description:
        'Cấp quản lý trung gian, phụ trách một hoặc nhiều team và báo cáo lên Director',
      hierarchyLevel: 2,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.DIRECTOR,
      defaultPermissions: PERMISSION_TEMPLATES.MANAGER.defaultPermissions,
      accessLimitations: PERMISSION_TEMPLATES.MANAGER.accessLimitations,
      displayOrder: 2,
      isActive: true,
      position: 2,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 3: Team Lead
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.TEAM_LEAD,
      levelCode: 'TEAM_LEAD',
      levelName: 'Trưởng nhóm',
      levelNameEn: 'Team Lead',
      description:
        'Người dẫn dắt một team nhỏ, có thẩm quyền quản lý công việc và hỗ trợ team members',
      hierarchyLevel: 3,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.MANAGER,
      defaultPermissions: PERMISSION_TEMPLATES.TEAM_LEAD.defaultPermissions,
      accessLimitations: PERMISSION_TEMPLATES.TEAM_LEAD.accessLimitations,
      displayOrder: 3,
      isActive: true,
      position: 3,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 4: Senior Staff
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SENIOR_STAFF,
      levelCode: 'SENIOR_STAFF',
      levelName: 'Nhân viên cao cấp',
      levelNameEn: 'Senior Staff',
      description:
        'Nhân viên có kinh nghiệm, có thể mentor junior staff và handle các task phức tạp',
      hierarchyLevel: 4,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.TEAM_LEAD,
      defaultPermissions: PERMISSION_TEMPLATES.SENIOR_STAFF.defaultPermissions,
      accessLimitations: PERMISSION_TEMPLATES.SENIOR_STAFF.accessLimitations,
      displayOrder: 4,
      isActive: true,
      position: 4,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },

    // Level 5: Junior Staff (Lowest level)
    {
      id: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.JUNIOR_STAFF,
      levelCode: 'JUNIOR_STAFF',
      levelName: 'Nhân viên',
      levelNameEn: 'Junior Staff',
      description:
        'Nhân viên mới, thực hiện các công việc cơ bản và học hỏi từ senior staff',
      hierarchyLevel: 5,
      parentLevelId: MKT_ORGANIZATION_LEVEL_DATA_SEEDS_IDS.SENIOR_STAFF,
      defaultPermissions: PERMISSION_TEMPLATES.JUNIOR_STAFF.defaultPermissions,
      accessLimitations: PERMISSION_TEMPLATES.JUNIOR_STAFF.accessLimitations,
      displayOrder: 5,
      isActive: true,
      position: 5,
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: null,
      createdByName: 'Admin User',
    },
  ];
