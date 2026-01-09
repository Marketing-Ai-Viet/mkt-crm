/**
 * Cache Key Builder Utilities
 *
 * Functions for building consistent cache keys for RBAC
 */

import { RBAC_CACHE_PREFIX } from 'src/mkt-core/infrastructure/redis/constants';

/**
 * Build cache key for permission template
 */
export const buildPermissionTemplateKey = (templateId: string): string =>
  `${RBAC_CACHE_PREFIX.PERMISSION_TEMPLATE}:${templateId}`;

/**
 * Build cache key for user permissions
 */
export const buildUserPermissionsKey = (userId: string): string =>
  `${RBAC_CACHE_PREFIX.USER_PERMISSIONS}:${userId}`;

/**
 * Build cache key for policy
 */
export const buildPolicyKey = (policyId: string): string =>
  `${RBAC_CACHE_PREFIX.POLICY}:${policyId}`;

/**
 * Build cache key for hierarchy
 */
export const buildHierarchyKey = (userId: string): string =>
  `${RBAC_CACHE_PREFIX.HIERARCHY}:${userId}`;

/**
 * Build cache key for validation result
 */
export const buildValidationResultKey = (
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
): string => {
  const base = `${RBAC_CACHE_PREFIX.VALIDATION}:${userId}:${action}:${resourceType}`;

  return resourceId ? `${base}:${resourceId}` : base;
};

/**
 * Build cache key for user context
 */
export const buildUserContextKey = (userId: string): string =>
  `${RBAC_CACHE_PREFIX.USER_CONTEXT}:${userId}`;

/**
 * Build cache key for data access policy
 */
export const buildDataAccessPolicyKey = (policyId: string): string =>
  `${RBAC_CACHE_PREFIX.DATA_ACCESS_POLICY}:${policyId}`;

/**
 * Build cache key for audit log
 */
export const buildAuditLogKey = (logId: string): string =>
  `${RBAC_CACHE_PREFIX.AUDIT_LOG}:${logId}`;

/**
 * Extract components from a validation result cache key
 */
export const parseValidationResultKey = (
  key: string,
): {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
} | null => {
  const prefix = RBAC_CACHE_PREFIX.VALIDATION;

  if (!key.startsWith(prefix)) {
    return null;
  }

  const parts = key.slice(prefix.length + 1).split(':');

  if (parts.length < 3) {
    return null;
  }

  return {
    userId: parts[0],
    action: parts[1],
    resourceType: parts[2],
    resourceId: parts[3],
  };
};

/**
 * RBAC Cache Keys helper object
 */
export const RBAC_CACHE_KEYS = {
  permissionTemplate: buildPermissionTemplateKey,
  userPermissions: buildUserPermissionsKey,
  policy: buildPolicyKey,
  hierarchy: buildHierarchyKey,
  validationResult: buildValidationResultKey,
  userContext: buildUserContextKey,
  dataAccessPolicy: buildDataAccessPolicyKey,
  auditLog: buildAuditLogKey,
} as const;

/**
 * RBAC Cache Tags for invalidation
 */
export const RBAC_CACHE_TAGS = {
  PERMISSION_TEMPLATE: 'rbac:permission-template',
  USER: 'rbac:user',
  POLICY: 'rbac:policy',
  HIERARCHY: 'rbac:hierarchy',
  VALIDATION: 'rbac:validation',
  DATA_ACCESS_POLICY: 'rbac:data-access-policy',
  AUDIT_LOG: 'rbac:audit-log',
} as const;

/**
 * Build tag for specific user
 */
export const buildUserTag = (userId: string): string =>
  `${RBAC_CACHE_TAGS.USER}:${userId}`;

/**
 * Build tag for specific template
 */
export const buildTemplateTag = (templateId: string): string =>
  `${RBAC_CACHE_TAGS.PERMISSION_TEMPLATE}:${templateId}`;

/**
 * Build tag for specific policy
 */
export const buildPolicyTag = (policyId: string): string =>
  `${RBAC_CACHE_TAGS.POLICY}:${policyId}`;
