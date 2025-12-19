import { z } from 'zod';

// ============================================
// DEFAULTS
// ============================================

const DEFAULT_CACHE_TTL_SECONDS = 300; // 5 minutes
const DEFAULT_MAX_RULES_PER_PROMOTION = 20;
const DEFAULT_MAX_COUPONS_BULK_CREATE = 1000;
const DEFAULT_EXPIRATION_CHECK_CRON = '0 0 * * * *'; // Every hour
const DEFAULT_COUPON_CODE_LENGTH = 8;

// ============================================
// ZOD SCHEMAS
// ============================================

/**
 * Zod schema for boolean environment variables
 * Converts 'true'/'false' strings to boolean, with default value
 */
const booleanEnvSchema = (defaultValue: boolean) =>
  z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? defaultValue : val === 'true'));

/**
 * Zod schema for positive integer environment variables
 */
const positiveIntEnvSchema = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : defaultValue))
    .refine((val) => val > 0, { message: 'Must be a positive integer' });

/**
 * Zod schema for cron expression environment variables
 */
const cronEnvSchema = (defaultValue: string) =>
  z
    .string()
    .optional()
    .transform((val) => val ?? defaultValue);

/**
 * MKT Promotion Configuration Schema
 *
 * Environment variables:
 * - PROMOTION_CACHE_TTL_SECONDS: Cache TTL in seconds (default: 300)
 * - PROMOTION_MAX_RULES_PER_PROMOTION: Maximum rules per promotion (default: 20)
 * - PROMOTION_MAX_COUPONS_BULK_CREATE: Maximum coupons for bulk creation (default: 1000)
 * - PROMOTION_EXPIRATION_CHECK_ENABLED: Enable expiration check job (default: true)
 * - PROMOTION_EXPIRATION_CHECK_CRON: Cron expression for expiration check (default: every hour)
 * - PROMOTION_COUPON_CODE_LENGTH: Length of generated coupon codes (default: 8)
 */
const promotionConfigSchema = z.object({
  PROMOTION_CACHE_TTL_SECONDS: positiveIntEnvSchema(DEFAULT_CACHE_TTL_SECONDS),
  PROMOTION_MAX_RULES_PER_PROMOTION: positiveIntEnvSchema(
    DEFAULT_MAX_RULES_PER_PROMOTION,
  ),
  PROMOTION_MAX_COUPONS_BULK_CREATE: positiveIntEnvSchema(
    DEFAULT_MAX_COUPONS_BULK_CREATE,
  ),
  PROMOTION_EXPIRATION_CHECK_ENABLED: booleanEnvSchema(true),
  PROMOTION_EXPIRATION_CHECK_CRON: cronEnvSchema(DEFAULT_EXPIRATION_CHECK_CRON),
  PROMOTION_COUPON_CODE_LENGTH: positiveIntEnvSchema(
    DEFAULT_COUPON_CODE_LENGTH,
  ),
});

// ============================================
// PARSE & VALIDATE
// ============================================

const parsedEnv = promotionConfigSchema.safeParse({
  PROMOTION_CACHE_TTL_SECONDS: process.env.PROMOTION_CACHE_TTL_SECONDS,
  PROMOTION_MAX_RULES_PER_PROMOTION:
    process.env.PROMOTION_MAX_RULES_PER_PROMOTION,
  PROMOTION_MAX_COUPONS_BULK_CREATE:
    process.env.PROMOTION_MAX_COUPONS_BULK_CREATE,
  PROMOTION_EXPIRATION_CHECK_ENABLED:
    process.env.PROMOTION_EXPIRATION_CHECK_ENABLED,
  PROMOTION_EXPIRATION_CHECK_CRON: process.env.PROMOTION_EXPIRATION_CHECK_CRON,
  PROMOTION_COUPON_CODE_LENGTH: process.env.PROMOTION_COUPON_CODE_LENGTH,
});

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error(
    '[MktPromotionConfig] Invalid environment variables:',
    parsedEnv.error.flatten().fieldErrors,
  );
}

const validatedEnv = parsedEnv.success
  ? parsedEnv.data
  : promotionConfigSchema.parse({}); // Fallback to defaults

// ============================================
// PROMOTION CONFIGURATION
// ============================================

export const MKT_PROMOTION_CONFIG = {
  /** Cache TTL in seconds (default: 5 minutes) */
  CACHE_TTL_SECONDS: validatedEnv.PROMOTION_CACHE_TTL_SECONDS,

  /** Maximum number of rules per promotion */
  MAX_RULES_PER_PROMOTION: validatedEnv.PROMOTION_MAX_RULES_PER_PROMOTION,

  /** Maximum number of coupons for bulk creation */
  MAX_COUPONS_BULK_CREATE: validatedEnv.PROMOTION_MAX_COUPONS_BULK_CREATE,

  /** Enable promotion expiration check job */
  EXPIRATION_CHECK_ENABLED: validatedEnv.PROMOTION_EXPIRATION_CHECK_ENABLED,

  /** Cron expression for expiration check job (default: every hour) */
  EXPIRATION_CHECK_CRON: validatedEnv.PROMOTION_EXPIRATION_CHECK_CRON,

  /** Length of generated coupon codes */
  COUPON_CODE_LENGTH: validatedEnv.PROMOTION_COUPON_CODE_LENGTH,
} as const;

export type MktPromotionConfigType = typeof MKT_PROMOTION_CONFIG;
