/**
 * Linked Account Types
 *
 * Types for external account integration with multiple providers
 */

import {
  ACCOUNT_PROVIDER,
  LINKED_ACCOUNT_STATUS,
} from 'src/mkt-core/customer/constants/linked-account.constants';

// ============================================
// PROVIDER & STATUS TYPES
// ============================================

export type AccountProvider =
  (typeof ACCOUNT_PROVIDER)[keyof typeof ACCOUNT_PROVIDER];

export type LinkedAccountStatus =
  (typeof LINKED_ACCOUNT_STATUS)[keyof typeof LINKED_ACCOUNT_STATUS];

// ============================================
// LINKED ACCOUNT TYPE
// ============================================

/**
 * LinkedAccount - Generic account data structure
 * Stored as JSONB in linkedAccounts field
 *
 * Supports multiple providers with extensible metadata
 *
 * @example MKT Server account
 * {
 *   id: "uuid",
 *   provider: "MKT_SERVER",
 *   externalId: "mkt-account-123",
 *   email: "user@example.com",
 *   displayName: "John Doe",
 *   isPrimary: true,
 *   status: "ACTIVE",
 *   linkedAt: "2024-01-01T00:00:00Z",
 *   metadata: { licenseCount: 5 }
 * }
 *
 * @example Google account
 * {
 *   id: "uuid",
 *   provider: "GOOGLE",
 *   externalId: "google-user-id",
 *   email: "user@gmail.com",
 *   displayName: "John Doe",
 *   avatarUrl: "https://...",
 *   metadata: { domain: "company.com" }
 * }
 */
/**
 * Metadata type - sử dụng JSON-compatible primitive types
 * để TypeORM's _QueryDeepPartialEntity có thể traverse qua type này
 * Giá trị thực tế là JSON object được lưu trong JSONB column
 */
export type LinkedAccountMetadata = Record<
  string,
  string | number | boolean | null
>;

export type LinkedAccount = {
  /** Unique ID trong CRM (UUID) */
  id: string;

  /** Provider nguồn tài khoản */
  provider: AccountProvider;

  /** ID tài khoản trên hệ thống nguồn */
  externalId?: string;

  /** Email liên kết */
  email?: string | null;

  /** Tên hiển thị */
  displayName?: string | null;

  /** Avatar URL */
  avatarUrl?: string | null;

  /** Tài khoản chính cho provider này */
  isPrimary: boolean;

  /** Trạng thái liên kết */
  status: LinkedAccountStatus;

  /** Thời gian liên kết (ISO string) */
  linkedAt: string;

  /** Thời gian sync gần nhất (ISO string) */
  lastSyncAt?: string | null;

  /** Thời gian hết hạn (nếu có) */
  expiresAt?: string | null;

  /** Ghi chú */
  notes?: string | null;

  /** Metadata mở rộng theo provider - JSON type để tránh type inference issues */
  metadata?: LinkedAccountMetadata;
};

// ============================================
// PROVIDER-SPECIFIC METADATA TYPES
// ============================================

/**
 * MKT Server account metadata
 */
export type MktServerAccountMetadata = {
  licenseCount?: number;
  subscriptionTier?: string;
  lastActivityAt?: string;
};

/**
 * Google account metadata
 */
export type GoogleAccountMetadata = {
  domain?: string;
  organizationUnit?: string;
  isAdmin?: boolean;
};

/**
 * Zalo account metadata
 */
export type ZaloAccountMetadata = {
  oaId?: string;
  followersCount?: number;
  isVerified?: boolean;
};

/**
 * E-commerce (Shopee/Lazada) account metadata
 */
export type EcommerceAccountMetadata = {
  shopId?: string;
  shopName?: string;
  region?: string;
  ratingScore?: number;
};
