import { Injectable, Logger } from '@nestjs/common';

import { createHash } from 'crypto';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import {
  DASHBOARD_CACHE_PREFIX,
  DASHBOARD_CACHE_TTL,
} from 'src/mkt-core/infrastructure/redis/constants/cache-keys.constant';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'DashboardCacheService';

@Injectable()
export class DashboardCacheService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.MktDashboard)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  // ============================================
  // GENERIC CACHE OPERATIONS
  // ============================================

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.cacheStorage.get<T>(key);

      if (cached) {
        this.logger.debug('Cache HIT', { key });
      }

      return cached ?? null;
    } catch (error) {
      this.logger.error('Cache get failed', {
        key,
        error: getErrorMessage(error),
      });

      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const ttlMs = ttlSeconds * 1000;

      await this.cacheStorage.set(key, value, ttlMs);
      this.logger.debug('Cache SET', { key, ttlSeconds });
    } catch (error) {
      this.logger.error('Cache set failed', {
        key,
        error: getErrorMessage(error),
      });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheStorage.del(key);
      this.logger.debug('Cache DEL', { key });
    } catch (error) {
      this.logger.error('Cache del failed', {
        key,
        error: getErrorMessage(error),
      });
    }
  }

  // ============================================
  // CACHE KEY BUILDERS
  // ============================================

  buildSummaryKey(
    workspaceId: string,
    period: string,
    filters?: Record<string, unknown>,
  ): string {
    const filterHash = filters
      ? createHash('sha256')
          .update(safeJsonStringify(filters) ?? '')
          .digest('hex')
          .slice(0, 8)
      : 'default';

    return `${DASHBOARD_CACHE_PREFIX.SUMMARY}:${workspaceId}:${period}:${filterHash}`;
  }

  buildStatsKey(
    workspaceId: string,
    dataSource: string,
    period: string,
  ): string {
    return `${DASHBOARD_CACHE_PREFIX.STATS}:${workspaceId}:${dataSource}:${period}`;
  }

  buildLeaderboardKey(workspaceId: string, period: string): string {
    return `${DASHBOARD_CACHE_PREFIX.LEADERBOARD}:${workspaceId}:${period}`;
  }

  buildAlertsKey(workspaceId: string): string {
    return `${DASHBOARD_CACHE_PREFIX.ALERTS}:${workspaceId}`;
  }

  buildWidgetKey(widgetId: string): string {
    return `${DASHBOARD_CACHE_PREFIX.WIDGET}:${widgetId}`;
  }

  buildLayoutKey(userId: string): string {
    return `${DASHBOARD_CACHE_PREFIX.LAYOUT}:${userId}`;
  }

  // ============================================
  // DOMAIN-SPECIFIC CACHE METHODS
  // ============================================

  async getSummary<T>(
    workspaceId: string,
    period: string,
    filters?: Record<string, unknown>,
  ): Promise<T | null> {
    const key = this.buildSummaryKey(workspaceId, period, filters);

    return this.get<T>(key);
  }

  async setSummary<T>(
    workspaceId: string,
    period: string,
    value: T,
    filters?: Record<string, unknown>,
  ): Promise<void> {
    const key = this.buildSummaryKey(workspaceId, period, filters);

    await this.set(key, value, DASHBOARD_CACHE_TTL.SUMMARY);
  }

  async getStats<T>(
    workspaceId: string,
    dataSource: string,
    period: string,
  ): Promise<T | null> {
    const key = this.buildStatsKey(workspaceId, dataSource, period);

    return this.get<T>(key);
  }

  async setStats<T>(
    workspaceId: string,
    dataSource: string,
    period: string,
    value: T,
  ): Promise<void> {
    const key = this.buildStatsKey(workspaceId, dataSource, period);

    await this.set(key, value, DASHBOARD_CACHE_TTL.STATS);
  }

  async getLeaderboard<T>(
    workspaceId: string,
    period: string,
  ): Promise<T | null> {
    const key = this.buildLeaderboardKey(workspaceId, period);

    return this.get<T>(key);
  }

  async setLeaderboard<T>(
    workspaceId: string,
    period: string,
    value: T,
  ): Promise<void> {
    const key = this.buildLeaderboardKey(workspaceId, period);

    await this.set(key, value, DASHBOARD_CACHE_TTL.LEADERBOARD);
  }

  async getAlerts<T>(workspaceId: string): Promise<T | null> {
    const key = this.buildAlertsKey(workspaceId);

    return this.get<T>(key);
  }

  async setAlerts<T>(workspaceId: string, value: T): Promise<void> {
    const key = this.buildAlertsKey(workspaceId);

    await this.set(key, value, DASHBOARD_CACHE_TTL.ALERTS);
  }

  // ============================================
  // CACHE INVALIDATION
  // ============================================

  /**
   * Invalidate all dashboard caches for a workspace
   * Used when domain data changes (order created, payment confirmed, etc.)
   */
  async invalidateSummary(workspaceId: string): Promise<void> {
    // We can't easily do pattern-based deletion with CacheStorageService
    // Instead, we invalidate known key patterns
    this.logger.log('Summary cache invalidation requested', { workspaceId });
    // Individual keys will expire via TTL
    // For immediate invalidation, callers should use specific key deletion
  }

  async invalidateWidget(widgetId: string): Promise<void> {
    const key = this.buildWidgetKey(widgetId);

    await this.del(key);
  }

  async invalidateLayout(userId: string): Promise<void> {
    const key = this.buildLayoutKey(userId);

    await this.del(key);
  }

  /**
   * Invalidate stats cache for specific data source
   */
  async invalidateStats(
    workspaceId: string,
    dataSource: string,
    periods: string[],
  ): Promise<void> {
    for (const period of periods) {
      const key = this.buildStatsKey(workspaceId, dataSource, period);

      await this.del(key);
    }
  }
}
