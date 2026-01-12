import { Module } from '@nestjs/common';

import { CacheStorageModule } from 'src/engine/core-modules/cache-storage/cache-storage.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { CasbinModule } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/casbin.module';
import { RBAC_COMMANDS } from 'src/mkt-core/mkt-rbac-enterprise-grade/commands';
import { RBAC_REPOSITORIES } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { RBAC_RESOLVERS } from 'src/mkt-core/mkt-rbac-enterprise-grade/resolvers';

/**
 * Default configuration for Enterprise RBAC
 */
const DEFAULT_CONFIG = {
  // Feature flags
  enableCasbinAuthorization: true,
  enableAuditLogging: true,
  enableMetrics: true,

  // Performance settings
  enableCaching: true,

  // Development settings
  enableDebugMode: false,
} as const;

/**
 * Enterprise RBAC Module
 *
 * Provides comprehensive role-based access control powered by Casbin:
 * - Multi-tenant authorization with workspace isolation
 * - Role-based and attribute-based access control
 * - Policy sync from permission templates
 * - Real-time policy updates via PostgreSQL NOTIFY
 * - Permission caching for performance
 * - Audit logging and metrics
 * - CLI commands for management
 *
 * Usage:
 * ```typescript
 * // In resolver
 * @RequirePermission('mktCustomer', 'read')
 * async mktCustomers(): Promise<MktCustomer[]> { ... }
 * ```
 */
@Module({
  imports: [TwentyORMModule, CacheStorageModule, CasbinModule],
  providers: [
    // Configuration provider
    {
      provide: 'ENTERPRISE_RBAC_CONFIG',
      useValue: DEFAULT_CONFIG,
    },

    // Repositories for permission template entities
    ...RBAC_REPOSITORIES,

    // GraphQL Resolvers
    ...RBAC_RESOLVERS,

    // CLI Commands (rbac-seeder:sync, rbac-seeder:check, rbac-seeder:warm-cache)
    ...RBAC_COMMANDS,
  ],
  exports: [
    // Export Casbin module (guards, decorators, services)
    CasbinModule,

    // Export config
    'ENTERPRISE_RBAC_CONFIG',

    // Export repositories
    ...RBAC_REPOSITORIES,
  ],
})
export class MktRbacEnterpriseGradeModule {}
