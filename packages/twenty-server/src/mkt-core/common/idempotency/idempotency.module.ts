import { DynamicModule, Module, Provider } from '@nestjs/common';

import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';

import { IdempotencyCacheRepository } from './repositories';

import { IdempotencyService } from './services/idempotency.service';
import { StuckPendingCleanupService } from './services/stuck-pending-cleanup.service';
import { IDEMPOTENCY_CACHE_TOKEN } from './types/idempotency.types';

/**
 * Options for IdempotencyModule
 */
export type IdempotencyModuleOptions = {
  /**
   * Cache storage namespace to use
   * Default: MktOrder (for backwards compatibility)
   */
  namespace?: CacheStorageNamespace;

  /**
   * Enable stuck PENDING cleanup service
   * Default: true
   */
  enableCleanup?: boolean;
};

/**
 * Idempotency Module
 *
 * Provides idempotency protection for operations across domains.
 * Requires CacheStorageModule to be imported globally (which is the default).
 *
 * Architecture:
 * - IdempotencyCacheRepository: Handles all Redis cache operations
 * - IdempotencyService: Business logic for idempotency
 * - StuckPendingCleanupService: Periodic cleanup of stuck records
 *
 * @example
 * ```typescript
 * // Basic usage with default namespace
 * @Module({
 *   imports: [IdempotencyModule.register()],
 * })
 * export class OrderModule {}
 *
 * // Custom namespace
 * @Module({
 *   imports: [
 *     IdempotencyModule.register({
 *       namespace: CacheStorageNamespace.MktPayment,
 *       enableCleanup: true,
 *     }),
 *   ],
 * })
 * export class PaymentModule {}
 * ```
 */
@Module({})
export class IdempotencyModule {
  /**
   * Register with options
   */
  static register(options?: IdempotencyModuleOptions): DynamicModule {
    const namespace = options?.namespace ?? CacheStorageNamespace.MktOrder;
    const enableCleanup = options?.enableCleanup ?? true;

    const providers: Provider[] = [
      // Provide CacheStorageService with specific namespace
      {
        provide: IDEMPOTENCY_CACHE_TOKEN,
        useFactory: (cacheStorageService: CacheStorageService) => {
          return cacheStorageService;
        },
        inject: [namespace],
      },
      // Repository layer - handles all Redis operations
      IdempotencyCacheRepository,
      // Service layer - business logic
      IdempotencyService,
    ];

    if (enableCleanup) {
      providers.push(StuckPendingCleanupService);
    }

    return {
      module: IdempotencyModule,
      providers,
      exports: [IdempotencyService, IdempotencyCacheRepository],
    };
  }

  /**
   * For global registration
   */
  static forRoot(options?: IdempotencyModuleOptions): DynamicModule {
    const dynamicModule = this.register(options);

    return {
      ...dynamicModule,
      global: true,
    };
  }
}
