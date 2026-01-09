import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CacheStorageModule } from 'src/engine/core-modules/cache-storage/cache-storage.module';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { RedisInfrastructureModule } from 'src/mkt-core/infrastructure/redis/redis-infrastructure.module';
import { rbacConfig } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config';
import { WorkspaceCasbinRuleRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/workspace-casbin-rule.repository';
import { PolicyVersionRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories/policy-version.repository';
import { PolicyValidator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/validators/policy.validator';
import { HighRiskPolicyValidator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/validators/high-risk-policy.validator';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
import { PolicySyncService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/policy-sync.service';
import { RbacMetricsService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/rbac-metrics.service';
import { CacheWarmerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/cache-warmer.service';
import { PolicyApprovalService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/policy-approval.service';
import { CrossRegionInvalidationPubSub } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/pubsub';
import { CasbinAuthzGuard } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/guards/casbin-authz.guard';
import { DualPathAuthzGuard } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/guards/dual-path-authz.guard';
import { RbacHealthIndicator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/health/rbac-health.indicator';
import {
  CacheWarmerJob,
  CrossRegionReloadJob,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/jobs';

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
  imports: [
    ConfigModule.forFeature(rbacConfig),
    ScheduleModule.forRoot(),
    TerminusModule,
    CacheStorageModule,
    TwentyORMModule,
    RedisInfrastructureModule,
    // For CacheWarmerService to access workspace list from core schema
    TypeOrmModule.forFeature([Workspace], 'core'),
  ],
  providers: [
    // Repositories (workspace-aware)
    WorkspaceCasbinRuleRepository,
    PolicyVersionRepository,
    // Validators
    PolicyValidator,
    HighRiskPolicyValidator,
    // Services (order matters for dependencies)
    CasbinEnforcerService,
    RbacMetricsService,
    PolicySyncService,
    CacheWarmerService,
    PolicyApprovalService,
    CrossRegionInvalidationPubSub,
    // Guards
    CasbinAuthzGuard,
    DualPathAuthzGuard,
    // Health
    RbacHealthIndicator,
    // Jobs (Cron)
    CacheWarmerJob,
    CrossRegionReloadJob,
  ],
  exports: [
    // Repositories
    WorkspaceCasbinRuleRepository,
    PolicyVersionRepository,
    // Validators
    PolicyValidator,
    HighRiskPolicyValidator,
    // Services
    CasbinEnforcerService,
    PolicySyncService,
    RbacMetricsService,
    CacheWarmerService,
    PolicyApprovalService,
    CrossRegionInvalidationPubSub,
    // Guards
    CasbinAuthzGuard,
    DualPathAuthzGuard,
    // Health
    RbacHealthIndicator,
  ],
})
export class CasbinModule {}
