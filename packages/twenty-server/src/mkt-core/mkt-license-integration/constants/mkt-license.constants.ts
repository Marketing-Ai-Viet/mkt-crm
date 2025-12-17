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

  // Actions
  LICENSE_ACTIVATE: '/api/oauth/licenses/:id/activate',
  LICENSE_REVOKE: '/api/oauth/licenses/:id/revoke',

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
// LOG CONTEXT
// ============================================

export const MKT_LICENSE_LOG_CONTEXT = 'MktLicenseIntegration' as const;

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
