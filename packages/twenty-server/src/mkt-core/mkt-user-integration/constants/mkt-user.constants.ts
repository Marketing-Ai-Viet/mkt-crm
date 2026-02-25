// ============================================
// API ENDPOINTS
// ============================================

/**
 * MKT User API Endpoints
 *
 * IMPORTANT: Endpoints must match MKT Admin Backend API:
 * - User: `/api/v1/user`
 * - Auth: `/api/auth/sign-up/email`
 *
 * Uses MktAuthHttpService (Better Auth) for authentication.
 */
export const MKT_USER_ENDPOINTS = {
  // User endpoints (Admin API via mkt-auth-client)
  WHOAMI: '/api/v1/user/whoami',
  LIST: '/api/v1/user/all',
  LIST_CURSOR: '/api/v1/user/all/cursor',
  GET_BY_ID: '/api/v1/user/:id',
  UPDATE_PROFILE: '/api/v1/user/profile',
  DELETE: '/api/v1/user/:id',

  // Auth endpoint for user creation (Better Auth sign-up)
  SIGN_UP: '/api/auth/sign-up/email',
} as const;

export type MktUserEndpointsType =
  (typeof MKT_USER_ENDPOINTS)[keyof typeof MKT_USER_ENDPOINTS];

// ============================================
// ADMIN USER ROLE
// ============================================

/**
 * Admin user role enum
 * Matches role values from MKT Admin Backend API (Swagger)
 */
export const MKT_ADMIN_USER_ROLE = {
  USER: 'User',
  ADMIN: 'Admin',
} as const;

export type MktAdminUserRoleType =
  (typeof MKT_ADMIN_USER_ROLE)[keyof typeof MKT_ADMIN_USER_ROLE];

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
// ERROR BUILDER
// ============================================

export const MKT_USER_ERROR_BUILDER = {
  fetchFailed: (error: string) => `Failed to fetch user: ${error}`,
  fetchByEmailFailed: (error: string) =>
    `Failed to fetch user by email: ${error}`,
  createFailed: (error: string) => `Failed to create user: ${error}`,
  updateFailed: (error: string) => `Failed to update user: ${error}`,
  deleteFailed: (error: string) => `Failed to delete user: ${error}`,
} as const;
