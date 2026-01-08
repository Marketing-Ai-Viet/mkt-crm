/**
 * Constants for Generic Combo module
 *
 * Uses centralized cache configuration from infrastructure/redis
 */

import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';
import {
  CACHE_TTL,
  COMBO_CACHE_PREFIX,
} from 'src/mkt-core/infrastructure/redis/constants';

// ============================================
// COMBO ITEM TYPE
// ============================================

/**
 * Các loại item trong combo:
 * - DIGITAL_EXTERNAL: Sản phẩm số từ MKT Server (bán theo package)
 *   + Yêu cầu externalPackageId (bắt buộc)
 *   + externalProductId optional (lấy tự động từ package.productId)
 * - INTERNAL_PRODUCT: Sản phẩm trong CRM (deprecated - dùng DIGITAL_EXTERNAL)
 * - INTERNAL_VARIANT: Variant trong CRM (deprecated - dùng DIGITAL_EXTERNAL)
 * - SERVICE: Dịch vụ (serviceName, servicePrice)
 * - CUSTOM: Item tùy chỉnh (customName, customPrice)
 */
export const COMBO_ITEM_TYPE = {
  DIGITAL_EXTERNAL: 'DIGITAL_EXTERNAL',
  INTERNAL_PRODUCT: 'INTERNAL_PRODUCT',
  INTERNAL_VARIANT: 'INTERNAL_VARIANT',
  SERVICE: 'SERVICE',
  CUSTOM: 'CUSTOM',
} as const;

export type ComboItemType =
  (typeof COMBO_ITEM_TYPE)[keyof typeof COMBO_ITEM_TYPE];

export const COMBO_ITEM_TYPE_OPTIONS = [
  {
    value: COMBO_ITEM_TYPE.DIGITAL_EXTERNAL,
    label: 'Digital Package (External)',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: COMBO_ITEM_TYPE.INTERNAL_PRODUCT,
    label: 'Internal Product',
    color: 'green' as TagColor,
    position: 1,
  },
  {
    value: COMBO_ITEM_TYPE.INTERNAL_VARIANT,
    label: 'Internal Variant',
    color: 'turquoise' as TagColor,
    position: 2,
  },
  {
    value: COMBO_ITEM_TYPE.SERVICE,
    label: 'Service',
    color: 'purple' as TagColor,
    position: 3,
  },
  {
    value: COMBO_ITEM_TYPE.CUSTOM,
    label: 'Custom Item',
    color: 'orange' as TagColor,
    position: 4,
  },
];

// ============================================
// PRICING TYPE (same as digital combo)
// ============================================

export const GENERIC_COMBO_PRICING_TYPE = {
  FIXED: 'FIXED',
  SUM: 'SUM',
  DISCOUNT: 'DISCOUNT',
} as const;

export type GenericComboPricingType =
  (typeof GENERIC_COMBO_PRICING_TYPE)[keyof typeof GENERIC_COMBO_PRICING_TYPE];

export const GENERIC_COMBO_PRICING_TYPE_OPTIONS = [
  {
    value: GENERIC_COMBO_PRICING_TYPE.FIXED,
    label: 'Fixed Price',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: GENERIC_COMBO_PRICING_TYPE.SUM,
    label: 'Sum of Items',
    color: 'green' as TagColor,
    position: 1,
  },
  {
    value: GENERIC_COMBO_PRICING_TYPE.DISCOUNT,
    label: 'Percentage Discount',
    color: 'orange' as TagColor,
    position: 2,
  },
];

// ============================================
// DEFAULT VALUES
// ============================================

export const GENERIC_COMBO_DEFAULTS = {
  CURRENCY: 'VND',
  QUANTITY: 1,
  POSITION: 0,
  IS_ACTIVE: true,
  VERSION: 1,
} as const;

// ============================================
// CACHE CONFIGURATION
// ============================================

export const GENERIC_COMBO_CACHE = {
  /** TTL in seconds (from centralized config) */
  TTL_SECONDS: CACHE_TTL.SHORT, // 5 minutes

  /** Calculation TTL in seconds (from centralized config) */
  CALCULATION_TTL_SECONDS: CACHE_TTL.RATE_LIMIT_WINDOW, // 1 minute

  /** Key prefix (from centralized config) */
  KEY_PREFIX: COMBO_CACHE_PREFIX.DATA,

  /** Calculation cache prefix */
  CALCULATION_PREFIX: COMBO_CACHE_PREFIX.CALCULATION,

  /** Code lookup prefix */
  BY_CODE_PREFIX: COMBO_CACHE_PREFIX.BY_CODE,
} as const;

// ============================================
// LOG CONTEXT
// ============================================

export const GENERIC_COMBO_LOG_CONTEXT = 'MktGenericCombo';

// ============================================
// RETRY CONFIGURATION
// ============================================

export const GENERIC_COMBO_RETRY = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 5000,
} as const;
