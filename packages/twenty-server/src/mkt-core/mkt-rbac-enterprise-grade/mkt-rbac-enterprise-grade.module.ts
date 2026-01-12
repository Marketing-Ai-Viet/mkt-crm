import { Module } from '@nestjs/common';

import { CacheStorageModule } from 'src/engine/core-modules/cache-storage/cache-storage.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { CasbinModule } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/casbin.module';
import { RBAC_COMMANDS } from 'src/mkt-core/mkt-rbac-enterprise-grade/commands';
import {
  ENTERPRISE_RBAC_CONFIG,
  ENTERPRISE_RBAC_CONFIG_TOKEN,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/configs';
import { RBAC_REPOSITORIES } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { RBAC_RESOLVERS } from 'src/mkt-core/mkt-rbac-enterprise-grade/resolvers';

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
 * Configuration:
 * Uses ENTERPRISE_RBAC_CONFIG_TOKEN (Symbol) for type-safe injection:
 * ```typescript
 * constructor(
 *   @Inject(ENTERPRISE_RBAC_CONFIG_TOKEN)
 *   private readonly config: EnterpriseRbacConfigType,
 * ) {}
 * ```
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
    // Configuration provider (Symbol token for type safety)
    {
      provide: ENTERPRISE_RBAC_CONFIG_TOKEN,
      useValue: ENTERPRISE_RBAC_CONFIG,
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

    // Export config token
    ENTERPRISE_RBAC_CONFIG_TOKEN,

    // Export repositories
    ...RBAC_REPOSITORIES,
  ],
})
export class MktRbacEnterpriseGradeModule {}
