import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  RBAC_PUBSUB_DEFAULTS,
  RBAC_PUBSUB_ENV,
} from 'src/mkt-core/infrastructure/redis/constants/pubsub.constant';
import { RedisPubSubService } from 'src/mkt-core/infrastructure/redis/services/redis-pubsub.service';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { RBAC_EVENTS } from 'src/mkt-core/mkt-rbac-enterprise-grade/events/rbac.events';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

import {
  CrossRegionPubSubConfig,
  PubSubMessage,
  PubSubServiceStatus,
  RbacInvalidationPayload,
} from './types';

/**
 * Cross-Region Invalidation Pub/Sub Service
 *
 * Handles policy invalidation across multiple server instances/regions
 * using Redis Pub/Sub for real-time notification.
 *
 * Features:
 * - Real-time cross-region policy invalidation via Redis Pub/Sub
 * - Debouncing to prevent thundering herd
 * - Self-message filtering (prevent loops)
 * - Graceful degradation when Redis unavailable
 *
 * Architecture:
 * - When policies change locally, publish invalidation event
 * - Other instances receive event and invalidate their caches
 * - Hourly cron job ensures eventual consistency (see CrossRegionReloadJob)
 *
 * @example
 * ```typescript
 * // Publish invalidation for a workspace
 * await crossRegionPubSub.publishInvalidation('ws-123', 'policy_updated');
 *
 * // Force full reload (for recovery scenarios)
 * await crossRegionPubSub.forceFullReload();
 * ```
 */
@Injectable()
export class CrossRegionInvalidationPubSub
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:CrossRegionInvalidationPubSub`,
  );

  private readonly config: CrossRegionPubSubConfig;
  private unsubscribe: (() => Promise<void>) | null = null;

  // Debounce tracking
  private readonly pendingInvalidations = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly pubsubService: RedisPubSubService,
    private readonly enforcerService: CasbinEnforcerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.config = this.loadConfig();
  }

  async onModuleInit(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.warn('Cross-region invalidation disabled');

      return;
    }

    await this.subscribeToInvalidations();
    this.logger.log(
      `Cross-region invalidation enabled (instance: ${this.pubsubService.getInstanceId()})`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    // Clear pending debounce timers
    for (const timer of this.pendingInvalidations.values()) {
      clearTimeout(timer);
    }
    this.pendingInvalidations.clear();

    // Unsubscribe from Pub/Sub
    if (this.unsubscribe) {
      await this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Publish invalidation event to all regions
   *
   * @param workspaceId - Workspace to invalidate
   * @param reason - Reason for invalidation (for logging)
   * @param options - Additional options
   */
  async publishInvalidation(
    workspaceId: string,
    reason: string,
    options?: {
      policyIds?: string[];
      userId?: string;
      fullReload?: boolean;
    },
  ): Promise<void> {
    if (!this.config.enabled) {
      // Fallback: just invalidate locally
      await this.enforcerService.invalidateCache(workspaceId);

      return;
    }

    const payload: RbacInvalidationPayload = {
      workspaceId,
      reason,
      policyIds: options?.policyIds,
      userId: options?.userId,
      fullReload: options?.fullReload,
    };

    try {
      const subscriberCount = await this.pubsubService.publishRbacInvalidation(
        payload,
        {
          metadata: {
            publishedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
          },
        },
      );

      this.logger.debug(
        `Published invalidation for ${workspaceId}: ${reason} (${subscriberCount} subscribers)`,
      );

      // Also invalidate locally (not covered by self-filtering since we're publishing)
      await this.enforcerService.invalidateCache(workspaceId);
    } catch (error) {
      this.logger.error(`Failed to publish invalidation: ${error}`);
      // Fallback: just invalidate locally
      await this.enforcerService.invalidateCache(workspaceId);
    }
  }

  /**
   * Publish full reload request to all regions
   */
  async publishFullReload(reason = 'manual_trigger'): Promise<void> {
    if (!this.config.enabled) {
      await this.enforcerService.invalidateAllCaches();

      return;
    }

    const payload: RbacInvalidationPayload = {
      workspaceId: '*',
      reason,
      fullReload: true,
    };

    try {
      await this.pubsubService.publishRbacInvalidation(payload);

      this.logger.log(`Published full reload request: ${reason}`);

      // Also reload locally
      await this.enforcerService.invalidateAllCaches();
    } catch (error) {
      this.logger.error(`Failed to publish full reload: ${error}`);
      await this.enforcerService.invalidateAllCaches();
    }
  }

  /**
   * Force full reload locally (for recovery)
   */
  async forceFullReload(): Promise<void> {
    await this.enforcerService.invalidateAllCaches();
    this.logger.log('Forced full reload completed');
  }

  /**
   * Get service status
   */
  getStatus(): PubSubServiceStatus {
    return {
      enabled: this.config.enabled,
      connected: this.pubsubService.isServiceConnected(),
      instanceId: this.pubsubService.getInstanceId(),
      pendingInvalidations: this.pendingInvalidations.size,
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Load configuration from environment
   */
  private loadConfig(): CrossRegionPubSubConfig {
    return {
      enabled: process.env[RBAC_PUBSUB_ENV.MULTI_REGION_ENABLED] !== 'false',
      fallbackReloadIntervalMs: parseInt(
        process.env[RBAC_PUBSUB_ENV.FALLBACK_RELOAD_INTERVAL_MS] ??
          String(RBAC_PUBSUB_DEFAULTS.FALLBACK_RELOAD_INTERVAL_MS),
        10,
      ),
      debounceMs: parseInt(
        process.env[RBAC_PUBSUB_ENV.INVALIDATION_DEBOUNCE_MS] ??
          String(RBAC_PUBSUB_DEFAULTS.DEBOUNCE_MS),
        10,
      ),
      maxMessageAgeMs: RBAC_PUBSUB_DEFAULTS.MAX_MESSAGE_AGE_MS,
      reconnectDelayMs: RBAC_PUBSUB_DEFAULTS.RECONNECT_DELAY_MS,
      maxReconnectAttempts: RBAC_PUBSUB_DEFAULTS.MAX_RECONNECT_ATTEMPTS,
    };
  }

  /**
   * Subscribe to invalidation events from other regions
   */
  private async subscribeToInvalidations(): Promise<void> {
    this.unsubscribe = await this.pubsubService.subscribeRbacInvalidation(
      (message) => this.handleExternalInvalidation(message),
      { ignoreSelf: true }, // Don't process our own messages
    );
  }

  /**
   * Handle invalidation event from another region
   */
  private async handleExternalInvalidation(
    message: PubSubMessage<RbacInvalidationPayload>,
  ): Promise<void> {
    const { payload } = message;

    this.logger.debug(
      `Received external invalidation: ${payload.workspaceId} - ${payload.reason}`,
    );

    // Emit event for other listeners
    this.eventEmitter.emit(RBAC_EVENTS.CROSS_REGION_INVALIDATION, {
      workspaceId: payload.workspaceId,
      reason: payload.reason,
      sourceInstanceId: message.sourceInstanceId,
      timestamp: message.timestamp,
    });

    // Handle with debouncing
    if (payload.fullReload || payload.workspaceId === '*') {
      // Full reload - clear all pending and reload
      this.clearPendingInvalidations();
      await this.enforcerService.invalidateAllCaches();

      this.logger.log('External full reload processed');

      return;
    }

    // Debounce per-workspace invalidations
    this.scheduleInvalidation(payload.workspaceId);
  }

  /**
   * Schedule debounced invalidation
   */
  private scheduleInvalidation(workspaceId: string): void {
    // Clear existing timer for this workspace
    const existingTimer = this.pendingInvalidations.get(workspaceId);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new invalidation
    const timer = setTimeout(async () => {
      this.pendingInvalidations.delete(workspaceId);

      try {
        await this.enforcerService.invalidateCache(workspaceId);

        this.logger.debug(
          `Processed debounced invalidation for ${workspaceId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process invalidation for ${workspaceId}: ${error}`,
        );
      }
    }, this.config.debounceMs);

    this.pendingInvalidations.set(workspaceId, timer);
  }

  /**
   * Clear all pending invalidations
   */
  private clearPendingInvalidations(): void {
    for (const timer of this.pendingInvalidations.values()) {
      clearTimeout(timer);
    }
    this.pendingInvalidations.clear();
  }
}
