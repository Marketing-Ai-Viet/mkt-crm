import { z } from 'zod';

export const oauth2ClientEnvValidation = z.object({
  MKT_API_BASE_URL: z.string().url().optional(),
  MKT_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  MKT_OAUTH_CLIENT_SECRET: z.string().min(32).optional(),
  MKT_OAUTH_SCOPES: z.string().optional(),

  OAUTH2_TOKEN_ENDPOINT: z.string().optional(),
  OAUTH2_INTROSPECT_ENDPOINT: z.string().optional(),
  OAUTH2_REVOKE_ENDPOINT: z.string().optional(),

  OAUTH2_CACHE_LRU_MAX: z.coerce.number().positive().optional(),
  OAUTH2_CACHE_LRU_TTL_MS: z.coerce.number().positive().optional(),
  OAUTH2_CACHE_REDIS_TTL_SECONDS: z.coerce.number().positive().optional(),

  OAUTH2_REFRESH_THRESHOLD_SECONDS: z.coerce.number().positive().optional(),
  OAUTH2_REFRESH_INTERVAL_MS: z.coerce.number().positive().optional(),

  OAUTH2_HTTP_TIMEOUT_MS: z.coerce.number().positive().optional(),
  OAUTH2_HTTP_MAX_RETRIES: z.coerce.number().nonnegative().optional(),
  OAUTH2_HTTP_RETRY_DELAY_MS: z.coerce.number().positive().optional(),

  OAUTH2_RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  OAUTH2_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().positive().optional(),
  OAUTH2_RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().optional(),

  OAUTH2_CIRCUIT_BREAKER_ENABLED: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  OAUTH2_CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce
    .number()
    .positive()
    .optional(),
  OAUTH2_CIRCUIT_BREAKER_RESET_TIMEOUT_MS: z.coerce
    .number()
    .positive()
    .optional(),
  OAUTH2_CIRCUIT_BREAKER_HALF_OPEN_ATTEMPTS: z.coerce
    .number()
    .positive()
    .optional(),

  OAUTH2_JWT_VERIFICATION_ENABLED: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  OAUTH2_JWT_ALGORITHM: z.string().optional(),
  OAUTH2_JWT_PUBLIC_KEY_URL: z.string().url().optional(),
  OAUTH2_JWT_PUBLIC_KEY: z.string().optional(),
  OAUTH2_JWT_ISSUER: z.string().optional(),
  OAUTH2_JWT_AUDIENCE: z.string().optional(),
});

export type OAuth2ClientEnvValidation = z.infer<
  typeof oauth2ClientEnvValidation
>;
