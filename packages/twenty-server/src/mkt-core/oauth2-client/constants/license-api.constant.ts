// License API Endpoints
export const LICENSE_API_ENDPOINTS = {
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

export type LicenseApiEndpointsType =
  (typeof LICENSE_API_ENDPOINTS)[keyof typeof LICENSE_API_ENDPOINTS];

// License Query Defaults
export const LICENSE_QUERY_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// Bulk Operation Limits
export const LICENSE_BULK_LIMITS = {
  MIN_ITEMS: 1,
  MAX_ITEMS: 100,
} as const;

// Max Devices Limits
export const LICENSE_MAX_DEVICES_LIMITS = {
  MIN: 1,
  MAX: 100,
  DEFAULT: 1,
} as const;
