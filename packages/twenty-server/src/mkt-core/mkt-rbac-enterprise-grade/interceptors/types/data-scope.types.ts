/**
 * Data Scope Types for RBAC Row-Level Security
 *
 * Types used by DataScopeInterceptor and @DataScope decorator
 * for automatic data filtering based on user context.
 */

import {
  RbacFilterCondition,
  RbacFilterOperator,
  RbacFilterConditionItem,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';
import { UserContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-context.service';
import { ResourceEntityName } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';

// ============================================
// RE-EXPORTS
// ============================================

export { RbacFilterCondition, RbacFilterOperator, RbacFilterConditionItem };

// ============================================
// DECORATOR METADATA TYPES
// ============================================

/**
 * Data scope metadata key for decorator
 */
export const DATA_SCOPE_METADATA_KEY = 'rbac:data_scope' as const;

/**
 * Filter mode determines how filters are applied
 */
export type DataScopeFilterMode =
  | 'AUTO' // Automatically apply filters based on user context and policies
  | 'MANUAL' // Filters are provided but not automatically applied
  | 'SKIP'; // Skip data filtering (for admin-only endpoints)

/**
 * Options for @DataScope decorator
 */
export type DataScopeOptions = {
  /**
   * Resource entity name for data filtering (e.g., 'mktOrder', 'mktCustomer')
   * Must match a value from RESOURCE_ENTITY_MAP
   */
  resource: ResourceEntityName;

  /**
   * Filter mode (default: AUTO)
   * - AUTO: Automatically apply filters
   * - MANUAL: Attach filters to request but don't apply
   * - SKIP: Skip filtering (for admin endpoints)
   */
  mode?: DataScopeFilterMode;

  /**
   * Enable caching of filter conditions (default: true)
   */
  enableCache?: boolean;

  /**
   * Cache TTL override in milliseconds
   */
  cacheTTL?: number;

  /**
   * Audit level for data access
   */
  auditLevel?: 'low' | 'medium' | 'high';

  /**
   * Custom error message when user lacks data access
   */
  errorMessage?: string;

  /**
   * Allow access even if no data scope is resolved
   * (useful for endpoints that should still work without filters)
   */
  allowUnscoped?: boolean;

  /**
   * Fields to exclude from filtering
   */
  excludeFields?: string[];

  /**
   * Additional static filter conditions to always apply
   */
  additionalConditions?: RbacFilterConditionItem[];
};

/**
 * Metadata stored by @DataScope decorator
 */
export type DataScopeMetadata = Required<
  Pick<DataScopeOptions, 'resource' | 'mode'>
> &
  Omit<DataScopeOptions, 'resource' | 'mode'>;

// ============================================
// REQUEST AUGMENTATION TYPES
// ============================================

/**
 * Data scope context attached to request
 */
export type DataScopeContext = {
  /**
   * Resource being accessed
   */
  resource: string;

  /**
   * Data filter conditions to apply
   */
  filter: RbacFilterCondition | null;

  /**
   * User context used for filtering
   */
  userContext: UserContext | null;

  /**
   * Whether user has full access (no filtering)
   */
  hasFullAccess: boolean;

  /**
   * Whether filtering was skipped
   */
  skipped: boolean;

  /**
   * Reason for skip or null filter
   */
  reason?: string;

  /**
   * Timestamp when scope was resolved
   */
  resolvedAt: string;

  /**
   * Latency in milliseconds
   */
  latencyMs: number;
};

/**
 * Augmented request with data scope
 */
export type DataScopedRequest = {
  /**
   * Data scope context for row-level security
   */
  dataScope?: DataScopeContext;

  /**
   * User from auth
   */
  user?: {
    id: string;
    [key: string]: unknown;
  };

  /**
   * Workspace from auth
   */
  workspace?: {
    id: string;
    [key: string]: unknown;
  };

  /**
   * Workspace ID (alternative location)
   */
  workspaceId?: string;
};

// ============================================
// HELPER TYPES
// ============================================

/**
 * TypeORM-compatible WHERE clause generated from filter conditions
 */
export type TypeOrmWhereClause = Record<
  string,
  | unknown
  | {
      operator: string;
      value: unknown;
    }
>;

/**
 * Conversion result from FilterCondition to TypeORM WHERE
 */
export type FilterToWhereResult = {
  where: TypeOrmWhereClause;
  sql?: string;
  parameters?: Record<string, unknown>;
};

// ============================================
// CONSTANTS
// ============================================

/**
 * Default data scope options
 */
export const DATA_SCOPE_DEFAULTS: Required<
  Omit<DataScopeOptions, 'resource' | 'additionalConditions' | 'excludeFields'>
> = {
  mode: 'AUTO',
  enableCache: true,
  cacheTTL: 300000, // 5 minutes
  auditLevel: 'low',
  errorMessage: 'Access denied: insufficient data access permissions',
  allowUnscoped: false,
} as const;

/**
 * Log context for data scope operations
 */
export const DATA_SCOPE_LOG_CONTEXT = 'RBAC:DataScope' as const;

/**
 * Messages for data scope operations
 */
export const DATA_SCOPE_MESSAGES = {
  RESOLVE_START: (resource: string) =>
    `Resolving data scope for resource: ${resource}`,
  RESOLVE_SUCCESS: (resource: string, ms: number) =>
    `Data scope resolved for ${resource} in ${ms}ms`,
  RESOLVE_SKIP: (resource: string, reason: string) =>
    `Data scope skipped for ${resource}: ${reason}`,
  NO_USER: 'User not found in request context',
  NO_WORKSPACE: 'Workspace not found in request context',
  FULL_ACCESS: 'User has full access - no data scope applied',
  FILTER_APPLIED: (conditionCount: number) =>
    `Data filter applied with ${conditionCount} conditions`,
  ACCESS_DENIED: 'Data access denied based on user scope',
  CACHE_HIT: (resource: string) => `Data scope cache hit for ${resource}`,
  CACHE_MISS: (resource: string) => `Data scope cache miss for ${resource}`,
} as const;
