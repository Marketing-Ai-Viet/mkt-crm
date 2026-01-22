/**
 * Casbin Rule Seed Data Constants
 *
 * Contains seed data for MktCasbinRuleWorkspaceEntity
 * Policy types:
 * - 'p': Permission policies
 * - 'g': Role assignments (user -> role)
 * - 'g2': Resource groupings
 */

// Casbin policy types
const CASBIN_POLICY_TYPE = {
  PERMISSION: 'p',
  ROLE_ASSIGNMENT: 'g',
  RESOURCE_GROUPING: 'g2',
} as const;

// Casbin effects
const CASBIN_EFFECT = {
  ALLOW: 'allow',
  DENY: 'deny',
} as const;

// Casbin actions
const CASBIN_ACTION = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
  ALL: '*',
} as const;

type MktCasbinRuleDataSeed = {
  id: string;
  ptype: string;
  subject: string;
  object: string | null;
  action: string | null;
  effect: string | null;
  condition: string | null;
  position: number | null;
};

export const MKT_CASBIN_RULE_DATA_SEED_COLUMNS: (keyof MktCasbinRuleDataSeed)[] =
  [
    'id',
    'ptype',
    'subject',
    'object',
    'action',
    'effect',
    'condition',
    'position',
  ];

export const MKT_CASBIN_RULE_DATA_SEEDS_IDS = {
  // Role definitions - Permission policies for roles
  ROLE_ADMIN_ALL: '11111111-0001-4000-8000-000000000001',
  ROLE_ADMIN_MANAGE_USERS: '11111111-0001-4000-8000-000000000002',
  ROLE_MANAGER_CUSTOMER_ALL: '11111111-0001-4000-8000-000000000003',
  ROLE_MANAGER_ORDER_ALL: '11111111-0001-4000-8000-000000000004',
  ROLE_MANAGER_INVOICE_READ: '11111111-0001-4000-8000-000000000005',
  ROLE_SALES_CUSTOMER_MANAGE: '11111111-0001-4000-8000-000000000006',
  ROLE_SALES_ORDER_MANAGE: '11111111-0001-4000-8000-000000000007',
  ROLE_SALES_INVOICE_READ: '11111111-0001-4000-8000-000000000008',
  ROLE_SUPPORT_CUSTOMER_READ: '11111111-0001-4000-8000-000000000009',
  ROLE_SUPPORT_ORDER_READ: '11111111-0001-4000-8000-000000000010',
  ROLE_VIEWER_READ_ALL: '11111111-0001-4000-8000-000000000011',
  ROLE_FINANCE_PAYMENT_ALL: '11111111-0001-4000-8000-000000000012',
  ROLE_FINANCE_INVOICE_ALL: '11111111-0001-4000-8000-000000000013',
  ROLE_MARKETING_PROMOTION_ALL: '11111111-0001-4000-8000-000000000014',

  // Accountant role policies
  ROLE_ACCOUNTANT_INVOICE_MANAGE: '11111111-0001-4000-8000-000000000015',
  ROLE_ACCOUNTANT_PAYMENT_MANAGE: '11111111-0001-4000-8000-000000000016',
  ROLE_ACCOUNTANT_ORDER_READ: '11111111-0001-4000-8000-000000000017',
  ROLE_ACCOUNTANT_CUSTOMER_READ: '11111111-0001-4000-8000-000000000018',
  ROLE_ACCOUNTANT_LICENSE_READ: '11111111-0001-4000-8000-000000000019',
  ROLE_ACCOUNTANT_REPORT_READ: '11111111-0001-4000-8000-000000000020',

  // Support role additional policies
  ROLE_SUPPORT_CUSTOMER_UPDATE: '11111111-0001-4000-8000-000000000021',
  ROLE_SUPPORT_ORDER_UPDATE: '11111111-0001-4000-8000-000000000022',
  ROLE_SUPPORT_LICENSE_READ: '11111111-0001-4000-8000-000000000023',
  ROLE_SUPPORT_PAYMENT_READ: '11111111-0001-4000-8000-000000000024',
  ROLE_SUPPORT_INVOICE_READ: '11111111-0001-4000-8000-000000000025',
  ROLE_SUPPORT_PRODUCT_READ: '11111111-0001-4000-8000-000000000026',

  // Role assignments - User to Role mappings
  USER_ADMIN_ASSIGN: '11111111-0002-4000-8000-000000000001',
  USER_MANAGER_ASSIGN: '11111111-0002-4000-8000-000000000002',
  USER_SALES_ASSIGN: '11111111-0002-4000-8000-000000000003',
  USER_SUPPORT_ASSIGN: '11111111-0002-4000-8000-000000000004',
  USER_VIEWER_ASSIGN: '11111111-0002-4000-8000-000000000005',
  USER_ACCOUNTANT_ASSIGN: '11111111-0002-4000-8000-000000000006',

  // Resource groupings
  GROUP_CRM_ENTITIES: '11111111-0003-4000-8000-000000000001',
  GROUP_ORDER_ENTITIES: '11111111-0003-4000-8000-000000000002',
  GROUP_FINANCE_ENTITIES: '11111111-0003-4000-8000-000000000003',

  // ABAC conditions - Policies with conditions
  ABAC_DEPARTMENT_FILTER: '11111111-0004-4000-8000-000000000001',
  ABAC_OWN_RECORDS_ONLY: '11111111-0004-4000-8000-000000000002',
};

// Sample workspace member IDs for demo (these should match actual members)
const SAMPLE_USER_IDS = {
  ADMIN: 'user:00000000-0000-4000-8000-000000000001',
  MANAGER: 'user:00000000-0000-4000-8000-000000000002',
  SALES_REP: 'user:00000000-0000-4000-8000-000000000003',
  SUPPORT: 'user:00000000-0000-4000-8000-000000000004',
  VIEWER: 'user:00000000-0000-4000-8000-000000000005',
  ACCOUNTANT: 'user:00000000-0000-4000-8000-000000000006',
};

export const MKT_CASBIN_RULE_DATA_SEEDS: MktCasbinRuleDataSeed[] = [
  // ============================================
  // PERMISSION POLICIES (p type)
  // Format: p, subject, object, action, effect, condition
  // ============================================

  // Admin role - full access to all resources
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_ADMIN_ALL,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:admin',
    object: '*',
    action: CASBIN_ACTION.ALL,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 1,
  },

  // Admin can manage users and permissions
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_ADMIN_MANAGE_USERS,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:admin',
    object: 'workspaceMember',
    action: CASBIN_ACTION.MANAGE,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 2,
  },

  // Manager role - customer management
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_MANAGER_CUSTOMER_ALL,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:manager',
    object: 'mktCustomer',
    action: CASBIN_ACTION.ALL,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 3,
  },

  // Manager role - order management
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_MANAGER_ORDER_ALL,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:manager',
    object: 'mktOrder',
    action: CASBIN_ACTION.ALL,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 4,
  },

  // Manager role - invoice read
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_MANAGER_INVOICE_READ,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:manager',
    object: 'mktInvoice',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 5,
  },

  // Sales role - customer create/update/read
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_SALES_CUSTOMER_MANAGE,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:sales',
    object: 'mktCustomer',
    action: CASBIN_ACTION.MANAGE,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 6,
  },

  // Sales role - order management
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_SALES_ORDER_MANAGE,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:sales',
    object: 'mktOrder',
    action: CASBIN_ACTION.MANAGE,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 7,
  },

  // Sales role - invoice read only
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_SALES_INVOICE_READ,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:sales',
    object: 'mktInvoice',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 8,
  },

  // Support role - customer read only
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_SUPPORT_CUSTOMER_READ,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:support',
    object: 'mktCustomer',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 9,
  },

  // Support role - order read only
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_SUPPORT_ORDER_READ,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:support',
    object: 'mktOrder',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 10,
  },

  // Viewer role - read all
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_VIEWER_READ_ALL,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:viewer',
    object: '*',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 11,
  },

  // Finance role - payment full access
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_FINANCE_PAYMENT_ALL,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:finance',
    object: 'mktPayment',
    action: CASBIN_ACTION.ALL,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 12,
  },

  // Finance role - invoice full access
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_FINANCE_INVOICE_ALL,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:finance',
    object: 'mktInvoice',
    action: CASBIN_ACTION.ALL,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 13,
  },

  // Marketing role - promotion full access
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_MARKETING_PROMOTION_ALL,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:marketing',
    object: 'mktPromotion',
    action: CASBIN_ACTION.ALL,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 14,
  },

  // ============================================
  // ROLE ASSIGNMENTS (g type)
  // Format: g, user, role
  // ============================================

  // Assign admin user to admin role
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.USER_ADMIN_ASSIGN,
    ptype: CASBIN_POLICY_TYPE.ROLE_ASSIGNMENT,
    subject: SAMPLE_USER_IDS.ADMIN,
    object: 'role:admin',
    action: null,
    effect: null,
    condition: null,
    position: 15,
  },

  // Assign manager user to manager role
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.USER_MANAGER_ASSIGN,
    ptype: CASBIN_POLICY_TYPE.ROLE_ASSIGNMENT,
    subject: SAMPLE_USER_IDS.MANAGER,
    object: 'role:manager',
    action: null,
    effect: null,
    condition: null,
    position: 16,
  },

  // Assign sales user to sales role
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.USER_SALES_ASSIGN,
    ptype: CASBIN_POLICY_TYPE.ROLE_ASSIGNMENT,
    subject: SAMPLE_USER_IDS.SALES_REP,
    object: 'role:sales',
    action: null,
    effect: null,
    condition: null,
    position: 17,
  },

  // Assign support user to support role
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.USER_SUPPORT_ASSIGN,
    ptype: CASBIN_POLICY_TYPE.ROLE_ASSIGNMENT,
    subject: SAMPLE_USER_IDS.SUPPORT,
    object: 'role:support',
    action: null,
    effect: null,
    condition: null,
    position: 18,
  },

  // Assign viewer user to viewer role
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.USER_VIEWER_ASSIGN,
    ptype: CASBIN_POLICY_TYPE.ROLE_ASSIGNMENT,
    subject: SAMPLE_USER_IDS.VIEWER,
    object: 'role:viewer',
    action: null,
    effect: null,
    condition: null,
    position: 19,
  },

  // ============================================
  // RESOURCE GROUPINGS (g2 type)
  // Format: g2, resource, group
  // ============================================

  // CRM entities group
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.GROUP_CRM_ENTITIES,
    ptype: CASBIN_POLICY_TYPE.RESOURCE_GROUPING,
    subject: 'mktCustomer',
    object: 'crm_entities',
    action: null,
    effect: null,
    condition: null,
    position: 20,
  },

  // Order entities group
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.GROUP_ORDER_ENTITIES,
    ptype: CASBIN_POLICY_TYPE.RESOURCE_GROUPING,
    subject: 'mktOrder',
    object: 'order_entities',
    action: null,
    effect: null,
    condition: null,
    position: 21,
  },

  // Finance entities group
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.GROUP_FINANCE_ENTITIES,
    ptype: CASBIN_POLICY_TYPE.RESOURCE_GROUPING,
    subject: 'mktPayment',
    object: 'finance_entities',
    action: null,
    effect: null,
    condition: null,
    position: 22,
  },

  // ============================================
  // ABAC POLICIES (with conditions)
  // ============================================

  // Department-based filter - only access records in own department
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ABAC_DEPARTMENT_FILTER,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:department_user',
    object: 'mktCustomer',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: 'r.attr.departmentId == u.attr.departmentId',
    position: 23,
  },

  // Own records only - users can only access their own records
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ABAC_OWN_RECORDS_ONLY,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:restricted_user',
    object: 'mktOrder',
    action: CASBIN_ACTION.ALL,
    effect: CASBIN_EFFECT.ALLOW,
    condition: 'r.attr.createdById == u.id',
    position: 24,
  },

  // ============================================
  // ACCOUNTANT ROLE POLICIES
  // Full access to invoices and payments
  // Read access to orders, customers, licenses for reconciliation
  // ============================================

  // Accountant - Invoice full management (except delete)
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_ACCOUNTANT_INVOICE_MANAGE,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:accountant',
    object: 'mktInvoice',
    action: CASBIN_ACTION.MANAGE,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 25,
  },

  // Accountant - Payment full management (except delete)
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_ACCOUNTANT_PAYMENT_MANAGE,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:accountant',
    object: 'mktPayment',
    action: CASBIN_ACTION.MANAGE,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 26,
  },

  // Accountant - Order read only
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_ACCOUNTANT_ORDER_READ,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:accountant',
    object: 'mktOrder',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 27,
  },

  // Accountant - Customer read only
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_ACCOUNTANT_CUSTOMER_READ,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:accountant',
    object: 'mktCustomer',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 28,
  },

  // Accountant - License read only
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_ACCOUNTANT_LICENSE_READ,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:accountant',
    object: 'mktLicense',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 29,
  },

  // Accountant - Report read only
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_ACCOUNTANT_REPORT_READ,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:accountant',
    object: 'mktReport',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 30,
  },

  // ============================================
  // SUPPORT ROLE ADDITIONAL POLICIES
  // Update access to customers and orders for support cases
  // Read access to licenses, payments, invoices, products
  // ============================================

  // Support - Customer update (for notes/tags)
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_SUPPORT_CUSTOMER_UPDATE,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:support',
    object: 'mktCustomer',
    action: CASBIN_ACTION.UPDATE,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 31,
  },

  // Support - Order update (for support status)
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_SUPPORT_ORDER_UPDATE,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:support',
    object: 'mktOrder',
    action: CASBIN_ACTION.UPDATE,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 32,
  },

  // Support - License read
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_SUPPORT_LICENSE_READ,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:support',
    object: 'mktLicense',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 33,
  },

  // Support - Payment read (view status only)
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_SUPPORT_PAYMENT_READ,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:support',
    object: 'mktPayment',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 34,
  },

  // Support - Invoice read (view status only)
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_SUPPORT_INVOICE_READ,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:support',
    object: 'mktInvoice',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 35,
  },

  // Support - Product read
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.ROLE_SUPPORT_PRODUCT_READ,
    ptype: CASBIN_POLICY_TYPE.PERMISSION,
    subject: 'role:support',
    object: 'mktProduct',
    action: CASBIN_ACTION.READ,
    effect: CASBIN_EFFECT.ALLOW,
    condition: null,
    position: 36,
  },

  // ============================================
  // ACCOUNTANT ROLE ASSIGNMENT
  // ============================================
  {
    id: MKT_CASBIN_RULE_DATA_SEEDS_IDS.USER_ACCOUNTANT_ASSIGN,
    ptype: CASBIN_POLICY_TYPE.ROLE_ASSIGNMENT,
    subject: SAMPLE_USER_IDS.ACCOUNTANT,
    object: 'role:accountant',
    action: null,
    effect: null,
    condition: null,
    position: 37,
  },
];
