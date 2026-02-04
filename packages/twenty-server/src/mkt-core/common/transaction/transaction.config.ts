import { z } from 'zod';

// ============================================
// DEFAULTS
// ============================================

// IMPORTANT: Must be less than pg driver's query_timeout (10000ms in engine)
// If statement_timeout > query_timeout, client disconnects first but PostgreSQL
// transaction stays open as "idle in transaction" (zombie) holding locks indefinitely
const DEFAULT_TIMEOUT_MS = 8000; // 8 seconds (< query_timeout 10s)

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
 * Transaction Configuration Schema
 *
 * Environment variables:
 * - TRANSACTION_ALS_ENABLED: Enable ALS-based transaction binding (default: true)
 *   Repositories in transaction context will use the same database connection.
 * - TRANSACTION_DEFAULT_TIMEOUT_MS: Default transaction timeout in ms (default: 30000)
 */
const transactionConfigSchema = z.object({
  TRANSACTION_ALS_ENABLED: booleanEnvSchema(true),
  TRANSACTION_DEFAULT_TIMEOUT_MS: positiveIntEnvSchema(DEFAULT_TIMEOUT_MS),
});

// ============================================
// PARSE & VALIDATE
// ============================================

const parsedEnv = transactionConfigSchema.safeParse({
  TRANSACTION_ALS_ENABLED: process.env.TRANSACTION_ALS_ENABLED,
  TRANSACTION_DEFAULT_TIMEOUT_MS: process.env.TRANSACTION_DEFAULT_TIMEOUT_MS,
});

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error(
    '[TransactionConfig] Invalid environment variables:',
    parsedEnv.error.flatten().fieldErrors,
  );
}

const validatedEnv = parsedEnv.success
  ? parsedEnv.data
  : transactionConfigSchema.parse({}); // Fallback to defaults

// ============================================
// TRANSACTION CONFIGURATION
// ============================================

export const TRANSACTION_CONFIG = {
  /** Enable ALS-based transaction binding */
  ALS_ENABLED: validatedEnv.TRANSACTION_ALS_ENABLED,

  /** Default transaction timeout in milliseconds */
  DEFAULT_TIMEOUT_MS: validatedEnv.TRANSACTION_DEFAULT_TIMEOUT_MS,
} as const;

export type TransactionConfigType = typeof TRANSACTION_CONFIG;
