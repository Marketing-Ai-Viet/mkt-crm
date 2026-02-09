/**
 * Order DataScope Constants
 *
 * Centralized configuration for @DataScope decorator in Order module.
 * Provides preset configurations for different operation types.
 *
 * Pattern follows Contract module: contract-data-scope.constants.ts
 */

import { DataScopeOptions } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/types';
import { ResourceEntityName } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';
import {
  DATA_SCOPE_MODE,
  DATA_SCOPE_AUDIT_LEVEL,
} from 'src/mkt-core/contract/constants/contract-data-scope.constants';

// ============================================================================
// ORDER DATA SCOPE PRESETS
// ============================================================================

/**
 * Order resource entity name for DataScope configuration.
 * Defined locally to avoid circular dependency with workspace entity.
 * Must match MKT_ORDER_ENTITY_NAME in mkt-order.workspace-entity.ts.
 */
const ORDER_RESOURCE: ResourceEntityName = 'mktOrder';

/**
 * Base configuration for all Order DataScope operations
 */
const ORDER_DATA_SCOPE_BASE = {
  resource: ORDER_RESOURCE,
} as const;

/**
 * Preset DataScope configurations for Order operations
 *
 * Usage:
 * ```typescript
 * @DataScope(ORDER_DATA_SCOPE.QUERY_SINGLE)
 * async getOrderById(...) {}
 *
 * @DataScope(ORDER_DATA_SCOPE.MUTATION_CREATE)
 * async createOrderWithItems(...) {}
 * ```
 */
export const ORDER_DATA_SCOPE = {
  // ==========================================================================
  // QUERY PRESETS
  // ==========================================================================

  /**
   * For single record queries (getById, getByCode)
   * - AUTO mode: Apply hierarchical filtering
   * - MEDIUM audit: Log individual record access
   */
  QUERY_SINGLE: {
    ...ORDER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.MEDIUM,
  } satisfies DataScopeOptions,

  /**
   * For list/bulk queries (getOrders, getOrdersByStatus)
   * - AUTO mode: Apply hierarchical filtering
   * - LOW audit: Minimal logging for bulk operations
   */
  QUERY_LIST: {
    ...ORDER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.LOW,
  } satisfies DataScopeOptions,

  /**
   * For customer-specific queries (getOrdersByCustomer)
   * - AUTO mode: Apply hierarchical filtering
   * - MEDIUM audit: Customer-scoped access needs tracking
   */
  QUERY_BY_CUSTOMER: {
    ...ORDER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.MEDIUM,
  } satisfies DataScopeOptions,

  /**
   * For payment summary queries
   * - AUTO mode: Apply hierarchical filtering
   * - MEDIUM audit: Financial data access needs tracking
   */
  QUERY_PAYMENT_SUMMARY: {
    ...ORDER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.MEDIUM,
  } satisfies DataScopeOptions,

  /**
   * For aggregation/statistics queries (customerOrderStats)
   * - SKIP mode: No filtering for aggregated data
   * - LOW audit: Statistics don't expose individual records
   */
  QUERY_AGGREGATION: {
    ...ORDER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.SKIP,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.LOW,
  } satisfies DataScopeOptions,

  // ==========================================================================
  // MUTATION PRESETS
  // ==========================================================================

  /**
   * For create operations (createOrderWithItems)
   * - SKIP mode: No filtering needed for new records
   * - HIGH audit: Log all create operations
   */
  MUTATION_CREATE: {
    ...ORDER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.SKIP,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For status update operations (updateOrderStatus, publishDraftOrder)
   * - AUTO mode: Ensure user can access record being updated
   * - HIGH audit: Log all status changes
   */
  MUTATION_UPDATE_STATUS: {
    ...ORDER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For order confirmation with license creation
   * - AUTO mode: Ensure user can access the order
   * - HIGH audit: License creation is a critical operation
   */
  MUTATION_CONFIRM: {
    ...ORDER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For payment confirmation
   * - AUTO mode: Ensure user can access the order
   * - HIGH audit: Financial operation
   */
  MUTATION_CONFIRM_PAYMENT: {
    ...ORDER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For refund operations
   * - AUTO mode: Ensure user can access the order
   * - HIGH audit: Sensitive financial operation
   */
  MUTATION_REFUND: {
    ...ORDER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For unlock operations after late payment
   * - AUTO mode: Ensure user can access the locked order
   * - HIGH audit: Restoring locked licenses is critical
   */
  MUTATION_UNLOCK: {
    ...ORDER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,
} as const;
