/**
 * MKT User Integration Types
 *
 * Type definitions for MKT Admin Backend User API integration.
 * Uses Better Auth (mkt-auth-client) instead of OAuth2.
 */

import { MktAdminUserRoleType } from 'src/mkt-core/mkt-user-integration/constants';

// ============================================
// ADMIN API DTO TYPES (from Swagger)
// ============================================

/**
 * AdminUserDto - Direct mapping from MKT Admin Backend API (Swagger)
 *
 * This is the shape returned by the Admin API endpoints.
 * MktAuthHttpService.unwrapResponse() auto-unwraps { data: T } -> T
 */
export type AdminUserDto = {
  id: string;
  role: MktAdminUserRoleType;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * AdminUpdateUserProfileDto - Input for PATCH /api/v1/user/profile
 */
export type AdminUpdateUserProfileDto = {
  username?: string;
  firstName?: string;
  lastName?: string;
  image?: string;
};

// ============================================
// INTERNAL USER TYPES
// ============================================

/**
 * Internal user type mapped from AdminUserDto
 * Provides backward-compatible structure for CRM usage
 */
export type MktUser = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: MktAdminUserRoleType;
  image: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================
// INPUT TYPES
// ============================================

/**
 * Create user input - maps to Better Auth sign-up endpoint
 * POST /api/auth/sign-up/email
 */
export type MktCreateUserInput = {
  email: string;
  password: string;
  name: string;
};

/**
 * Update user profile input - maps to PATCH /api/v1/user/profile
 */
export type MktUpdateUserInput = {
  username?: string;
  firstName?: string;
  lastName?: string;
  image?: string;
};

// ============================================
// PAGINATED RESPONSE TYPES
// ============================================

/**
 * Paginated users response (built locally from unwrapped API response)
 *
 * NOTE: MktAuthHttpService.unwrapResponse() auto-unwraps { data: [...], pagination }
 * -> returns AdminUserDto[] (pagination info is lost).
 * Repository must build pagination locally.
 */
export type MktPaginatedUsers = {
  data: MktUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ============================================
// QUERY PARAMS TYPES
// ============================================

/**
 * Query params for users list
 */
export type MktUserQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
};

// ============================================
// FETCHER TYPES
// ============================================

/**
 * User fetcher interface for dependency injection
 * Allows decoupling from data fetching logic
 */
export type UserFetcher = (userId: string) => Promise<MktUser | null>;
