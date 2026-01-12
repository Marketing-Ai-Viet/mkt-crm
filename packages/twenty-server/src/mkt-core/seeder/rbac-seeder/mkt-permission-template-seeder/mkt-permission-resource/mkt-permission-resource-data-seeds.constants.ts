/**
 * Permission Resource Seed Data Constants
 *
 * Defines resources that can have permissions applied
 * Resources: CUSTOMERS, ORDERS, PRODUCTS, LICENSES, etc.
 */

import { PERMISSION_RESOURCE_CATEGORY } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/permission-template/options.constants';

type MktPermissionResourceDataSeed = {
  id: string;
  resourceKey: string;
  resourceName: string;
  resourceCategory: string;
  description: string | null;
  isSystemResource: boolean;
  isActive: boolean;
  displayOrder: number;
  icon: string | null;
  colorCode: string | null;
  position: number;
};

export const MKT_PERMISSION_RESOURCE_DATA_SEED_COLUMNS: (keyof MktPermissionResourceDataSeed)[] =
  [
    'id',
    'resourceKey',
    'resourceName',
    'resourceCategory',
    'description',
    'isSystemResource',
    'isActive',
    'displayOrder',
    'icon',
    'colorCode',
    'position',
  ];

export const MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS = {
  CUSTOMERS: '7aefbda1-0097-4815-a813-2adadea98b61',
  ORDERS: '5900fcbe-d77e-40d1-bf19-f57b74857e6e',
  PRODUCTS: 'b2008878-f429-4bdc-99d9-cd56502a1ec4',
  LICENSES: '4521ff79-3a46-48a4-bbc2-e0b3ea4109d6',
  INVOICES: 'a8961a81-9c88-4e50-b7e0-a4416b4ae62a',
  PAYMENTS: '502366d7-2226-449f-9fc5-c6b3d4890665',
  DEPARTMENTS: 'f49fb5e8-92a8-4315-b406-09d356350811',
  USERS: '4ac1ccf4-4268-4e9d-b891-cc0405744022',
  REPORTS: 'ef1fb068-a238-4554-b892-b48ad72232fc',
  SETTINGS: 'f566972d-ff24-49ea-a351-5a5b3bf28982',
  CONTRACTS: 'c8d3cd77-5871-4d08-8727-25d17f66efde',
  DASHBOARD: '918e8492-b1bd-4cc9-959c-9ce5c2537e54',
};

export const MKT_PERMISSION_RESOURCE_DATA_SEEDS: MktPermissionResourceDataSeed[] =
  [
    // CRM Resources
    {
      id: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.CUSTOMERS,
      resourceKey: 'CUSTOMERS',
      resourceName: 'Customers',
      resourceCategory: PERMISSION_RESOURCE_CATEGORY.BUSINESS_DATA,
      description: 'Customer data and profiles',
      isSystemResource: true,
      isActive: true,
      displayOrder: 1,
      icon: 'IconUsers',
      colorCode: '#3B82F6',
      position: 1,
    },
    {
      id: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.CONTRACTS,
      resourceKey: 'CONTRACTS',
      resourceName: 'Contracts',
      resourceCategory: PERMISSION_RESOURCE_CATEGORY.BUSINESS_DATA,
      description: 'Customer contracts and agreements',
      isSystemResource: true,
      isActive: true,
      displayOrder: 2,
      icon: 'IconFileText',
      colorCode: '#8B5CF6',
      position: 2,
    },

    // Sales Resources
    {
      id: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.ORDERS,
      resourceKey: 'ORDERS',
      resourceName: 'Orders',
      resourceCategory: PERMISSION_RESOURCE_CATEGORY.BUSINESS_DATA,
      description: 'Sales orders and transactions',
      isSystemResource: true,
      isActive: true,
      displayOrder: 3,
      icon: 'IconShoppingCart',
      colorCode: '#10B981',
      position: 3,
    },
    {
      id: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.PRODUCTS,
      resourceKey: 'PRODUCTS',
      resourceName: 'Products',
      resourceCategory: PERMISSION_RESOURCE_CATEGORY.BUSINESS_DATA,
      description: 'Product catalog and inventory',
      isSystemResource: true,
      isActive: true,
      displayOrder: 4,
      icon: 'IconPackage',
      colorCode: '#F59E0B',
      position: 4,
    },
    {
      id: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.LICENSES,
      resourceKey: 'LICENSES',
      resourceName: 'Licenses',
      resourceCategory: PERMISSION_RESOURCE_CATEGORY.BUSINESS_DATA,
      description: 'Software licenses and subscriptions',
      isSystemResource: true,
      isActive: true,
      displayOrder: 5,
      icon: 'IconKey',
      colorCode: '#6366F1',
      position: 5,
    },

    // Finance Resources
    {
      id: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.INVOICES,
      resourceKey: 'INVOICES',
      resourceName: 'Invoices',
      resourceCategory: PERMISSION_RESOURCE_CATEGORY.FINANCIAL,
      description: 'Customer invoices and billing',
      isSystemResource: true,
      isActive: true,
      displayOrder: 6,
      icon: 'IconFileInvoice',
      colorCode: '#EC4899',
      position: 6,
    },
    {
      id: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.PAYMENTS,
      resourceKey: 'PAYMENTS',
      resourceName: 'Payments',
      resourceCategory: PERMISSION_RESOURCE_CATEGORY.FINANCIAL,
      description: 'Payment transactions and records',
      isSystemResource: true,
      isActive: true,
      displayOrder: 7,
      icon: 'IconCreditCard',
      colorCode: '#14B8A6',
      position: 7,
    },

    // System Resources
    {
      id: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.DEPARTMENTS,
      resourceKey: 'DEPARTMENTS',
      resourceName: 'Departments',
      resourceCategory: PERMISSION_RESOURCE_CATEGORY.SYSTEM_CONFIG,
      description: 'Organization departments and hierarchy',
      isSystemResource: true,
      isActive: true,
      displayOrder: 8,
      icon: 'IconBuilding',
      colorCode: '#64748B',
      position: 8,
    },
    {
      id: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.USERS,
      resourceKey: 'USERS',
      resourceName: 'Users',
      resourceCategory: PERMISSION_RESOURCE_CATEGORY.SYSTEM_CONFIG,
      description: 'User accounts and permissions',
      isSystemResource: true,
      isActive: true,
      displayOrder: 9,
      icon: 'IconUser',
      colorCode: '#EF4444',
      position: 9,
    },
    {
      id: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.SETTINGS,
      resourceKey: 'SETTINGS',
      resourceName: 'Settings',
      resourceCategory: PERMISSION_RESOURCE_CATEGORY.SYSTEM_CONFIG,
      description: 'System configuration and settings',
      isSystemResource: true,
      isActive: true,
      displayOrder: 10,
      icon: 'IconSettings',
      colorCode: '#78716C',
      position: 10,
    },

    // Analytics Resources
    {
      id: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.REPORTS,
      resourceKey: 'REPORTS',
      resourceName: 'Reports',
      resourceCategory: PERMISSION_RESOURCE_CATEGORY.REPORTING,
      description: 'Business reports and analytics',
      isSystemResource: true,
      isActive: true,
      displayOrder: 11,
      icon: 'IconChartBar',
      colorCode: '#0EA5E9',
      position: 11,
    },
    {
      id: MKT_PERMISSION_RESOURCE_DATA_SEEDS_IDS.DASHBOARD,
      resourceKey: 'DASHBOARD',
      resourceName: 'Dashboard',
      resourceCategory: PERMISSION_RESOURCE_CATEGORY.REPORTING,
      description: 'Executive dashboards and KPIs',
      isSystemResource: true,
      isActive: true,
      displayOrder: 12,
      icon: 'IconDashboard',
      colorCode: '#7C3AED',
      position: 12,
    },
  ];
