import { z } from 'zod';

// ============================================
// CUSTOM VALIDATORS
// ============================================

/**
 * Validate IP address (IPv4)
 */
const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

/**
 * Validate CIDR notation (IPv4)
 */
const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

/**
 * Validate IP or CIDR
 */
const isValidIpOrCidr = (value: string): boolean => {
  const trimmed = value.trim();

  // Check IPv6 localhost
  if (trimmed === '::1') {
    return true;
  }

  // Check IPv4 or CIDR
  return ipv4Regex.test(trimmed) || cidrRegex.test(trimmed);
};

/**
 * Transform comma-separated IP list to array
 */
const ipListTransform = z
  .string()
  .transform((val) =>
    val
      .split(',')
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0),
  )
  .refine(
    (ips) => ips.every(isValidIpOrCidr),
    'Invalid IP address or CIDR format',
  );

// ============================================
// PAYMENT ENV VALIDATION
// ============================================

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

  // Server URL
  SERVER_URL: z.string().url().optional(),

  // Workspace
  MKT_WORKSPACE_ID: z.string().uuid().optional(),
});

export type PaymentEnvValidation = z.infer<typeof paymentEnvValidation>;

// ============================================
// SECURITY ENV VALIDATION
// ============================================

/**
 * Security Environment Variables Validation Schema
 *
 * Validates IP whitelist and rate limiting configuration
 */
export const securityEnvValidation = z.object({
  // IP Whitelist
  SEPAY_IP_WHITELIST_ENABLED: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  SEPAY_IP_WHITELIST: ipListTransform.optional(),

  // Rate Limiting
  SEPAY_RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  SEPAY_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .positive()
    .max(10000)
    .optional(),
  SEPAY_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(3600000) // Max 1 hour
    .optional(),
});

export type SecurityEnvValidation = z.infer<typeof securityEnvValidation>;

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate and parse security environment variables
 *
 * @returns Parsed and validated security config
 * @throws ZodError if validation fails
 */
export const validateSecurityEnv = (): SecurityEnvValidation => {
  return securityEnvValidation.parse({
    SEPAY_IP_WHITELIST_ENABLED: process.env.SEPAY_IP_WHITELIST_ENABLED,
    SEPAY_IP_WHITELIST: process.env.SEPAY_IP_WHITELIST,
    SEPAY_RATE_LIMIT_ENABLED: process.env.SEPAY_RATE_LIMIT_ENABLED,
    SEPAY_RATE_LIMIT_MAX: process.env.SEPAY_RATE_LIMIT_MAX,
    SEPAY_RATE_LIMIT_WINDOW_MS: process.env.SEPAY_RATE_LIMIT_WINDOW_MS,
  });
};

/**
 * Safe validate security environment variables (no throw)
 *
 * @returns Parsed config or null if validation fails
 */
export const safeValidateSecurityEnv = (): SecurityEnvValidation | null => {
  const result = securityEnvValidation.safeParse({
    SEPAY_IP_WHITELIST_ENABLED: process.env.SEPAY_IP_WHITELIST_ENABLED,
    SEPAY_IP_WHITELIST: process.env.SEPAY_IP_WHITELIST,
    SEPAY_RATE_LIMIT_ENABLED: process.env.SEPAY_RATE_LIMIT_ENABLED,
    SEPAY_RATE_LIMIT_MAX: process.env.SEPAY_RATE_LIMIT_MAX,
    SEPAY_RATE_LIMIT_WINDOW_MS: process.env.SEPAY_RATE_LIMIT_WINDOW_MS,
  });

  return result.success ? result.data : null;
};
