import {
  MktCurrency,
  MktSupportedLanguage,
} from 'src/mkt-core/mkt-product-integration/types';

// ============================================
// API ENDPOINTS
// ============================================

/**
 * MKT Product API Endpoints
 */
export const MKT_PRODUCT_ENDPOINTS = {
  // Product endpoints
  LIST: '/api/oauth/products',
  GET_BY_ID: '/api/oauth/products/:id',
  GET_BY_CODE: '/api/oauth/products/by-code/:code',
  GET_LOCALIZED: '/api/oauth/products/:id/localized',
  SEARCH: '/api/oauth/products/search/:lang',
  GET_PRODUCT_PACKAGES: '/api/oauth/products/:id/packages',

  // Package endpoints
  GET_PACKAGE: '/api/oauth/packages/:id',
  GET_PACKAGE_BY_CODE: '/api/oauth/packages/by-code/:code',
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
export const MKT_CACHE_TTL = 300 as const; // 5 minutes

/**
 * Fallback cache TTL in seconds (used when API is unavailable)
 */
export const MKT_FALLBACK_CACHE_TTL = 86400 as const; // 24 hours

/**
 * Cache key patterns
 */
export const MKT_CACHE_KEYS = {
  PRODUCT: (id: string) => `${MKT_CACHE_PREFIX}:product:${id}`,
  PRODUCT_CODE: (code: string) => `${MKT_CACHE_PREFIX}:product:code:${code}`,
  PRODUCT_FALLBACK: (id: string) =>
    `${MKT_CACHE_PREFIX}:product:fallback:${id}`,
  PACKAGE: (id: string) => `${MKT_CACHE_PREFIX}:package:${id}`,
  PACKAGE_CODE: (code: string) => `${MKT_CACHE_PREFIX}:package:code:${code}`,
  PACKAGES_BY_PRODUCT: (productId: string) =>
    `${MKT_CACHE_PREFIX}:packages:product:${productId}`,
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

// ============================================
// OPERATION MESSAGES
// ============================================

export const MKT_PRODUCT_MESSAGES = {
  // Product operations
  FETCH_PRODUCT: 'Fetching product from MKT Server',
  FETCH_PRODUCT_BY_CODE: 'Fetching product by code from MKT Server',
  FETCH_PRODUCTS: 'Fetching products list from MKT Server',
  PRODUCT_NOT_FOUND: 'Product not found',
  PRODUCT_CACHED: 'Product cached successfully',

  // Package operations
  FETCH_PACKAGE: 'Fetching package from MKT Server',
  FETCH_PACKAGES_BY_PRODUCT: 'Fetching packages for product',
  PACKAGE_NOT_FOUND: 'Package not found',

  // Cache operations
  CACHE_HIT: 'Cache hit',
  CACHE_MISS: 'Cache miss',
  CACHE_SET: 'Cache set',
  CACHE_INVALIDATE: 'Cache invalidated',

  // Snapshot operations
  SNAPSHOT_CREATED: 'Snapshot created',
  SNAPSHOT_VERIFIED: 'Snapshot verified',
  SNAPSHOT_CHECKSUM_MISMATCH: 'Snapshot checksum mismatch',

  // Validation
  VALIDATION_START: 'Starting order validation',
  VALIDATION_SUCCESS: 'Order validation successful',
  VALIDATION_FAILED: 'Order validation failed',
} as const;

export const MKT_PRODUCT_ERROR_BUILDER = {
  fetchFailed: (error: string) => `Failed to fetch product: ${error}`,
  fetchPackageFailed: (error: string) => `Failed to fetch package: ${error}`,
  validationFailed: (error: string) => `Validation failed: ${error}`,
  cacheError: (error: string) => `Cache error: ${error}`,
} as const;
