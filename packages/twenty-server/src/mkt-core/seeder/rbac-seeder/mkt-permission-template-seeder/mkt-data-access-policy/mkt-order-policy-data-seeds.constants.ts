/**
 * Order-specific DataAccessPolicy Seeds
 *
 * Cross-department access policies for Order module.
 * These policies allow departments other than SALES to view orders
 * relevant to their responsibilities.
 */

import { MKT_DEPARTMENT_DATA_SEEDS_IDS } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
import { RBAC_RESOURCE_KEY } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';
import { getEntityName } from 'src/mkt-core/mkt-rbac-enterprise-grade/utils/resource-mapper.utils';

type MktOrderPolicyDataSeed = {
  id: string;
  name: string;
  description?: string;
  departmentId?: string | null;
  specificMemberId?: string | null;
  objectName: string;
  filterConditions: object;
  priority?: number;
  isActive?: boolean;
  position: number;
};

// ============================================================================
// SEED IDS
// ============================================================================

export const MKT_ORDER_POLICY_DATA_SEED_IDS = {
  ORDER_ACCOUNTING_READ: 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
  ORDER_SUPPORT_READ: 'd2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d',
  ORDER_FINANCE_FULL: 'e3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e',
};

// ============================================================================
// SEED DATA
// ============================================================================

export const MKT_ORDER_POLICY_DATA_SEEDS: MktOrderPolicyDataSeed[] = [
  /**
   * ORDER_ACCOUNTING_READ
   *
   * Accounting can view payment-related orders even if not the creator.
   * Filter: paymentStatus IN ['PARTIAL','PAID','OVERPAID'] OR status = 'LOCKED'
   */
  {
    id: MKT_ORDER_POLICY_DATA_SEED_IDS.ORDER_ACCOUNTING_READ,
    name: 'Accounting Order Payment Access Policy',
    description:
      'Accounting can view orders with payments (PARTIAL, PAID, OVERPAID) or locked orders for reconciliation',
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
    specificMemberId: null,
    objectName: getEntityName(RBAC_RESOURCE_KEY.ORDER),
    filterConditions: {
      crossDepartmentAccess: {
        enabled: true,
        description:
          'Accounting views payment-related orders regardless of creator',
      },
      compositeFilter: {
        operator: 'OR',
        conditions: [
          {
            field: 'paymentStatus',
            operator: 'IN',
            values: ['PARTIAL', 'PAID', 'OVERPAID'],
            description: 'Orders with partial or full payments',
          },
          {
            field: 'status',
            operator: 'EQUALS',
            value: 'LOCKED',
            description: 'Orders locked due to payment overdue',
          },
        ],
      },
      status: {
        deniedValues: ['deleted', 'void'],
      },
    },
    priority: 9,
    isActive: true,
    position: 1,
  },

  /**
   * ORDER_SUPPORT_READ
   *
   * Support can only view orders of customers assigned to them.
   * Filter: Customer assignment via accountOwnerId
   */
  {
    id: MKT_ORDER_POLICY_DATA_SEED_IDS.ORDER_SUPPORT_READ,
    name: 'Support Order Customer Access Policy',
    description:
      'Support can only view orders of customers they manage for support handling',
    departmentId: MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
    specificMemberId: null,
    objectName: getEntityName(RBAC_RESOURCE_KEY.ORDER),
    filterConditions: {
      crossDepartmentAccess: {
        enabled: true,
        description: 'Support views orders of assigned customers for lookup',
      },
      customerAssignment: {
        enabled: true,
        joinField: 'mktCustomerId',
        customerOwnerField: 'accountOwnerId',
        matchCurrentUser: true,
        description:
          'Only view orders where customer accountOwnerId = current user',
      },
      status: {
        allowedValues: ['PENDING_PAYMENT', 'PROCESSING', 'COMPLETED', 'LOCKED'],
        deniedValues: ['DRAFT', 'deleted', 'void'],
        description: 'Exclude draft orders and voided/deleted orders',
      },
      timeRange: {
        field: 'createdAt',
        daysBack: 180,
        description: 'Only view orders from the last 6 months',
      },
    },
    priority: 6,
    isActive: true,
    position: 2,
  },

  /**
   * ORDER_FINANCE_FULL
   *
   * Finance department has full access to all orders for reporting.
   * Filter: No row-level filter (full access)
   *
   * Note: Uses null departmentId as FINANCE department
   * is not yet seeded. In production, replace with FINANCE department ID.
   */
  {
    id: MKT_ORDER_POLICY_DATA_SEED_IDS.ORDER_FINANCE_FULL,
    name: 'Finance Order Full Access Policy',
    description:
      'Finance department can view all orders for reporting and auditing',
    departmentId: null,
    specificMemberId: null,
    objectName: getEntityName(RBAC_RESOURCE_KEY.ORDER),
    filterConditions: {
      fullAccess: {
        enabled: true,
        description: 'Finance has full read access to all orders for reporting',
      },
      departmentScope: {
        targetDepartments: ['FINANCE'],
        description: 'Applies to members of the Finance department',
      },
      auditTrail: {
        enabled: true,
        description: 'Log all access from Finance department',
      },
      status: {
        deniedValues: ['deleted', 'void'],
      },
    },
    priority: 12,
    isActive: true,
    position: 3,
  },
];

// ============================================================================
// HELPER EXPORTS
// ============================================================================

export const ACTIVE_ORDER_POLICIES = MKT_ORDER_POLICY_DATA_SEEDS.filter(
  (policy) => policy.isActive,
);

export const ORDER_POLICIES_BY_DEPARTMENT = {
  ACCOUNTING: MKT_ORDER_POLICY_DATA_SEEDS.filter(
    (policy) =>
      policy.departmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.ACCOUNTING,
  ),
  SUPPORT: MKT_ORDER_POLICY_DATA_SEEDS.filter(
    (policy) => policy.departmentId === MKT_DEPARTMENT_DATA_SEEDS_IDS.SUPPORT,
  ),
  FINANCE: MKT_ORDER_POLICY_DATA_SEEDS.filter(
    (policy) => policy.departmentId === null,
  ),
};
