import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { RedisInfrastructureModule } from 'src/mkt-core/infrastructure/redis';

import {
  MktAuthCacheService,
  MktAuthLockService,
  MktAuthClientService,
  MktAuthHttpService,
} from './services';

import {
  MKT_AUTH_CLIENT_CONFIG_KEY,
  mktAuthClientConfigFactory,
} from './configs/mkt-auth-client.config';
import {
  MKT_AUTH_LOG_CONTEXT,
  MKT_AUTH_DEFAULTS,
} from './constants/mkt-auth-client.constant';

/**
 * MKT Auth Client Module
 *
 * Provides Bearer token authentication for MKT Server API calls.
 * Implements Better Auth pattern (no refresh token - re-login on 401).
 *
 * Architecture:
 * - configs/: Zod-validated configuration schemas
 * - constants/: Cache keys, event names, default values
 * - types/: TypeScript type definitions
 * - services/: Business logic layer
 *   - MktAuthCacheService: Two-tier caching (local + Redis)
 *   - MktAuthLockService: Distributed locking wrapper
 *   - MktAuthClientService: Token lifecycle management
 *   - MktAuthHttpService: HTTP client with auto-auth (Phase 3)
 *   - MktAuthMetricsService: Prometheus metrics (Phase 4)
 *
 * Features:
 * - Zod configuration validation
 * - Two-tier caching (local in-memory + Redis distributed)
 * - Distributed locking (multi-instance safe)
 * - Circuit breaker (prevents continuous failures)
 * - Jitter (reduces thundering herd)
 * - Exponential backoff retry
 * - Event-driven integration (EventEmitter2)
 *
 * Dependencies:
 * - RedisInfrastructureModule: Distributed caching and locking
 * - HttpModule: HTTP client for MKT Server API calls
 *
 * NOTE: EventEmitter2 is available globally via CoreEngineModule.
 * CacheStorageService is injected via @InjectCacheStorage decorator.
 *
 * @see docs/better-auth-bearer-implementation.md for full specification
 */
@Module({
  imports: [
    RedisInfrastructureModule, // Distributed caching and locking
    HttpModule.register({
      timeout: MKT_AUTH_DEFAULTS.RETRY.MAX_DELAY_MS,
      maxRedirects: 5,
    }),
  ],
  providers: [
    // Configuration provider
    {
      provide: MKT_AUTH_CLIENT_CONFIG_KEY,
      useFactory: mktAuthClientConfigFactory,
    },
    // Core Services (Phase 2)
    MktAuthCacheService,
    MktAuthLockService,
    MktAuthClientService,
    // HTTP Client (Phase 3)
    MktAuthHttpService,
    // MktAuthMetricsService (Phase 4)
  ],
  exports: [
    // Configuration
    MKT_AUTH_CLIENT_CONFIG_KEY,
    // Public API
    MktAuthClientService,
    MktAuthCacheService,
    // HTTP Client (Phase 3)
    MktAuthHttpService,
  ],
})
export class MktAuthClientModule implements OnModuleInit {
  private readonly logger = new Logger(MKT_AUTH_LOG_CONTEXT);

  onModuleInit() {
    const config = mktAuthClientConfigFactory();

    if (!config.baseUrl || !config.credentials.email) {
      this.logger.warn(
        'MKT Auth Client is disabled: Missing required configuration ' +
          '(MKT_SERVER_BASE_URL, MKT_AUTH_EMAIL, MKT_AUTH_PASSWORD)',
      );

      return;
    }

    this.logger.log(`MKT Auth Client module loaded for: ${config.baseUrl}`);
    this.logger.debug(`Token TTL: ${config.token.serverTtlMs}ms`);
    this.logger.debug(`Buffer: ${config.token.bufferMs}ms`);
    this.logger.debug(
      `Circuit breaker: ${config.circuitBreaker.enabled ? 'enabled' : 'disabled'}`,
    );
    this.logger.debug(
      `Jitter: ${config.jitter.enabled ? 'enabled' : 'disabled'}`,
    );
  }
}
