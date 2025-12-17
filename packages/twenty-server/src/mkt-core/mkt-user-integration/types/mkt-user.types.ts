/**
 * MKT User Integration Types
 *
 * Type definitions for MKT Server User API integration
 */

import {
  MktAuthMethodType,
  MktUserStatusType,
} from 'src/mkt-core/mkt-user-integration/constants';

// ============================================
// USER TYPES
// ============================================

/**
 * User từ MKT Server API response
 */
export type MktUser = {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  code: string | null;
  phone: string | null;
  avatarUrl: string | null;
  roleId: string | null;
  status: MktUserStatusType;
  authMethod: MktAuthMethodType;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  crmCustomerId: string | null;
  crmSyncEnabled: boolean;
  preferences: Record<string, unknown>;
  settings: Record<string, unknown>;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Login history từ MKT Server API response
 */
export type MktUserLoginHistory = {
  userId: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lockedUntil: string | null;
};

// ============================================
// INPUT TYPES
// ============================================

/**
 * Create user input cho API
 */
export type MktCreateUserInput = {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phone?: string;
  code?: string;
  roleId?: string;
  status?: MktUserStatusType;
};

/**
 * Update user input cho API
 */
export type MktUpdateUserInput = {
  email?: string;
  username?: string;
  fullName?: string;
  phone?: string;
  role?: string;
  status?: MktUserStatusType;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
  settings?: Record<string, unknown>;
};

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * API Response wrapper (matching MKT Server format)
 */
export type MktUserApiResponse<T> = {
  success: boolean;
  data: T;
  message: string;
};

/**
 * Paginated users response từ MKT Server
 */
export type MktPaginatedUsers = {
  users: MktUser[];
  total: number;
  page: number;
  limit: number;
};

// ============================================
// QUERY PARAMS TYPES
// ============================================

/**
 * Query params cho users list
 */
export type MktUserQueryParams = {
  page?: number;
  limit?: number;
  role?: string;
  status?: MktUserStatusType;
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
