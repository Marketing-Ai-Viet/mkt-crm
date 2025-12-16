/**
 * MKT Product Proxy Types
 *
 * Type definitions for MKT Server Product & ProductPackage API integration
 */

// ============================================
// MULTI-LANGUAGE SUPPORT
// ============================================

/**
 * Multi-language field từ MKT Server
 * Hỗ trợ 3 ngôn ngữ: Vietnamese, English, Korean
 */
export type MktMultiLangField = {
  vi: string;
  en: string;
  ko: string;
};

export type MktSupportedLanguage = 'vi' | 'en' | 'ko';

// ============================================
// PRODUCT TYPES
// ============================================

export type MktProductStatus = 'active' | 'beta' | 'inactive' | 'deprecated';

/**
 * Product từ MKT Server API (localized response)
 */
export type MktProduct = {
  id: string;
  productName: string;
  productDescription: string | null;
  productOverview: string | null;
  code: string;
  status: MktProductStatus;
  version: string | null;
  basePrice: number | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  gallery: string[];
  sortOrder: number;
  metadata: Record<string, unknown>;
  packages?: MktProductPackage[];
  createdAt: string;
  updatedAt: string;
};

// ============================================
// PACKAGE TYPES
// ============================================

export type MktPackageType = 'subscription' | 'perpetual' | 'trial' | 'addon';
export type MktBillingCycle =
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'one_time'
  | 'lifetime';
export type MktCurrency = 'VND' | 'USD' | 'EUR';

/**
 * ProductPackage từ MKT Server API (localized response)
 */
export type MktProductPackage = {
  id: string;
  licenseType: string;
  packageCode: string;
  packageName: string;
  packageDescription: string | null;
  packageType: MktPackageType;
  currency: MktCurrency;
  billingCycle: MktBillingCycle;
  durationDays: number | null;
  isActive: boolean;
  price: number;
  metadata: Record<string, unknown>;
  productId: string;
  createdAt: string;
  updatedAt: string;
};

// ============================================
// SNAPSHOT TYPES - IMMUTABLE AFTER CREATION
// ============================================

/**
 * Product Snapshot - IMMUTABLE sau khi tạo
 * Lưu trữ thông tin product tại thời điểm tạo order
 */
export type MktProductSnapshot = {
  id: string;
  code: string;
  productName: MktMultiLangField;
  productDescription: MktMultiLangField | null;
  displayName: string;
  displayDescription: string | null;
  displayLanguage: MktSupportedLanguage;
  basePrice: number | null;
  currency: MktCurrency;
  status: MktProductStatus;
  version: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  capturedAt: string;
  sourceVersion: string;
  checksum: string;
};

/**
 * Package Snapshot - IMMUTABLE sau khi tạo
 * Lưu trữ thông tin package tại thời điểm tạo order
 */
export type MktPackageSnapshot = {
  id: string;
  packageCode: string;
  productId: string;
  packageName: MktMultiLangField;
  packageDescription: MktMultiLangField | null;
  displayName: string;
  displayDescription: string | null;
  packageType: MktPackageType;
  licenseType: string;
  billingCycle: MktBillingCycle;
  durationDays: number | null;
  price: number;
  currency: MktCurrency;
  capturedAt: string;
};

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * API Response wrapper (matching MKT Server format)
 */
export type MktApiResponse<T> = {
  success: boolean;
  data: T;
  message: string;
};

/**
 * Paginated data response
 */
export type MktPaginatedData<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ============================================
// QUERY PARAMS TYPES
// ============================================

/**
 * Query params for products list
 */
export type MktProductQueryParams = {
  page?: number;
  limit?: number;
  status?: MktProductStatus;
  search?: string;
  lang?: MktSupportedLanguage;
  sortBy?: 'sortOrder' | 'createdAt' | 'updatedAt' | 'code';
  sortOrder?: 'ASC' | 'DESC';
};

/**
 * Query params for packages list
 */
export type MktPackageQueryParams = {
  page?: number;
  limit?: number;
  productId?: string;
  packageType?: MktPackageType;
  isActive?: boolean;
};

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Validation item for order
 */
export type MktOrderValidationItem = {
  productId: string;
  packageId?: string;
};

/**
 * Validation error
 */
export type MktValidationError = {
  productId: string;
  packageId?: string;
  reason: string;
};

/**
 * Validation result
 */
export type MktValidationResult = {
  valid: boolean;
  errors: MktValidationError[];
};

export type SyncResult = {
  productsCount: number;
  packagesCount: number;
  errors: string[];
  duration: number;
};

export type SyncItemResult = {
  count: number;
  errors: string[];
};
