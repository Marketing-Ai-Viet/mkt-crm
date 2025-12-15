/**
 * MKT Product Proxy Types
 * Types for external product/package integration from MKT Server
 */

/**
 * Multi-language field from MKT Server
 */
export type MktMultiLangField = {
  vi: string;
  en: string;
  ko: string;
};

/**
 * Product status from MKT Server
 */
export type MktProductStatus = 'active' | 'beta' | 'inactive' | 'deprecated';

/**
 * Package type from MKT Server
 */
export type MktPackageType = 'subscription' | 'perpetual' | 'trial' | 'addon';

/**
 * Billing cycle from MKT Server
 */
export type MktBillingCycle =
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'one_time'
  | 'lifetime';

/**
 * Supported currencies
 */
export type MktCurrency = 'VND' | 'USD' | 'EUR';

/**
 * Supported languages
 */
export type MktSupportedLanguage = 'vi' | 'en' | 'ko';

/**
 * Product from MKT Server API
 */
export type MktProduct = {
  id: string;
  productName: MktMultiLangField;
  productDescription: MktMultiLangField | null;
  productOverview: MktMultiLangField | null;
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

/**
 * ProductPackage from MKT Server API
 */
export type MktProductPackage = {
  id: string;
  licenseType: string;
  packageCode: string;
  packageName: MktMultiLangField;
  packageDescription: MktMultiLangField | null;
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

/**
 * Product Snapshot - IMMUTABLE after creation
 * Captured at order time for historical reference
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
 * Package Snapshot - IMMUTABLE after creation
 * Captured at order time for historical reference
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
