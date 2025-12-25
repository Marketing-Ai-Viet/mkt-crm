import { z } from 'zod';

/**
 * Payment Environment Variables Validation Schema
 *
 * Uses Zod to validate environment variables for payment module
 */
export const paymentEnvValidation = z.object({
  // SEPay configuration
  SEPAY_ACC: z.string().optional(),
  SEPAY_BANK: z.string().optional(),
  SEPAY_VA: z.string().optional(),
  SEPAY_AUTH_ENABLED: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  SEPAY_WEBHOOK_API_KEY: z.string().optional(),
  SEPAY_WORKSPACE_ID: z.string().uuid().optional(),

  // BIDV SEPay Business configuration
  IS_BIDV_BUSINESS: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  BIDV_SEPAY_API_URL: z.string().url().optional(),
  BIDV_SEPAY_AUTH_TOKEN: z.string().optional(),
  BIDV_SEPAY_COOKIE: z.string().optional(),

  // Firebase configuration
  FIREBASE_KEY: z.string().optional(),
  FIREBASE_DB_URL: z.string().url().optional(),
  FIREBASE_AUTH_URL: z.string().url().optional(),

  // Server URL
  SERVER_URL: z.string().url().optional(),

  // Workspace
  MKT_WORKSPACE_ID: z.string().uuid().optional(),
});

export type PaymentEnvValidation = z.infer<typeof paymentEnvValidation>;
