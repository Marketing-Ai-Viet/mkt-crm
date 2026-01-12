/**
 * RBAC Configuration Schemas
 *
 * Zod schemas for RBAC module configuration with validation
 */

import { z } from 'zod';

import { CASBIN_CACHE_TTL } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/constants/cache-keys.constant';

// ============================================
// HELPER SCHEMAS
// ============================================

/**
 * Schema for parsing boolean from environment variable
 */
const envBooleanSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (val === undefined || val === '') {
      return undefined;
    }

    return val.toLowerCase() === 'true';
  });

/**
 * Schema for parsing number from environment variable
 */
const envNumberSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (val === undefined || val === '') {
      return undefined;
    }

    const parsed = parseInt(val, 10);

    return isNaN(parsed) ? undefined : parsed;
  });

/**
 * Schema for parsing comma-separated string array from environment variable
 */
const envStringArraySchema = z
  .string()
  .optional()
  .transform((val) => {
    if (val === undefined || val.trim() === '') {
      return [];
    }

    return val.split(',').map((s) => s.trim());
  });

// ============================================
// CONFIG SCHEMAS
// ============================================

/**
 * Cache warmer configuration schema
 */
export const rbacCacheWarmerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  warmOnStartup: z.boolean().default(true),
  concurrency: z.number().int().positive().default(5),
  priorityWorkspaces: z.array(z.string()).default([]),
});

/**
 * Policy sync configuration schema
 */
export const rbacSyncConfigSchema = z.object({
  maxRetries: z.number().int().positive().default(3),
  retryDelayMs: z.number().int().positive().default(1000),
  debounceMs: z.number().int().nonnegative().default(500),
  maxPoliciesPerWorkspace: z.number().int().positive().default(10000),
});

/**
 * Enforcer configuration schema
 */
export const rbacEnforcerConfigSchema = z.object({
  failClosed: z.boolean().default(true),
  cacheEnabled: z.boolean().default(true),
  maxEnforcersInMemory: z.number().int().positive().default(100),
  enforcerTtlMs: z
    .number()
    .int()
    .positive()
    .default(CASBIN_CACHE_TTL.ENFORCER * 1000),
});

/**
 * Pub/Sub configuration schema
 */
export const rbacPubSubConfigSchema = z.object({
  enabled: z.boolean().default(true),
  fallbackReloadIntervalMs: z.number().int().positive().default(3600000),
  debounceMs: z.number().int().nonnegative().default(100),
  maxMessageAgeMs: z.number().int().positive().default(300000),
  reconnectDelayMs: z.number().int().positive().default(1000),
  maxReconnectAttempts: z.number().int().positive().default(10),
});

/**
 * Complete RBAC module configuration schema
 */
export const casbinRbacConfigSchema = z.object({
  cacheWarmer: rbacCacheWarmerConfigSchema,
  sync: rbacSyncConfigSchema,
  enforcer: rbacEnforcerConfigSchema,
  pubsub: rbacPubSubConfigSchema,
});

// ============================================
// ENVIRONMENT SCHEMA
// ============================================

/**
 * Environment variables schema for RBAC configuration
 *
 * Maps environment variables to config properties with validation
 */
export const rbacEnvSchema = z.object({
  // Cache warmer
  RBAC_CACHE_WARM_ENABLED: envBooleanSchema,
  RBAC_CACHE_WARM_ON_STARTUP: envBooleanSchema,
  RBAC_CACHE_WARM_CONCURRENCY: envNumberSchema,
  RBAC_PRIORITY_WORKSPACES: envStringArraySchema,

  // Sync
  RBAC_SYNC_MAX_RETRIES: envNumberSchema,
  RBAC_SYNC_RETRY_DELAY_MS: envNumberSchema,
  RBAC_SYNC_DEBOUNCE_MS: envNumberSchema,
  RBAC_MAX_POLICIES_PER_WORKSPACE: envNumberSchema,

  // Enforcer
  RBAC_FAIL_CLOSED: envBooleanSchema,
  RBAC_CACHE_ENABLED: envBooleanSchema,
  RBAC_MAX_ENFORCERS_IN_MEMORY: envNumberSchema,
  RBAC_ENFORCER_TTL_MS: envNumberSchema,

  // PubSub
  RBAC_MULTI_REGION_ENABLED: envBooleanSchema,
  RBAC_FALLBACK_RELOAD_INTERVAL_MS: envNumberSchema,
  RBAC_INVALIDATION_DEBOUNCE_MS: envNumberSchema,
  RBAC_PUBSUB_MAX_MESSAGE_AGE_MS: envNumberSchema,
  RBAC_PUBSUB_RECONNECT_DELAY_MS: envNumberSchema,
  RBAC_PUBSUB_MAX_RECONNECT_ATTEMPTS: envNumberSchema,
});

// ============================================
// INFERRED TYPES
// ============================================

export type RbacCacheWarmerConfig = z.infer<typeof rbacCacheWarmerConfigSchema>;
export type RbacSyncConfig = z.infer<typeof rbacSyncConfigSchema>;
export type RbacEnforcerConfig = z.infer<typeof rbacEnforcerConfigSchema>;
export type RbacPubSubConfig = z.infer<typeof rbacPubSubConfigSchema>;
export type CasbinRbacConfig = z.infer<typeof casbinRbacConfigSchema>;
export type RbacEnvConfig = z.infer<typeof rbacEnvSchema>;

// ============================================
// VALIDATION FUNCTION
// ============================================

/**
 * Parse and validate environment variables for RBAC configuration
 *
 * @param env - Process environment variables
 * @returns Validated and transformed RBAC configuration
 * @throws ZodError if validation fails
 */
export const parseRbacEnv = (
  env: NodeJS.ProcessEnv = process.env,
): RbacEnvConfig => {
  return rbacEnvSchema.parse(env);
};

/**
 * Build RBAC configuration from environment variables
 *
 * Uses Zod schemas to validate and transform environment variables
 * into a fully typed configuration object with defaults.
 *
 * @param env - Process environment variables
 * @returns Complete RBAC configuration
 */
export const buildRbacConfig = (
  env: NodeJS.ProcessEnv = process.env,
): CasbinRbacConfig => {
  const parsedEnv = parseRbacEnv(env);

  const cacheWarmer = rbacCacheWarmerConfigSchema.parse({
    enabled: parsedEnv.RBAC_CACHE_WARM_ENABLED,
    warmOnStartup: parsedEnv.RBAC_CACHE_WARM_ON_STARTUP,
    concurrency: parsedEnv.RBAC_CACHE_WARM_CONCURRENCY,
    priorityWorkspaces: parsedEnv.RBAC_PRIORITY_WORKSPACES,
  });

  const sync = rbacSyncConfigSchema.parse({
    maxRetries: parsedEnv.RBAC_SYNC_MAX_RETRIES,
    retryDelayMs: parsedEnv.RBAC_SYNC_RETRY_DELAY_MS,
    debounceMs: parsedEnv.RBAC_SYNC_DEBOUNCE_MS,
    maxPoliciesPerWorkspace: parsedEnv.RBAC_MAX_POLICIES_PER_WORKSPACE,
  });

  const enforcer = rbacEnforcerConfigSchema.parse({
    failClosed: parsedEnv.RBAC_FAIL_CLOSED,
    cacheEnabled: parsedEnv.RBAC_CACHE_ENABLED,
    maxEnforcersInMemory: parsedEnv.RBAC_MAX_ENFORCERS_IN_MEMORY,
    enforcerTtlMs: parsedEnv.RBAC_ENFORCER_TTL_MS,
  });

  const pubsub = rbacPubSubConfigSchema.parse({
    enabled: parsedEnv.RBAC_MULTI_REGION_ENABLED,
    fallbackReloadIntervalMs: parsedEnv.RBAC_FALLBACK_RELOAD_INTERVAL_MS,
    debounceMs: parsedEnv.RBAC_INVALIDATION_DEBOUNCE_MS,
    maxMessageAgeMs: parsedEnv.RBAC_PUBSUB_MAX_MESSAGE_AGE_MS,
    reconnectDelayMs: parsedEnv.RBAC_PUBSUB_RECONNECT_DELAY_MS,
    maxReconnectAttempts: parsedEnv.RBAC_PUBSUB_MAX_RECONNECT_ATTEMPTS,
  });

  return { cacheWarmer, sync, enforcer, pubsub };
};
