import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import IORedis from 'ioredis';

import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonParse, safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { REDIS_LOG_CONTEXT } from 'src/mkt-core/infrastructure/redis/constants/redis.constants';
import {
  PubSubChannel,
  PUBSUB_CHANNELS,
} from 'src/mkt-core/infrastructure/redis/constants/cache-keys.constant';

// ============================================
// TYPES
// ============================================

/**
 * Base pub/sub message structure
 */
export type PubSubMessage<T = unknown> = {
  /** Unique message ID */
  id: string;
  /** Source instance ID (to prevent self-processing) */
  sourceInstanceId: string;
  /** Channel the message was published to */
  channel: string;
  /** Message payload */
  payload: T;
  /** Timestamp when message was created */
  timestamp: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Message handler function type
 */
export type MessageHandler<T = unknown> = (
  message: PubSubMessage<T>,
) => void | Promise<void>;

/**
 * Subscription options
 */
export type SubscriptionOptions = {
  /** Whether to ignore messages from self (default: true) */
  ignoreSelf?: boolean;
  /** Whether to handle errors silently (default: true) */
  silentErrors?: boolean;
};

/**
 * Publish options
 */
export type PublishOptions = {
  /** Additional metadata to include */
  metadata?: Record<string, unknown>;
};

/**
 * Pub/Sub service configuration
 */
export type PubSubConfig = {
  /** Unique instance ID (defaults to random UUID) */
  instanceId?: string;
  /** Reconnect delay in ms (default: 1000) */
  reconnectDelayMs?: number;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
};

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_CONFIG: Required<PubSubConfig> = {
  instanceId: `instance-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  reconnectDelayMs: 1000,
  maxReconnectAttempts: 10,
};

/**
 * Redis Pub/Sub Service
 *
 * Provides reusable, type-safe Redis Pub/Sub functionality for cross-region
 * communication and distributed event handling.
 *
 * Features:
 * - Type-safe message publishing and subscribing
 * - Automatic JSON serialization/deserialization
 * - Self-message filtering (prevent self-loops)
 * - Automatic reconnection handling
 * - Multiple channel subscriptions
 * - Graceful cleanup on module destroy
 *
 * @example
 * ```typescript
 * // Subscribe to a channel
 * await pubsubService.subscribe<MyPayload>(
 *   PUBSUB_CHANNELS.RBAC_POLICY_INVALIDATION,
 *   (message) => {
 *     console.log('Received:', message.payload);
 *     // Handle the message
 *   }
 * );
 *
 * // Publish to a channel
 * await pubsubService.publish<MyPayload>(
 *   PUBSUB_CHANNELS.RBAC_POLICY_INVALIDATION,
 *   { workspaceId: 'ws-123', reason: 'policy_updated' }
 * );
 * ```
 */
@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(`${REDIS_LOG_CONTEXT}:PubSub`);
  private readonly config: Required<PubSubConfig>;

  // Dedicated clients for pub/sub (required by Redis)
  private publisherClient: IORedis | null = null;
  private subscriberClient: IORedis | null = null;

  // Message handlers by channel
  private readonly handlers = new Map<
    string,
    Set<{
      handler: MessageHandler;
      options: SubscriptionOptions;
    }>
  >();

  // Subscribed channels
  private readonly subscribedChannels = new Set<string>();

  // Connection state
  private isConnected = false;
  private reconnectAttempts = 0;

  constructor(private readonly redisClientService: RedisClientService) {
    this.config = { ...DEFAULT_CONFIG };
  }

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Get instance ID (useful for debugging)
   */
  getInstanceId(): string {
    return this.config.instanceId;
  }

  /**
   * Check if service is connected
   */
  isServiceConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get list of subscribed channels
   */
  getSubscribedChannels(): string[] {
    return Array.from(this.subscribedChannels);
  }

  /**
   * Subscribe to a channel
   *
   * @param channel - Channel to subscribe to
   * @param handler - Message handler function
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  async subscribe<T = unknown>(
    channel: PubSubChannel | string,
    handler: MessageHandler<T>,
    options: SubscriptionOptions = {},
  ): Promise<() => Promise<void>> {
    const opts: SubscriptionOptions = {
      ignoreSelf: true,
      silentErrors: true,
      ...options,
    };

    // Register handler
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }

    const handlerEntry = {
      handler: handler as MessageHandler,
      options: opts,
    };

    const channelHandlersSet = this.handlers.get(channel);

    if (channelHandlersSet) {
      channelHandlersSet.add(handlerEntry);
    }

    // Subscribe to channel if not already subscribed
    if (!this.subscribedChannels.has(channel)) {
      await this.subscribeToChannel(channel);
    }

    this.logger.debug(`Subscribed to channel: ${channel}`);

    // Return unsubscribe function
    return async () => {
      const channelHandlers = this.handlers.get(channel);

      if (channelHandlers) {
        channelHandlers.delete(handlerEntry);

        // If no more handlers, unsubscribe from channel
        if (channelHandlers.size === 0) {
          this.handlers.delete(channel);
          await this.unsubscribeFromChannel(channel);
        }
      }
    };
  }

  /**
   * Publish a message to a channel
   *
   * @param channel - Channel to publish to
   * @param payload - Message payload
   * @param options - Publish options
   * @returns Number of subscribers that received the message
   */
  async publish<T = unknown>(
    channel: PubSubChannel | string,
    payload: T,
    options: PublishOptions = {},
  ): Promise<number> {
    if (!this.publisherClient) {
      this.logger.warn('Publisher client not initialized');

      return 0;
    }

    const message: PubSubMessage<T> = {
      id: this.generateMessageId(),
      sourceInstanceId: this.config.instanceId,
      channel,
      payload,
      timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
      metadata: options.metadata,
    };

    const serialized = safeJsonStringify(message);

    if (!serialized) {
      this.logger.error('Failed to serialize message');

      return 0;
    }

    try {
      const subscriberCount = await this.publisherClient.publish(
        channel,
        serialized,
      );

      this.logger.debug(
        `Published message to ${channel}, received by ${subscriberCount} subscribers`,
      );

      return subscriberCount;
    } catch (error) {
      this.logger.error(`Failed to publish to ${channel}: ${error}`);

      return 0;
    }
  }

  /**
   * Publish to multiple channels
   *
   * @param channels - Channels to publish to
   * @param payload - Message payload
   * @param options - Publish options
   */
  async publishToMany<T = unknown>(
    channels: Array<PubSubChannel | string>,
    payload: T,
    options: PublishOptions = {},
  ): Promise<void> {
    await Promise.all(
      channels.map((channel) => this.publish(channel, payload, options)),
    );
  }

  // ============================================
  // PREDEFINED CHANNEL HELPERS
  // ============================================

  /**
   * Subscribe to RBAC policy invalidation events
   */
  async subscribeRbacInvalidation(
    handler: MessageHandler<RbacInvalidationPayload>,
    options?: SubscriptionOptions,
  ): Promise<() => Promise<void>> {
    return this.subscribe(
      PUBSUB_CHANNELS.RBAC_POLICY_INVALIDATION,
      handler,
      options,
    );
  }

  /**
   * Publish RBAC policy invalidation event
   */
  async publishRbacInvalidation(
    payload: RbacInvalidationPayload,
    options?: PublishOptions,
  ): Promise<number> {
    return this.publish(
      PUBSUB_CHANNELS.RBAC_POLICY_INVALIDATION,
      payload,
      options,
    );
  }

  /**
   * Subscribe to cache invalidation events
   */
  async subscribeCacheInvalidation(
    handler: MessageHandler<CacheInvalidationPayload>,
    options?: SubscriptionOptions,
  ): Promise<() => Promise<void>> {
    return this.subscribe(PUBSUB_CHANNELS.CACHE_INVALIDATION, handler, options);
  }

  /**
   * Publish cache invalidation event
   */
  async publishCacheInvalidation(
    payload: CacheInvalidationPayload,
    options?: PublishOptions,
  ): Promise<number> {
    return this.publish(PUBSUB_CHANNELS.CACHE_INVALIDATION, payload, options);
  }

  /**
   * Subscribe to department hierarchy events
   */
  async subscribeDepartmentHierarchy(
    handler: MessageHandler<DepartmentHierarchyPayload>,
    options?: SubscriptionOptions,
  ): Promise<() => Promise<void>> {
    return this.subscribe(
      PUBSUB_CHANNELS.DEPARTMENT_HIERARCHY,
      handler,
      options,
    );
  }

  /**
   * Publish department hierarchy event
   */
  async publishDepartmentHierarchy(
    payload: DepartmentHierarchyPayload,
    options?: PublishOptions,
  ): Promise<number> {
    return this.publish(PUBSUB_CHANNELS.DEPARTMENT_HIERARCHY, payload, options);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Initialize pub/sub clients
   */
  private async initialize(): Promise<void> {
    try {
      // Create dedicated clients (pub/sub requires separate connections)
      const baseClient = this.redisClientService.getClient();

      this.publisherClient = baseClient.duplicate();
      this.subscriberClient = baseClient.duplicate();

      // Setup message handler
      this.subscriberClient.on(
        'message',
        (channel: string, message: string) => {
          void this.handleMessage(channel, message);
        },
      );

      // Setup connection handlers
      this.subscriberClient.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logger.log('Pub/Sub subscriber connected');
      });

      this.subscriberClient.on('error', (error) => {
        this.logger.error(`Pub/Sub subscriber error: ${error.message}`);
      });

      this.subscriberClient.on('close', () => {
        this.isConnected = false;
        this.logger.warn('Pub/Sub subscriber disconnected');
        void this.handleReconnect();
      });

      this.isConnected = true;
      this.logger.log(
        `Pub/Sub service initialized (instance: ${this.config.instanceId})`,
      );
    } catch (error) {
      this.logger.error(`Failed to initialize Pub/Sub: ${error}`);
    }
  }

  /**
   * Handle reconnection
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached');

      return;
    }

    this.reconnectAttempts++;

    await new Promise((resolve) =>
      setTimeout(resolve, this.config.reconnectDelayMs),
    );

    try {
      // Re-subscribe to all channels
      for (const channel of this.subscribedChannels) {
        await this.subscriberClient?.subscribe(channel);
      }

      this.logger.log(
        `Reconnected and re-subscribed to ${this.subscribedChannels.size} channels`,
      );
    } catch (error) {
      this.logger.error(`Reconnect failed: ${error}`);
      void this.handleReconnect();
    }
  }

  /**
   * Subscribe to a Redis channel
   */
  private async subscribeToChannel(channel: string): Promise<void> {
    if (!this.subscriberClient) {
      throw new Error('Subscriber client not initialized');
    }

    await this.subscriberClient.subscribe(channel);
    this.subscribedChannels.add(channel);
  }

  /**
   * Unsubscribe from a Redis channel
   */
  private async unsubscribeFromChannel(channel: string): Promise<void> {
    if (!this.subscriberClient) {
      return;
    }

    await this.subscriberClient.unsubscribe(channel);
    this.subscribedChannels.delete(channel);

    this.logger.debug(`Unsubscribed from channel: ${channel}`);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(
    channel: string,
    rawMessage: string,
  ): Promise<void> {
    const parseResult = safeJsonParse<PubSubMessage>(rawMessage);

    if (!parseResult.success || !parseResult.data) {
      this.logger.warn(`Failed to parse message on ${channel}`);

      return;
    }

    const message = parseResult.data;
    const channelHandlers = this.handlers.get(channel);

    if (!channelHandlers || channelHandlers.size === 0) {
      return;
    }

    for (const { handler, options } of channelHandlers) {
      // Skip if from self and ignoreSelf is true
      if (
        options.ignoreSelf &&
        message.sourceInstanceId === this.config.instanceId
      ) {
        continue;
      }

      try {
        await handler(message);
      } catch (error) {
        if (!options.silentErrors) {
          this.logger.error(`Handler error on ${channel}: ${error}`);
        }
      }
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Shutdown pub/sub clients
   */
  private async shutdown(): Promise<void> {
    // Unsubscribe from all channels
    if (this.subscriberClient) {
      for (const channel of this.subscribedChannels) {
        try {
          await this.subscriberClient.unsubscribe(channel);
        } catch (error) {
          this.logger.debug(`Error unsubscribing from ${channel}: ${error}`);
        }
      }

      await this.subscriberClient.quit();
      this.subscriberClient = null;
    }

    if (this.publisherClient) {
      await this.publisherClient.quit();
      this.publisherClient = null;
    }

    this.handlers.clear();
    this.subscribedChannels.clear();
    this.isConnected = false;

    this.logger.log('Pub/Sub service shut down');
  }
}

// ============================================
// PAYLOAD TYPES
// ============================================

/**
 * RBAC policy invalidation payload
 */
export type RbacInvalidationPayload = {
  workspaceId: string;
  reason: string;
  policyIds?: string[];
  userId?: string;
  fullReload?: boolean;
};

/**
 * Cache invalidation payload
 */
export type CacheInvalidationPayload = {
  keys?: string[];
  patterns?: string[];
  tags?: string[];
  namespace?: string;
};

/**
 * Department hierarchy payload
 */
export type DepartmentHierarchyPayload = {
  workspaceId: string;
  departmentId: string;
  changeType: 'created' | 'updated' | 'deleted';
  parentDepartmentId?: string;
};
