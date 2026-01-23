/**
 * Order Authorization Constants
 *
 * Authorization rules for order mutations.
 * Uses withChildTeams() helper to include child teams of each department.
 */

import { DepartmentAuthOptions } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/department-authorization.types';
import { DEPARTMENT } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
import {
  withChildTeams,
  combineWithChildTeams,
} from 'src/mkt-core/mkt-department/utils/department-auth.util';

/**
 * Authorization rules for order mutations
 */
export const ORDER_AUTHORIZATION = {
  /**
   * Create order: SALES + TECH (including all child teams) + Executives
   * - SALES department and all child teams (SALES_DOMESTIC, SALES_ONLINE, etc.)
   * - TECH department and all child teams (TECH_BACKEND, TECH_FRONTEND, etc.)
   * - Executives (CEO, C-Level, VP - level ≤ 3)
   */
  CREATE_ORDER: {
    allowedDepartments: combineWithChildTeams([DEPARTMENT.SALES]),
    allowManagers: false,
    allowExecutives: true,
    deniedMessage: 'Only sales or tech staff can create orders',
  } satisfies DepartmentAuthOptions,

  /**
   * Publish draft: All employees can publish draft orders
   * - Any authenticated employee can publish draft orders
   * - Uses low template priority threshold to allow all staff levels
   */
  PUBLISH_DRAFT: {
    allowedDepartments: [],
    allowManagers: true,
    allowExecutives: true,
    allowHighPriorityTemplates: true,
    minTemplatePriority: 0,
    deniedMessage: 'You do not have permission to publish draft orders',
  } satisfies DepartmentAuthOptions,

  /**
   * Confirm order payment: ACCOUNTING (including child teams) + Executives
   * - ACCOUNTING department and all child teams (ACCOUNTING_PAYABLE, etc.)
   * - Executives (CEO, C-Level, VP)
   * - Managers NOT allowed (unless in ACCOUNTING)
   */
  CONFIRM_ORDER: {
    allowedDepartments: withChildTeams(DEPARTMENT.ACCOUNTING),
    allowManagers: false,
    allowExecutives: true,
    deniedMessage: 'Only accounting staff can confirm order payments',
  } satisfies DepartmentAuthOptions,

  /**
   * Update order status: SALES + ACCOUNTING (including child teams) + Managers + Executives
   * - SALES department (order management)
   * - ACCOUNTING department (financial processing)
   * - Managers from any department
   * - Executives
   */
  UPDATE_STATUS: {
    allowedDepartments: combineWithChildTeams([
      DEPARTMENT.SALES,
      DEPARTMENT.ACCOUNTING,
    ]),
    allowManagers: true,
    allowExecutives: true,
    deniedMessage:
      'Only sales, accounting staff, or managers can update order status',
  } satisfies DepartmentAuthOptions,

  /**
   * Refund order: ACCOUNTING (including child teams) + Executives only
   * - Sensitive financial operation
   * - Only ACCOUNTING department allowed
   * - Managers NOT allowed (unless in ACCOUNTING)
   */
  REFUND_ORDER: {
    allowedDepartments: withChildTeams(DEPARTMENT.ACCOUNTING),
    allowManagers: false,
    allowExecutives: true,
    deniedMessage: 'Only accounting staff can process order refunds',
  } satisfies DepartmentAuthOptions,

  // ============================================
  // NEW PAYMENT FLOW AUTHORIZATIONS
  // ============================================

  /**
   * Confirm order with license creation: SALES + Executives
   * New flow: DRAFT → CONFIRMED → PROCESSING (tạo license ngay)
   */
  CONFIRM_ORDER_WITH_LICENSE: {
    allowedDepartments: combineWithChildTeams([DEPARTMENT.SALES]),
    allowManagers: false,
    allowExecutives: true,
    deniedMessage: 'Only sales staff can confirm orders with license creation',
  } satisfies DepartmentAuthOptions,

  /**
   * Confirm payment: SALES (bank transfer) + ACCOUNTING (cash/other) + Executives
   * - SALES can confirm SEPAY/bank transfers
   * - ACCOUNTING can confirm cash payments
   */
  CONFIRM_PAYMENT: {
    allowedDepartments: combineWithChildTeams([
      DEPARTMENT.SALES,
      DEPARTMENT.ACCOUNTING,
    ]),
    allowManagers: false,
    allowExecutives: true,
    deniedMessage: 'Only sales or accounting staff can confirm payments',
  } satisfies DepartmentAuthOptions,

  /**
   * Unlock order after late payment: ACCOUNTING only + Executives
   * - Sensitive operation: restores locked licenses
   * - Only ACCOUNTING department allowed
   */
  UNLOCK_ORDER: {
    allowedDepartments: withChildTeams(DEPARTMENT.ACCOUNTING),
    allowManagers: false,
    allowExecutives: true,
    deniedMessage: 'Only accounting staff can unlock orders after late payment',
  } satisfies DepartmentAuthOptions,
} as const;

/**
 * Export type cho ORDER_AUTHORIZATION keys
 */
export type OrderAuthorizationType = keyof typeof ORDER_AUTHORIZATION;
