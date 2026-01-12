/**
 * RBAC Configuration Types
 *
 * Additional types not generated from Zod schemas
 *
 * Note: Main config types are now defined in rbac-config.schema.ts
 * and inferred from Zod schemas for type safety.
 */

/**
 * Pub/sub service status
 *
 * Runtime status type (not configurable via env)
 */
export type RbacPubSubServiceStatus = {
  enabled: boolean;
  connected: boolean;
  instanceId: string;
  pendingInvalidations: number;
  subscribedChannels?: string[];
};
