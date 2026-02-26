import { z } from 'zod';

import { CACHE_TTL } from 'src/mkt-core/infrastructure/redis/constants';

// ============================================
// INJECTION TOKENS (Symbol-based for type safety)
// ============================================

/**
 * Injection token for Enterprise RBAC Configuration
 *
 * Usage:
 * ```typescript
 * constructor(
 *   @Inject(ENTERPRISE_RBAC_CONFIG_TOKEN)
 *   private readonly config: EnterpriseRbacConfigType,
 * ) {}
 * ```
 */
export const ENTERPRISE_RBAC_CONFIG_TOKEN = Symbol('ENTERPRISE_RBAC_CONFIG');

// ============================================
// DEFAULTS (using centralized cache TTL)
// ============================================

const DEFAULT_CACHE_TTL_SECONDS = CACHE_TTL.MEDIUM; // 10 minutes
const DEFAULT_ENABLE_HIERARCHY_VALIDATION = true;
const DEFAULT_ENABLE_POLICY_ENGINE = true;
const DEFAULT_ENABLE_AUDIT_LOGGING = true;
const DEFAULT_ENABLE_CACHING = true;
const DEFAULT_AUDIT_LOG_RETENTION_DAYS = 90;
const DEFAULT_CACHE_WARMUP_CRON = '0 0 * * * *'; // Every hour
const DEFAULT_AUDIT_CLEANUP_CRON = '0 0 2 * * *'; // Every day at 2 AM
const DEFAULT_TEMPORARY_PERMISSION_CLEANUP_CRON = '0 */15 * * * *'; // Every 15 min

// Phase 2: Feature flags cho PermissionContext flow
const DEFAULT_USE_PERMISSION_CONTEXT = true; // Enabled - PermissionContext flow active
const DEFAULT_FALLBACK_ON_ERROR = true; // Fallback to legacy if new flow fails
const DEFAULT_DEBUG_FILTER_RESOLUTION = false; // Log chi tiết filter resolution

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
 * Zod schema for cron expression environment variables
 */
const cronEnvSchema = (defaultValue: string) =>
  z
    .string()
    .optional()
    .transform((val) => val ?? defaultValue);

/**
 * MKT RBAC Configuration Schema
 *
 * Environment variables:
 * - RBAC_CACHE_TTL_SECONDS: Cache TTL in seconds (default: 600 - 10 minutes)
 * - RBAC_ENABLE_HIERARCHY_VALIDATION: Enable hierarchy validation (default: true)
 * - RBAC_ENABLE_POLICY_ENGINE: Enable policy engine (default: true)
 * - RBAC_ENABLE_AUDIT_LOGGING: Enable audit logging (default: true)
 * - RBAC_ENABLE_CACHING: Enable caching (default: true)
 * - RBAC_AUDIT_LOG_RETENTION_DAYS: Audit log retention days (default: 90)
 * - RBAC_CACHE_WARMUP_CRON: Cache warmup cron expression (default: every hour)
 * - RBAC_AUDIT_CLEANUP_CRON: Audit log cleanup cron (default: every day at 2 AM)
 * - RBAC_TEMPORARY_PERMISSION_CLEANUP_CRON: Temporary permission cleanup cron (default: every 15 min)
 *
 * Phase 2 - PermissionContext Feature Flags:
 * - RBAC_USE_PERMISSION_CONTEXT: Enable new PermissionContext flow (default: true)
 * - RBAC_FALLBACK_ON_ERROR: Fallback to legacy if new flow fails (default: true)
 * - RBAC_DEBUG_FILTER_RESOLUTION: Log chi tiết filter resolution (default: false)
 */
const rbacConfigSchema = z.object({
  RBAC_CACHE_TTL_SECONDS: positiveIntEnvSchema(DEFAULT_CACHE_TTL_SECONDS),
  RBAC_ENABLE_HIERARCHY_VALIDATION: booleanEnvSchema(
    DEFAULT_ENABLE_HIERARCHY_VALIDATION,
  ),
  RBAC_ENABLE_POLICY_ENGINE: booleanEnvSchema(DEFAULT_ENABLE_POLICY_ENGINE),
  RBAC_ENABLE_AUDIT_LOGGING: booleanEnvSchema(DEFAULT_ENABLE_AUDIT_LOGGING),
  RBAC_ENABLE_CACHING: booleanEnvSchema(DEFAULT_ENABLE_CACHING),
  RBAC_AUDIT_LOG_RETENTION_DAYS: positiveIntEnvSchema(
    DEFAULT_AUDIT_LOG_RETENTION_DAYS,
  ),
  RBAC_CACHE_WARMUP_CRON: cronEnvSchema(DEFAULT_CACHE_WARMUP_CRON),
  RBAC_AUDIT_CLEANUP_CRON: cronEnvSchema(DEFAULT_AUDIT_CLEANUP_CRON),
  RBAC_TEMPORARY_PERMISSION_CLEANUP_CRON: cronEnvSchema(
    DEFAULT_TEMPORARY_PERMISSION_CLEANUP_CRON,
  ),
  // Phase 2: PermissionContext Feature Flags
  RBAC_USE_PERMISSION_CONTEXT: booleanEnvSchema(DEFAULT_USE_PERMISSION_CONTEXT),
  RBAC_FALLBACK_ON_ERROR: booleanEnvSchema(DEFAULT_FALLBACK_ON_ERROR),
  RBAC_DEBUG_FILTER_RESOLUTION: booleanEnvSchema(
    DEFAULT_DEBUG_FILTER_RESOLUTION,
  ),
});

// ============================================
// PARSE & VALIDATE
// ============================================

const parsedEnv = rbacConfigSchema.safeParse({
  RBAC_CACHE_TTL_SECONDS: process.env.RBAC_CACHE_TTL_SECONDS,
  RBAC_ENABLE_HIERARCHY_VALIDATION:
    process.env.RBAC_ENABLE_HIERARCHY_VALIDATION,
  RBAC_ENABLE_POLICY_ENGINE: process.env.RBAC_ENABLE_POLICY_ENGINE,
  RBAC_ENABLE_AUDIT_LOGGING: process.env.RBAC_ENABLE_AUDIT_LOGGING,
  RBAC_ENABLE_CACHING: process.env.RBAC_ENABLE_CACHING,
  RBAC_AUDIT_LOG_RETENTION_DAYS: process.env.RBAC_AUDIT_LOG_RETENTION_DAYS,
  RBAC_CACHE_WARMUP_CRON: process.env.RBAC_CACHE_WARMUP_CRON,
  RBAC_AUDIT_CLEANUP_CRON: process.env.RBAC_AUDIT_CLEANUP_CRON,
  RBAC_TEMPORARY_PERMISSION_CLEANUP_CRON:
    process.env.RBAC_TEMPORARY_PERMISSION_CLEANUP_CRON,
  // Phase 2: PermissionContext Feature Flags
  RBAC_USE_PERMISSION_CONTEXT: process.env.RBAC_USE_PERMISSION_CONTEXT,
  RBAC_FALLBACK_ON_ERROR: process.env.RBAC_FALLBACK_ON_ERROR,
  RBAC_DEBUG_FILTER_RESOLUTION: process.env.RBAC_DEBUG_FILTER_RESOLUTION,
});

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error(
    '[MktRbacConfig] Invalid environment variables:',
    parsedEnv.error.flatten().fieldErrors,
  );
}

const validatedEnv = parsedEnv.success
  ? parsedEnv.data
  : rbacConfigSchema.parse({}); // Fallback to defaults

// ============================================
// RBAC CONFIGURATION
// ============================================

export const MKT_RBAC_CONFIG = {
  /** Cache TTL in seconds (default: 10 minutes) */
  CACHE_TTL_SECONDS: validatedEnv.RBAC_CACHE_TTL_SECONDS,

  /** Enable hierarchy validation */
  ENABLE_HIERARCHY_VALIDATION: validatedEnv.RBAC_ENABLE_HIERARCHY_VALIDATION,

  /** Enable policy engine */
  ENABLE_POLICY_ENGINE: validatedEnv.RBAC_ENABLE_POLICY_ENGINE,

  /** Enable audit logging */
  ENABLE_AUDIT_LOGGING: validatedEnv.RBAC_ENABLE_AUDIT_LOGGING,

  /** Enable caching */
  ENABLE_CACHING: validatedEnv.RBAC_ENABLE_CACHING,

  /** Audit log retention days */
  AUDIT_LOG_RETENTION_DAYS: validatedEnv.RBAC_AUDIT_LOG_RETENTION_DAYS,

  /** Cache warmup cron expression */
  CACHE_WARMUP_CRON: validatedEnv.RBAC_CACHE_WARMUP_CRON,

  /** Audit log cleanup cron expression */
  AUDIT_CLEANUP_CRON: validatedEnv.RBAC_AUDIT_CLEANUP_CRON,

  /** Temporary permission cleanup cron expression */
  TEMPORARY_PERMISSION_CLEANUP_CRON:
    validatedEnv.RBAC_TEMPORARY_PERMISSION_CLEANUP_CRON,

  // ============================================
  // Phase 2: PermissionContext Feature Flags
  // ============================================

  /**
   * Enable new PermissionContext flow (default: true)
   * - false: Dùng hard-coded switch logic (legacy)
   * - true: Dùng PermissionContext + FilterExpressionResolver (new)
   */
  USE_PERMISSION_CONTEXT: validatedEnv.RBAC_USE_PERMISSION_CONTEXT,

  /**
   * Fallback to legacy flow if new flow fails (default: true)
   * Khi new flow gặp lỗi, tự động fallback về legacy để đảm bảo availability
   */
  FALLBACK_ON_ERROR: validatedEnv.RBAC_FALLBACK_ON_ERROR,

  /**
   * Log chi tiết filter resolution (default: false)
   * Hữu ích cho debugging và monitoring rollout
   */
  DEBUG_FILTER_RESOLUTION: validatedEnv.RBAC_DEBUG_FILTER_RESOLUTION,
} as const;

export type MktRbacConfigType = typeof MKT_RBAC_CONFIG;

// ============================================
// ENTERPRISE RBAC CONFIGURATION
// ============================================

/**
 * Enterprise RBAC Configuration Schema
 *
 * Feature flags and settings for the Enterprise RBAC module.
 *
 * Environment variables:
 * - RBAC_ENABLE_METRICS: Enable RBAC metrics (default: true)
 * - RBAC_DEBUG_MODE: Enable debug mode (default: false)
 */
const enterpriseRbacConfigSchema = z.object({
  /** Enable audit logging */
  enableAuditLogging: z.boolean().default(true),

  /** Enable metrics collection */
  enableMetrics: z.boolean().default(true),

  /** Enable caching */
  enableCaching: z.boolean().default(true),

  /** Enable debug mode */
  enableDebugMode: z.boolean().default(false),
});

/**
 * Build Enterprise RBAC config from environment variables
 */
const buildEnterpriseRbacConfig = () => {
  const envConfig = {
    enableAuditLogging: process.env.RBAC_ENABLE_AUDIT_LOGGING !== 'false',
    enableMetrics: process.env.RBAC_ENABLE_METRICS !== 'false',
    enableCaching: process.env.RBAC_ENABLE_CACHING !== 'false',
    enableDebugMode: process.env.RBAC_DEBUG_MODE === 'true',
  };

  return enterpriseRbacConfigSchema.parse(envConfig);
};

/**
 * Enterprise RBAC Configuration
 *
 * Use with ENTERPRISE_RBAC_CONFIG_TOKEN for injection:
 * ```typescript
 * @Inject(ENTERPRISE_RBAC_CONFIG_TOKEN)
 * private readonly config: EnterpriseRbacConfigType,
 * ```
 */
export const ENTERPRISE_RBAC_CONFIG = buildEnterpriseRbacConfig();

export type EnterpriseRbacConfigType = z.infer<
  typeof enterpriseRbacConfigSchema
>;
