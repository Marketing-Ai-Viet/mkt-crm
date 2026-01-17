/**
 * Permission Template Types
 *
 * Types for permission template management operations
 */

import {
  PermissionTemplateType,
  ResolutionStrategy,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';
import { MktPermissionTemplateWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * Create template input
 */
export type CreateTemplateInput = {
  templateKey: string;
  templateName: string;
  description?: string;
  templateType?: PermissionTemplateType;
  departmentType?: string;
  hierarchyLevel?: number;
  applicableToLevels?: number[];
  organizationLevelId?: string;
  priority?: number;
  resolutionStrategy?: ResolutionStrategy;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isSystemTemplate?: boolean;
  metadata?: Record<string, unknown>;
  createdById?: string;
};

/**
 * Update template input
 */
export type UpdateTemplateInput = {
  templateName?: string;
  description?: string;
  templateType?: PermissionTemplateType;
  departmentType?: string;
  hierarchyLevel?: number;
  applicableToLevels?: number[];
  organizationLevelId?: string;
  priority?: number;
  resolutionStrategy?: ResolutionStrategy;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  lastModifiedBy?: string;
};

/**
 * Template query options
 */
export type TemplateQueryOptions = {
  includeRelations?: boolean;
  includeInactive?: boolean;
  templateType?: PermissionTemplateType;
  departmentType?: string;
  hierarchyLevel?: number;
  organizationLevelId?: string;
};

/**
 * Template list result
 */
export type TemplateListResult = {
  templates: MktPermissionTemplateWorkspaceEntity[];
  total: number;
};
