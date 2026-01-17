/**
 * RBAC Casbin Configuration
 *
 * Centralized configuration for RBAC module
 * Uses Zod schemas for validation and type safety
 */

// Schema exports (types inferred from Zod schemas)
export {
  // Schemas
  rbacCacheWarmerConfigSchema,
  rbacSyncConfigSchema,
  rbacEnforcerConfigSchema,
  rbacPubSubConfigSchema,
  casbinRbacConfigSchema,
  rbacEnvSchema,
  // Types (inferred from schemas)
  type RbacCacheWarmerConfig,
  type RbacSyncConfig,
  type RbacEnforcerConfig,
  type RbacPubSubConfig,
  type CasbinRbacConfig,
  type RbacEnvConfig,
  // Functions
  parseRbacEnv,
  buildRbacConfig,
} from './rbac-config.schema';

// Config registration
export { rbacConfig, RBAC_CONFIG_KEY } from './rbac.config';

// Defaults (re-export for backward compatibility)
export * from './rbac-config.defaults';

// Legacy types (re-export from schema for backward compatibility)
export { type RbacPubSubServiceStatus } from './rbac-config.types';
