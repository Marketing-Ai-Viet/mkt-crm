import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { MktAuthClientModule } from 'src/mkt-core/mkt-auth-client';
import { RedisInfrastructureModule } from 'src/mkt-core/infrastructure/redis';

import { MktPackageRepository, MktProductRepository } from './repositories';
import {
  MktProductCacheService,
  MktProductProxyService,
  MktProductSyncService,
  MktProductSyncCronRegistrationService,
  MktSnapshotService,
  MktValidationService,
} from './services';
import { MktProductScheduledSyncJob } from './jobs';
import { MktDigitalProductResolver } from './resolvers';

/**
 * MKT Product Integration Module
 *
 * Architecture:
 * - Repositories: Data access layer (HTTP calls to MKT Server)
 * - Services: Business logic layer
 * - Jobs: Scheduled background tasks
 * - Resolvers: GraphQL resolvers
 *
 * Provides services for:
 * - Product/Package proxy (API calls with caching)
 * - Product/Package snapshots (for order immutability)
 * - Order validation
 * - Auto-sync products on token acquisition
 *
 * Dependencies:
 * - MktAuthClientModule: Token management and authenticated HTTP client
 * - RedisInfrastructureModule: Distributed caching, circuit breaker, rate limiter
 *
 * NOTE: EventEmitter2 is available globally via CoreEngineModule.
 * CacheStorageService is injected via @InjectCacheStorage decorator with MktProduct namespace.
 */
@Module({
  imports: [
    MktAuthClientModule, // Token management and authenticated HTTP client
    RedisInfrastructureModule, // Distributed caching infrastructure
    MessageQueueModule, // For cron job registration
    // For MktProductSyncCronRegistrationService to access workspace list from core schema
    TypeOrmModule.forFeature([Workspace], 'core'),
  ],
  providers: [
    // Repositories (Data Access Layer)
    MktProductRepository,
    MktPackageRepository,
    // Services (Business Logic Layer)
    MktSnapshotService,
    MktProductCacheService,
    MktValidationService,
    MktProductProxyService, // Facade service - depends on repositories and other services
    MktProductSyncService,
    // Cron Registration (auto-registers cron jobs on module init)
    MktProductSyncCronRegistrationService,
    // Jobs
    MktProductScheduledSyncJob,
    // Resolvers
    MktDigitalProductResolver,
  ],
  exports: [
    // Public API
    MktProductProxyService,
    MktSnapshotService,
    MktProductSyncService,
    MktValidationService,
    // Repositories for direct access if needed
    MktProductRepository,
    MktPackageRepository,
  ],
})
export class MktProductIntegrationModule {}
