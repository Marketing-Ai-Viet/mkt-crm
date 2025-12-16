import { Module } from '@nestjs/common';

import { OAuth2ClientModule } from 'src/mkt-core/oauth2-client/oauth2-client.module';
import { RedisInfrastructureModule } from 'src/mkt-core/infrastructure/redis';

import {
  MktSnapshotService,
  MktProductCacheService,
  MktProductProxyService,
  MktProductSyncService,
} from './services';
import { MktProductScheduledSyncJob } from './jobs';

/**
 * MKT Product Integration Module
 *
 * Provides services for:
 * - Product/Package proxy (API calls with caching)
 * - Product/Package snapshots (for order immutability)
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
    // Services
    MktSnapshotService,
    MktProductCacheService,
    MktProductProxyService,
    MktProductSyncService,
    // Jobs
    MktProductScheduledSyncJob,
  ],
  exports: [MktProductProxyService, MktSnapshotService, MktProductSyncService],
})
export class MktProductIntegrationModule {}
