/**
 * Contract DataScope Constants
 *
 * Centralized configuration for @DataScope decorator in Contract module.
 * Provides preset configurations for different operation types.
 */

import { DataScopeOptions } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/types';
import { MKT_CONTRACT_ENTITY_NAME } from 'src/mkt-core/contract/workspace-entity/mkt-contract.workspace-entity';

// ============================================================================
// DATA SCOPE MODE CONSTANTS
// ============================================================================

/**
 * Filter modes for DataScope
 */
export const DATA_SCOPE_MODE = {
  /** Automatically apply filters based on user context */
  AUTO: 'AUTO',
  /** Attach filters but don't apply automatically */
  MANUAL: 'MANUAL',
  /** Skip filtering (for create operations or aggregation) */
  SKIP: 'SKIP',
} as const;

/**
 * Audit levels for data access logging
 */
export const DATA_SCOPE_AUDIT_LEVEL = {
  /** Minimal logging - for list/bulk queries */
  LOW: 'low',
  /** Standard logging - for single record queries */
  MEDIUM: 'medium',
  /** Detailed logging - for mutations and sensitive operations */
  HIGH: 'high',
} as const;

// ============================================================================
// CONTRACT DATA SCOPE PRESETS
// ============================================================================

/**
 * Base configuration for all Contract DataScope operations
 */
const CONTRACT_DATA_SCOPE_BASE = {
  resource: MKT_CONTRACT_ENTITY_NAME,
} as const;

/**
 * Preset DataScope configurations for Contract operations
 *
 * Usage:
 * ```typescript
 * @DataScope(CONTRACT_DATA_SCOPE.QUERY_SINGLE)
 * async getContractById(...) {}
 *
 * @DataScope(CONTRACT_DATA_SCOPE.MUTATION_CREATE)
 * async createContract(...) {}
 * ```
 */
export const CONTRACT_DATA_SCOPE = {
  // ==========================================================================
  // QUERY PRESETS
  // ==========================================================================

  /**
   * For single record queries (getById, getByNumber)
   * - AUTO mode: Apply hierarchical filtering
   * - MEDIUM audit: Log individual record access
   */
  QUERY_SINGLE: {
    ...CONTRACT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.MEDIUM,
  } satisfies DataScopeOptions,

  /**
   * For list/bulk queries (getByCustomer, getByStatus, getAll)
   * - AUTO mode: Apply hierarchical filtering
   * - LOW audit: Minimal logging for bulk operations
   */
  QUERY_LIST: {
    ...CONTRACT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.LOW,
  } satisfies DataScopeOptions,

  /**
   * For aggregation/statistics queries (statusDistribution, customerStats)
   * - SKIP mode: No filtering for aggregated data
   * - LOW audit: Statistics don't expose individual records
   */
  QUERY_AGGREGATION: {
    ...CONTRACT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.SKIP,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.LOW,
  } satisfies DataScopeOptions,

  // ==========================================================================
  // MUTATION PRESETS
  // ==========================================================================

  /**
   * For create operations
   * - SKIP mode: No filtering needed for new records
   * - HIGH audit: Log all create operations
   */
  MUTATION_CREATE: {
    ...CONTRACT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.SKIP,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For update operations
   * - AUTO mode: Ensure user can access record being updated
   * - HIGH audit: Log all modifications
   */
  MUTATION_UPDATE: {
    ...CONTRACT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For delete operations (soft/hard)
   * - AUTO mode: Ensure user can access record being deleted
   * - HIGH audit: Log all deletions
   */
  MUTATION_DELETE: {
    ...CONTRACT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For restore operations
   * - AUTO mode: Ensure user can access record being restored
   * - HIGH audit: Log all restorations
   */
  MUTATION_RESTORE: {
    ...CONTRACT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type DataScopeMode =
  (typeof DATA_SCOPE_MODE)[keyof typeof DATA_SCOPE_MODE];
export type DataScopeAuditLevel =
  (typeof DATA_SCOPE_AUDIT_LEVEL)[keyof typeof DATA_SCOPE_AUDIT_LEVEL];
