// ============================================
// API ENDPOINTS
// ============================================

/**
 * MKT License API Endpoints
 *
 * IMPORTANT: Endpoints must match MKT Server controllers:
 * - LicenseOAuthController: `/api/oauth/licenses`
 */
export const MKT_LICENSE_ENDPOINTS = {
  // Base
  LICENSES: '/api/oauth/licenses',
  LICENSE_DETAIL: '/api/oauth/licenses/:id',

  // Query
  LICENSE_BY_KEY: '/api/oauth/licenses/by-key/:licenseKey',
  LICENSE_VALIDATE: '/api/oauth/licenses/validate',
  LICENSE_CHECK_EXISTS: '/api/oauth/licenses/check-exists',

  // Actions
  LICENSE_ACTIVATE: '/api/oauth/licenses/:id/activate',
  LICENSE_REVOKE: '/api/oauth/licenses/:id/revoke',
  LICENSE_TRIAL: '/api/oauth/licenses/trial',
  LICENSE_UPGRADE: '/api/oauth/licenses/:id/upgrade',

  // Bulk
  LICENSES_BULK: '/api/oauth/licenses/bulk',

  // Analytics
  LICENSES_ANALYTICS: '/api/oauth/licenses/analytics',
} as const;

export type MktLicenseEndpointsType =
  (typeof MKT_LICENSE_ENDPOINTS)[keyof typeof MKT_LICENSE_ENDPOINTS];

// ============================================
// QUERY DEFAULTS
// ============================================

/**
 * Query defaults for licenses
 */
export const MKT_LICENSE_QUERY_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// ============================================
// BULK OPERATION LIMITS
// ============================================

export const MKT_LICENSE_BULK_LIMITS = {
  MIN_ITEMS: 1,
  MAX_ITEMS: 100,
} as const;

// ============================================
// MAX DEVICES LIMITS
// ============================================

export const MKT_LICENSE_MAX_DEVICES_LIMITS = {
  MIN: 1,
  MAX: 100,
  DEFAULT: 1,
} as const;

// ============================================
// TRIAL LICENSE CONSTRAINTS
// ============================================

export const MKT_TRIAL_LICENSE_CONSTRAINTS = {
  /** Default trial duration in days */
  DEFAULT_TRIAL_DAYS: 14,
  /** Minimum trial days */
  MIN_TRIAL_DAYS: 1,
  /** Maximum trial days */
  MAX_TRIAL_DAYS: 90,
  /** Default max devices for trial license (always 1) */
  DEFAULT_MAX_DEVICES: 1,
} as const;

// ============================================
// ERROR BUILDER
// ============================================

export const MKT_LICENSE_ERROR_BUILDER = {
  fetchFailed: (error: string) => `Failed to fetch license: ${error}`,
  fetchAllFailed: (error: string) => `Failed to fetch licenses: ${error}`,
  createFailed: (error: string) => `Failed to create license: ${error}`,
  updateFailed: (error: string) => `Failed to update license: ${error}`,
  deleteFailed: (error: string) => `Failed to delete license: ${error}`,
  activateFailed: (error: string) => `Failed to activate license: ${error}`,
  revokeFailed: (error: string) => `Failed to revoke license: ${error}`,
  validationFailed: (error: string) => `Failed to validate license: ${error}`,
  analyticsFailure: (error: string) =>
    `Failed to fetch license analytics: ${error}`,
  notFound: (id: string) => `License not found: ${id}`,
} as const;
