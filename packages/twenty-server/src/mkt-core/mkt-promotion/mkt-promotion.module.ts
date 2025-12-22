import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

// Repositories
import {
  MktPromotionRepository,
  MktPromotionRuleRepository,
  MktCouponRepository,
  MktPromotionUsageRepository,
} from './repositories';
import {
  PromotionResolver,
  CouponResolver,
  CalculateDiscountResolver,
} from './resolvers';
import {
  PromotionExpirationCheckJob,
  CouponExpirationCheckJob,
  PromotionUsageCleanupJob,
  PromotionCacheWarmupJob,
} from './jobs';
import {
  PromotionFindOnePreQueryHook,
  PromotionFindManyPreQueryHook,
  CouponFindOnePreQueryHook,
  CouponFindManyPreQueryHook,
  PromotionUsageFindManyPreQueryHook,
  PromotionCreateOnePostQueryHook,
  PromotionUpdateOnePostQueryHook,
  PromotionDeleteOnePostQueryHook,
} from './hooks';
import {
  PromotionListener,
  CouponListener,
  PromotionUsageListener,
  OrderPromotionListener,
} from './listeners';

import {
  PromotionCacheService,
  PromotionNotificationService,
} from './services/infrastructure';
import {
  PromotionApplicationService,
  CouponApplicationService,
  PromotionUsageApplicationService,
} from './services/application';
import {
  PromotionCalculationService,
  PromotionValidationService,
  RuleEvaluationService,
} from './services/domain';

/**
 * MktPromotionModule
 *
 * Module quản lý khuyến mãi (Promotion) và mã giảm giá (Coupon)
 *
 * Features:
 * - Quản lý Promotion với nhiều loại discount (PERCENT, FIXED, BUY_X_GET_Y)
 * - Quản lý Coupon với usage tracking
 * - Rule-based promotion evaluation
 * - Auto-apply promotions cho orders
 * - Caching với Redis
 * - Background jobs cho expiration checking
 *
 * Architecture:
 * - Repositories: Data access layer (TwentyORM)
 * - Domain Services: Business logic (calculation, validation, rule evaluation)
 * - Application Services: Orchestration và workflow
 * - Infrastructure Services: Caching, notifications
 * - Resolvers: GraphQL API
 * - Hooks: Pre/Post query hooks cho workspace entities
 * - Jobs: Background jobs (expiration check, cleanup)
 * - Listeners: Event handlers
 *
 * Dependencies:
 * - TwentyORMModule: Database access
 * - WorkspaceCacheStorageModule: Redis caching
 * - TokenModule: Authentication
 */
@Module({
  imports: [TokenModule, TwentyORMModule, WorkspaceCacheStorageModule],
  providers: [
    // ============================================
    // REPOSITORIES (Data Access Layer)
    // ============================================
    MktPromotionRepository,
    MktPromotionRuleRepository,
    MktCouponRepository,
    MktPromotionUsageRepository,

    // ============================================
    // DOMAIN SERVICES (Business Logic Layer)
    // ============================================
    PromotionCalculationService,
    PromotionValidationService,
    RuleEvaluationService,

    // ============================================
    // APPLICATION SERVICES (Orchestration Layer)
    // ============================================
    PromotionApplicationService,
    CouponApplicationService,
    PromotionUsageApplicationService,

    // ============================================
    // INFRASTRUCTURE SERVICES
    // ============================================
    PromotionCacheService,
    PromotionNotificationService,

    // ============================================
    // RESOLVERS (GraphQL Layer)
    // ============================================
    PromotionResolver,
    CouponResolver,
    CalculateDiscountResolver,

    // ============================================
    // BACKGROUND JOBS
    // ============================================
    PromotionExpirationCheckJob,
    CouponExpirationCheckJob,
    PromotionUsageCleanupJob,
    PromotionCacheWarmupJob,

    // ============================================
    // PRE-QUERY HOOKS
    // ============================================
    PromotionFindOnePreQueryHook,
    PromotionFindManyPreQueryHook,
    CouponFindOnePreQueryHook,
    CouponFindManyPreQueryHook,
    PromotionUsageFindManyPreQueryHook,

    // ============================================
    // POST-QUERY HOOKS
    // ============================================
    PromotionCreateOnePostQueryHook,
    PromotionUpdateOnePostQueryHook,
    PromotionDeleteOnePostQueryHook,

    // ============================================
    // EVENT LISTENERS
    // ============================================
    PromotionListener,
    CouponListener,
    PromotionUsageListener,
    OrderPromotionListener,
  ],
  exports: [
    // Public API - Application Services
    PromotionApplicationService,
    CouponApplicationService,
    PromotionUsageApplicationService,

    // Domain Services (cho external modules như Order)
    PromotionCalculationService,
    PromotionValidationService,

    // Infrastructure Services
    PromotionCacheService,

    // Repositories (cho direct access nếu cần)
    MktPromotionRepository,
    MktPromotionRuleRepository,
    MktCouponRepository,
    MktPromotionUsageRepository,
  ],
})
export class MktPromotionModule {}
