// Permission Resource Categories
import { PermissionResourceSeed } from 'src/mkt-core/mkt-permission-template/types/permissions.type';

export const PERMISSION_RESOURCE_CATEGORIES = {
  BUSINESS_DATA: 'BUSINESS_DATA',
  SYSTEM_CONFIG: 'SYSTEM_CONFIG',
  USER_MGMT: 'USER_MGMT',
  FINANCIAL: 'FINANCIAL',
  REPORTING: 'REPORTING',
} as const;

// Permission Resource Keys (expanded for 11-level hierarchy)
export const PERMISSION_RESOURCE_KEYS = {
  // Core business data
  CUSTOMERS: 'CUSTOMERS',
  ORDERS: 'ORDERS',
  PRODUCTS: 'PRODUCTS',

  // Organizational resources
  USERS: 'USERS',
  DEPARTMENTS: 'DEPARTMENTS',
  ORGANIZATION_LEVELS: 'ORGANIZATION_LEVELS',
  TEAM_MANAGEMENT: 'TEAM_MANAGEMENT',

  // Financial and sensitive data
  FINANCIAL_DATA: 'FINANCIAL_DATA',
  SALARY_DATA: 'SALARY_DATA',
  BUDGET_DATA: 'BUDGET_DATA',
  TRANSACTIONS: 'TRANSACTIONS',

  // Reports and analytics
  REPORTS: 'REPORTS',
  ANALYTICS: 'ANALYTICS',
  KPIS: 'KPIS',
  PERFORMANCE_REVIEWS: 'PERFORMANCE_REVIEWS',

  // System configuration
  SETTINGS: 'SETTINGS',
  WORKFLOWS: 'WORKFLOWS',
  INTEGRATIONS: 'INTEGRATIONS',
  PERMISSIONS: 'PERMISSIONS',

  // Confidential resources
  CONFIDENTIAL_INFO: 'CONFIDENTIAL_INFO',
  AUDIT_LOGS: 'AUDIT_LOGS',
} as const;

// Pre-generated UUIDs for consistent seeding (expanded for 11-level hierarchy)
export const PERMISSION_RESOURCE_IDS = {
  CUSTOMERS: 'f6e3f5dd-8c2a-4d15-8a0f-2ff3a7d9c4c1',
  ORDERS: '0b5f9d28-2e8d-4d52-9c5f-6a3cb2ad7e11',
  PRODUCTS: 'b1a6d3f2-5c44-4b0e-90c2-6b0f4e2d7a33',
  INVOICES: '4c0d8a71-11a5-42a4-8dc4-2e5f6b9d1c55',
  PAYMENTS: 'a7e2f0b9-3d6f-4589-8b6a-74c0d2a1f677',
  LICENSE: 'c9d2e5f1-7a4b-4a3e-8c9d-3f2a6b5d8e99',

  // Organizational resources
  USERS: '3b2f9e61-4d8a-46a5-92cb-1e0f7d6a3b44',
  DEPARTMENTS: '54c1e3a7-6b2d-4f7d-8a9c-2d1f5b6a7e22',
  ORGANIZATION_LEVELS: '9d8f2c31-7e4b-4e2a-8a9d-5c7b2d1f6a66',
  TEAM_MANAGEMENT: 'e1a4b7c2-5d6f-43b9-8d1a-7c5f2e3a9b10',

  // Financial and sensitive data
  FINANCIAL_DATA: '2e6d4c81-9f3a-4937-82db-6a1f5c3b7d88',
  SALARY_DATA: '7f2b1d93-6e4a-4d6a-9bc5-1d2a3f4e5c77',
  BUDGET_DATA: '5d1a7c42-8b3e-4f9d-8e2a-4c7b5d1f3a11',
  TRANSACTIONS: '81e4a6d2-3f5b-4b7a-8d9c-6a2f1e5b4c22',

  // Reports and analytics
  REPORTS: '6a3d1f92-5b7c-47e9-8c2d-1f4a5e7b9d33',
  ANALYTICS: 'b7e2a1d4-3c5f-4d7a-9b8c-2e1f4a6d5c44',
  KPIS: '1f5d7a23-9c2b-4a6d-8e1f-3c4b5d6e7a55',
  PERFORMANCE_REVIEWS: 'd3a6c1b2-5e4f-4a7e-9b8d-6c5a4f3e2d66',

  // System configuration
  SETTINGS: 'e9d1f2a3-4c5e-4a7d-8e9b-6c5d4e3f2a77',
  WORKFLOWS: '0f6c8e1d-2a3b-4d7c-9e8a-5b6c7d8e9f88',
  INTEGRATIONS: '9b2a1c7d-3d5f-4c6a-8d1e-2f3b4a5c6d99',
  PERMISSIONS: '6c8d9e1f-2c3a-4d7b-9e8c-5a1d2f3b4c00',

  // Confidential resources
  CONFIDENTIAL_INFO: '12a5d7e9-b1c2-4a6d-8e9a-7b6c5d4e3f11',
  AUDIT_LOGS: '8e1f2a3b-4d5c-4a7e-9b8d-6c5a4f3e2d22',
} as const;

// Permission Resources Seed Data (updated for 11-level hierarchy)
export const PERMISSION_RESOURCES_SEED: PermissionResourceSeed[] = [
  // Core business data (accessible by most levels)
  {
    id: PERMISSION_RESOURCE_IDS.CUSTOMERS,
    resourceKey: PERMISSION_RESOURCE_KEYS.CUSTOMERS,
    resourceName: 'Customers',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.BUSINESS_DATA,
    description: 'Customer records, profiles, and contact information',
    isSystemResource: true,
    isActive: true,
    displayOrder: 1,
    icon: 'IconUsers',
    colorCode: '#3B82F6', // Blue
  },
  {
    id: PERMISSION_RESOURCE_IDS.ORDERS,
    resourceKey: PERMISSION_RESOURCE_KEYS.ORDERS,
    resourceName: 'Orders',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.BUSINESS_DATA,
    description: 'Order records, transactions, and order management',
    isSystemResource: true,
    isActive: true,
    displayOrder: 2,
    icon: 'IconShoppingCart',
    colorCode: '#10B981', // Green
  },
  {
    id: PERMISSION_RESOURCE_IDS.PRODUCTS,
    resourceKey: PERMISSION_RESOURCE_KEYS.PRODUCTS,
    resourceName: 'Products',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.BUSINESS_DATA,
    description: 'Product catalog, inventory, and product information',
    isSystemResource: true,
    isActive: true,
    displayOrder: 3,
    icon: 'IconPackage',
    colorCode: '#F59E0B', // Amber
  },

  // Organizational resources (hierarchy-based access)
  {
    id: PERMISSION_RESOURCE_IDS.USERS,
    resourceKey: PERMISSION_RESOURCE_KEYS.USERS,
    resourceName: 'Users',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.USER_MGMT,
    description: 'User accounts, profiles, and user management',
    isSystemResource: true,
    isActive: true,
    displayOrder: 4,
    icon: 'IconUser',
    colorCode: '#EF4444', // Red
  },
  {
    id: PERMISSION_RESOURCE_IDS.DEPARTMENTS,
    resourceKey: PERMISSION_RESOURCE_KEYS.DEPARTMENTS,
    resourceName: 'Departments',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.USER_MGMT,
    description: 'Department structure, organization, and management',
    isSystemResource: true,
    isActive: true,
    displayOrder: 5,
    icon: 'IconBuildingBank',
    colorCode: '#06B6D4', // Cyan
  },
  {
    id: PERMISSION_RESOURCE_IDS.ORGANIZATION_LEVELS,
    resourceKey: PERMISSION_RESOURCE_KEYS.ORGANIZATION_LEVELS,
    resourceName: 'Organization Levels',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.USER_MGMT,
    description: 'Organizational hierarchy levels and management',
    isSystemResource: true,
    isActive: true,
    displayOrder: 6,
    icon: 'IconHierarchy',
    colorCode: '#8B5CF6', // Purple
  },
  {
    id: PERMISSION_RESOURCE_IDS.TEAM_MANAGEMENT,
    resourceKey: PERMISSION_RESOURCE_KEYS.TEAM_MANAGEMENT,
    resourceName: 'Team Management',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.USER_MGMT,
    description: 'Team assignment, task management, and team coordination',
    isSystemResource: true,
    isActive: true,
    displayOrder: 7,
    icon: 'IconUsers',
    colorCode: '#14B8A6', // Teal
  },

  // Financial and sensitive data (high-level access only)
  {
    id: PERMISSION_RESOURCE_IDS.FINANCIAL_DATA,
    resourceKey: PERMISSION_RESOURCE_KEYS.FINANCIAL_DATA,
    resourceName: 'Financial Data',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.FINANCIAL,
    description: 'General financial records and business financial information',
    isSystemResource: true,
    isActive: true,
    displayOrder: 8,
    icon: 'IconCurrencyDollar',
    colorCode: '#F97316', // Orange
  },
  {
    id: PERMISSION_RESOURCE_IDS.SALARY_DATA,
    resourceKey: PERMISSION_RESOURCE_KEYS.SALARY_DATA,
    resourceName: 'Salary Data',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.FINANCIAL,
    description:
      'Employee salary and compensation information (highly sensitive)',
    isSystemResource: true,
    isActive: true,
    displayOrder: 9,
    icon: 'IconMoney',
    colorCode: '#DC2626', // Red
  },
  {
    id: PERMISSION_RESOURCE_IDS.BUDGET_DATA,
    resourceKey: PERMISSION_RESOURCE_KEYS.BUDGET_DATA,
    resourceName: 'Budget Data',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.FINANCIAL,
    description: 'Department and project budget information',
    isSystemResource: true,
    isActive: true,
    displayOrder: 10,
    icon: 'IconChartPie',
    colorCode: '#F59E0B', // Amber
  },
  {
    id: PERMISSION_RESOURCE_IDS.TRANSACTIONS,
    resourceKey: PERMISSION_RESOURCE_KEYS.TRANSACTIONS,
    resourceName: 'Transactions',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.FINANCIAL,
    description: 'Financial transactions requiring approval',
    isSystemResource: true,
    isActive: true,
    displayOrder: 11,
    icon: 'IconCreditCard',
    colorCode: '#10B981', // Green
  },

  // Reports and analytics (level-based access)
  {
    id: PERMISSION_RESOURCE_IDS.REPORTS,
    resourceKey: PERMISSION_RESOURCE_KEYS.REPORTS,
    resourceName: 'Reports',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.REPORTING,
    description: 'Business reports, analytics, and data visualization',
    isSystemResource: true,
    isActive: true,
    displayOrder: 12,
    icon: 'IconChartBar',
    colorCode: '#8B5CF6', // Purple
  },
  {
    id: PERMISSION_RESOURCE_IDS.ANALYTICS,
    resourceKey: PERMISSION_RESOURCE_KEYS.ANALYTICS,
    resourceName: 'Analytics',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.REPORTING,
    description: 'Advanced analytics, data mining, and business intelligence',
    isSystemResource: true,
    isActive: true,
    displayOrder: 13,
    icon: 'IconChartLine',
    colorCode: '#A855F7', // Violet
  },
  {
    id: PERMISSION_RESOURCE_IDS.KPIS,
    resourceKey: PERMISSION_RESOURCE_KEYS.KPIS,
    resourceName: 'KPIs',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.REPORTING,
    description: 'Key Performance Indicators and metrics tracking',
    isSystemResource: true,
    isActive: true,
    displayOrder: 14,
    icon: 'IconTarget',
    colorCode: '#84CC16', // Lime
  },
  {
    id: PERMISSION_RESOURCE_IDS.PERFORMANCE_REVIEWS,
    resourceKey: PERMISSION_RESOURCE_KEYS.PERFORMANCE_REVIEWS,
    resourceName: 'Performance Reviews',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.REPORTING,
    description: 'Employee performance reviews and evaluations',
    isSystemResource: true,
    isActive: true,
    displayOrder: 15,
    icon: 'IconStar',
    colorCode: '#F59E0B', // Amber
  },

  // System configuration (admin and high-level access)
  {
    id: PERMISSION_RESOURCE_IDS.SETTINGS,
    resourceKey: PERMISSION_RESOURCE_KEYS.SETTINGS,
    resourceName: 'Settings',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.SYSTEM_CONFIG,
    description: 'System settings, configurations, and preferences',
    isSystemResource: true,
    isActive: true,
    displayOrder: 16,
    icon: 'IconSettings',
    colorCode: '#6B7280', // Gray
  },
  {
    id: PERMISSION_RESOURCE_IDS.WORKFLOWS,
    resourceKey: PERMISSION_RESOURCE_KEYS.WORKFLOWS,
    resourceName: 'Workflows',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.SYSTEM_CONFIG,
    description: 'Business process workflows and automation',
    isSystemResource: true,
    isActive: true,
    displayOrder: 17,
    icon: 'IconGitBranch',
    colorCode: '#EC4899', // Pink
  },
  {
    id: PERMISSION_RESOURCE_IDS.INTEGRATIONS,
    resourceKey: PERMISSION_RESOURCE_KEYS.INTEGRATIONS,
    resourceName: 'Integrations',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.SYSTEM_CONFIG,
    description: 'Third-party integrations and API connections',
    isSystemResource: true,
    isActive: true,
    displayOrder: 18,
    icon: 'IconPlug',
    colorCode: '#14B8A6', // Teal
  },
  {
    id: PERMISSION_RESOURCE_IDS.PERMISSIONS,
    resourceKey: PERMISSION_RESOURCE_KEYS.PERMISSIONS,
    resourceName: 'Permissions',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.SYSTEM_CONFIG,
    description: 'Permission management and access control configuration',
    isSystemResource: true,
    isActive: true,
    displayOrder: 19,
    icon: 'IconShield',
    colorCode: '#DC2626', // Red
  },

  // Confidential resources (executive level only)
  {
    id: PERMISSION_RESOURCE_IDS.CONFIDENTIAL_INFO,
    resourceKey: PERMISSION_RESOURCE_KEYS.CONFIDENTIAL_INFO,
    resourceName: 'Confidential Information',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.SYSTEM_CONFIG,
    description: 'Highly confidential business information and documents',
    isSystemResource: true,
    isActive: true,
    displayOrder: 20,
    icon: 'IconEyeOff',
    colorCode: '#991B1B', // Dark Red
  },
  {
    id: PERMISSION_RESOURCE_IDS.AUDIT_LOGS,
    resourceKey: PERMISSION_RESOURCE_KEYS.AUDIT_LOGS,
    resourceName: 'Audit Logs',
    resourceCategory: PERMISSION_RESOURCE_CATEGORIES.SYSTEM_CONFIG,
    description: 'System audit logs and security monitoring information',
    isSystemResource: true,
    isActive: true,
    displayOrder: 21,
    icon: 'IconFileText',
    colorCode: '#374151', // Dark Gray
  },
];
