/**
 * Cache constants for Promotion module
 */

export const PROMOTION_CACHE = {
  TTL_SECONDS: 300, // 5 minutes
  KEY_PREFIX: 'mkt-promotion',
  ACTIVE_PROMOTIONS_KEY: 'active-promotions',
  PROMOTION_BY_ID_PREFIX: 'promotion',
  PROMOTION_BY_CODE_PREFIX: 'promotion-code',
} as const;
