// ============================================
// API ENDPOINTS
// ============================================

/**
 * MKT User API Endpoints
 *
 * IMPORTANT: Endpoints must match MKT Server controllers:
 * - OauthUserController: `/api/oauth/users`
 */
export const MKT_USER_ENDPOINTS = {
  // User endpoints (từ OauthUserController)
  LIST: '/api/oauth/users',
  GET_BY_ID: '/api/oauth/users/:id',
  GET_BY_EMAIL: '/api/oauth/users/by-email/:email',
  CREATE: '/api/oauth/users',
  UPDATE: '/api/oauth/users/:id',
  LOGIN_HISTORY_BY_EMAIL: '/api/oauth/users/by-email/:email/login-history',
} as const;

export type MktUserEndpointsType =
  (typeof MKT_USER_ENDPOINTS)[keyof typeof MKT_USER_ENDPOINTS];

// ============================================
// USER STATUS
// ============================================

/**
 * User status enum
 * Matches UserStatus from MKT Server
 */
export const MKT_USER_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
} as const;

export type MktUserStatusType =
  (typeof MKT_USER_STATUS)[keyof typeof MKT_USER_STATUS];

// ============================================
// AUTH METHOD
// ============================================

/**
 * Authentication method enum
 * Matches AuthMethod from MKT Server
 */
export const MKT_AUTH_METHOD = {
  LOCAL: 'local',
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  APPLE: 'apple',
} as const;

export type MktAuthMethodType =
  (typeof MKT_AUTH_METHOD)[keyof typeof MKT_AUTH_METHOD];

// ============================================
// REQUIRED SCOPES
// ============================================

/**
 * Required OAuth2 scopes for user operations
 */
export const MKT_USER_REQUIRED_SCOPES = {
  READ: 'users:read',
  WRITE: 'users:write',
  MANAGE: 'users:manage',
} as const;

export type MktUserScopeType =
  (typeof MKT_USER_REQUIRED_SCOPES)[keyof typeof MKT_USER_REQUIRED_SCOPES];

// ============================================
// QUERY DEFAULTS
// ============================================

/**
 * Query defaults for users
 */
export const MKT_USER_QUERY_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// ============================================
// LOG CONTEXT
// ============================================

export const MKT_USER_LOG_CONTEXT = 'MktUserIntegration' as const;

// ============================================
// URL BUILDER HELPERS
// ============================================

/**
 * URL builder functions for MKT User API
 */
export const MKT_USER_URL_BUILDER = {
  /**
   * Build URL for getting user by ID
   * @param userId - User ID
   * @returns Full URL path
   */
  getById: (userId: string): string =>
    MKT_USER_ENDPOINTS.GET_BY_ID.replace(':id', userId),

  /**
   * Build URL for getting user by email
   * @param email - User email
   * @returns Full URL path
   */
  getByEmail: (email: string): string =>
    MKT_USER_ENDPOINTS.GET_BY_EMAIL.replace(
      ':email',
      encodeURIComponent(email),
    ),

  /**
   * Build URL for updating user
   * @param userId - User ID
   * @returns Full URL path
   */
  update: (userId: string): string =>
    MKT_USER_ENDPOINTS.UPDATE.replace(':id', userId),

  /**
   * Build URL for getting login history by email
   * @param email - User email
   * @returns Full URL path
   */
  loginHistoryByEmail: (email: string): string =>
    MKT_USER_ENDPOINTS.LOGIN_HISTORY_BY_EMAIL.replace(
      ':email',
      encodeURIComponent(email),
    ),
} as const;
