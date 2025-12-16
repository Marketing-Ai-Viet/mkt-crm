import {
  MktCurrency,
  MktSupportedLanguage,
} from 'src/mkt-core/mkt-product-integration/types';

// ============================================
// API ENDPOINTS
// ============================================

/**
 * MKT Product API Endpoints
 *
 * IMPORTANT: Endpoints must match MKT Server controllers:
 * - ProductOAuthController: `/api/oauth/products`
 * - ProductPackageOAuthController: `/api/oauth/product-packages`
 */
export const MKT_PRODUCT_ENDPOINTS = {
  // Product endpoints (từ ProductOAuthController)
  LIST: '/api/oauth/products',
  GET_BY_ID: '/api/oauth/products/:id',
  GET_BY_CODE: '/api/oauth/products/by-code/:code',
  GET_LOCALIZED: '/api/oauth/products/:id/localized',
  LIST_LOCALIZED: '/api/oauth/products/localized',
  SEARCH: '/api/oauth/products/search/:lang',
  GET_PRODUCT_PACKAGES: '/api/oauth/products/:id/packages',

  // Package endpoints (từ ProductPackageOAuthController)
  // FIX: Changed from /api/oauth/packages to /api/oauth/product-packages
  PACKAGES_LIST: '/api/oauth/product-packages',
  GET_PACKAGE: '/api/oauth/product-packages/:id',
  GET_PACKAGE_BY_CODE: '/api/oauth/product-packages/by-code/:code',
  GET_PACKAGES_BY_PRODUCT: '/api/oauth/product-packages/by-product/:productId',
  GET_PACKAGES_BY_LICENSE_TYPE:
    '/api/oauth/product-packages/by-license-type/:licenseType',
} as const;

export type MktProductEndpointsType =
  (typeof MKT_PRODUCT_ENDPOINTS)[keyof typeof MKT_PRODUCT_ENDPOINTS];

// ============================================
// CACHE CONFIGURATION
// ============================================

/**
 * Cache prefix for MKT Product Integration
 */
export const MKT_CACHE_PREFIX = 'mkt' as const;

/**
 * Cache TTL in seconds
 */
export const MKT_CACHE_TTL = 3600 as const; // 1 hour

/**
 * Fallback cache TTL in seconds (used when API is unavailable)
 */
export const MKT_FALLBACK_CACHE_TTL = 86400 as const; // 24 hours

// ============================================
// PRODUCT TYPE
// ============================================

export enum MKT_PRODUCT_TYPE {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
  SERVICE = 'SERVICE',
  OTHER = 'OTHER',
}

/**
 * Cache prefix for product types
 * Used to differentiate cache keys by product type
 */
export const MKT_PRODUCT_TYPE_CACHE_PREFIX = {
  [MKT_PRODUCT_TYPE.DIGITAL]: 'digital',
  [MKT_PRODUCT_TYPE.PHYSICAL]: 'physical',
  [MKT_PRODUCT_TYPE.SERVICE]: 'service',
  [MKT_PRODUCT_TYPE.OTHER]: 'other',
} as const;

/**
 * Default cache prefix for product endpoints
 */
export const MKT_DEFAULT_PRODUCT_CACHE_PREFIX =
  MKT_PRODUCT_TYPE_CACHE_PREFIX[MKT_PRODUCT_TYPE.DIGITAL];

/**
 * Cache key patterns
 *
 * NOTE: CacheStorageNamespace.MktProduct adds prefix "mkt:product:"
 * So keys here should NOT include "product:" prefix to avoid duplication
 *
 * Final key format: mkt:product:{type}:{key}
 */
export const CACHE_KEYS = {
  product: (id: string, type: MKT_PRODUCT_TYPE = MKT_PRODUCT_TYPE.DIGITAL) =>
    `${MKT_PRODUCT_TYPE_CACHE_PREFIX[type]}:${id}`,
  productCode: (
    code: string,
    type: MKT_PRODUCT_TYPE = MKT_PRODUCT_TYPE.DIGITAL,
  ) => `${MKT_PRODUCT_TYPE_CACHE_PREFIX[type]}:code:${code}`,
  productFallback: (
    id: string,
    type: MKT_PRODUCT_TYPE = MKT_PRODUCT_TYPE.DIGITAL,
  ) => `${MKT_PRODUCT_TYPE_CACHE_PREFIX[type]}:fallback:${id}`,
  package: (id: string, type: MKT_PRODUCT_TYPE = MKT_PRODUCT_TYPE.DIGITAL) =>
    `${MKT_PRODUCT_TYPE_CACHE_PREFIX[type]}:pkg:${id}`,
  packageCode: (
    code: string,
    type: MKT_PRODUCT_TYPE = MKT_PRODUCT_TYPE.DIGITAL,
  ) => `${MKT_PRODUCT_TYPE_CACHE_PREFIX[type]}:pkg:code:${code}`,
  packagesByProduct: (
    productId: string,
    type: MKT_PRODUCT_TYPE = MKT_PRODUCT_TYPE.DIGITAL,
  ) => `${MKT_PRODUCT_TYPE_CACHE_PREFIX[type]}:pkgs:${productId}`,
} as const;

// ============================================
// LANGUAGE & CURRENCY DEFAULTS
// ============================================

/**
 * Supported languages
 */
export const MKT_SUPPORTED_LANGUAGES: readonly MktSupportedLanguage[] = [
  'vi',
  'en',
  'ko',
] as const;

/**
 * Default language
 */
export const MKT_DEFAULT_LANGUAGE: MktSupportedLanguage = 'vi' as const;

/**
 * Default currency
 */
export const MKT_DEFAULT_CURRENCY: MktCurrency = 'VND' as const;

/**
 * Language fallback order
 */
export const MKT_LANGUAGE_FALLBACK_ORDER: readonly MktSupportedLanguage[] = [
  'vi',
  'en',
  'ko',
] as const;

// ============================================
// PRODUCT STATUS CONFIGURATION
// ============================================

/**
 * Product status that can be ordered
 */
export const MKT_ORDERABLE_STATUSES = ['active', 'beta'] as const;

export type MktOrderableStatus = (typeof MKT_ORDERABLE_STATUSES)[number];

// ============================================
// QUERY DEFAULTS
// ============================================

/**
 * Query defaults for products
 */
export const MKT_PRODUCT_QUERY_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
  SORT_BY: 'sortOrder',
  SORT_ORDER: 'ASC',
} as const;

// ============================================
// LOG CONTEXT
// ============================================

export const MKT_PRODUCT_LOG_CONTEXT = 'MktProductIntegration' as const;

export const MKT_PRODUCT_ERROR_BUILDER = {
  fetchFailed: (error: string) => `Failed to fetch product: ${error}`,
  fetchPackageFailed: (error: string) => `Failed to fetch package: ${error}`,
  validationFailed: (error: string) => `Validation failed: ${error}`,
  cacheError: (error: string) => `Cache error: ${error}`,
} as const;
