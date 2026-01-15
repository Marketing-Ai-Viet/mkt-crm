/**
 * Template Resource Permission Seed Data Constants
 *
 * Maps permission templates to specific resources with allowed/denied actions
 */

import { MKT_PERMISSION_ACTION_DATA_SEEDS_IDS } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-action/mkt-permission-action-data-seeds.constants';
import { MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-resource/mkt-permission-resource-data-seeds.constants';
import { MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-template/mkt-permission-template-data-seeds.constants';

type MktTemplateResourcePermissionDataSeed = {
  id: string;
  templateId: string;
  resourceId: string;
  allowedActions: string; // JSON string of action IDs array
  deniedActions: string | null; // JSON string of action IDs array
  conditions: string | null; // JSON string of conditions object
  restrictions: string | null; // JSON string of restrictions object
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

// All actions for full access (JSON stringified)
const ALL_ACTIONS = JSON.stringify([
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.MANAGE,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.EXPORT,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.IMPORT,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.APPROVE,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.REJECT,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.ARCHIVE,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.RESTORE,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.ASSIGN,
]);

// CRUD actions (JSON stringified)
const CRUD_ACTIONS = JSON.stringify([
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
]);

// Read-only actions (JSON stringified)
const READ_ONLY_ACTIONS = JSON.stringify([
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.EXPORT,
]);

// Basic edit actions (no delete) (JSON stringified)
const BASIC_EDIT_ACTIONS = JSON.stringify([
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
  MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.EXPORT,
]);

export const MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS = {
  // CEO permissions (full access to all resources)
  CEO_CUSTOMERS: '912de43c-f815-4ea8-a0ee-b23ba9ebfb1a',
  CEO_ORDERS: '6795eab0-cfbb-4ea1-870b-dadb42ec95c6',
  CEO_PRODUCTS: '3bc5d419-e62d-4cae-9814-cd493637d8cc',
  CEO_LICENSES: 'cb190a74-4ef8-4133-a3d0-4403fde97e1c',
  CEO_INVOICES: 'a6155a57-b335-40ee-b669-ba570c57a094',
  CEO_PAYMENTS: '1679354f-afdc-4cbb-95f6-e7a80fbc68ca',
  CEO_DEPARTMENTS: 'f78b9fe9-ac5f-4bb9-b182-db01df0a84af',
  CEO_USERS: '702b2e2b-72e7-4983-b62f-3925cc187344',
  CEO_REPORTS: 'ee986267-3c7c-430e-8f62-873b3db313a1',
  CEO_SETTINGS: '1c004483-f923-4d9b-b765-368f82d5be6a',

  // VP permissions
  VP_CUSTOMERS: '91c394fb-e2a9-4fc0-b47b-54bef153b19b',
  VP_ORDERS: 'a6091e2b-a922-42e1-b05d-03d6a43576a5',
  VP_PRODUCTS: '61c693e9-be69-47b9-82f6-5e60cbb3f1d1',
  VP_LICENSES: 'e897c4f2-6658-461f-be3d-c9be3fe26aeb',
  VP_REPORTS: 'e373ba12-2e7b-4a21-951a-34875c74c491',

  // Director permissions
  DIRECTOR_CUSTOMERS: '33b6fe00-230d-4ad8-875c-cc64514d88a9',
  DIRECTOR_ORDERS: '68251885-b80a-4bee-b9bd-a6c5578294b2',
  DIRECTOR_PRODUCTS: 'e64ea72a-dde2-45f6-aeef-2b95074434a6',
  DIRECTOR_LICENSES: '5e8e19f9-f283-4d50-b537-604df239ecea',

  // Manager permissions
  MANAGER_CUSTOMERS: '0ef9b8a8-23a6-44a5-b471-cff49409e8be',
  MANAGER_ORDERS: 'ed669a96-f20a-4369-8570-a2fa7d782a40',
  MANAGER_PRODUCTS: '986fe497-f972-44a6-9998-70de94bef561',

  // ===========================================
  // SALES Department permissions
  // ===========================================
  // Sales Director permissions
  SALES_DIRECTOR_CUSTOMERS: 'b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e',
  SALES_DIRECTOR_ORDERS: 'c5d6e7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f',
  SALES_DIRECTOR_LICENSES: 'd6e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a',
  SALES_DIRECTOR_INVOICES: 'e7f8a9b0-c1d2-4e3f-4a5b-6c7d8e9f0a1b',
  SALES_DIRECTOR_PRODUCTS: 'f8a9b0c1-d2e3-4f4a-5b6c-7d8e9f0a1b2c',
  SALES_DIRECTOR_PAYMENTS: 'a9b0c1d2-e3f4-4a5b-6c7d-8e9f0a1b2c3d',

  // Sales Manager permissions
  SALES_MANAGER_CUSTOMERS: 'b0c1d2e3-f4a5-4b6c-7d8e-9f0a1b2c3d4e',
  SALES_MANAGER_ORDERS: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
  SALES_MANAGER_LICENSES: 'd2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6a',
  SALES_MANAGER_INVOICES: 'e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a7b',
  SALES_MANAGER_PRODUCTS: 'f4a5b6c7-d8e9-4f0a-1b2c-3d4e5f6a7b8c',
  SALES_MANAGER_PAYMENTS: 'a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9d',

  // Sales Staff permissions
  SALES_STAFF_CUSTOMERS: 'b6c7d8e9-f0a1-4b2c-3d4e-5f6a7b8c9d0e',
  SALES_STAFF_ORDERS: 'c7d8e9f0-a1b2-4c3d-4e5f-6a7b8c9d0e1f',
  SALES_STAFF_LICENSES: 'd8e9f0a1-b2c3-4d4e-5f6a-7b8c9d0e1f2a',
  SALES_STAFF_INVOICES: 'e9f0a1b2-c3d4-4e5f-6a7b-8c9d0e1f2a3b',
  SALES_STAFF_PRODUCTS: 'f0a1b2c3-d4e5-4f6a-7b8c-9d0e1f2a3b4c',
};

export const MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS: MktTemplateResourcePermissionDataSeed[] =
  [
    // ===========================================
    // CEO Permissions - Full access to all resources
    // ===========================================
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.CEO_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.CEO,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.CUSTOMERS,
      allowedActions: ALL_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.CEO_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.CEO,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.ORDERS,
      allowedActions: ALL_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.CEO_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.CEO,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.PRODUCTS,
      allowedActions: ALL_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.CEO_LICENSES,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.CEO,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.LICENSES,
      allowedActions: ALL_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.CEO_INVOICES,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.CEO,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.INVOICES,
      allowedActions: ALL_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.CEO_PAYMENTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.CEO,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.PAYMENTS,
      allowedActions: ALL_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.CEO_DEPARTMENTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.CEO,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.DEPARTMENTS,
      allowedActions: ALL_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.CEO_USERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.CEO,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.USERS,
      allowedActions: ALL_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.CEO_REPORTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.CEO,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.REPORTS,
      allowedActions: ALL_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.CEO_SETTINGS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.CEO,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.SETTINGS,
      allowedActions: ALL_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },

    // ===========================================
    // VP Permissions - High-level access, no system settings
    // ===========================================
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.VP_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.VP,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.CUSTOMERS,
      allowedActions: CRUD_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.VP_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.VP,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.ORDERS,
      allowedActions: CRUD_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.VP_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.VP,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.PRODUCTS,
      allowedActions: CRUD_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.VP_LICENSES,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.VP,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.LICENSES,
      allowedActions: CRUD_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.VP_REPORTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.VP,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.REPORTS,
      allowedActions: READ_ONLY_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },

    // ===========================================
    // Director Permissions - Department-level access
    // ===========================================
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.DIRECTOR_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.DIRECTOR,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.CUSTOMERS,
      allowedActions: BASIC_EDIT_ACTIONS,
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
      ]),
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.DIRECTOR_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.DIRECTOR,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.ORDERS,
      allowedActions: BASIC_EDIT_ACTIONS,
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
      ]),
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.DIRECTOR_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.DIRECTOR,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.PRODUCTS,
      allowedActions: READ_ONLY_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.DIRECTOR_LICENSES,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.DIRECTOR,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.LICENSES,
      allowedActions: READ_ONLY_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },

    // ===========================================
    // Manager Permissions - Team-level access
    // ===========================================
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.MANAGER_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.MANAGER,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.CUSTOMERS,
      allowedActions: BASIC_EDIT_ACTIONS,
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
      ]),
      conditions: JSON.stringify({ ownRecordsOnly: false }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.MANAGER_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.MANAGER,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.ORDERS,
      allowedActions: BASIC_EDIT_ACTIONS,
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
      ]),
      conditions: JSON.stringify({ ownRecordsOnly: false }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.MANAGER_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.MANAGER,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.PRODUCTS,
      allowedActions: READ_ONLY_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },

    // ===========================================
    // SALES_DIRECTOR Permissions - Full department access
    // Customer: ALL CRUD + EXPORT + ASSIGN
    // Order: ALL CRUD + APPROVE
    // License: READ only
    // Invoice: READ + EXPORT (team scope)
    // ===========================================
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_DIRECTOR_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_DIRECTOR,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.CUSTOMERS,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.EXPORT,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.ASSIGN,
      ]),
      deniedActions: null,
      conditions: JSON.stringify({ scope: 'DEPARTMENT' }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_DIRECTOR_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_DIRECTOR,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.ORDERS,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.APPROVE,
      ]),
      deniedActions: null,
      conditions: JSON.stringify({ scope: 'DEPARTMENT' }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_DIRECTOR_LICENSES,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_DIRECTOR,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.LICENSES,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
      ]),
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
      ]),
      conditions: JSON.stringify({ scope: 'DEPARTMENT' }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_DIRECTOR_INVOICES,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_DIRECTOR,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.INVOICES,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.EXPORT,
      ]),
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
      ]),
      conditions: JSON.stringify({ scope: 'TEAM' }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_DIRECTOR_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_DIRECTOR,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.PRODUCTS,
      allowedActions: READ_ONLY_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_DIRECTOR_PAYMENTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_DIRECTOR,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.PAYMENTS,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
      ]),
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
      ]),
      conditions: JSON.stringify({ scope: 'TEAM', viewStatusOnly: true }),
      restrictions: null,
      isActive: true,
    },

    // ===========================================
    // SALES_MANAGER Permissions - Team-level access
    // Customer: TEAM CRU + EXPORT + ASSIGN (no DELETE)
    // Order: TEAM CRU + APPROVE (no DELETE)
    // License: TEAM READ + UPDATE
    // Invoice: TEAM READ
    // ===========================================
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_MANAGER_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_MANAGER,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.CUSTOMERS,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.EXPORT,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.ASSIGN,
      ]),
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
      ]),
      conditions: JSON.stringify({ scope: 'TEAM' }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_MANAGER_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_MANAGER,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.ORDERS,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.APPROVE,
      ]),
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
      ]),
      conditions: JSON.stringify({ scope: 'TEAM' }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_MANAGER_LICENSES,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_MANAGER,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.LICENSES,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
      ]),
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
      ]),
      conditions: JSON.stringify({ scope: 'TEAM' }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_MANAGER_INVOICES,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_MANAGER,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.INVOICES,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
      ]),
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.EXPORT,
      ]),
      conditions: JSON.stringify({ scope: 'TEAM' }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_MANAGER_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_MANAGER,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.PRODUCTS,
      allowedActions: READ_ONLY_ACTIONS,
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_MANAGER_PAYMENTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_MANAGER,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.PAYMENTS,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
      ]),
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
      ]),
      conditions: JSON.stringify({ scope: 'TEAM', viewStatusOnly: true }),
      restrictions: null,
      isActive: true,
    },

    // ===========================================
    // SALES_STAFF Permissions - Own record access
    // Customer: OWN CRU (no DELETE, no EXPORT)
    // Order: OWN CRU (no DELETE, no APPROVE)
    // License: OWN READ only
    // Invoice: OWN READ only
    // ===========================================
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_STAFF_CUSTOMERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_STAFF,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.CUSTOMERS,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
      ]),
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.EXPORT,
      ]),
      conditions: JSON.stringify({ scope: 'OWN', filterBy: 'accountOwnerId' }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_STAFF_ORDERS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_STAFF,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.ORDERS,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
      ]),
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.APPROVE,
      ]),
      conditions: JSON.stringify({ scope: 'OWN', filterBy: 'createdById' }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_STAFF_LICENSES,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_STAFF,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.LICENSES,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
      ]),
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
      ]),
      conditions: JSON.stringify({ scope: 'OWN' }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_STAFF_INVOICES,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_STAFF,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.INVOICES,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
      ]),
      deniedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.CREATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.UPDATE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.DELETE,
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.EXPORT,
      ]),
      conditions: JSON.stringify({ scope: 'OWN_ORDERS' }),
      restrictions: null,
      isActive: true,
    },
    {
      id: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS_IDS.SALES_STAFF_PRODUCTS,
      templateId: MKT_PERMISSION_TEMPLATE_DATA_SEEDS_IDS.SALES_STAFF,
      resourceId: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.PRODUCTS,
      allowedActions: JSON.stringify([
        MKT_PERMISSION_ACTION_DATA_SEEDS_IDS.READ,
      ]),
      deniedActions: null,
      conditions: null,
      restrictions: null,
      isActive: true,
    },
  ];
