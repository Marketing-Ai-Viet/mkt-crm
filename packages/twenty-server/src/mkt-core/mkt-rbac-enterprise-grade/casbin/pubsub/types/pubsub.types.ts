/**
 * RBAC Pub/Sub Types
 *
 * Centralized type definitions for RBAC cross-region pub/sub communication.
 */

// Re-export common types from infrastructure
export type {
  MessageHandler,
  PubSubMessage,
  PublishOptions,
  RbacInvalidationPayload,
  SubscriptionOptions,
} from 'src/mkt-core/infrastructure/redis/services/redis-pubsub.service';

// Re-export config types from centralized config
export type {
  RbacPubSubConfig,
  RbacPubSubServiceStatus,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config/rbac-config.types';

// Aliases for convenience (same as config types)
export type { RbacPubSubConfig as CrossRegionPubSubConfig } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config/rbac-config.types';
export type { RbacPubSubServiceStatus as PubSubServiceStatus } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config/rbac-config.types';
