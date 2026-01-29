import { z } from 'zod';

import { MKT_AUTH_DEFAULTS } from 'src/mkt-core/mkt-auth-client/constants/mkt-auth-client.constant';

// ============================================
// HELPER SCHEMAS
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
 * Zod schema for positive number (float) environment variables
 */
const positiveNumberEnvSchema = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : defaultValue))
    .refine((val) => val > 0, { message: 'Must be a positive number' });

/**
 * Zod schema for required string environment variables
 */
const requiredStringEnvSchema = z
  .string()
  .min(1, 'Required string cannot be empty');

/**
 * Zod schema for comma-separated integer list
 */
const intListEnvSchema = (defaultValue: readonly number[]) =>
  z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val.split(',').map((s) => parseInt(s.trim(), 10))
        : [...defaultValue],
    );

// ============================================
// CONFIG SCHEMAS
// ============================================

/**
 * Token configuration schema
 */
export const MktAuthTokenConfigSchema = z.object({
  MKT_AUTH_TOKEN_SERVER_TTL_MS: positiveIntEnvSchema(
    MKT_AUTH_DEFAULTS.TOKEN.SERVER_TTL_MS,
  ),
  MKT_AUTH_TOKEN_BUFFER_MS: positiveIntEnvSchema(
    MKT_AUTH_DEFAULTS.TOKEN.BUFFER_MS,
  ),
});

/**
 * Cache configuration schema
 */
export const MktAuthCacheConfigSchema = z.object({
  MKT_AUTH_CACHE_LOCAL_TTL_MS: positiveIntEnvSchema(
    MKT_AUTH_DEFAULTS.CACHE.LOCAL_TTL_MS,
  ),
});

/**
 * Retry configuration schema
 */
export const MktAuthRetryConfigSchema = z.object({
  MKT_AUTH_RETRY_MAX_ATTEMPTS: positiveIntEnvSchema(
    MKT_AUTH_DEFAULTS.RETRY.MAX_ATTEMPTS,
  ),
  MKT_AUTH_RETRY_INITIAL_DELAY_MS: positiveIntEnvSchema(
    MKT_AUTH_DEFAULTS.RETRY.INITIAL_DELAY_MS,
  ),
  MKT_AUTH_RETRY_MAX_DELAY_MS: positiveIntEnvSchema(
    MKT_AUTH_DEFAULTS.RETRY.MAX_DELAY_MS,
  ),
  MKT_AUTH_RETRY_BACKOFF_MULTIPLIER: positiveNumberEnvSchema(
    MKT_AUTH_DEFAULTS.RETRY.BACKOFF_MULTIPLIER,
  ),
  MKT_AUTH_RETRY_STATUS_CODES: intListEnvSchema(
    MKT_AUTH_DEFAULTS.RETRY.RETRYABLE_STATUS_CODES,
  ),
});

/**
 * Jitter configuration schema
 */
export const MktAuthJitterConfigSchema = z.object({
  MKT_AUTH_JITTER_ENABLED: booleanEnvSchema(MKT_AUTH_DEFAULTS.JITTER.ENABLED),
  MKT_AUTH_JITTER_MIN_MS: positiveIntEnvSchema(MKT_AUTH_DEFAULTS.JITTER.MIN_MS),
  MKT_AUTH_JITTER_MAX_MS: positiveIntEnvSchema(MKT_AUTH_DEFAULTS.JITTER.MAX_MS),
});

/**
 * Circuit breaker configuration schema
 */
export const MktAuthCircuitBreakerConfigSchema = z.object({
  MKT_AUTH_CIRCUIT_BREAKER_ENABLED: booleanEnvSchema(
    MKT_AUTH_DEFAULTS.CIRCUIT_BREAKER.ENABLED,
  ),
  MKT_AUTH_CIRCUIT_BREAKER_FAILURE_THRESHOLD: positiveIntEnvSchema(
    MKT_AUTH_DEFAULTS.CIRCUIT_BREAKER.FAILURE_THRESHOLD,
  ),
  MKT_AUTH_CIRCUIT_BREAKER_RESET_TIMEOUT_MS: positiveIntEnvSchema(
    MKT_AUTH_DEFAULTS.CIRCUIT_BREAKER.RESET_TIMEOUT_MS,
  ),
  MKT_AUTH_CIRCUIT_BREAKER_HALF_OPEN_MAX_ATTEMPTS: positiveIntEnvSchema(
    MKT_AUTH_DEFAULTS.CIRCUIT_BREAKER.HALF_OPEN_MAX_ATTEMPTS,
  ),
});

/**
 * Lock configuration schema
 */
export const MktAuthLockConfigSchema = z.object({
  MKT_AUTH_LOCK_TIMEOUT_MS: positiveIntEnvSchema(
    MKT_AUTH_DEFAULTS.LOCK.TIMEOUT_MS,
  ),
  MKT_AUTH_LOCK_MAX_WAIT_MS: positiveIntEnvSchema(
    MKT_AUTH_DEFAULTS.LOCK.MAX_WAIT_MS,
  ),
  MKT_AUTH_LOCK_RETRY_INTERVAL_MS: positiveIntEnvSchema(
    MKT_AUTH_DEFAULTS.LOCK.RETRY_INTERVAL_MS,
  ),
});

/**
 * Main configuration schema
 */
export const MktAuthClientConfigSchema = z.object({
  // Base URL and credentials (required)
  MKT_SERVER_BASE_URL: requiredStringEnvSchema,
  MKT_AUTH_EMAIL: requiredStringEnvSchema,
  MKT_AUTH_PASSWORD: requiredStringEnvSchema,

  // Token configuration
  ...MktAuthTokenConfigSchema.shape,

  // Cache configuration
  ...MktAuthCacheConfigSchema.shape,

  // Retry configuration
  ...MktAuthRetryConfigSchema.shape,

  // Jitter configuration
  ...MktAuthJitterConfigSchema.shape,

  // Circuit breaker configuration
  ...MktAuthCircuitBreakerConfigSchema.shape,

  // Lock configuration
  ...MktAuthLockConfigSchema.shape,
});

export type MktAuthClientEnvConfig = z.infer<typeof MktAuthClientConfigSchema>;

// ============================================
// PARSE & VALIDATE
// ============================================

/**
 * Parse and validate environment variables
 * Returns validated config or throws on critical errors
 */
export function parseMktAuthClientConfig(): MktAuthClientEnvConfig {
  const envConfig = {
    // Required
    MKT_SERVER_BASE_URL: process.env.MKT_SERVER_BASE_URL,
    MKT_AUTH_EMAIL: process.env.MKT_AUTH_EMAIL,
    MKT_AUTH_PASSWORD: process.env.MKT_AUTH_PASSWORD,

    // Token
    MKT_AUTH_TOKEN_SERVER_TTL_MS: process.env.MKT_AUTH_TOKEN_SERVER_TTL_MS,
    MKT_AUTH_TOKEN_BUFFER_MS: process.env.MKT_AUTH_TOKEN_BUFFER_MS,

    // Cache
    MKT_AUTH_CACHE_LOCAL_TTL_MS: process.env.MKT_AUTH_CACHE_LOCAL_TTL_MS,

    // Retry
    MKT_AUTH_RETRY_MAX_ATTEMPTS: process.env.MKT_AUTH_RETRY_MAX_ATTEMPTS,
    MKT_AUTH_RETRY_INITIAL_DELAY_MS:
      process.env.MKT_AUTH_RETRY_INITIAL_DELAY_MS,
    MKT_AUTH_RETRY_MAX_DELAY_MS: process.env.MKT_AUTH_RETRY_MAX_DELAY_MS,
    MKT_AUTH_RETRY_BACKOFF_MULTIPLIER:
      process.env.MKT_AUTH_RETRY_BACKOFF_MULTIPLIER,
    MKT_AUTH_RETRY_STATUS_CODES: process.env.MKT_AUTH_RETRY_STATUS_CODES,

    // Jitter
    MKT_AUTH_JITTER_ENABLED: process.env.MKT_AUTH_JITTER_ENABLED,
    MKT_AUTH_JITTER_MIN_MS: process.env.MKT_AUTH_JITTER_MIN_MS,
    MKT_AUTH_JITTER_MAX_MS: process.env.MKT_AUTH_JITTER_MAX_MS,

    // Circuit breaker
    MKT_AUTH_CIRCUIT_BREAKER_ENABLED:
      process.env.MKT_AUTH_CIRCUIT_BREAKER_ENABLED,
    MKT_AUTH_CIRCUIT_BREAKER_FAILURE_THRESHOLD:
      process.env.MKT_AUTH_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    MKT_AUTH_CIRCUIT_BREAKER_RESET_TIMEOUT_MS:
      process.env.MKT_AUTH_CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
    MKT_AUTH_CIRCUIT_BREAKER_HALF_OPEN_MAX_ATTEMPTS:
      process.env.MKT_AUTH_CIRCUIT_BREAKER_HALF_OPEN_MAX_ATTEMPTS,

    // Lock
    MKT_AUTH_LOCK_TIMEOUT_MS: process.env.MKT_AUTH_LOCK_TIMEOUT_MS,
    MKT_AUTH_LOCK_MAX_WAIT_MS: process.env.MKT_AUTH_LOCK_MAX_WAIT_MS,
    MKT_AUTH_LOCK_RETRY_INTERVAL_MS:
      process.env.MKT_AUTH_LOCK_RETRY_INTERVAL_MS,
  };

  const result = MktAuthClientConfigSchema.safeParse(envConfig);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;

    // Check if required fields are missing
    const requiredFields = [
      'MKT_SERVER_BASE_URL',
      'MKT_AUTH_EMAIL',
      'MKT_AUTH_PASSWORD',
    ];
    const missingRequired = requiredFields.filter(
      (field) => errors[field as keyof typeof errors],
    );

    if (missingRequired.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        '[MktAuthClientConfig] Missing required environment variables:',
        missingRequired,
      );
      // eslint-disable-next-line no-console
      console.error('[MktAuthClientConfig] Module will be disabled');

      // Return config with empty required fields - module should handle gracefully
      return {
        MKT_SERVER_BASE_URL: '',
        MKT_AUTH_EMAIL: '',
        MKT_AUTH_PASSWORD: '',
        ...getDefaultOptionalConfig(),
      } as MktAuthClientEnvConfig;
    }

    // eslint-disable-next-line no-console
    console.warn(
      '[MktAuthClientConfig] Invalid environment variables (using defaults):',
      errors,
    );
  }

  return result.success
    ? result.data
    : (envConfig as unknown as MktAuthClientEnvConfig);
}

/**
 * Get default values for optional configuration
 */
function getDefaultOptionalConfig() {
  return {
    MKT_AUTH_TOKEN_SERVER_TTL_MS: MKT_AUTH_DEFAULTS.TOKEN.SERVER_TTL_MS,
    MKT_AUTH_TOKEN_BUFFER_MS: MKT_AUTH_DEFAULTS.TOKEN.BUFFER_MS,
    MKT_AUTH_CACHE_LOCAL_TTL_MS: MKT_AUTH_DEFAULTS.CACHE.LOCAL_TTL_MS,
    MKT_AUTH_RETRY_MAX_ATTEMPTS: MKT_AUTH_DEFAULTS.RETRY.MAX_ATTEMPTS,
    MKT_AUTH_RETRY_INITIAL_DELAY_MS: MKT_AUTH_DEFAULTS.RETRY.INITIAL_DELAY_MS,
    MKT_AUTH_RETRY_MAX_DELAY_MS: MKT_AUTH_DEFAULTS.RETRY.MAX_DELAY_MS,
    MKT_AUTH_RETRY_BACKOFF_MULTIPLIER:
      MKT_AUTH_DEFAULTS.RETRY.BACKOFF_MULTIPLIER,
    MKT_AUTH_RETRY_STATUS_CODES: [
      ...MKT_AUTH_DEFAULTS.RETRY.RETRYABLE_STATUS_CODES,
    ],
    MKT_AUTH_JITTER_ENABLED: MKT_AUTH_DEFAULTS.JITTER.ENABLED,
    MKT_AUTH_JITTER_MIN_MS: MKT_AUTH_DEFAULTS.JITTER.MIN_MS,
    MKT_AUTH_JITTER_MAX_MS: MKT_AUTH_DEFAULTS.JITTER.MAX_MS,
    MKT_AUTH_CIRCUIT_BREAKER_ENABLED: MKT_AUTH_DEFAULTS.CIRCUIT_BREAKER.ENABLED,
    MKT_AUTH_CIRCUIT_BREAKER_FAILURE_THRESHOLD:
      MKT_AUTH_DEFAULTS.CIRCUIT_BREAKER.FAILURE_THRESHOLD,
    MKT_AUTH_CIRCUIT_BREAKER_RESET_TIMEOUT_MS:
      MKT_AUTH_DEFAULTS.CIRCUIT_BREAKER.RESET_TIMEOUT_MS,
    MKT_AUTH_CIRCUIT_BREAKER_HALF_OPEN_MAX_ATTEMPTS:
      MKT_AUTH_DEFAULTS.CIRCUIT_BREAKER.HALF_OPEN_MAX_ATTEMPTS,
    MKT_AUTH_LOCK_TIMEOUT_MS: MKT_AUTH_DEFAULTS.LOCK.TIMEOUT_MS,
    MKT_AUTH_LOCK_MAX_WAIT_MS: MKT_AUTH_DEFAULTS.LOCK.MAX_WAIT_MS,
    MKT_AUTH_LOCK_RETRY_INTERVAL_MS: MKT_AUTH_DEFAULTS.LOCK.RETRY_INTERVAL_MS,
  };
}

// ============================================
// CONFIG FACTORY (for NestJS ConfigModule)
// ============================================

/**
 * Configuration factory for NestJS registerAs pattern
 *
 * Usage in module:
 * ```typescript
 * ConfigModule.forRoot({
 *   load: [mktAuthClientConfigFactory],
 * })
 * ```
 *
 * Then inject:
 * ```typescript
 * constructor(
 *   @Inject(MKT_AUTH_CLIENT_CONFIG_KEY)
 *   private readonly config: MktAuthClientConfig,
 * ) {}
 * ```
 */
export const MKT_AUTH_CLIENT_CONFIG_KEY = 'mktAuthClient';

export function mktAuthClientConfigFactory() {
  const env = parseMktAuthClientConfig();

  return {
    baseUrl: env.MKT_SERVER_BASE_URL,
    credentials: {
      email: env.MKT_AUTH_EMAIL,
      password: env.MKT_AUTH_PASSWORD,
    },
    token: {
      serverTtlMs: env.MKT_AUTH_TOKEN_SERVER_TTL_MS,
      bufferMs: env.MKT_AUTH_TOKEN_BUFFER_MS,
    },
    cache: {
      localTtlMs: env.MKT_AUTH_CACHE_LOCAL_TTL_MS,
    },
    retry: {
      maxAttempts: env.MKT_AUTH_RETRY_MAX_ATTEMPTS,
      initialDelayMs: env.MKT_AUTH_RETRY_INITIAL_DELAY_MS,
      maxDelayMs: env.MKT_AUTH_RETRY_MAX_DELAY_MS,
      backoffMultiplier: env.MKT_AUTH_RETRY_BACKOFF_MULTIPLIER,
      retryableStatusCodes: env.MKT_AUTH_RETRY_STATUS_CODES,
    },
    jitter: {
      enabled: env.MKT_AUTH_JITTER_ENABLED,
      minMs: env.MKT_AUTH_JITTER_MIN_MS,
      maxMs: env.MKT_AUTH_JITTER_MAX_MS,
    },
    circuitBreaker: {
      enabled: env.MKT_AUTH_CIRCUIT_BREAKER_ENABLED,
      failureThreshold: env.MKT_AUTH_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
      resetTimeoutMs: env.MKT_AUTH_CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
      halfOpenMaxAttempts: env.MKT_AUTH_CIRCUIT_BREAKER_HALF_OPEN_MAX_ATTEMPTS,
    },
    lock: {
      timeoutMs: env.MKT_AUTH_LOCK_TIMEOUT_MS,
      maxWaitMs: env.MKT_AUTH_LOCK_MAX_WAIT_MS,
      retryIntervalMs: env.MKT_AUTH_LOCK_RETRY_INTERVAL_MS,
    },
  };
}

export type MktAuthClientConfigFactoryResult = ReturnType<
  typeof mktAuthClientConfigFactory
>;
