import { Logger } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

import { z } from 'zod';

// ============================================
// TYPES
// ============================================

/**
 * Partial payment configuration type
 */
export type PartialPaymentConfig = {
  /** Whether partial payment is enabled */
  enabled: boolean;
  /** Auto-confirm threshold percentage (0-100) */
  autoConfirmThreshold: number;
  /** Whether to auto-refund overpayments */
  autoRefundOverpayment: boolean;
  /** Minimum payment amount required */
  minimumPaymentAmount: number;
};

// ============================================
// DEFAULTS
// ============================================

const PARTIAL_PAYMENT_DEFAULTS = {
  ENABLED: true,
  AUTO_CONFIRM_THRESHOLD: 100, // Require 100% payment by default
  AUTO_REFUND_OVERPAYMENT: false, // Require manual review
  MINIMUM_PAYMENT_AMOUNT: 1000, // Minimum 1000 VND
} as const;

// ============================================
// ZOD VALIDATION
// ============================================

/**
 * Environment validation schema for partial payment
 */
const partialPaymentEnvSchema = z.object({
  PARTIAL_PAYMENT_ENABLED: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  PARTIAL_PAYMENT_THRESHOLD: z.coerce.number().min(0).max(100).optional(),
  PARTIAL_PAYMENT_AUTO_REFUND: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  PARTIAL_PAYMENT_MINIMUM_AMOUNT: z.coerce.number().min(0).optional(),
});

type PartialPaymentEnvValidation = z.infer<typeof partialPaymentEnvSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

const logger = new Logger('PartialPaymentConfig');

/**
 * Safe validate partial payment environment variables
 */
const safeValidatePartialPaymentEnv =
  (): PartialPaymentEnvValidation | null => {
    const result = partialPaymentEnvSchema.safeParse({
      PARTIAL_PAYMENT_ENABLED: process.env.PARTIAL_PAYMENT_ENABLED,
      PARTIAL_PAYMENT_THRESHOLD: process.env.PARTIAL_PAYMENT_THRESHOLD,
      PARTIAL_PAYMENT_AUTO_REFUND: process.env.PARTIAL_PAYMENT_AUTO_REFUND,
      PARTIAL_PAYMENT_MINIMUM_AMOUNT:
        process.env.PARTIAL_PAYMENT_MINIMUM_AMOUNT,
    });

    if (!result.success) {
      logger.warn(
        'Partial payment env validation failed:',
        result.error.message,
      );

      return null;
    }

    return result.data;
  };

// ============================================
// CONFIG BUILDER
// ============================================

/**
 * Build partial payment configuration
 */
const buildPartialPaymentConfig = (): PartialPaymentConfig => {
  const validated = safeValidatePartialPaymentEnv();

  if (!validated) {
    return {
      enabled: PARTIAL_PAYMENT_DEFAULTS.ENABLED,
      autoConfirmThreshold: PARTIAL_PAYMENT_DEFAULTS.AUTO_CONFIRM_THRESHOLD,
      autoRefundOverpayment: PARTIAL_PAYMENT_DEFAULTS.AUTO_REFUND_OVERPAYMENT,
      minimumPaymentAmount: PARTIAL_PAYMENT_DEFAULTS.MINIMUM_PAYMENT_AMOUNT,
    };
  }

  return {
    enabled:
      validated.PARTIAL_PAYMENT_ENABLED ?? PARTIAL_PAYMENT_DEFAULTS.ENABLED,
    autoConfirmThreshold:
      validated.PARTIAL_PAYMENT_THRESHOLD ??
      PARTIAL_PAYMENT_DEFAULTS.AUTO_CONFIRM_THRESHOLD,
    autoRefundOverpayment:
      validated.PARTIAL_PAYMENT_AUTO_REFUND ??
      PARTIAL_PAYMENT_DEFAULTS.AUTO_REFUND_OVERPAYMENT,
    minimumPaymentAmount:
      validated.PARTIAL_PAYMENT_MINIMUM_AMOUNT ??
      PARTIAL_PAYMENT_DEFAULTS.MINIMUM_PAYMENT_AMOUNT,
  };
};

// ============================================
// MAIN CONFIG
// ============================================

/**
 * Partial payment configuration
 *
 * Registered with NestJS ConfigModule as 'partialPayment'
 *
 * Environment variables:
 * - PARTIAL_PAYMENT_ENABLED: Enable partial payment support (default: true)
 * - PARTIAL_PAYMENT_THRESHOLD: Auto-confirm threshold percentage (default: 100)
 * - PARTIAL_PAYMENT_AUTO_REFUND: Auto-refund overpayments (default: false)
 * - PARTIAL_PAYMENT_MINIMUM_AMOUNT: Minimum payment amount (default: 1000)
 *
 * @example
 * ```typescript
 * constructor(
 *   @Inject(partialPaymentConfig.KEY)
 *   private readonly config: PartialPaymentConfig,
 * ) {}
 *
 * if (this.config.enabled) {
 *   const shouldConfirm = result.percentagePaid >= this.config.autoConfirmThreshold;
 * }
 * ```
 */
export const partialPaymentConfig = registerAs(
  'partialPayment',
  buildPartialPaymentConfig,
);

/**
 * Config key for injection
 */
export const PARTIAL_PAYMENT_CONFIG_KEY = partialPaymentConfig.KEY;
