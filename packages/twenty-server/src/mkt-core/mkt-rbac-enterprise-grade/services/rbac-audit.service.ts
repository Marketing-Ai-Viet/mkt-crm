/**
 * RbacAuditService - Business logic for RBAC Audit Logging
 *
 * Cung cấp các operations để logging, querying và phân tích permission checks
 * và access control decisions.
 *
 * Responsibilities:
 * - Ghi log permission checks (single và batch)
 * - Query audit logs với pagination
 * - Thống kê và phân tích audit data
 * - Phát hiện security alerts
 * - Cleanup old audit logs
 */

import { Injectable, Logger } from '@nestjs/common';

import { MktPermissionAuditRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktPermissionAuditWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { CheckResult } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { ArrayUtils } from 'src/mkt-core/utils/array.utils';
import {
  CreateAuditLogInput,
  AuditQueryOptions,
  PaginatedAuditLogResult,
  AuditStatistics,
  UserAuditSummary,
  ServiceSecurityAlert,
  DateRangeOptions,
  RequiredDateRange,
  ObjectCountEntry,
  FailureReasonEntry,
  AuditItem,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';
import { AUDIT_SERVICE_MESSAGES } from 'src/mkt-core/mkt-rbac-enterprise-grade/message';

@Injectable()
export class RbacAuditService {
  // ============================================
  // CONSTANTS
  // ============================================

  private static readonly LOG_CONTEXT = 'RBAC:AuditService';

  /** Default page size for paginated queries */
  private static readonly DEFAULT_PAGE_SIZE = 50;

  /** Maximum allowed page size */
  private static readonly MAX_PAGE_SIZE = 500;

  /** Number of failures before triggering an alert */
  private static readonly FAILURE_THRESHOLD_FOR_ALERT = 5;

  /** High activity threshold for alerts */
  private static readonly HIGH_VOLUME_THRESHOLD = 100;

  /** Default log retention period in days */
  private static readonly DEFAULT_RETENTION_DAYS = 90;

  /** Default statistics time window in days */
  private static readonly DEFAULT_STATS_WINDOW_DAYS = 30;

  /** Maximum items to fetch for statistics */
  private static readonly MAX_STATS_ITEMS = 10000;

  /** Maximum items to fetch for user summary */
  private static readonly MAX_USER_SUMMARY_ITEMS = 5000;

  /** Top N items to show in summaries */
  private static readonly TOP_N_ITEMS = 10;

  // ============================================
  // PROPERTIES
  // ============================================

  private readonly logger = new Logger(RbacAuditService.LOG_CONTEXT);

  constructor(private readonly auditRepository: MktPermissionAuditRepository) {}

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Log a single permission check
   *
   * @param workspaceId - Workspace ID
   * @param input - Audit log input data
   * @returns Created audit log entity
   */
  async logPermissionCheck(
    workspaceId: string,
    input: CreateAuditLogInput,
  ): Promise<MktPermissionAuditWorkspaceEntity> {
    const auditData = this.buildAuditData(input);
    const audit = await this.auditRepository.create(auditData);

    this.logger.debug(
      AUDIT_SERVICE_MESSAGES.LOG_CREATED(
        input.action,
        input.objectName,
        input.checkResult,
      ),
    );

    return audit;
  }

  /**
   * Log multiple permission checks in batch
   *
   * @param workspaceId - Workspace ID (reserved for future use)
   * @param entries - Array of audit log inputs
   * @returns Array of created audit log entities
   */
  async logBatch(
    _workspaceId: string,
    entries: CreateAuditLogInput[],
  ): Promise<MktPermissionAuditWorkspaceEntity[]> {
    const auditEntries = entries.map((input) => this.buildAuditData(input));
    const audits = await this.auditRepository.createBatch(auditEntries);

    this.logger.log(AUDIT_SERVICE_MESSAGES.BATCH_LOGGED(audits.length));

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
   *
   * @param workspaceId - Workspace ID
   * @param options - Query options including filters and pagination
   * @returns Paginated result with items and metadata
   */
  async queryAuditLogs(
    workspaceId: string,
    options: AuditQueryOptions,
  ): Promise<PaginatedAuditLogResult> {
    const pageSize = Math.min(
      options.limit ?? RbacAuditService.DEFAULT_PAGE_SIZE,
      RbacAuditService.MAX_PAGE_SIZE,
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
   *
   * Tính toán các metrics từ audit logs trong khoảng thời gian:
   * - Số lượng checks theo result (pass/fail/skip/warning/error)
   * - Cache hit rate
   * - Average check duration
   * - Distribution by action, object, source
   * - Failure reasons breakdown
   *
   * @param workspaceId - Workspace ID
   * @param options - Optional date range
   * @returns Audit statistics
   */
  async getStatistics(
    workspaceId: string,
    options?: DateRangeOptions,
  ): Promise<AuditStatistics> {
    const { fromDate, toDate } = this.getDefaultDateRange(options);

    const { items } = await this.auditRepository.query(workspaceId, {
      fromDate,
      toDate,
      limit: RbacAuditService.MAX_STATS_ITEMS,
    });

    const resultCounts = this.countByCheckResult(items);

    return {
      totalChecks: items.length,
      passedChecks: resultCounts[CheckResult.PASS],
      failedChecks: resultCounts[CheckResult.FAIL],
      skippedChecks: resultCounts[CheckResult.SKIP],
      warningChecks: resultCounts[CheckResult.WARNING],
      errorChecks: resultCounts[CheckResult.ERROR],
      cacheHitRate: this.calculateCacheHitRate(items),
      averageCheckDurationMs: this.calculateAverageCheckDuration(items),
      checksByAction: ArrayUtils.countByKey(items, 'action'),
      checksByObject: ArrayUtils.countByKey(items, 'objectName'),
      checksBySource: this.countByPermissionSource(items),
      failuresByReason: this.countFailureReasons(items),
    };
  }

  /**
   * Get user audit summary
   *
   * Tổng hợp thông tin audit cho một user cụ thể:
   * - Tổng số checks và tỷ lệ pass/fail
   * - Thời gian activity cuối
   * - Top accessed objects
   * - Top failure reasons
   *
   * @param workspaceId - Workspace ID
   * @param workspaceMemberId - Workspace member ID
   * @param options - Optional date range
   * @returns User audit summary
   */
  async getUserAuditSummary(
    workspaceId: string,
    workspaceMemberId: string,
    options?: DateRangeOptions,
  ): Promise<UserAuditSummary> {
    const { fromDate, toDate } = this.getDefaultDateRange(options);

    const { items } = await this.auditRepository.query(workspaceId, {
      workspaceMemberId,
      fromDate,
      toDate,
      limit: RbacAuditService.MAX_USER_SUMMARY_ITEMS,
    });

    const resultCounts = this.countByCheckResult(items);

    return {
      workspaceMemberId,
      userId: items[0]?.userId,
      totalChecks: items.length,
      passedChecks: resultCounts[CheckResult.PASS],
      failedChecks: resultCounts[CheckResult.FAIL],
      lastActivity: this.getLastActivityDate(items),
      mostAccessedObjects: this.getTopObjectCounts(items),
      failureReasons: this.getTopFailureReasons(items),
    };
  }

  // ============================================
  // SECURITY ANALYSIS
  // ============================================

  /**
   * Detect security alerts based on audit patterns
   *
   * Phát hiện các patterns đáng ngờ:
   * - REPEATED_FAILURES: User có nhiều permission check failures
   * - HIGH_VOLUME: User có activity cao bất thường
   *
   * @param workspaceId - Workspace ID
   * @param options - Optional time window in hours
   * @returns Array of detected security alerts
   */
  async detectSecurityAlerts(
    workspaceId: string,
    options?: { timeWindowHours?: number },
  ): Promise<ServiceSecurityAlert[]> {
    const timeWindowHours = options?.timeWindowHours ?? 24;
    const fromDate = DateTimeUtils.toDateRequired(
      DateTimeUtils.subtract(DateTimeUtils.now(), { hours: timeWindowHours }),
    );

    const alerts: ServiceSecurityAlert[] = [];
    const now = DateTimeUtils.toDateRequired(DateTimeUtils.now());

    // Detect repeated failures
    const failureAlerts = await this.detectRepeatedFailures(
      workspaceId,
      fromDate,
      timeWindowHours,
      now,
    );

    alerts.push(...failureAlerts);

    // Detect high volume activity
    const volumeAlerts = await this.detectHighVolumeActivity(
      workspaceId,
      fromDate,
      timeWindowHours,
      now,
    );

    alerts.push(...volumeAlerts);

    // Log all detected alerts
    for (const alert of alerts) {
      this.logger.warn(
        AUDIT_SERVICE_MESSAGES.ALERT_DETECTED(alert.type, alert.severity),
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
   *
   * Xóa các audit logs cũ hơn retention period.
   * Mặc định là 90 ngày.
   *
   * @param workspaceId - Workspace ID
   * @param retentionDays - Optional retention period in days
   * @returns Number of deleted records
   */
  async cleanupOldLogs(
    workspaceId: string,
    retentionDays?: number,
  ): Promise<number> {
    const days = retentionDays ?? RbacAuditService.DEFAULT_RETENTION_DAYS;
    const cutoffDate = DateTimeUtils.toDateRequired(
      DateTimeUtils.subtract(DateTimeUtils.now(), { days }),
    );

    const deletedCount = await this.auditRepository.deleteOlderThan(
      workspaceId,
      cutoffDate,
    );

    this.logger.log(
      AUDIT_SERVICE_MESSAGES.CLEANUP_COMPLETED(deletedCount, days),
    );

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

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Build audit data from input
   * Centralized method để tạo audit data object
   */
  private buildAuditData(
    input: CreateAuditLogInput,
  ): Partial<MktPermissionAuditWorkspaceEntity> {
    return {
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
    };
  }

  /**
   * Count items by permission source, filtering out null/undefined sources
   */
  private countByPermissionSource(items: AuditItem[]): Record<string, number> {
    const itemsWithSource = items.filter(
      (item) =>
        item.permissionSource !== null && item.permissionSource !== undefined,
    );

    return ArrayUtils.countByKey(itemsWithSource, 'permissionSource');
  }

  /**
   * Detect repeated failure patterns
   */
  private async detectRepeatedFailures(
    workspaceId: string,
    fromDate: Date,
    timeWindowHours: number,
    detectedAt: Date,
  ): Promise<ServiceSecurityAlert[]> {
    const deniedAccess = await this.auditRepository.findDeniedAccess(
      workspaceId,
      { fromDate, limit: 1000 },
    );

    const failuresByUser = ArrayUtils.groupBy(
      deniedAccess,
      'workspaceMemberId',
    );
    const alerts: ServiceSecurityAlert[] = [];

    for (const [userId, userFailures] of Object.entries(failuresByUser)) {
      const failureCount = userFailures.length;

      if (failureCount >= RbacAuditService.FAILURE_THRESHOLD_FOR_ALERT) {
        const severity =
          failureCount >= RbacAuditService.FAILURE_THRESHOLD_FOR_ALERT * 2
            ? 'HIGH'
            : 'MEDIUM';

        alerts.push({
          type: 'REPEATED_FAILURES',
          severity,
          workspaceMemberId: userId,
          description: `User has ${failureCount} failed permission checks in the last ${timeWindowHours} hours`,
          details: { failureCount, timeWindowHours },
          detectedAt,
        });
      }
    }

    return alerts;
  }

  /**
   * Detect high volume activity patterns
   */
  private async detectHighVolumeActivity(
    workspaceId: string,
    fromDate: Date,
    timeWindowHours: number,
    detectedAt: Date,
  ): Promise<ServiceSecurityAlert[]> {
    const { items: recentActivity } = await this.auditRepository.query(
      workspaceId,
      { fromDate, limit: 5000 },
    );

    const volumeByUser = ArrayUtils.groupBy(
      recentActivity,
      'workspaceMemberId',
    );
    const alerts: ServiceSecurityAlert[] = [];

    for (const [userId, userActivity] of Object.entries(volumeByUser)) {
      const checkCount = userActivity.length;

      if (checkCount >= RbacAuditService.HIGH_VOLUME_THRESHOLD) {
        alerts.push({
          type: 'HIGH_VOLUME',
          severity: 'LOW',
          workspaceMemberId: userId,
          description: `Unusually high activity: ${checkCount} permission checks in ${timeWindowHours} hours`,
          details: { checkCount, timeWindowHours },
          detectedAt,
        });
      }
    }

    return alerts;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Tính default date range cho statistics
   * Mặc định là 30 ngày gần nhất
   */
  private getDefaultDateRange(options?: DateRangeOptions): RequiredDateRange {
    const now = DateTimeUtils.now();
    const defaultFromDate = DateTimeUtils.toDateRequired(
      DateTimeUtils.subtract(now, {
        days: RbacAuditService.DEFAULT_STATS_WINDOW_DAYS,
      }),
    );
    const defaultToDate = DateTimeUtils.toDateRequired(now);

    return {
      fromDate: options?.fromDate ?? defaultFromDate,
      toDate: options?.toDate ?? defaultToDate,
    };
  }

  /**
   * Đếm audit items theo check result
   */
  private countByCheckResult(items: AuditItem[]): Record<CheckResult, number> {
    const counts = ArrayUtils.countByKey(items, 'checkResult');

    return {
      [CheckResult.PASS]: counts[CheckResult.PASS] ?? 0,
      [CheckResult.FAIL]: counts[CheckResult.FAIL] ?? 0,
      [CheckResult.SKIP]: counts[CheckResult.SKIP] ?? 0,
      [CheckResult.WARNING]: counts[CheckResult.WARNING] ?? 0,
      [CheckResult.ERROR]: counts[CheckResult.ERROR] ?? 0,
    };
  }

  /**
   * Đếm failure reasons từ danh sách audit items
   */
  private countFailureReasons(items: AuditItem[]): Record<string, number> {
    const failedItems = items.filter(
      (item) => item.checkResult === CheckResult.FAIL && item.denialReason,
    );

    return ArrayUtils.countByKey(failedItems, 'denialReason');
  }

  /**
   * Tính toán cache hit rate
   */
  private calculateCacheHitRate(items: AuditItem[]): number {
    if (items.length === 0) return 0;

    const cacheHits = items.filter((item) => item.cacheHit).length;

    return cacheHits / items.length;
  }

  /**
   * Tính toán average check duration
   */
  private calculateAverageCheckDuration(items: AuditItem[]): number {
    const itemsWithDuration = items.filter(
      (item) =>
        item.checkDurationMs !== null && item.checkDurationMs !== undefined,
    );

    if (itemsWithDuration.length === 0) return 0;

    const totalDuration = ArrayUtils.sumBy(
      itemsWithDuration,
      'checkDurationMs',
    );

    return totalDuration / itemsWithDuration.length;
  }

  /**
   * Convert audit items to sorted top N object counts
   */
  private getTopObjectCounts(
    items: AuditItem[],
    limit: number = RbacAuditService.TOP_N_ITEMS,
  ): ObjectCountEntry[] {
    const objectCounts = ArrayUtils.countByKey(items, 'objectName');
    const entries = Object.entries(objectCounts).map(([objectName, count]) => ({
      objectName,
      count,
    }));

    return ArrayUtils.take(
      ArrayUtils.orderBy(entries, ['count'], ['desc']),
      limit,
    );
  }

  /**
   * Convert failure reasons to sorted top N entries
   */
  private getTopFailureReasons(
    items: AuditItem[],
    limit: number = RbacAuditService.TOP_N_ITEMS,
  ): FailureReasonEntry[] {
    const reasonCounts = this.countFailureReasons(items);
    const entries = Object.entries(reasonCounts).map(([reason, count]) => ({
      reason,
      count,
    }));

    return ArrayUtils.take(
      ArrayUtils.orderBy(entries, ['count'], ['desc']),
      limit,
    );
  }

  /**
   * Lấy ngày activity cuối cùng từ danh sách audit items
   */
  private getLastActivityDate(items: AuditItem[]): Date | undefined {
    if (items.length === 0) return undefined;

    const sorted = ArrayUtils.orderBy(items, ['createdAt'], ['desc']);
    const lastItem = sorted[0];

    return lastItem
      ? DateTimeUtils.toDate(DateTimeUtils.fromISO(lastItem.createdAt))
      : undefined;
  }
}
