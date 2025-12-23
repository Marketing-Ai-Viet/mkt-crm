/**
 * Linked Account Constants
 *
 * Constants for external account integration with multiple providers
 */

import { FieldMetadataType } from 'twenty-shared/types';

import { FieldTypeAndNameMetadata } from 'src/engine/workspace-manager/workspace-sync-metadata/utils/get-ts-vector-column-expression.util';

// ============================================
// SEARCH FIELDS
// ============================================

export const SEARCH_FIELDS_FOR_MKT_CUSTOMER: FieldTypeAndNameMetadata[] = [
  { name: 'name', type: FieldMetadataType.TEXT },
];

// ============================================
// ACCOUNT PROVIDER
// ============================================

/**
 * Account Provider - Nguồn tài khoản
 * Mở rộng thêm provider mới tại đây
 */
export const ACCOUNT_PROVIDER = {
  MKT_SERVER: 'MKT_SERVER', // MKT Server (existing)
  GOOGLE: 'GOOGLE', // Google Workspace
  MICROSOFT: 'MICROSOFT', // Microsoft 365
  FACEBOOK: 'FACEBOOK', // Facebook Business
  ZALO: 'ZALO', // Zalo OA
  SHOPEE: 'SHOPEE', // Shopee Seller
  LAZADA: 'LAZADA', // Lazada Seller
  CUSTOM: 'CUSTOM', // Custom integration
  TIKTOK: 'TIKTOK', // TikTok For Business
} as const;

/**
 * Account Provider Options for UI select
 */
export const ACCOUNT_PROVIDER_OPTIONS = [
  { value: ACCOUNT_PROVIDER.MKT_SERVER, label: 'MKT Server', color: 'blue' },
  { value: ACCOUNT_PROVIDER.GOOGLE, label: 'Google', color: 'red' },
  { value: ACCOUNT_PROVIDER.MICROSOFT, label: 'Microsoft', color: 'sky' },
  { value: ACCOUNT_PROVIDER.FACEBOOK, label: 'Facebook', color: 'indigo' },
  { value: ACCOUNT_PROVIDER.ZALO, label: 'Zalo', color: 'cyan' },
  { value: ACCOUNT_PROVIDER.SHOPEE, label: 'Shopee', color: 'orange' },
  { value: ACCOUNT_PROVIDER.LAZADA, label: 'Lazada', color: 'purple' },
  { value: ACCOUNT_PROVIDER.CUSTOM, label: 'Custom', color: 'gray' },
  { value: ACCOUNT_PROVIDER.TIKTOK, label: 'TikTok', color: 'pink' },
] as const;

// ============================================
// LINKED ACCOUNT STATUS
// ============================================

/**
 * Account Status - Trạng thái tài khoản
 */
export const LINKED_ACCOUNT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  EXPIRED: 'EXPIRED',
} as const;

/**
 * Linked Account Status Options for UI select
 */
export const LINKED_ACCOUNT_STATUS_OPTIONS = [
  { value: LINKED_ACCOUNT_STATUS.ACTIVE, label: 'Active', color: 'green' },
  { value: LINKED_ACCOUNT_STATUS.INACTIVE, label: 'Inactive', color: 'gray' },
  {
    value: LINKED_ACCOUNT_STATUS.SUSPENDED,
    label: 'Suspended',
    color: 'orange',
  },
  {
    value: LINKED_ACCOUNT_STATUS.PENDING_VERIFICATION,
    label: 'Pending Verification',
    color: 'yellow',
  },
  { value: LINKED_ACCOUNT_STATUS.EXPIRED, label: 'Expired', color: 'red' },
] as const;

// ============================================
// DEFAULT VALUES
// ============================================

export const LINKED_ACCOUNT_DEFAULTS = {
  STATUS: LINKED_ACCOUNT_STATUS.ACTIVE,
  IS_PRIMARY: false,
} as const;
