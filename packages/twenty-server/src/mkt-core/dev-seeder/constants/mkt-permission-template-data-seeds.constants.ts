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

// Permission Template IDs (valid UUID v4 values) - pre-generated for consistency
export const MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS = {
  CEO: '1a2b3c4d-5e6f-7890-abcd-123456789abc',
  VICE_PRESIDENT: '2b3c4d5e-6f70-8901-bcde-23456789abcd',
  DIRECTOR: '3c4d5e6f-7081-9012-cdef-3456789abcde',
  MANAGER: '4d5e6f70-8192-0123-def0-456789abcdef',
  TEAM_LEAD: '5e6f7081-92a3-1234-ef01-56789abcdef0',
  SENIOR_STAFF: '6f708192-a3b4-2345-f012-6789abcdef01',
  JUNIOR_STAFF: '70819234-b4c5-3456-0123-789abcdef012',
  INTERN: '8192a3b4-c5d6-4567-1234-89abcdef0123',
};

// Permission Template Data Seeds for 11-level hierarchy system
export const MKT_PERMISSION_TEMPLATE_DATA_SEEDS: MktPermissionTemplateDataSeed[] =
  [
    // Level 1: CEO
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      templateKey: 'CEO',
      templateName: 'Chief Executive Officer',
      description:
        'Full administrative access and ultimate decision-making authority. Can access all resources, approve all actions, and override system restrictions.',
      hierarchyLevel: 1,
      applicableToLevels: JSON.stringify([1]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 1000,
      createdBySource: 'SYSTEM',
      lastModifiedBy: 'system',
      lastModifiedAt: '2024-01-01T00:00:00.000Z',
      position: 100,
    },

    // Level 2: Vice President
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.VICE_PRESIDENT,
      templateKey: 'VICE_PRESIDENT',
      templateName: 'Vice President',
      description:
        'Senior executive access with broad permissions across departments. Can approve high-value transactions and access sensitive data with minimal restrictions.',
      hierarchyLevel: 2,
      applicableToLevels: JSON.stringify([2]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 900,
      createdBySource: 'SYSTEM',
      lastModifiedBy: 'system',
      lastModifiedAt: '2024-01-01T00:00:00.000Z',
      position: 200,
    },

    // Level 3: Director
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.DIRECTOR,
      templateKey: 'DIRECTOR',
      templateName: 'Director',
      description:
        'Departmental leadership access with extensive permissions within area of responsibility. Can manage budgets, approve departmental decisions, and access cross-functional data.',
      hierarchyLevel: 3,
      applicableToLevels: JSON.stringify([3]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 800,
      createdBySource: 'SYSTEM',
      lastModifiedBy: 'system',
      lastModifiedAt: '2024-01-01T00:00:00.000Z',
      position: 300,
    },

    // Level 4: Manager
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      templateKey: 'MANAGER',
      templateName: 'Manager',
      description:
        'Team management access with operational permissions. Can manage team members, access departmental reports, and approve routine operational decisions.',
      hierarchyLevel: 4,
      applicableToLevels: JSON.stringify([4]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 700,
      createdBySource: 'SYSTEM',
      lastModifiedBy: 'system',
      lastModifiedAt: '2024-01-01T00:00:00.000Z',
      position: 400,
    },

    // Level 5: Team Lead
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      templateKey: 'TEAM_LEAD',
      templateName: 'Team Lead',
      description:
        'Team coordination access with limited management permissions. Can assign tasks, view team performance, and access operational data within working hours.',
      hierarchyLevel: 5,
      applicableToLevels: JSON.stringify([5]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 600,
      createdBySource: 'SYSTEM',
      lastModifiedBy: 'system',
      lastModifiedAt: '2024-01-01T00:00:00.000Z',
      position: 500,
    },

    // Level 6: Senior Staff
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.SENIOR_STAFF,
      templateKey: 'SENIOR_STAFF',
      templateName: 'Senior Staff',
      description:
        'Experienced professional access with enhanced operational permissions. Can create and modify records, access most business data, with time and volume restrictions.',
      hierarchyLevel: 6,
      applicableToLevels: JSON.stringify([6]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 500,
      createdBySource: 'SYSTEM',
      lastModifiedBy: 'system',
      lastModifiedAt: '2024-01-01T00:00:00.000Z',
      position: 600,
    },

    // Level 7: Junior Staff
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.JUNIOR_STAFF,
      templateKey: 'JUNIOR_STAFF',
      templateName: 'Junior Staff',
      description:
        'Standard operational access with basic permissions. Can perform routine tasks, access public data, with supervisor oversight and approval requirements.',
      hierarchyLevel: 7,
      applicableToLevels: JSON.stringify([7]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 400,
      createdBySource: 'SYSTEM',
      lastModifiedBy: 'system',
      lastModifiedAt: '2024-01-01T00:00:00.000Z',
      position: 700,
    },

    // Level 8: Intern
    {
      id: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      templateKey: 'INTERN',
      templateName: 'Intern',
      description:
        'Limited access for training and learning purposes. Read-only access to basic data, requires supervisor approval for most actions, with comprehensive monitoring.',
      hierarchyLevel: 8,
      applicableToLevels: JSON.stringify([8]),
      version: '1.0.0',
      isSystemTemplate: true,
      isActive: true,
      priority: 300,
      createdBySource: 'SYSTEM',
      lastModifiedBy: 'system',
      lastModifiedAt: '2024-01-01T00:00:00.000Z',
      position: 800,
    },
  ];
