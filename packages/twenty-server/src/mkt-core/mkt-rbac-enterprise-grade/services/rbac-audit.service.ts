/**
 * RbacAuditService - Business logic for RBAC Audit Logging
 *
 * Provides operations for logging, querying, and analyzing permission checks
 * and access control decisions.
 */

import { Injectable, Logger } from '@nestjs/common';

import { MktPermissionAuditRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktPermissionAuditWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { CheckResult } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  CreateAuditLogInput,
  AuditQueryOptions,
  PaginatedAuditLogResult,
  AuditStatistics,
  UserAuditSummary,
  ServiceSecurityAlert as SecurityAlert,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';

// Alias for backward compatibility
type AuditLogQueryOptions = AuditQueryOptions;

// Re-export types for backward compatibility
export type {
  CreateAuditLogInput,
  AuditLogQueryOptions,
  PaginatedAuditLogResult,
  AuditStatistics,
  UserAuditSummary,
  SecurityAlert,
};

// ============================================
// CONSTANTS
// ============================================

const LOG_CONTEXT = 'RBAC:AuditService';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;
const FAILURE_THRESHOLD_FOR_ALERT = 5;
const HIGH_VOLUME_THRESHOLD = 100;
const DEFAULT_RETENTION_DAYS = 90;

const AUDIT_MESSAGES = {
  LOG_CREATED: (action: string, object: string, result: string) =>
    `Audit: ${action} on ${object} - ${result}`,
  BATCH_LOGGED: (count: number) => `${count} audit entries logged`,
  CLEANUP_COMPLETED: (deleted: number, retentionDays: number) =>
    `Audit cleanup: ${deleted} entries older than ${retentionDays} days deleted`,
  ALERT_DETECTED: (type: string, severity: string) =>
    `Security alert detected: ${type} (${severity})`,
} as const;

// ============================================
// SERVICE
// ============================================

@Injectable()
export class RbacAuditService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(private readonly auditRepository: MktPermissionAuditRepository) {}

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Log a single permission check
   */
  async logPermissionCheck(
    workspaceId: string,
    input: CreateAuditLogInput,
  ): Promise<MktPermissionAuditWorkspaceEntity> {
    const audit = await this.auditRepository.create({
      workspaceMemberId: input.workspaceMemberId,
      userId: input.userId,
      action: input.action,
      objectName: input.objectName,
      recordId: input.recordId,
      permissionSource: input.permissionSource,
      checkResult: input.checkResult,
      denialReason: input.denialReason,
      requestContext: input.requestContext,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      checkDurationMs: input.checkDurationMs,
      stepResults: input.stepResults,
      cacheHit: input.cacheHit ?? false,
      executionPath: input.executionPath,
      requestId: input.requestId,
      metadata: input.metadata,
    });

    this.logger.debug(
      AUDIT_MESSAGES.LOG_CREATED(
        input.action,
        input.objectName,
        input.checkResult,
      ),
    );

    return audit;
  }

  /**
   * Log multiple permission checks in batch
   */
  async logBatch(
    _workspaceId: string,
    entries: CreateAuditLogInput[],
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    const auditEntries = entries.map((input) => ({
      workspaceMemberId: input.workspaceMemberId,
      userId: input.userId,
      action: input.action,
      objectName: input.objectName,
      recordId: input.recordId,
      permissionSource: input.permissionSource,
      checkResult: input.checkResult,
      denialReason: input.denialReason,
      requestContext: input.requestContext,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      checkDurationMs: input.checkDurationMs,
      stepResults: input.stepResults,
      cacheHit: input.cacheHit ?? false,
      executionPath: input.executionPath,
      requestId: input.requestId,
      metadata: input.metadata,
    }));

    const audits = await this.auditRepository.createBatch(auditEntries);

    this.logger.log(AUDIT_MESSAGES.BATCH_LOGGED(audits.length));

    return audits;
  }

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get audit log by ID
   */
  async getAuditLogById(
    workspaceId: string,
    id: string,
  ): Promise<MktPermissionAuditWorkspaceEntity | null> {
    return this.auditRepository.findById(id);
  }

  /**
   * Query audit logs with pagination
   */
  async queryAuditLogs(
    workspaceId: string,
    options: AuditLogQueryOptions,
  ): Promise<PaginatedAuditLogResult> {
    const pageSize = Math.min(
      options.limit ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const offset = options.offset ?? 0;
    const page = Math.floor(offset / pageSize) + 1;

    const { items, total } = await this.auditRepository.query(workspaceId, {
      ...options,
      limit: pageSize,
      offset,
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get audit logs for a specific user
   */
  async getAuditLogsByUser(
    workspaceId: string,
    workspaceMemberId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    return this.auditRepository.findByWorkspaceMemberId(
      workspaceId,
      workspaceMemberId,
      options,
    );
  }

  /**
   * Get audit logs for a specific object
   */
  async getAuditLogsByObject(
    workspaceId: string,
    objectName: string,
    options?: { limit?: number; offset?: number },
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    return this.auditRepository.findByObjectName(
      workspaceId,
      objectName,
      options,
    );
  }

  /**
   * Get denied access attempts
   */
  async getDeniedAccessAttempts(
    workspaceId: string,
    options?: { limit?: number; offset?: number; fromDate?: Date },
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    return this.auditRepository.findDeniedAccess(workspaceId, options);
  }

  /**
   * Get audit logs within a date range
   */
  async getAuditLogsByDateRange(
    workspaceId: string,
    fromDate: Date,
    toDate: Date,
    options?: { limit?: number; offset?: number },
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    return this.auditRepository.findByDateRange(
      workspaceId,
      fromDate,
      toDate,
      options,
    );
  }

  // ============================================
  // STATISTICS & ANALYTICS
  // ============================================

  /**
   * Get audit statistics for a workspace
   */
  async getStatistics(
    workspaceId: string,
    options?: { fromDate?: Date; toDate?: Date },
  ): Promise<AuditStatistics> {
    const fromDate =
      options?.fromDate ??
      DateTimeUtils.toDate(
        DateTimeUtils.subtract(DateTimeUtils.now(), { days: 30 }),
      );
    const toDate = options?.toDate ?? DateTimeUtils.toDate(DateTimeUtils.now());

    const { items } = await this.auditRepository.query(workspaceId, {
      fromDate,
      toDate,
      limit: 10000, // Get a large batch for statistics
    });

    let passedChecks = 0;
    let failedChecks = 0;
    let skippedChecks = 0;
    let warningChecks = 0;
    let errorChecks = 0;
    let cacheHits = 0;
    let totalDuration = 0;
    let durationCount = 0;
    const checksByAction: Record<string, number> = {};
    const checksByObject: Record<string, number> = {};
    const checksBySource: Record<string, number> = {};
    const failuresByReason: Record<string, number> = {};

    for (const audit of items) {
      // Count by result
      switch (audit.checkResult) {
        case CheckResult.PASS:
          passedChecks++;
          break;
        case CheckResult.FAIL:
          failedChecks++;

          if (audit.denialReason) {
            failuresByReason[audit.denialReason] =
              (failuresByReason[audit.denialReason] ?? 0) + 1;
          }
          break;
        case CheckResult.SKIP:
          skippedChecks++;
          break;
        case CheckResult.WARNING:
          warningChecks++;
          break;
        case CheckResult.ERROR:
          errorChecks++;
          break;
      }

      // Count cache hits
      if (audit.cacheHit) {
        cacheHits++;
      }

      // Sum durations
      if (audit.checkDurationMs) {
        totalDuration += audit.checkDurationMs;
        durationCount++;
      }

      // Count by action
      checksByAction[audit.action] = (checksByAction[audit.action] ?? 0) + 1;

      // Count by object
      checksByObject[audit.objectName] =
        (checksByObject[audit.objectName] ?? 0) + 1;

      // Count by source
      if (audit.permissionSource) {
        checksBySource[audit.permissionSource] =
          (checksBySource[audit.permissionSource] ?? 0) + 1;
      }
    }

    const totalChecks = items.length;

    return {
      totalChecks,
      passedChecks,
      failedChecks,
      skippedChecks,
      warningChecks,
      errorChecks,
      cacheHitRate: totalChecks > 0 ? cacheHits / totalChecks : 0,
      averageCheckDurationMs:
        durationCount > 0 ? totalDuration / durationCount : 0,
      checksByAction,
      checksByObject,
      checksBySource,
      failuresByReason,
    };
  }

  /**
   * Get user audit summary
   */
  async getUserAuditSummary(
    workspaceId: string,
    workspaceMemberId: string,
    options?: { fromDate?: Date; toDate?: Date },
  ): Promise<UserAuditSummary> {
    const fromDate =
      options?.fromDate ??
      DateTimeUtils.toDate(
        DateTimeUtils.subtract(DateTimeUtils.now(), { days: 30 }),
      );
    const toDate = options?.toDate ?? DateTimeUtils.toDate(DateTimeUtils.now());

    const { items } = await this.auditRepository.query(workspaceId, {
      workspaceMemberId,
      fromDate,
      toDate,
      limit: 5000,
    });

    let passedChecks = 0;
    let failedChecks = 0;
    let lastActivity: Date | undefined;
    const objectCounts: Record<string, number> = {};
    const failureReasonCounts: Record<string, number> = {};

    for (const audit of items) {
      // Count results
      if (audit.checkResult === CheckResult.PASS) {
        passedChecks++;
      } else if (audit.checkResult === CheckResult.FAIL) {
        failedChecks++;

        if (audit.denialReason) {
          failureReasonCounts[audit.denialReason] =
            (failureReasonCounts[audit.denialReason] ?? 0) + 1;
        }
      }

      // Track last activity - convert createdAt to Date for comparison
      const auditDate = new Date(audit.createdAt);

      if (!lastActivity || auditDate > lastActivity) {
        lastActivity = auditDate;
      }

      // Count objects
      objectCounts[audit.objectName] =
        (objectCounts[audit.objectName] ?? 0) + 1;
    }

    // Sort and limit most accessed objects
    const mostAccessedObjects = Object.entries(objectCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([objectName, count]) => ({ objectName, count }));

    // Sort and limit failure reasons
    const failureReasons = Object.entries(failureReasonCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    return {
      workspaceMemberId,
      userId: items[0]?.userId,
      totalChecks: items.length,
      passedChecks,
      failedChecks,
      lastActivity,
      mostAccessedObjects,
      failureReasons,
    };
  }

  // ============================================
  // SECURITY ANALYSIS
  // ============================================

  /**
   * Detect security alerts based on audit patterns
   */
  async detectSecurityAlerts(
    workspaceId: string,
    options?: { timeWindowHours?: number },
  ): Promise<SecurityAlert[]> {
    const timeWindowHours = options?.timeWindowHours ?? 24;
    const fromDate = DateTimeUtils.toDate(
      DateTimeUtils.subtract(DateTimeUtils.now(), { hours: timeWindowHours }),
    );

    const alerts: SecurityAlert[] = [];

    // Get recent denied access
    const deniedAccess = await this.auditRepository.findDeniedAccess(
      workspaceId,
      { fromDate, limit: 1000 },
    );

    // Analyze failures by user
    const failuresByUser: Record<string, number> = {};

    for (const audit of deniedAccess) {
      failuresByUser[audit.workspaceMemberId] =
        (failuresByUser[audit.workspaceMemberId] ?? 0) + 1;
    }

    // Check for repeated failures
    const now = DateTimeUtils.toDate(DateTimeUtils.now()) ?? new Date();

    for (const [userId, count] of Object.entries(failuresByUser)) {
      if (count >= FAILURE_THRESHOLD_FOR_ALERT) {
        alerts.push({
          type: 'REPEATED_FAILURES',
          severity:
            count >= FAILURE_THRESHOLD_FOR_ALERT * 2 ? 'HIGH' : 'MEDIUM',
          workspaceMemberId: userId,
          description: `User has ${count} failed permission checks in the last ${timeWindowHours} hours`,
          details: { failureCount: count, timeWindowHours },
          detectedAt: now,
        });
      }
    }

    // Check for high volume
    const volumeByUser: Record<string, number> = {};
    const { items: recentActivity } = await this.auditRepository.query(
      workspaceId,
      { fromDate, limit: 5000 },
    );

    for (const audit of recentActivity) {
      volumeByUser[audit.workspaceMemberId] =
        (volumeByUser[audit.workspaceMemberId] ?? 0) + 1;
    }

    for (const [userId, count] of Object.entries(volumeByUser)) {
      if (count >= HIGH_VOLUME_THRESHOLD) {
        alerts.push({
          type: 'HIGH_VOLUME',
          severity: 'LOW',
          workspaceMemberId: userId,
          description: `Unusually high activity: ${count} permission checks in ${timeWindowHours} hours`,
          details: { checkCount: count, timeWindowHours },
          detectedAt: now,
        });
      }
    }

    // Log alerts
    for (const alert of alerts) {
      this.logger.warn(
        AUDIT_MESSAGES.ALERT_DETECTED(alert.type, alert.severity),
        alert,
      );
    }

    return alerts;
  }

  // ============================================
  // CLEANUP OPERATIONS
  // ============================================

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(
    workspaceId: string,
    retentionDays?: number,
  ): Promise<number> {
    const days = retentionDays ?? DEFAULT_RETENTION_DAYS;
    const cutoffDate =
      DateTimeUtils.toDate(
        DateTimeUtils.subtract(DateTimeUtils.now(), { days }),
      ) ?? new Date();

    const deletedCount = await this.auditRepository.deleteOlderThan(
      workspaceId,
      cutoffDate,
    );

    this.logger.log(AUDIT_MESSAGES.CLEANUP_COMPLETED(deletedCount, days));

    return deletedCount;
  }

  /**
   * Get total audit log count
   */
  async getTotalCount(workspaceId: string): Promise<number> {
    return this.auditRepository.countWithWorkspace(workspaceId);
  }

  /**
   * Get count by check result
   */
  async getCountByResult(
    workspaceId: string,
    checkResult: CheckResult,
  ): Promise<number> {
    return this.auditRepository.countByCheckResult(workspaceId, checkResult);
  }
}
