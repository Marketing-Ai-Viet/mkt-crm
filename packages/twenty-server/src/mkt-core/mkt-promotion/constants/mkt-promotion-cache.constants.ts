/**
 * Cache constants for Promotion module
 *
 * Uses centralized cache configuration from infrastructure/redis
 */

import {
  CACHE_TTL,
  PROMOTION_CACHE_PREFIX,
} from 'src/mkt-core/infrastructure/redis/constants';

export const PROMOTION_CACHE = {
  /** TTL in seconds (from centralized config) */
  TTL_SECONDS: CACHE_TTL.SHORT, // 5 minutes

  /** Key prefix (from centralized config) */
  KEY_PREFIX: PROMOTION_CACHE_PREFIX.DATA,

  /** Active promotions key suffix */
  ACTIVE_PROMOTIONS_KEY: 'active',

  /** Promotion by ID prefix */
  PROMOTION_BY_ID_PREFIX: 'data',

  /** Promotion by code prefix */
  PROMOTION_BY_CODE_PREFIX: 'code',
} as const;
