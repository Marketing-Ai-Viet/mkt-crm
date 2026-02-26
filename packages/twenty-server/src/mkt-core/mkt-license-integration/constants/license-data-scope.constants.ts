/**
 * License DataScope Constants
 *
 * Centralized configuration for @DataScope decorator in License Integration module.
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
// LICENSE DATA SCOPE PRESETS
// ============================================================================

/**
 * License resource entity name for DataScope configuration.
 * Defined locally to avoid circular dependency with workspace entity.
 */
const LICENSE_RESOURCE: ResourceEntityName = 'mktLicense';

/**
 * Base configuration for all License DataScope operations
 */
const LICENSE_DATA_SCOPE_BASE = {
  resource: LICENSE_RESOURCE,
} as const;

/**
 * Preset DataScope configurations for License operations
 *
 * Usage:
 * ```typescript
 * @DataScope(LICENSE_DATA_SCOPE.QUERY_SINGLE)
 * async mktLicenseById(...) {}
 *
 * @DataScope(LICENSE_DATA_SCOPE.MUTATION_CREATE)
 * async mktCreateLicense(...) {}
 * ```
 */
export const LICENSE_DATA_SCOPE = {
  // ==========================================================================
  // QUERY PRESETS
  // ==========================================================================

  /**
   * For single record queries (byId, byKey, validate)
   * - AUTO mode: Apply hierarchical filtering
   * - MEDIUM audit: Log individual record access
   */
  QUERY_SINGLE: {
    ...LICENSE_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.MEDIUM,
  } satisfies DataScopeOptions,

  /**
   * For list/bulk queries (mktLicenses)
   * - AUTO mode: Apply hierarchical filtering
   * - LOW audit: Minimal logging for bulk operations
   */
  QUERY_LIST: {
    ...LICENSE_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.LOW,
  } satisfies DataScopeOptions,

  /**
   * For analytics/aggregation queries (mktLicenseAnalytics)
   * - SKIP mode: No filtering for aggregated data
   * - LOW audit: Statistics don't expose individual records
   */
  QUERY_AGGREGATION: {
    ...LICENSE_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.SKIP,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.LOW,
  } satisfies DataScopeOptions,

  // ==========================================================================
  // MUTATION PRESETS
  // ==========================================================================

  /**
   * For create operations (mktCreateLicense, mktCreateTrialLicense)
   * - SKIP mode: No filtering needed for new records
   * - HIGH audit: License creation is critical
   */
  MUTATION_CREATE: {
    ...LICENSE_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.SKIP,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For update operations (mktUpdateLicense)
   * - AUTO mode: Ensure user can access license being updated
   * - HIGH audit: License modifications are critical
   */
  MUTATION_UPDATE: {
    ...LICENSE_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For delete operations (mktDeleteLicense)
   * - AUTO mode: Ensure user can access license being deleted
   * - HIGH audit: License deletion is critical
   */
  MUTATION_DELETE: {
    ...LICENSE_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For activate/revoke operations
   * - AUTO mode: Ensure user can access license
   * - HIGH audit: License state changes are critical
   */
  MUTATION_STATE_CHANGE: {
    ...LICENSE_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For bulk operations (bulk create, update, delete)
   * - SKIP mode for create, AUTO mode for update/delete
   * - HIGH audit: Bulk operations are high-impact
   */
  MUTATION_BULK_CREATE: {
    ...LICENSE_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.SKIP,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  MUTATION_BULK_UPDATE: {
    ...LICENSE_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  MUTATION_BULK_DELETE: {
    ...LICENSE_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,
} as const;
