import { Module } from '@nestjs/common';

import { OAuth2ClientModule } from 'src/mkt-core/oauth2-client/oauth2-client.module';
import { RedisInfrastructureModule } from 'src/mkt-core/infrastructure/redis';

import { MktPackageRepository, MktProductRepository } from './repositories';
import {
  MktProductCacheService,
  MktProductProxyService,
  MktProductSyncService,
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
 * - Auto-sync products on OAuth2 token acquisition
 *
 * Dependencies:
 * - OAuth2ClientModule: Token management and HTTP client
 * - RedisInfrastructureModule: Distributed caching, circuit breaker, rate limiter
 *
 * NOTE: EventEmitter2 is available globally via CoreEngineModule.
 * CacheStorageService is injected via @InjectCacheStorage decorator with MktProduct namespace.
 */
@Module({
  imports: [
    OAuth2ClientModule, // Token management and OAuth2 HTTP client
    RedisInfrastructureModule, // Distributed caching infrastructure
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
