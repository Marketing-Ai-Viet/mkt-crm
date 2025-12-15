import { z } from 'zod';

// ============================================
// DEFAULTS
// ============================================

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes

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
 * MKT Product Sync Configuration Schema
 *
 * Environment variables:
 * - MKT_AUTO_SYNC_ENABLED: Enable auto-sync on token acquired (default: true)
 * - MKT_SYNC_ON_STARTUP: Sync on startup after initial token (default: true)
 * - MKT_SYNC_BATCH_SIZE: Batch size for pagination (default: 50)
 * - MKT_SYNC_MIN_INTERVAL_MS: Minimum interval between syncs (default: 300000)
 * - MKT_SYNC_MAX_RETRIES: Max retry attempts for sync (default: 3)
 * - MKT_SYNC_PARALLEL: Enable parallel batch processing (default: true)
 * - MKT_SYNC_INVALIDATE_STALE: Enable stale cache invalidation (default: false)
 */
const mktSyncConfigSchema = z.object({
  MKT_AUTO_SYNC_ENABLED: booleanEnvSchema(true),
  MKT_SYNC_ON_STARTUP: booleanEnvSchema(true),
  MKT_SYNC_BATCH_SIZE: positiveIntEnvSchema(DEFAULT_BATCH_SIZE),
  MKT_SYNC_MIN_INTERVAL_MS: positiveIntEnvSchema(DEFAULT_MIN_SYNC_INTERVAL_MS),
  MKT_SYNC_MAX_RETRIES: positiveIntEnvSchema(DEFAULT_MAX_RETRIES),
  MKT_SYNC_PARALLEL: booleanEnvSchema(true),
  MKT_SYNC_INVALIDATE_STALE: booleanEnvSchema(false),
});

// ============================================
// PARSE & VALIDATE
// ============================================

const parsedEnv = mktSyncConfigSchema.safeParse({
  MKT_AUTO_SYNC_ENABLED: process.env.MKT_AUTO_SYNC_ENABLED,
  MKT_SYNC_ON_STARTUP: process.env.MKT_SYNC_ON_STARTUP,
  MKT_SYNC_BATCH_SIZE: process.env.MKT_SYNC_BATCH_SIZE,
  MKT_SYNC_MIN_INTERVAL_MS: process.env.MKT_SYNC_MIN_INTERVAL_MS,
  MKT_SYNC_MAX_RETRIES: process.env.MKT_SYNC_MAX_RETRIES,
  MKT_SYNC_PARALLEL: process.env.MKT_SYNC_PARALLEL,
  MKT_SYNC_INVALIDATE_STALE: process.env.MKT_SYNC_INVALIDATE_STALE,
});

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error(
    '[MktSyncConfig] Invalid environment variables:',
    parsedEnv.error.flatten().fieldErrors,
  );
}

const validatedEnv = parsedEnv.success
  ? parsedEnv.data
  : mktSyncConfigSchema.parse({}); // Fallback to defaults

// ============================================
// SYNC CONFIGURATION
// ============================================

export const MKT_SYNC_CONFIG = {
  /** Enable auto-sync on token acquired */
  AUTO_SYNC_ENABLED: validatedEnv.MKT_AUTO_SYNC_ENABLED,

  /** Sync on startup (after initial token) */
  SYNC_ON_STARTUP: validatedEnv.MKT_SYNC_ON_STARTUP,

  /** Batch size for pagination */
  BATCH_SIZE: validatedEnv.MKT_SYNC_BATCH_SIZE,

  /** Minimum interval between syncs (default: 5 minutes) */
  MIN_SYNC_INTERVAL_MS: validatedEnv.MKT_SYNC_MIN_INTERVAL_MS,

  /** Max retry attempts for sync */
  MAX_RETRY_ATTEMPTS: validatedEnv.MKT_SYNC_MAX_RETRIES,

  /** Enable parallel batch processing */
  PARALLEL_BATCH_PROCESSING: validatedEnv.MKT_SYNC_PARALLEL,

  /** Enable stale cache invalidation */
  ENABLE_STALE_INVALIDATION: validatedEnv.MKT_SYNC_INVALIDATE_STALE,
} as const;

export type MktSyncConfigType = typeof MKT_SYNC_CONFIG;

// ============================================
// SYNC LOCK CONFIGURATION
// ============================================

export const MKT_SYNC_LOCK_CONFIG = {
  /** Lock key for distributed sync lock */
  KEY: 'mkt:product:sync:lock',

  /** Lock TTL in milliseconds (10 minutes) */
  TTL_MS: DEFAULT_LOCK_TTL_MS,
} as const;

// ============================================
// REQUIRED SCOPES FOR SYNC
// ============================================

export const MKT_SYNC_REQUIRED_SCOPES = [
  'products:read',
  'product-packages:read',
] as const;

export type MktSyncRequiredScope = (typeof MKT_SYNC_REQUIRED_SCOPES)[number];
