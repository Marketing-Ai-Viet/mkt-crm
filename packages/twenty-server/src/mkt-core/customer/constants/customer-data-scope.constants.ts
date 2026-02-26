/**
 * Customer DataScope Constants
 *
 * Centralized configuration for @DataScope decorator in Customer module.
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
// CUSTOMER DATA SCOPE PRESETS
// ============================================================================

/**
 * Customer resource entity name for DataScope configuration.
 * Defined locally to avoid circular dependency with workspace entity.
 * Must match MKT_CUSTOMER_ENTITY_NAME in mkt-customer.workspace-entity.ts.
 */
const CUSTOMER_RESOURCE: ResourceEntityName = 'mktCustomer';

/**
 * Base configuration for all Customer DataScope operations
 */
const CUSTOMER_DATA_SCOPE_BASE = {
  resource: CUSTOMER_RESOURCE,
} as const;

/**
 * Preset DataScope configurations for Customer operations
 *
 * Usage:
 * ```typescript
 * @DataScope(CUSTOMER_DATA_SCOPE.QUERY_SINGLE)
 * async getCustomerById(...) {}
 *
 * @DataScope(CUSTOMER_DATA_SCOPE.MUTATION_CREATE)
 * async createCustomer(...) {}
 * ```
 */
export const CUSTOMER_DATA_SCOPE = {
  // ==========================================================================
  // QUERY PRESETS
  // ==========================================================================

  /**
   * For single record queries (getById, getByCode, getByEmail)
   * - AUTO mode: Apply hierarchical filtering
   * - MEDIUM audit: Log individual record access
   */
  QUERY_SINGLE: {
    ...CUSTOMER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.MEDIUM,
  } satisfies DataScopeOptions,

  /**
   * For list/bulk queries (getCustomers, getByStatus, getByTier)
   * - AUTO mode: Apply hierarchical filtering
   * - LOW audit: Minimal logging for bulk operations
   */
  QUERY_LIST: {
    ...CUSTOMER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.LOW,
  } satisfies DataScopeOptions,

  /**
   * For aggregation/statistics queries (tierStatistics, noteStats)
   * - SKIP mode: No filtering for aggregated data
   * - LOW audit: Statistics don't expose individual records
   */
  QUERY_AGGREGATION: {
    ...CUSTOMER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.SKIP,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.LOW,
  } satisfies DataScopeOptions,

  /**
   * For export operations (CSV export, export statistics)
   * - AUTO mode: Apply hierarchical filtering
   * - HIGH audit: Export is a sensitive bulk data operation
   */
  QUERY_EXPORT: {
    ...CUSTOMER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For purchase history queries
   * - AUTO mode: Apply hierarchical filtering
   * - MEDIUM audit: Log access to purchase data
   */
  QUERY_PURCHASE_HISTORY: {
    ...CUSTOMER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.MEDIUM,
  } satisfies DataScopeOptions,

  // ==========================================================================
  // MUTATION PRESETS
  // ==========================================================================

  /**
   * For create operations (createCustomer)
   * - SKIP mode: No filtering needed for new records
   * - HIGH audit: Log all create operations
   */
  MUTATION_CREATE: {
    ...CUSTOMER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.SKIP,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For update operations (updateCustomer, linkAccount, setPrimary)
   * - AUTO mode: Ensure user can access record being updated
   * - HIGH audit: Log all modifications
   */
  MUTATION_UPDATE: {
    ...CUSTOMER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For delete operations (deleteCustomer, unlinkAccount, deleteNote)
   * - AUTO mode: Ensure user can access record being deleted
   * - HIGH audit: Log all deletions
   */
  MUTATION_DELETE: {
    ...CUSTOMER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For restore operations (restoreCustomer)
   * - AUTO mode: Ensure user can access record being restored
   * - HIGH audit: Log all restorations
   */
  MUTATION_RESTORE: {
    ...CUSTOMER_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,
} as const;
