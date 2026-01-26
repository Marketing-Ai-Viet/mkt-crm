import { Logger } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

import { safeValidateSecurityEnv } from './payment-config.validation';

// ============================================
// TYPES
// ============================================

/**
 * IP Whitelist configuration
 */
export type IpWhitelistConfig = {
  /** Whether IP whitelist is enabled */
  enabled: boolean;
  /** List of allowed IP addresses or CIDR ranges */
  addresses: string[];
};

/**
 * Rate limiting configuration
 */
export type RateLimitConfig = {
  /** Whether rate limiting is enabled */
  enabled: boolean;
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
};

/**
 * Complete security configuration
 */
export type PaymentSecurityConfig = {
  ipWhitelist: IpWhitelistConfig;
  rateLimit: RateLimitConfig;
};

// ============================================
// DEFAULTS
// ============================================

/**
 * Default SEPay IP whitelist
 * Note: These are example IPs - verify with SEPay support for production
 */
const DEFAULT_SEPAY_IP_WHITELIST: string[] = [
  // SEPay production IPs (example - verify with SEPay)
  '103.146.20.0/24',
  '103.146.21.0/24',
  // Localhost for development
  '127.0.0.1',
  '::1',
];

const SECURITY_DEFAULTS = {
  IP_WHITELIST_ENABLED: false, // Disabled by default for development
  RATE_LIMIT_ENABLED: true,
  RATE_LIMIT_MAX_REQUESTS: 100,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
} as const;

// ============================================
// CONFIG BUILDERS WITH ZOD VALIDATION
// ============================================

const logger = new Logger('SecurityConfig');

/**
 * Build security config with Zod validation
 */
const buildSecurityConfig = (): PaymentSecurityConfig => {
  const validated = safeValidateSecurityEnv();

  if (!validated) {
    logger.warn(
      'Security env validation failed, using defaults. Check SEPAY_IP_WHITELIST format.',
    );

    return {
      ipWhitelist: {
        enabled: SECURITY_DEFAULTS.IP_WHITELIST_ENABLED,
        addresses: DEFAULT_SEPAY_IP_WHITELIST,
      },
      rateLimit: {
        enabled: SECURITY_DEFAULTS.RATE_LIMIT_ENABLED,
        maxRequests: SECURITY_DEFAULTS.RATE_LIMIT_MAX_REQUESTS,
        windowMs: SECURITY_DEFAULTS.RATE_LIMIT_WINDOW_MS,
      },
    };
  }

  return {
    ipWhitelist: {
      enabled:
        validated.SEPAY_IP_WHITELIST_ENABLED ??
        SECURITY_DEFAULTS.IP_WHITELIST_ENABLED,
      addresses: validated.SEPAY_IP_WHITELIST ?? DEFAULT_SEPAY_IP_WHITELIST,
    },
    rateLimit: {
      enabled:
        validated.SEPAY_RATE_LIMIT_ENABLED ??
        SECURITY_DEFAULTS.RATE_LIMIT_ENABLED,
      maxRequests:
        validated.SEPAY_RATE_LIMIT_MAX ??
        SECURITY_DEFAULTS.RATE_LIMIT_MAX_REQUESTS,
      windowMs:
        validated.SEPAY_RATE_LIMIT_WINDOW_MS ??
        SECURITY_DEFAULTS.RATE_LIMIT_WINDOW_MS,
    },
  };
};

// ============================================
// MAIN CONFIG
// ============================================

/**
 * Payment security configuration
 *
 * Registered with NestJS ConfigModule as 'paymentSecurity'
 * Uses Zod validation for environment variables
 *
 * Environment variables:
 * - SEPAY_IP_WHITELIST_ENABLED: Enable IP whitelist (default: false)
 * - SEPAY_IP_WHITELIST: Comma-separated list of allowed IPs/CIDRs
 * - SEPAY_RATE_LIMIT_ENABLED: Enable rate limiting (default: true)
 * - SEPAY_RATE_LIMIT_MAX: Max requests per window (default: 100)
 * - SEPAY_RATE_LIMIT_WINDOW_MS: Time window in ms (default: 60000)
 *
 * @example
 * ```typescript
 * constructor(
 *   @Inject(securityConfig.KEY)
 *   private readonly config: PaymentSecurityConfig,
 * ) {}
 *
 * // Check if IP whitelist is enabled
 * if (this.config.ipWhitelist.enabled) {
 *   // Validate IP
 * }
 * ```
 */
export const securityConfig = registerAs(
  'paymentSecurity',
  buildSecurityConfig,
);

/**
 * Config key for injection
 */
export const SECURITY_CONFIG_KEY = securityConfig.KEY;
