/**
 * ExportAuditService - Service for logging export operations
 *
 * Provides audit trail for all export activities including:
 * - Who exported what data
 * - When the export occurred
 * - What filters were applied
 * - Whether PII was included
 *
 * This is important for:
 * - Compliance (GDPR, data privacy)
 * - Security monitoring
 * - Usage analytics
 */

import { Injectable, Logger } from '@nestjs/common';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import {
  EXPORT_AUDIT_ACTION,
  ExportAuditAction,
} from 'src/mkt-core/common/excel/constants/export-audit.constants';
import { EXCEL_LOG_CONTEXT } from 'src/mkt-core/common/excel/constants/excel.constants';

// ============================================
// TYPES
// ============================================

export type ExportAuditLogInput = {
  /** Export action type */
  action: ExportAuditAction;

  /** User ID who performed the export */
  userId: string;

  /** Workspace ID */
  workspaceId: string;

  /** Filter criteria used for export */
  filter?: Record<string, unknown>;

  /** Number of rows exported */
  rowCount: number;

  /** Whether PII columns were included */
  includedPii: boolean;

  /** Export format (xlsx, csv) */
  format: 'xlsx' | 'csv';

  /** IP address of the requester */
  ipAddress?: string;

  /** User agent of the requester */
  userAgent?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
};

export type ExportAuditLogEntry = ExportAuditLogInput & {
  /** Timestamp of the export */
  timestamp: string;

  /** Unique log ID */
  logId: string;
};

// ============================================
// SERVICE
// ============================================

@Injectable()
export class ExportAuditService {
  private readonly logger = new Logger(EXCEL_LOG_CONTEXT);

  /**
   * Log an export action
   *
   * @param input - Audit log input data
   * @returns Created audit log entry
   *
   * @remarks
   * Currently logs to application logger.
   * TODO: Integrate with RbacAuditService or dedicated audit storage
   */
  async logExportAction(
    input: ExportAuditLogInput,
  ): Promise<ExportAuditLogEntry> {
    const entry: ExportAuditLogEntry = {
      ...input,
      timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
      logId: this.generateLogId(),
    };

    // Log với structured format cho monitoring/alerting
    this.logger.log('Export action logged', {
      logId: entry.logId,
      action: entry.action,
      userId: entry.userId,
      workspaceId: entry.workspaceId,
      rowCount: entry.rowCount,
      includedPii: entry.includedPii,
      format: entry.format,
      timestamp: entry.timestamp,
      filter: entry.filter ? safeJsonStringify(entry.filter) : undefined,
    });

    // TODO: Persist to database via repository
    // await this.exportAuditRepository.create(entry);

    return entry;
  }

  /**
   * Log sync export action (shorthand method)
   */
  async logSyncExport(
    userId: string,
    workspaceId: string,
    rowCount: number,
    options: {
      filter?: Record<string, unknown>;
      includedPii?: boolean;
      format?: 'xlsx' | 'csv';
      ipAddress?: string;
      userAgent?: string;
    } = {},
  ): Promise<ExportAuditLogEntry> {
    return this.logExportAction({
      action: EXPORT_AUDIT_ACTION.EXPORT_ORDERS,
      userId,
      workspaceId,
      rowCount,
      includedPii: options.includedPii ?? false,
      format: options.format ?? 'xlsx',
      filter: options.filter,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    });
  }

  /**
   * Log async export request
   */
  async logAsyncExportRequest(
    userId: string,
    workspaceId: string,
    estimatedRows: number,
    jobId: string,
    options: {
      filter?: Record<string, unknown>;
      includedPii?: boolean;
      format?: 'xlsx' | 'csv';
    } = {},
  ): Promise<ExportAuditLogEntry> {
    return this.logExportAction({
      action: EXPORT_AUDIT_ACTION.EXPORT_ORDERS_ASYNC,
      userId,
      workspaceId,
      rowCount: estimatedRows,
      includedPii: options.includedPii ?? false,
      format: options.format ?? 'xlsx',
      filter: options.filter,
      metadata: { jobId, status: 'QUEUED' },
    });
  }

  /**
   * Log async export completion
   */
  async logAsyncExportComplete(
    userId: string,
    workspaceId: string,
    rowCount: number,
    jobId: string,
    downloadUrl: string,
  ): Promise<ExportAuditLogEntry> {
    return this.logExportAction({
      action: EXPORT_AUDIT_ACTION.EXPORT_ORDERS_ASYNC,
      userId,
      workspaceId,
      rowCount,
      includedPii: false,
      format: 'xlsx',
      metadata: {
        jobId,
        status: 'COMPLETED',
        downloadUrl: this.maskUrl(downloadUrl),
      },
    });
  }

  /**
   * Log async export failure
   */
  async logAsyncExportFailed(
    userId: string,
    workspaceId: string,
    jobId: string,
    error: string,
  ): Promise<ExportAuditLogEntry> {
    this.logger.error('Async export failed', {
      userId,
      workspaceId,
      jobId,
      error,
    });

    return this.logExportAction({
      action: EXPORT_AUDIT_ACTION.EXPORT_ORDERS_ASYNC,
      userId,
      workspaceId,
      rowCount: 0,
      includedPii: false,
      format: 'xlsx',
      metadata: {
        jobId,
        status: 'FAILED',
        error,
      },
    });
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    const timestamp = DateTimeUtils.toMillis(DateTimeUtils.now());
    const random = Math.random().toString(36).substring(2, 8);

    return `exp_${timestamp}_${random}`;
  }

  /**
   * Mask sensitive parts of URL for logging
   */
  private maskUrl(url: string): string {
    // Mask query parameters that might contain tokens
    return url.replace(/([?&](token|signature|key)=)[^&]+/gi, '$1***');
  }
}
