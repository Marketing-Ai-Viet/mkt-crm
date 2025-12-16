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
