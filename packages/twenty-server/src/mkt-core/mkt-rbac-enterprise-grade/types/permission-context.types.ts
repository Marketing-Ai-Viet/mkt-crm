/**
 * Permission Context Service Types
 *
 * Types cho PermissionContextService - quản lý permission context definitions.
 * Prefix "PermissionContext" để phân biệt với các context types khác.
 */

import { CONTEXT_TYPE } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/permission-template/options.constants';
import { MktPermissionContextWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

// ============================================
// INPUT TYPES
// ============================================

/**
 * Input để tạo permission context mới
 */
export type PermissionContextCreateInput = {
  contextKey: string;
  contextType: CONTEXT_TYPE;
  name: string;
  description?: string;
  filterExpression: Record<string, unknown>;
  priority?: number;
  isSystemDefault?: boolean;
  isActive?: boolean;
  position?: number;
  validationRules?: Record<string, unknown>;
};

// ============================================
// QUERY TYPES
// ============================================

/**
 * Options khi query permission context
 */
export type PermissionContextQueryOptions = {
  includeInactive?: boolean;
  includeRelations?: boolean;
};

// ============================================
// RESULT TYPES
// ============================================

/**
 * Result trả về khi list permission contexts
 */
export type PermissionContextListResult = {
  contexts: MktPermissionContextWorkspaceEntity[];
  total: number;
};
