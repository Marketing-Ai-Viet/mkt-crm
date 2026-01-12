/**
 * RBAC Pub/Sub Types
 *
 * Type definitions specific to RBAC cross-region pub/sub communication.
 *
 * Note: Config types (RbacPubSubConfig, RbacPubSubServiceStatus) are
 * exported from casbin/config module to avoid duplicate exports.
 */

// Re-export common types from infrastructure
export type {
  MessageHandler,
  PubSubMessage,
  PublishOptions,
  RbacInvalidationPayload,
  SubscriptionOptions,
} from 'src/mkt-core/infrastructure/redis/services/redis-pubsub.service';

// Local type aliases for pubsub module usage
// These are imported, not re-exported to avoid conflicts
import { RbacPubSubConfig } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config/rbac-config.schema';
import { RbacPubSubServiceStatus } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config/rbac-config.types';

// Aliases for backward compatibility within this module only
export type CrossRegionPubSubConfig = RbacPubSubConfig;
export type PubSubServiceStatus = RbacPubSubServiceStatus;
