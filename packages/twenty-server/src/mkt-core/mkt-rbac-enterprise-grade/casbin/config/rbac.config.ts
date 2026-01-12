import { registerAs } from '@nestjs/config';

import {
  buildRbacConfig,
  CasbinRbacConfig,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config/rbac-config.schema';

/**
 * RBAC module configuration
 *
 * Registered with NestJS ConfigModule as 'rbac'
 * Uses Zod schemas for validation and type safety
 *
 * Environment variables:
 * - RBAC_CACHE_WARM_ENABLED: Enable cache warming (default: true)
 * - RBAC_CACHE_WARM_ON_STARTUP: Warm cache on startup (default: true)
 * - RBAC_CACHE_WARM_CONCURRENCY: Concurrent workspace warming (default: 5)
 * - RBAC_PRIORITY_WORKSPACES: Comma-separated workspace IDs to prioritize
 * - RBAC_SYNC_MAX_RETRIES: Max sync retry attempts (default: 3)
 * - RBAC_SYNC_RETRY_DELAY_MS: Delay between retries (default: 1000)
 * - RBAC_SYNC_DEBOUNCE_MS: Debounce time for sync (default: 500)
 * - RBAC_MAX_POLICIES_PER_WORKSPACE: Max policies per workspace (default: 10000)
 * - RBAC_FAIL_CLOSED: Deny on error (default: true)
 * - RBAC_CACHE_ENABLED: Enable enforcer caching (default: true)
 * - RBAC_MAX_ENFORCERS_IN_MEMORY: Max enforcers in memory (default: 100)
 * - RBAC_ENFORCER_TTL_MS: Enforcer TTL in ms (default: 3600000)
 * - RBAC_MULTI_REGION_ENABLED: Enable cross-region invalidation (default: true)
 * - RBAC_FALLBACK_RELOAD_INTERVAL_MS: Fallback reload interval (default: 3600000)
 * - RBAC_INVALIDATION_DEBOUNCE_MS: Invalidation debounce time (default: 100)
 * - RBAC_PUBSUB_MAX_MESSAGE_AGE_MS: Max message age (default: 300000)
 * - RBAC_PUBSUB_RECONNECT_DELAY_MS: Reconnect delay (default: 1000)
 * - RBAC_PUBSUB_MAX_RECONNECT_ATTEMPTS: Max reconnect attempts (default: 10)
 *
 * @example
 * ```typescript
 * constructor(
 *   @Inject(rbacConfig.KEY)
 *   private readonly config: CasbinRbacConfig,
 * ) {}
 *
 * // Access config
 * const enabled = this.config.cacheWarmer.enabled;
 * const maxRetries = this.config.sync.maxRetries;
 * const pubsubEnabled = this.config.pubsub.enabled;
 * ```
 */
export const rbacConfig = registerAs(
  'rbac',
  (): CasbinRbacConfig => buildRbacConfig(process.env),
);

/**
 * Config key for injection
 */
export const RBAC_CONFIG_KEY = rbacConfig.KEY;
