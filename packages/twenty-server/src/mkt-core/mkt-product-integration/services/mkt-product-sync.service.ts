import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { DateTime } from 'luxon';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import {
  OAUTH2_EVENTS,
  OAuth2TokenAcquiredEvent,
} from 'src/mkt-core/oauth2-client/types';
import {
  MKT_SYNC_CONFIG,
  MKT_SYNC_LOCK_CONFIG,
  MKT_SYNC_REQUIRED_SCOPES,
  MKT_PRODUCT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-product-integration/constants';
import {
  MktProduct,
  MktProductPackage,
  SyncItemResult,
  SyncResult,
} from 'src/mkt-core/mkt-product-integration/types';

import { MktProductProxyService } from './mkt-product-proxy.service';
import { MktProductCacheService } from './mkt-product-cache.service';

// ============================================
// TYPES
// ============================================

// ============================================
// SERVICE
// ============================================

/**
 * MktProductSyncService
 *
 * Automatically syncs products and packages from MKT Server when OAuth2 token is acquired.
 *
 * Features:
 * - Event-driven sync on token acquisition
 * - Distributed lock to prevent concurrent syncs
 * - Streaming pagination for memory efficiency
 * - Graceful degradation with in-memory fallback
 */
@Injectable()
export class MktProductSyncService implements OnModuleInit {
  private readonly logger = new Logger(`${MKT_PRODUCT_LOG_CONTEXT}:Sync`);
  private lastSyncAt?: DateTime;
  private lastSyncResult?: SyncResult;

  // In-memory fallback for lock (when Redis unavailable)
  private localLockAcquired = false;

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.MktOAuth2)
    private readonly cacheStorage: CacheStorageService,
    private readonly productProxy: MktProductProxyService,
    private readonly cacheService: MktProductCacheService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (MKT_SYNC_CONFIG.SYNC_ON_STARTUP) {
      this.logger.log(
        'Sync on startup enabled, will sync after token acquired',
      );
    }
  }

  // ============================================
  // EVENT HANDLER
  // ============================================

  /**
   * Event handler: Called when OAuth2 token is acquired
   */
  @OnEvent(OAUTH2_EVENTS.TOKEN_ACQUIRED)
  async onTokenAcquired(event: OAuth2TokenAcquiredEvent): Promise<void> {
    if (!MKT_SYNC_CONFIG.AUTO_SYNC_ENABLED) {
      this.logger.debug('Auto sync disabled, skipping');

      return;
    }

    this.logger.log('OAuth2 token acquired, checking if sync needed...');

    // Check if scopes include required product scopes (EXACT match)
    if (!this.hasRequiredScopes(event.scopes)) {
      this.logger.debug(
        `Missing required product scopes (required: ${MKT_SYNC_REQUIRED_SCOPES.join(', ')}), skipping sync`,
      );

      return;
    }

    // Check if sync needed (not synced recently)
    if (this.shouldSkipSync()) {
      this.logger.debug(
        `Recent sync exists (${this.getTimeSinceLastSync()}ms ago), skipping`,
      );

      return;
    }

    // Run sync in background (non-blocking)
    this.syncAllProductsAndPackages().catch((error) => {
      this.logger.error('Background sync failed', error);
    });
  }

  // ============================================
  // SYNC METHODS
  // ============================================

  /**
   * Sync all products and packages from MKT Server
   * Uses distributed lock to prevent concurrent syncs
   */
  async syncAllProductsAndPackages(): Promise<SyncResult> {
    const startTime = DateTime.utc();

    // Try to acquire distributed lock
    const lockAcquired = await this.acquireLock();

    if (!lockAcquired) {
      this.logger.warn('Sync already in progress (lock exists), skipping');

      return {
        productsCount: 0,
        packagesCount: 0,
        errors: ['Lock not acquired - sync in progress'],
        duration: 0,
      };
    }

    const errors: string[] = [];
    let productsCount = 0;
    let packagesCount = 0;

    try {
      this.logger.log('Starting product sync from MKT Server...');

      // 1. Sync products using streaming pagination
      const productsResult = await this.syncProductsWithStreaming();

      productsCount = productsResult.count;
      errors.push(...productsResult.errors);

      // 2. Sync packages using streaming pagination
      const packagesResult = await this.syncPackagesWithStreaming();

      packagesCount = packagesResult.count;
      errors.push(...packagesResult.errors);

      const duration = Math.round(
        DateTime.utc().diff(startTime).as('milliseconds'),
      );

      this.lastSyncAt = DateTime.utc();
      this.lastSyncResult = { productsCount, packagesCount, errors, duration };

      this.logger.log(
        `Sync completed: ${productsCount} products, ${packagesCount} packages in ${duration}ms`,
      );

      if (errors.length > 0) {
        this.logger.warn(`Sync completed with ${errors.length} errors`, {
          errors,
        });
      }

      return this.lastSyncResult;
    } finally {
      // Always release lock
      await this.releaseLock();
    }
  }

  /**
   * Force sync (bypass interval check)
   */
  async forceSync(): Promise<SyncResult> {
    this.logger.log('Force sync triggered');
    this.lastSyncAt = undefined;

    return this.syncAllProductsAndPackages();
  }

  // ============================================
  // STREAMING PAGINATION (Memory-efficient)
  // ============================================

  /**
   * Stream products from API (AsyncGenerator)
   */
  private async *streamProducts(): AsyncGenerator<MktProduct[], void, unknown> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const result = await this.productProxy.getProducts({
          page,
          limit: MKT_SYNC_CONFIG.BATCH_SIZE,
        });

        if (result.data && result.data.length > 0) {
          yield result.data;
          hasMore = result.data.length >= MKT_SYNC_CONFIG.BATCH_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        this.logger.error(`Failed to fetch products page ${page}`, error);
        hasMore = false;
      }
    }
  }

  /**
   * Stream packages from API (AsyncGenerator)
   */
  private async *streamPackages(): AsyncGenerator<
    MktProductPackage[],
    void,
    unknown
  > {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const result = await this.productProxy.getPackages({
          page,
          limit: MKT_SYNC_CONFIG.BATCH_SIZE,
        });

        if (result.data && result.data.length > 0) {
          yield result.data;
          hasMore = result.data.length >= MKT_SYNC_CONFIG.BATCH_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        this.logger.error(`Failed to fetch packages page ${page}`, error);
        hasMore = false;
      }
    }
  }

  /**
   * Sync products using streaming (memory-efficient)
   */
  private async syncProductsWithStreaming(): Promise<SyncItemResult> {
    let count = 0;
    const errors: string[] = [];

    try {
      for await (const productBatch of this.streamProducts()) {
        // Process batch with Promise.allSettled (partial failure tolerant)
        const results = await Promise.allSettled(
          productBatch.map((product) =>
            this.cacheService.setProduct(product.id, product),
          ),
        );

        for (let i = 0; i < results.length; i++) {
          const result = results[i];

          if (result.status === 'fulfilled') {
            count++;
          } else {
            const productId = productBatch[i]?.id ?? 'unknown';

            errors.push(`Product ${productId}: ${result.reason}`);
          }
        }
      }

      this.logger.log(`Synced ${count} products`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      errors.push(`Products sync failed: ${message}`);
      this.logger.error('Products sync failed', error);
    }

    return { count, errors };
  }

  /**
   * Sync packages using streaming (memory-efficient)
   */
  private async syncPackagesWithStreaming(): Promise<SyncItemResult> {
    let count = 0;
    const errors: string[] = [];

    try {
      for await (const packageBatch of this.streamPackages()) {
        const results = await Promise.allSettled(
          packageBatch.map((pkg) => this.cacheService.setPackage(pkg.id, pkg)),
        );

        for (let i = 0; i < results.length; i++) {
          const result = results[i];

          if (result.status === 'fulfilled') {
            count++;
          } else {
            const packageId = packageBatch[i]?.id ?? 'unknown';

            errors.push(`Package ${packageId}: ${result.reason}`);
          }
        }
      }

      this.logger.log(`Synced ${count} packages`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      errors.push(`Packages sync failed: ${message}`);
      this.logger.error('Packages sync failed', error);
    }

    return { count, errors };
  }

  // ============================================
  // DISTRIBUTED LOCK (via CacheStorageService)
  // Follows RedisInfrastructureModule patterns
  // ============================================

  /**
   * Acquire distributed lock using CacheStorageService
   * Falls back to in-memory lock when Redis unavailable
   */
  private async acquireLock(): Promise<boolean> {
    // Check local lock first (in-memory fallback)
    if (this.localLockAcquired) {
      return false;
    }

    try {
      // Try to get existing lock from Redis
      const existingLock = await this.cacheStorage.get<string>(
        MKT_SYNC_LOCK_CONFIG.KEY,
      );

      if (existingLock) {
        return false;
      }

      // Set lock with TTL
      const lockValue = `locked:${DateTime.utc().toISO()}`;

      await this.cacheStorage.set(
        MKT_SYNC_LOCK_CONFIG.KEY,
        lockValue,
        MKT_SYNC_LOCK_CONFIG.TTL_MS,
      );

      // Verify lock was acquired (check for race condition)
      const verifyLock = await this.cacheStorage.get<string>(
        MKT_SYNC_LOCK_CONFIG.KEY,
      );

      if (verifyLock !== lockValue) {
        return false;
      }

      this.localLockAcquired = true;
      this.logger.debug('Distributed lock acquired');

      return true;
    } catch {
      // Redis unavailable - use local lock as fallback
      this.logger.debug('Redis unavailable for lock, using local lock');
      this.localLockAcquired = true;

      return true;
    }
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(): Promise<void> {
    this.localLockAcquired = false;

    try {
      await this.cacheStorage.del(MKT_SYNC_LOCK_CONFIG.KEY);
      this.logger.debug('Distributed lock released');
    } catch {
      this.logger.debug('Redis unavailable during lock release');
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Check if token has all required scopes (EXACT match)
   */
  private hasRequiredScopes(scopes: string[]): boolean {
    return MKT_SYNC_REQUIRED_SCOPES.every(
      (required) => scopes.includes(required) || scopes.includes('admin:all'),
    );
  }

  /**
   * Check if sync should be skipped based on interval
   */
  private shouldSkipSync(): boolean {
    if (!this.lastSyncAt) {
      return false;
    }

    return this.getTimeSinceLastSync() < MKT_SYNC_CONFIG.MIN_SYNC_INTERVAL_MS;
  }

  /**
   * Get time since last sync in milliseconds
   */
  private getTimeSinceLastSync(): number {
    if (!this.lastSyncAt) {
      return Infinity;
    }

    return Math.round(DateTime.utc().diff(this.lastSyncAt).as('milliseconds'));
  }

  // ============================================
  // PUBLIC STATUS METHODS
  // ============================================

  /**
   * Get sync status for health checks
   */
  getSyncStatus(): {
    isSyncing: boolean;
    lastSyncAt?: Date;
    lastResult?: SyncResult;
  } {
    return {
      isSyncing: this.localLockAcquired,
      lastSyncAt: this.lastSyncAt?.toJSDate(),
      lastResult: this.lastSyncResult,
    };
  }

  /**
   * Check if currently syncing (via lock)
   */
  async isSyncing(): Promise<boolean> {
    if (this.localLockAcquired) {
      return true;
    }

    try {
      const lock = await this.cacheStorage.get<string>(
        MKT_SYNC_LOCK_CONFIG.KEY,
      );

      return lock !== null;
    } catch {
      return this.localLockAcquired;
    }
  }
}
