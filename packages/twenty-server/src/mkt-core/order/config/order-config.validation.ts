import { z } from 'zod';

import {
  ORDER_TAX_DEFAULTS,
  TAX_VALIDATION,
} from 'src/mkt-core/order/config/order-config.defaults';

/**
 * Order Environment Variables Validation Schema
 *
 * Uses Zod to validate environment variables for order module
 */
export const orderEnvValidation = z.object({
  // Order code configuration
  ORDER_CODE_PREFIX: z.string().optional(),

  // Feature flags
  ORDER_OPTIMISTIC_LOCKING_ENABLED: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),

  // Server URL
  SERVER_URL: z.string().url().optional(),

  // SEPay configuration
  SEPAY_ACC: z.string().optional(),
  SEPAY_BANK: z.string().optional(),
  SEPAY_VA: z.string().optional(),

  // BIDV SEPay Business configuration
  IS_BIDV_BUSINESS: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  BIDV_SEPAY_API_URL: z.string().url().optional(),
  BIDV_SEPAY_AUTH_TOKEN: z.string().optional(),

  // Tax configuration
  MKT_ORDER_TAX_ENABLED: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  MKT_ORDER_TAX_PERCENTAGE: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine(
      (val) =>
        !isNaN(val) &&
        val >= TAX_VALIDATION.MIN_PERCENTAGE &&
        val <= TAX_VALIDATION.MAX_PERCENTAGE,
      {
        message: `Tax percentage must be between ${TAX_VALIDATION.MIN_PERCENTAGE} and ${TAX_VALIDATION.MAX_PERCENTAGE}`,
      },
    )
    .optional(),
});

export type OrderEnvValidation = z.infer<typeof orderEnvValidation>;

/**
 * Validate and parse tax environment variables
 *
 * @returns Validated tax config values
 * @throws ZodError if validation fails
 */
export const validateTaxEnv = (): {
  enabled: boolean;
  percentage: number;
} => {
  const rawEnabled = process.env.MKT_ORDER_TAX_ENABLED;
  const rawPercentage = process.env.MKT_ORDER_TAX_PERCENTAGE;

  // Validate enabled flag
  const enabledSchema = z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => {
      if (val === undefined) {
        return ORDER_TAX_DEFAULTS.ENABLED;
      }

      return val === 'true';
    });

  // Validate percentage
  const percentageSchema = z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) {
        return ORDER_TAX_DEFAULTS.DEFAULT_PERCENTAGE;
      }

      return parseInt(val, 10);
    })
    .refine(
      (val) =>
        !isNaN(val) &&
        val >= TAX_VALIDATION.MIN_PERCENTAGE &&
        val <= TAX_VALIDATION.MAX_PERCENTAGE,
      {
        message: `Tax percentage must be between ${TAX_VALIDATION.MIN_PERCENTAGE} and ${TAX_VALIDATION.MAX_PERCENTAGE}`,
      },
    );

  return {
    enabled: enabledSchema.parse(rawEnabled),
    percentage: percentageSchema.parse(rawPercentage),
  };
};
