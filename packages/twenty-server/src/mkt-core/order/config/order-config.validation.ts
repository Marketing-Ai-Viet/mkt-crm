import { z } from 'zod';

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
});

export type OrderEnvValidation = z.infer<typeof orderEnvValidation>;
