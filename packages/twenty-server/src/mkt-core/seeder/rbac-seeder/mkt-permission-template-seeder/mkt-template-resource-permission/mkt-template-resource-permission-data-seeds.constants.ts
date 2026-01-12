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
  ];
