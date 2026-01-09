import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';

import { CacheStorageModule } from 'src/engine/core-modules/cache-storage/cache-storage.module';
import { CasbinRuleRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/casbin-rule.repository';
import { PolicyVersionRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/policy-version.repository';
import { PolicyValidator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/validators/policy.validator';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
import { PolicySyncService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/policy-sync.service';
import { RbacMetricsService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/rbac-metrics.service';
import { CacheWarmerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/cache-warmer.service';
import { CasbinAuthzGuard } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/guards/casbin-authz.guard';
import { DualPathAuthzGuard } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/guards/dual-path-authz.guard';
import { RbacHealthIndicator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/health/rbac-health.indicator';

/**
 * Casbin Module
 *
 * Core module cho Casbin authorization system.
 *
 * Features:
 * - Multi-tenant enforcer management
 * - Policy sync từ workspace entities
 * - Permission checks với caching
 * - Health monitoring
 * - Shadow mode cho migration
 *
 * Exports:
 * - CasbinEnforcerService: Main permission check service
 * - PolicySyncService: Sync templates to policies
 * - RbacMetricsService: Metrics và monitoring
 * - CasbinAuthzGuard: Authorization guard
 * - DualPathAuthzGuard: Shadow mode guard
 * - RbacHealthIndicator: Health check
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [CasbinModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule, TerminusModule, CacheStorageModule],
  providers: [
    // Repositories
    CasbinRuleRepository,
    PolicyVersionRepository,
    // Validators
    PolicyValidator,
    // Services (order matters for dependencies)
    CasbinEnforcerService,
    RbacMetricsService,
    PolicySyncService,
    CacheWarmerService,
    // Guards
    CasbinAuthzGuard,
    DualPathAuthzGuard,
    // Health
    RbacHealthIndicator,
  ],
  exports: [
    // Repositories
    CasbinRuleRepository,
    PolicyVersionRepository,
    // Validators
    PolicyValidator,
    // Services
    CasbinEnforcerService,
    PolicySyncService,
    RbacMetricsService,
    CacheWarmerService,
    // Guards
    CasbinAuthzGuard,
    DualPathAuthzGuard,
    // Health
    RbacHealthIndicator,
  ],
})
export class CasbinModule {}
