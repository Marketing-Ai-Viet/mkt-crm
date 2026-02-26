/**
 * Payment DataScope Constants
 *
 * Centralized configuration for @DataScope decorator in Payment module.
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
// PAYMENT DATA SCOPE PRESETS
// ============================================================================

/**
 * Payment resource entity name for DataScope configuration.
 * Defined locally to avoid circular dependency with workspace entity.
 */
const PAYMENT_RESOURCE: ResourceEntityName = 'mktPayment';

/**
 * Base configuration for all Payment DataScope operations
 */
const PAYMENT_DATA_SCOPE_BASE = {
  resource: PAYMENT_RESOURCE,
} as const;

/**
 * Preset DataScope configurations for Payment operations
 *
 * Usage:
 * ```typescript
 * @DataScope(PAYMENT_DATA_SCOPE.MUTATION_CREATE)
 * async createPayment(...) {}
 *
 * @DataScope(PAYMENT_DATA_SCOPE.MUTATION_CONFIRM)
 * async confirmPayment(...) {}
 * ```
 */
export const PAYMENT_DATA_SCOPE = {
  // ==========================================================================
  // MUTATION PRESETS
  // ==========================================================================

  /**
   * For create operations (createPayment)
   * - SKIP mode: No filtering needed for new records
   * - HIGH audit: Financial operation
   */
  MUTATION_CREATE: {
    ...PAYMENT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.SKIP,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For update operations (updatePayment)
   * - AUTO mode: Ensure user can access payment being updated
   * - HIGH audit: Financial operation
   */
  MUTATION_UPDATE: {
    ...PAYMENT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For confirm operations (confirmPayment)
   * - AUTO mode: Ensure user can access payment being confirmed
   * - HIGH audit: Financial operation
   */
  MUTATION_CONFIRM: {
    ...PAYMENT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For reject operations (rejectPayment)
   * - AUTO mode: Ensure user can access payment being rejected
   * - HIGH audit: Financial operation
   */
  MUTATION_REJECT: {
    ...PAYMENT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For refund operations
   * - AUTO mode: Ensure user can access payment being refunded
   * - HIGH audit: Sensitive financial operation
   */
  MUTATION_REFUND: {
    ...PAYMENT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For VA create operations (createVirtualAccount)
   * - SKIP mode: No filtering needed for new records
   * - HIGH audit: Financial operation
   */
  MUTATION_VA_CREATE: {
    ...PAYMENT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.SKIP,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,

  /**
   * For VA deactivate operations (deactivateVirtualAccount)
   * - AUTO mode: Ensure user can access VA being deactivated
   * - HIGH audit: Financial operation
   */
  MUTATION_VA_DEACTIVATE: {
    ...PAYMENT_DATA_SCOPE_BASE,
    mode: DATA_SCOPE_MODE.AUTO,
    auditLevel: DATA_SCOPE_AUDIT_LEVEL.HIGH,
  } satisfies DataScopeOptions,
} as const;
