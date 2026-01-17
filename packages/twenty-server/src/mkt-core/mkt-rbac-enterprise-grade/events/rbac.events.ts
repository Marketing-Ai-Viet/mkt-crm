/**
 * RBAC Event Classes
 *
 * Event definitions for RBAC module
 */

// ============================================
// PERMISSION TEMPLATE EVENTS
// ============================================

export class PermissionTemplateCreatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly templateId: string,
    public readonly templateName: string,
    public readonly createdBy: string,
  ) {}
}

export class PermissionTemplateUpdatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly templateId: string,
    public readonly templateName: string,
    public readonly updatedBy: string,
    public readonly changes: Record<string, unknown>,
  ) {}
}

export class PermissionTemplateDeletedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly templateId: string,
    public readonly deletedBy: string,
  ) {}
}

// ============================================
// USER ROLE EVENTS
// ============================================

export class UserRoleAssignedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly templateId: string,
    public readonly assignedBy: string,
  ) {}
}

export class UserRoleRevokedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly templateId: string,
    public readonly revokedBy: string,
  ) {}
}

// ============================================
// POLICY EVENTS
// ============================================

export class PolicyCreatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly policyId: string,
    public readonly policyName: string,
    public readonly createdBy: string,
  ) {}
}

export class PolicyUpdatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly policyId: string,
    public readonly updatedBy: string,
    public readonly changes: Record<string, unknown>,
  ) {}
}

export class PolicyDeletedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly policyId: string,
    public readonly deletedBy: string,
  ) {}
}

// ============================================
// PERMISSION CHECK EVENTS
// ============================================

export class PermissionGrantedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly action: string,
    public readonly resourceType: string,
    public readonly resourceId: string | undefined,
    public readonly source: string,
  ) {}
}

export class PermissionDeniedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly action: string,
    public readonly resourceType: string,
    public readonly resourceId: string | undefined,
    public readonly reason: string,
    public readonly failedStep?: number,
  ) {}
}

// ============================================
// TEMPORARY PERMISSION EVENTS
// ============================================

export class TemporaryPermissionGrantedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly permissionId: string,
    public readonly userId: string,
    public readonly action: string,
    public readonly resourceType: string,
    public readonly expiresAt: Date,
    public readonly grantedBy: string,
  ) {}
}

export class TemporaryPermissionRevokedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly permissionId: string,
    public readonly userId: string,
    public readonly revokedBy: string,
  ) {}
}

export class TemporaryPermissionExpiredEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly permissionId: string,
    public readonly userId: string,
  ) {}
}

// ============================================
// CACHE EVENTS
// ============================================

export class RbacCacheInvalidatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly tags: string[],
    public readonly reason: string,
  ) {}
}

export class RbacCacheWarmedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly itemsWarmed: number,
    public readonly durationMs: number,
  ) {}
}

// ============================================
// EVENT NAMES (for event emitter)
// ============================================

export const RBAC_EVENTS = {
  // Permission template events
  PERMISSION_TEMPLATE_CREATED: 'rbac-seeder.permission-template.created',
  PERMISSION_TEMPLATE_UPDATED: 'rbac-seeder.permission-template.updated',
  PERMISSION_TEMPLATE_DELETED: 'rbac-seeder.permission-template.deleted',

  // User role events
  USER_ROLE_ASSIGNED: 'rbac-seeder.user-role.assigned',
  USER_ROLE_REVOKED: 'rbac-seeder.user-role.revoked',

  // Policy events
  POLICY_CREATED: 'rbac-seeder.policy.created',
  POLICY_UPDATED: 'rbac-seeder.policy.updated',
  POLICY_DELETED: 'rbac-seeder.policy.deleted',

  // Policy change approval events
  POLICY_CHANGE_REQUESTED: 'rbac-seeder.policy-change.requested',
  POLICY_CHANGE_APPROVED: 'rbac-seeder.policy-change.approved',
  POLICY_CHANGE_REJECTED: 'rbac-seeder.policy-change.rejected',
  POLICY_CHANGE_APPLIED: 'rbac-seeder.policy-change.applied',

  // Permission check events
  PERMISSION_GRANTED: 'rbac-seeder.permission.granted',
  PERMISSION_DENIED: 'rbac-seeder.permission.denied',

  // Temporary permission events
  TEMPORARY_PERMISSION_GRANTED: 'rbac-seeder.temporary-permission.granted',
  TEMPORARY_PERMISSION_REVOKED: 'rbac-seeder.temporary-permission.revoked',
  TEMPORARY_PERMISSION_EXPIRED: 'rbac-seeder.temporary-permission.expired',

  // Cache events
  CACHE_INVALIDATED: 'rbac-seeder.cache.invalidated',
  CACHE_WARMED: 'rbac-seeder.cache.warmed',

  // Cross-region invalidation events
  CROSS_REGION_INVALIDATION: 'rbac-seeder.cross-region.invalidation',
} as const;
