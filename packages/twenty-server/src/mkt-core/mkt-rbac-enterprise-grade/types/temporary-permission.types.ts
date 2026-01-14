/**
 * Temporary Permission Types
 *
 * Types for temporary permission management operations
 */

import { MktTemporaryPermissionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * Purpose categories for temporary permissions
 */
export const TemporaryPermissionPurpose = {
  EMERGENCY_ACCESS: 'EMERGENCY_ACCESS',
  CROSS_DEPARTMENT_COLLABORATION: 'CROSS_DEPARTMENT_COLLABORATION',
  PROJECT_ASSIGNMENT: 'PROJECT_ASSIGNMENT',
  TEMPORARY_COVERAGE: 'TEMPORARY_COVERAGE',
  TRAINING_ACCESS: 'TRAINING_ACCESS',
  AUDIT_REVIEW: 'AUDIT_REVIEW',
  OTHER: 'OTHER',
} as const;

export type TemporaryPermissionPurpose =
  (typeof TemporaryPermissionPurpose)[keyof typeof TemporaryPermissionPurpose];

/**
 * Revocation reasons
 */
export const RevokeReason = {
  EXPIRED: 'EXPIRED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  SECURITY_CONCERN: 'SECURITY_CONCERN',
  ROLE_CHANGED: 'ROLE_CHANGED',
  MANUAL_REVOCATION: 'MANUAL_REVOCATION',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  OTHER: 'OTHER',
} as const;

export type RevokeReason = (typeof RevokeReason)[keyof typeof RevokeReason];

/**
 * Create temporary permission input
 */
export type CreateTemporaryPermissionInput = {
  granteeWorkspaceMemberId: string;
  granterWorkspaceMemberId?: string;
  objectName: string;
  recordId?: string;
  canRead?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  expiresAt: Date;
  reason: string;
  purpose?: TemporaryPermissionPurpose;
};

/**
 * Grant temporary permission input (simplified)
 */
export type GrantTemporaryAccessInput = {
  granteeWorkspaceMemberId: string;
  granterWorkspaceMemberId: string;
  objectName: string;
  recordId?: string;
  permissions: {
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  durationHours?: number;
  expiresAt?: Date;
  reason: string;
  purpose?: TemporaryPermissionPurpose;
};

/**
 * Revoke permission input
 */
export type RevokeTemporaryPermissionInput = {
  revokedById: string;
  reason: RevokeReason;
};

/**
 * Query options for temporary permissions
 */
export type TemporaryPermissionQueryOptions = {
  includeRelations?: boolean;
  includeExpired?: boolean;
  includeRevoked?: boolean;
  objectName?: string;
  purpose?: TemporaryPermissionPurpose;
  referenceDate?: Date;
};

/**
 * Temporary permission list result
 */
export type TemporaryPermissionListResult = {
  permissions: MktTemporaryPermissionWorkspaceEntity[];
  total: number;
  activeCount: number;
  expiredCount: number;
  revokedCount: number;
};

/**
 * Permission check result
 */
export type TemporaryPermissionCheckResult = {
  hasPermission: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  expiresAt?: Date;
  permissions: MktTemporaryPermissionWorkspaceEntity[];
};

/**
 * User temporary permissions summary
 */
export type UserTemporaryPermissionsSummary = {
  userId: string;
  workspaceMemberId: string;
  activePermissions: number;
  expiredPermissions: number;
  revokedPermissions: number;
  permissionsByObject: Record<string, number>;
  permissionsByPurpose: Record<string, number>;
  earliestExpiry?: Date;
  latestExpiry?: Date;
};
