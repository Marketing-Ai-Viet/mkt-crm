import { PERMISSION_RESOURCE_IDS } from 'src/mkt-core/mkt-permission-template/constants/permission-resources.constants';

import { MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS } from './mkt-permission-template-data-seeds.constants';

// Template Resource Permission IDs (valid UUID v4 values) - pre-generated for consistency
export const MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS = {
  // CEO permissions
  CEO_CUSTOMERS: 'fad17843-f8b5-4bc2-aadf-5450a67b26d1',
  CEO_ORDERS: '698d2a76-7768-4783-a80f-34331847874e',
  CEO_PRODUCTS: '63f1e94a-ba97-44d2-8fb4-05da45d4df86',
  CEO_INVOICES: '9afa16b1-0d4c-4c22-9c20-c74244c29cc2',
  CEO_PAYMENTS: '20306a68-ba75-43f0-9e94-01e2c4455bb3',
  CEO_REPORTS: 'cef58fbd-a9f0-4913-972e-d75dfd5e1c10',
  CEO_USERS: '876486c3-25a2-422e-a517-a94ab573b56b',
  CEO_PERMISSIONS: '76c23d33-465f-4cf6-97d4-26df6e07ec75',
  CEO_SETTINGS: '389da66d-8ca7-4cbe-a62d-abc5084773d8',

  // Vice President permissions
  VP_CUSTOMERS: '87aa03d5-ec19-41ae-b347-0f9e04ddc833',
  VP_ORDERS: 'ec983b48-e86d-47ea-bea8-1c098aeec4ae',
  VP_PRODUCTS: '1f35b66e-a056-4648-8a16-44c42d252569',
  VP_INVOICES: '8424fab6-10a4-45a9-8fa6-03c1a74d2c38',
  VP_REPORTS: '6694097d-400f-49b5-b099-eec102a69717',
  VP_USERS: '95d84352-345a-41a8-91eb-392a73a99ad8',

  // Director permissions
  DIRECTOR_CUSTOMERS: '48994e4c-8310-4f55-8428-af3a699888fc',
  DIRECTOR_ORDERS: 'b7b6fe65-afa1-4e1d-be35-4f3b14036c69',
  DIRECTOR_PRODUCTS: '488e3051-987b-4170-8568-6057568279a6',
  DIRECTOR_REPORTS: '8efcf6b4-e8f9-489f-a654-2713feda28db',

  // Manager permissions
  MANAGER_CUSTOMERS: '1fb58bc7-7e89-4e9d-bbde-2586eb74b69e',
  MANAGER_ORDERS: '5d8f3547-e8d7-4f29-8bf4-003cc4430c94',
  MANAGER_PRODUCTS: 'ec2ec64b-3a6c-4390-859f-b60eab20017a',
  MANAGER_REPORTS: '74f3402c-8174-43c7-9cae-d30d01f8ed09',

  // Team Lead permissions
  TEAM_LEAD_CUSTOMERS: '4eaa5da1-70e7-4fba-8785-00a3e55487d2',
  TEAM_LEAD_ORDERS: 'fdcfdb80-19d9-4816-ae0d-0681a510e2f8',
  TEAM_LEAD_REPORTS: '2ec670c0-2adb-4d27-88dd-0ab0aecf8635',

  // Senior Staff permissions
  SENIOR_STAFF_CUSTOMERS: '164078e9-15a0-4220-b79e-555fef574c1e',
  SENIOR_STAFF_ORDERS: '6705fc9f-fc35-4944-901e-da19a48dd332',
  SENIOR_STAFF_PRODUCTS: '6b00a8ea-f52c-4ee5-b8d1-a07067ab981a',

  // Junior Staff permissions
  JUNIOR_STAFF_CUSTOMERS: 'abbb54f8-7cbb-40e8-8876-e0e4c705b2cd',
  JUNIOR_STAFF_ORDERS: 'f7e167df-aa80-4c80-b481-48003e0713c8',
  JUNIOR_STAFF_PRODUCTS: '66b1664f-8725-4b60-8566-5307cdb9b884',

  // Intern permissions
  INTERN_CUSTOMERS: '0575b38d-3f4a-448b-a3d2-7f30736d800f',
  INTERN_PRODUCTS: '84a31e73-c12c-4d98-acab-a81da11bf017',
  INTERN_REPORTS: '99d0734f-ecba-477e-8987-6e612dc23c18',
};

type MktTemplateResourcePermissionDataSeed = {
  id: string;
  templateId: string;
  resourceId: string;
  allowedActions: string; // JSON string for database storage
  deniedActions: string | null; // JSON string for database storage
  conditions: string | null; // JSON string for database storage
  restrictions: string | null; // JSON string for database storage
  isActive: boolean;
};

export const MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_COLUMNS: (keyof MktTemplateResourcePermissionDataSeed)[] =
  [
    'id',
    'templateId',
    'resourceId',
    'allowedActions',
    'deniedActions',
    'conditions',
    'restrictions',
    'isActive',
  ];

// Template Resource Permission Data Seeds
export const MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS: MktTemplateResourcePermissionDataSeed[] =
  [
    // CEO (Level 1) - Full access to all resources
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.CEO_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
        'IMPORT',
      ]),
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.CEO_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      resourceId: PERMISSION_RESOURCE_IDS.ORDERS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'APPROVE',
        'CANCEL',
      ]),
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.CEO_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      resourceId: PERMISSION_RESOURCE_IDS.PRODUCTS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'PUBLISH',
        'ARCHIVE',
      ]),
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.CEO_USERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      resourceId: PERMISSION_RESOURCE_IDS.USERS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'ACTIVATE',
        'DEACTIVATE',
      ]),
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.CEO_PERMISSIONS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      resourceId: PERMISSION_RESOURCE_IDS.PERMISSIONS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'ASSIGN',
        'REVOKE',
      ]),
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.CEO_SETTINGS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      resourceId: PERMISSION_RESOURCE_IDS.SETTINGS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'BACKUP',
        'RESTORE',
      ]),
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.CEO_REPORTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.CEO,
      resourceId: PERMISSION_RESOURCE_IDS.REPORTS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
        'SCHEDULE',
      ]),
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },

    // VICE PRESIDENT (Level 2) - Broad access with some restrictions
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.VP_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.VICE_PRESIDENT,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
      ]),
      deniedActions: JSON.stringify(['IMPORT']),
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.VP_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.VICE_PRESIDENT,
      resourceId: PERMISSION_RESOURCE_IDS.ORDERS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'APPROVE',
        'CANCEL',
      ]),
      deniedActions: JSON.stringify(['DELETE']),
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.VP_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.VICE_PRESIDENT,
      resourceId: PERMISSION_RESOURCE_IDS.PRODUCTS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'PUBLISH',
        'ARCHIVE',
      ]),
      deniedActions: JSON.stringify(['DELETE']),
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.VP_REPORTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.VICE_PRESIDENT,
      resourceId: PERMISSION_RESOURCE_IDS.REPORTS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'EXPORT',
        'SCHEDULE',
      ]),
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.VP_USERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.VICE_PRESIDENT,
      resourceId: PERMISSION_RESOURCE_IDS.USERS,
      allowedActions: JSON.stringify([
        'READ',
        'CREATE',
        'UPDATE',
        'ACTIVATE',
        'DEACTIVATE',
      ]),
      deniedActions: JSON.stringify(['DELETE']),
      conditions: null,
      restrictions: null,
      isActive: true,
    },

    // DIRECTOR (Level 3) - Departmental access
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.DIRECTOR_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.DIRECTOR,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'UPDATE', 'EXPORT']),
      deniedActions: null,
      conditions: JSON.stringify({
        department: 'own_department',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.DIRECTOR_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.DIRECTOR,
      resourceId: PERMISSION_RESOURCE_IDS.ORDERS,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'UPDATE', 'APPROVE']),
      deniedActions: null,
      conditions: JSON.stringify({
        department: 'own_department',
        maxAmount: 50000,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.DIRECTOR_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.DIRECTOR,
      resourceId: PERMISSION_RESOURCE_IDS.PRODUCTS,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'UPDATE', 'PUBLISH']),
      deniedActions: null,
      conditions: JSON.stringify({
        category: 'own_department_products',
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.DIRECTOR_REPORTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.DIRECTOR,
      resourceId: PERMISSION_RESOURCE_IDS.REPORTS,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'EXPORT']),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'department',
      }),
      restrictions: null,
      isActive: true,
    },

    // MANAGER (Level 4) - Team management access
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.MANAGER_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'UPDATE']),
      deniedActions: null,
      conditions: JSON.stringify({
        team: 'own_team',
      }),
      restrictions: JSON.stringify({
        workingHours: '8:00-18:00',
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.MANAGER_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.ORDERS,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'UPDATE']),
      deniedActions: null,
      conditions: JSON.stringify({
        team: 'own_team',
        maxAmount: 25000,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.MANAGER_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.PRODUCTS,
      allowedActions: JSON.stringify(['READ', 'UPDATE']),
      deniedActions: null,
      conditions: JSON.stringify({
        assignedProducts: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.MANAGER_REPORTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.MANAGER,
      resourceId: PERMISSION_RESOURCE_IDS.REPORTS,
      allowedActions: JSON.stringify(['READ', 'CREATE']),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'team',
      }),
      restrictions: null,
      isActive: true,
    },

    // TEAM_LEAD (Level 5) - Team coordination access
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.TEAM_LEAD_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      allowedActions: JSON.stringify(['READ', 'UPDATE']),
      deniedActions: null,
      conditions: JSON.stringify({
        assignedCustomers: true,
      }),
      restrictions: JSON.stringify({
        workingHours: '8:00-18:00',
        maxRecordsPerDay: 100,
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.TEAM_LEAD_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      resourceId: PERMISSION_RESOURCE_IDS.ORDERS,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'UPDATE']),
      deniedActions: null,
      conditions: JSON.stringify({
        maxAmount: 10000,
        requiresApproval: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.TEAM_LEAD_REPORTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.TEAM_LEAD,
      resourceId: PERMISSION_RESOURCE_IDS.REPORTS,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'own_work',
      }),
      restrictions: null,
      isActive: true,
    },

    // SENIOR_STAFF (Level 6) - Enhanced operational access
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.SENIOR_STAFF_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.SENIOR_STAFF,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'UPDATE']),
      deniedActions: null,
      conditions: JSON.stringify({
        assignedCustomers: true,
      }),
      restrictions: JSON.stringify({
        workingHours: '8:00-18:00',
        maxRecordsPerDay: 50,
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.SENIOR_STAFF_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.SENIOR_STAFF,
      resourceId: PERMISSION_RESOURCE_IDS.ORDERS,
      allowedActions: JSON.stringify(['READ', 'CREATE', 'UPDATE']),
      deniedActions: null,
      conditions: JSON.stringify({
        maxAmount: 5000,
        requiresApproval: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.SENIOR_STAFF_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.SENIOR_STAFF,
      resourceId: PERMISSION_RESOURCE_IDS.PRODUCTS,
      allowedActions: JSON.stringify(['READ', 'UPDATE']),
      deniedActions: null,
      conditions: JSON.stringify({
        assignedProducts: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // JUNIOR_STAFF (Level 7) - Basic operational access
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.JUNIOR_STAFF_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.JUNIOR_STAFF,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      allowedActions: JSON.stringify(['READ', 'UPDATE']),
      deniedActions: null,
      conditions: JSON.stringify({
        assignedCustomers: true,
        requiresSupervisorApproval: true,
      }),
      restrictions: JSON.stringify({
        workingHours: '8:00-17:00',
        maxRecordsPerDay: 25,
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.JUNIOR_STAFF_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.JUNIOR_STAFF,
      resourceId: PERMISSION_RESOURCE_IDS.ORDERS,
      allowedActions: JSON.stringify(['READ', 'CREATE']),
      deniedActions: null,
      conditions: JSON.stringify({
        maxAmount: 1000,
        requiresSupervisorApproval: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.JUNIOR_STAFF_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.JUNIOR_STAFF,
      resourceId: PERMISSION_RESOURCE_IDS.PRODUCTS,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: null,
      conditions: JSON.stringify({
        publicDataOnly: true,
      }),
      restrictions: null,
      isActive: true,
    },

    // INTERN (Level 8) - Limited read-only access
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.INTERN_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      resourceId: PERMISSION_RESOURCE_IDS.CUSTOMERS,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: null,
      conditions: JSON.stringify({
        publicDataOnly: true,
        requiresSupervisorApproval: true,
      }),
      restrictions: JSON.stringify({
        workingHours: '9:00-17:00',
        maxRecordsPerDay: 10,
        monitoringEnabled: true,
      }),
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.INTERN_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      resourceId: PERMISSION_RESOURCE_IDS.PRODUCTS,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: null,
      conditions: JSON.stringify({
        publicDataOnly: true,
        trainingModeOnly: true,
      }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_IDS.INTERN_REPORTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEED_IDS.INTERN,
      resourceId: PERMISSION_RESOURCE_IDS.REPORTS,
      allowedActions: JSON.stringify(['READ']),
      deniedActions: null,
      conditions: JSON.stringify({
        scope: 'training_reports_only',
        requiresSupervisorApproval: true,
      }),
      restrictions: null,
      isActive: true,
    },
  ];
