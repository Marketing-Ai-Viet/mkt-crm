import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CacheStorageModule } from 'src/engine/core-modules/cache-storage/cache-storage.module';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { RedisInfrastructureModule } from 'src/mkt-core/infrastructure/redis/redis-infrastructure.module';
import { rbacConfig } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config';
import {
  WorkspaceCasbinRuleRepository,
  PolicyVersionRepository,
  PolicyChangeRequestRepository,
  PolicyApprovalRepository,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/repositories';
import { PolicyValidator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/validators/policy.validator';
import { HighRiskPolicyValidator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/validators/high-risk-policy.validator';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
import { PolicySyncService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/policy-sync.service';
import { RbacMetricsService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/rbac-metrics.service';
import { CacheWarmerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/cache-warmer.service';
import { PolicyApprovalService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/policy-approval.service';
import { RoleInheritanceCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/role-inheritance-cache.service';
import { CrossRegionInvalidationPubSub } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/pubsub';
import { CasbinAuthzGuard } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/guards/casbin-authz.guard';
import { RbacHealthIndicator } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/health/rbac-health.indicator';
import {
  CacheWarmerJob,
  CrossRegionReloadJob,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/jobs';
import { RbacCronRegistrationService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/rbac-cron-registration.service';
import {
  MktPermissionTemplateRepository,
  MktUserPermissionTemplateRepository,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';

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
 * - Cross-region cache invalidation
 *
 * Exports:
 * - CasbinEnforcerService: Main permission check service
 * - PolicySyncService: Sync templates to policies
 * - RbacMetricsService: Metrics và monitoring
 * - CasbinAuthzGuard: Authorization guard
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
    TerminusModule,
    CacheStorageModule,
    TwentyORMModule,
    RedisInfrastructureModule,
    MessageQueueModule, // For cron job registration
    // For CacheWarmerService to access workspace list from core schema
    TypeOrmModule.forFeature([Workspace], 'core'),
  ],
  providers: [
    // Repositories (workspace-aware)
    WorkspaceCasbinRuleRepository,
    PolicyVersionRepository,
    PolicyChangeRequestRepository,
    PolicyApprovalRepository,
    // Template repositories (needed by PolicySyncService)
    MktPermissionTemplateRepository,
    MktUserPermissionTemplateRepository,
    // Validators
    PolicyValidator,
    HighRiskPolicyValidator,
    // Services (order matters for dependencies)
    CasbinEnforcerService,
    RbacMetricsService,
    RoleInheritanceCacheService, // Must be before PolicySyncService
    PolicySyncService,
    CacheWarmerService,
    PolicyApprovalService,
    CrossRegionInvalidationPubSub,
    // Guards
    CasbinAuthzGuard,
    // Health
    RbacHealthIndicator,
    // Cron Registration (auto-registers cron jobs on module init)
    RbacCronRegistrationService,
    // Jobs (Processor-based)
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
    RoleInheritanceCacheService,
    CrossRegionInvalidationPubSub,
    // Guards
    CasbinAuthzGuard,
    // Health
    RbacHealthIndicator,
  ],
})
export class CasbinModule {}
