type MktPermissionTemplateDataSeed = {
  id: string;
  templateKey: string;
  templateName: string;
  description?: string;
  hierarchyLevel: number;
  applicableToLevels: string; // JSON string for database storage
  version: string;
  isSystemTemplate: boolean;
  isActive: boolean;
  priority: number;
  createdBySource: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string; // ISO string for database storage
  position?: number;
};

export const MKT_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS: (keyof MktPermissionTemplateDataSeed)[] =
  [
    'id',
    'templateKey',
    'templateName',
    'description',
    'hierarchyLevel',
    'applicableToLevels',
    'version',
    'isSystemTemplate',
    'isActive',
    'priority',
    'createdBySource',
    'lastModifiedBy',
    'lastModifiedAt',
    'position',
  ];

/**
 * Permission Template IDs - Simplified RBAC System (5 templates)
 * Based on RBAC_SIMPLIFIED_SETUP_GUIDE.md
 */
export const MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS = {
  ADMIN: '1a1b1c1d-1e1f-4a4b-8c8d-1e1f2a2b3c3d',
  MANAGER: '2a2b2c2d-2e2f-4a4b-8c8d-2e2f3a3b4c4d',
  TEAM_LEAD: '3a3b3c3d-3e3f-4a4b-8c8d-3e3f4a4b5c5d',
  STAFF: '4a4b4c4d-4e4f-4a4b-8c8d-4e4f5a5b6c6d',
  INTERN: '5a5b5c5d-5e5f-4a4b-8c8d-5e5f6a6b7c7d',

  // Deprecated IDs (for backward compatibility)
  CEO: '1a1b1c1d-1e1f-4a4b-8c8d-1e1f2a2b3c3d', // Maps to ADMIN
  VICE_PRESIDENT: '2a2b2c2d-2e2f-4a4b-8c8d-2e2f3a3b4c4d', // Deprecated
  DIRECTOR: '2a2b2c2d-2e2f-4a4b-8c8d-2e2f3a3b4c4d', // Maps to MANAGER
  SENIOR_STAFF: '4a4b4c4d-4e4f-4a4b-8c8d-4e4f5a5b6c6d', // Maps to STAFF
  JUNIOR_STAFF: '4a4b4c4d-4e4f-4a4b-8c8d-4e4f5a5b6c6d', // Maps to STAFF
};

/**
 * Permission Template Data Seeds - Simplified RBAC System (5 templates)
 * Based on RBAC_SIMPLIFIED_SETUP_GUIDE.md
 *
 * Priority mapping:
 * - ADMIN: 1000 (Highest)
 * - MANAGER: 700
 * - TEAM_LEAD: 600
 * - STAFF: 500
 * - INTERN: 300 (Lowest)
 */
export const MKT_PERMISSION_TEMPLATE_DATA_SEEDS: MktPermissionTemplateDataSeed[] =
  [
    // Level 1: ADMIN
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.ADMIN,
      templateKey: 'ADMIN',
      templateName: 'Admin Template',
      description:
        'Toàn quyền quản trị hệ thống - Full access to all data and functions. Requires MFA for sensitive operations. Can access all departments and override restrictions.',
      hierarchyLevel: 1,
      applicableToLevels: JSON.stringify([1]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 1000,
      createdBySource: 'SYSTEM',
      lastModifiedBy: 'system',
      lastModifiedAt: '2025-09-30T00:00:00.000Z',
      position: 1,
    },

    // Level 2: MANAGER
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      templateKey: 'MANAGER',
      templateName: 'Manager Template',
      description:
        'Quản lý team và duyệt các thao tác quan trọng - Manage teams, approve important actions (up to 50M VND for Sales, 100M VND for Admin), view department and team data, limited cross-department access.',
      hierarchyLevel: 2,
      applicableToLevels: JSON.stringify([2]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 700,
      createdBySource: 'SYSTEM',
      lastModifiedBy: 'system',
      lastModifiedAt: '2025-09-30T00:00:00.000Z',
      position: 2,
    },

    // Level 3: TEAM_LEAD
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      templateKey: 'TEAM_LEAD',
      templateName: 'Team Lead Template',
      description:
        'Dẫn dắt nhóm nhỏ, phân công công việc - Lead small teams, assign tasks, approve minor actions (up to 20M VND), view team and own data. Can handle medium-high priority items.',
      hierarchyLevel: 3,
      applicableToLevels: JSON.stringify([3]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 600,
      createdBySource: 'SYSTEM',
      lastModifiedBy: 'system',
      lastModifiedAt: '2025-09-30T00:00:00.000Z',
      position: 3,
    },

    // Level 4: STAFF
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.STAFF,
      templateKey: 'STAFF',
      templateName: 'Staff Template',
      description:
        'Thực hiện công việc hàng ngày - Perform daily tasks, manage own data and assigned records. Can create customers/orders, handle low-medium priority items. No approval rights.',
      hierarchyLevel: 4,
      applicableToLevels: JSON.stringify([4]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 500,
      createdBySource: 'SYSTEM',
      lastModifiedBy: 'system',
      lastModifiedAt: '2025-09-30T00:00:00.000Z',
      position: 4,
    },

    // Level 5: INTERN
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      templateKey: 'INTERN',
      templateName: 'Intern Template',
      description:
        'Quyền hạn hạn chế, đang học tập - Limited access for learning. Read-only for most data, can only handle low priority items. Requires supervisor approval for critical actions. Comprehensive monitoring enabled.',
      hierarchyLevel: 5,
      applicableToLevels: JSON.stringify([5]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 300,
      createdBySource: 'SYSTEM',
      lastModifiedBy: 'system',
      lastModifiedAt: '2025-09-30T00:00:00.000Z',
      position: 5,
    },
  ];
