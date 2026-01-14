/**
 * Template Resource Permission Types
 *
 * Types for template resource permission management operations
 */

import { MktTemplateResourcePermissionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * Permission conditions for conditional access
 */
export type PermissionConditions = {
  ownershipRequired?: boolean;
  departmentRestricted?: boolean;
  departmentIds?: string[];
  fieldRestrictions?: string[];
  customConditions?: Record<string, unknown>;
};

/**
 * Permission restrictions for access control
 */
export type PermissionRestrictions = {
  timeRestriction?: {
    startTime?: string; // HH:mm format
    endTime?: string;
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    timezone?: string;
  };
  ipRestriction?: {
    allowedIps?: string[];
    deniedIps?: string[];
  };
  maxUsagePerDay?: number;
  requiresMfa?: boolean;
  customRestrictions?: Record<string, unknown>;
};

/**
 * Create resource permission input
 */
export type CreateResourcePermissionInput = {
  templateId: string;
  resourceId: string;
  contextId?: string;
  allowedActions: string[];
  deniedActions?: string[];
  conditions?: PermissionConditions;
  restrictions?: PermissionRestrictions;
  isActive?: boolean;
};

/**
 * Update resource permission input
 */
export type UpdateResourcePermissionInput = {
  allowedActions?: string[];
  deniedActions?: string[];
  conditions?: PermissionConditions;
  restrictions?: PermissionRestrictions;
  contextId?: string;
  isActive?: boolean;
};

/**
 * Bulk create resource permission input
 */
export type BulkCreateResourcePermissionInput = {
  templateId: string;
  permissions: Array<{
    resourceId: string;
    contextId?: string;
    allowedActions: string[];
    deniedActions?: string[];
    conditions?: PermissionConditions;
    restrictions?: PermissionRestrictions;
  }>;
};

/**
 * Query options for resource permissions
 */
export type ResourcePermissionQueryOptions = {
  includeRelations?: boolean;
  includeInactive?: boolean;
  resourceIds?: string[];
  contextId?: string;
};

/**
 * Resource permission list result
 */
export type ResourcePermissionListResult = {
  permissions: MktTemplateResourcePermissionWorkspaceEntity[];
  total: number;
};

/**
 * Permission summary for a template
 */
export type TemplatePermissionSummary = {
  templateId: string;
  totalPermissions: number;
  activePermissions: number;
  resourceCount: number;
  actionSummary: Record<string, number>;
};

/**
 * Effective permission for a resource
 */
export type EffectiveResourcePermission = {
  resourceId: string;
  resourceKey: string;
  resourceName: string;
  allowedActions: string[];
  deniedActions: string[];
  hasConditions: boolean;
  hasRestrictions: boolean;
  isActive: boolean;
};
