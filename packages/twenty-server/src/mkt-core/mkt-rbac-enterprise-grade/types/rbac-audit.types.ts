/**
 * RBAC Audit Service Types
 *
 * Types cho audit logging, querying và statistics
 */

import { MktPermissionAuditWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import {
  CheckResult,
  PermissionSource,
  RbacAction,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';

// ============================================
// DATE RANGE TYPES
// ============================================

/**
 * Options for date range queries (input - có thể undefined)
 */
export type DateRangeOptions = {
  fromDate?: Date;
  toDate?: Date;
};

/**
 * Required date range (output - luôn có giá trị)
 */
export type RequiredDateRange = {
  fromDate: Date;
  toDate: Date;
};

// ============================================
// STATISTICS TYPES
// ============================================

/**
 * Object count entry for statistics
 */
export type ObjectCountEntry = {
  objectName: string;
  count: number;
};

/**
 * Failure reason entry for statistics
 */
export type FailureReasonEntry = {
  reason: string;
  count: number;
};

/**
 * Internal audit item type for processing
 */
export type AuditItem = MktPermissionAuditWorkspaceEntity;

// ============================================
// AUDIT LOG TYPES
// ============================================

/**
 * Audit log entry input
 */
export type CreateAuditLogInput = {
  workspaceMemberId: string;
  userId?: string;
  action: RbacAction | string;
  objectName: string;
  recordId?: string;
  permissionSource?: PermissionSource;
  checkResult: CheckResult;
  denialReason?: string;
  requestContext?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  checkDurationMs?: number;
  stepResults?: Record<string, unknown>;
  cacheHit?: boolean;
  executionPath?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Query options for audit logs
 * Note: action must be RbacAction to match repository type
 */
export type AuditQueryOptions = {
  workspaceMemberId?: string;
  userId?: string;
  objectName?: string;
  action?: RbacAction;
  checkResult?: CheckResult;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
};

/**
 * Paginated audit log result
 */
export type PaginatedAuditLogResult = {
  items: MktPermissionAuditWorkspaceEntity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Audit statistics
 */
export type AuditStatistics = {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  skippedChecks: number;
  warningChecks: number;
  errorChecks: number;
  cacheHitRate: number;
  averageCheckDurationMs: number;
  checksByAction: Record<string, number>;
  checksByObject: Record<string, number>;
  checksBySource: Record<string, number>;
  failuresByReason: Record<string, number>;
};

/**
 * User audit summary
 */
export type UserAuditSummary = {
  workspaceMemberId: string;
  userId?: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  lastActivity?: Date;
  mostAccessedObjects: Array<{ objectName: string; count: number }>;
  failureReasons: Array<{ reason: string; count: number }>;
};

/**
 * Security alert type
 */
export type SecurityAlertType =
  | 'REPEATED_FAILURES'
  | 'UNUSUAL_ACCESS'
  | 'HIGH_VOLUME'
  | 'SENSITIVE_ACCESS';

/**
 * Security alert severity
 */
export type SecurityAlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Security alert
 */
export type SecurityAlert = {
  type: SecurityAlertType;
  severity: SecurityAlertSeverity;
  workspaceMemberId: string;
  description: string;
  details: Record<string, unknown>;
  detectedAt: Date;
};
