import { createModuleMessages } from 'src/mkt-core/common/messages';

// ============================================
// PRODUCT MESSAGES
// ============================================

export const MKT_PRODUCT_MESSAGES = createModuleMessages({
  entityName: 'Product',
  entityNamePlural: 'Products',
  customSuccess: {
    CACHED: 'Product cached successfully',
    SNAPSHOT_CREATED: 'Product snapshot created',
    SNAPSHOT_VERIFIED: 'Product snapshot verified',
  },
  customError: {
    SNAPSHOT_CHECKSUM_MISMATCH: 'Product snapshot checksum mismatch',
  },
  customOperation: {
    FETCH_FROM_MKT: 'Fetching product from MKT Server',
    FETCH_BY_CODE: 'Fetching product by code from MKT Server',
    FETCH_LIST_FROM_MKT: 'Fetching products list from MKT Server',
  },
});

// ============================================
// PACKAGE MESSAGES
// ============================================

export const MKT_PACKAGE_MESSAGES = createModuleMessages({
  entityName: 'Package',
  entityNamePlural: 'Packages',
  customOperation: {
    FETCH_FROM_MKT: 'Fetching package from MKT Server',
    FETCH_BY_PRODUCT: 'Fetching packages for product',
  },
});

// ============================================
// CACHE MESSAGES
// ============================================

export const MKT_CACHE_MESSAGES = createModuleMessages({
  entityName: 'Cache',
  customSuccess: {
    HIT: 'Cache hit',
    SET: 'Cache set successfully',
    INVALIDATED: 'Cache invalidated successfully',
  },
  customInfo: {
    MISS: 'Cache miss',
  },
});

// ============================================
// ORDER VALIDATION MESSAGES
// ============================================

export const MKT_ORDER_VALIDATION_MESSAGES = createModuleMessages({
  entityName: 'Order validation',
  customSuccess: {
    PASSED: 'Order validation successful',
  },
  customError: {
    FAILED: 'Order validation failed',
  },
  customOperation: {
    START: 'Starting order validation',
  },
});
