/**
 * Audit Application Service
 *
 * Orchestrates audit log operations for the RBAC system.
 * This service provides a high-level interface for querying, managing,
 * and exporting audit logs.
 */

import { Injectable, Logger } from '@nestjs/common';

import { RBAC_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';
import { CheckResult } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import { QueryAuditLogInput } from 'src/mkt-core/mkt-rbac-enterprise-grade/dto/inputs';
import {
  PaginatedAuditLogOutput,
  AuditLogEntryOutput,
  PaginationInfoOutput,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/dto/outputs';
import { MktPermissionAuditRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktPermissionAuditWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Audit Application Service
 *
 * Handles audit log operations including:
 * - Querying audit logs with filters and pagination
 * - Exporting audit logs
 * - Audit log analytics
 */
@Injectable()
export class AuditApplicationService {
  private readonly logger = new Logger(RBAC_LOG_CONTEXT);

  constructor(private readonly auditRepository: MktPermissionAuditRepository) {
    this.logger.log('Audit Application Service initialized');
  }

  /**
   * Query audit logs with filters and pagination
   *
   * @param input - Query input with filters
   * @param workspaceId - Workspace ID
   * @returns Paginated audit log results
   */
  async queryAuditLogs(
    input: QueryAuditLogInput,
    workspaceId: string,
  ): Promise<PaginatedAuditLogOutput> {
    this.logger.debug('Querying audit logs', {
      workspaceId,
      action: input.action,
      resourceType: input.resourceType,
    });

    try {
      const page = input.page || 1;
      const pageSize = input.pageSize || 20;

      const { items, total } = await this.auditRepository.query(
        {
          userId: input.userId,
          objectName: input.resourceType,
          checkResult: this.mapResultToCheckResult(input.result),
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
        workspaceId,
      );

      const mappedItems = items.map((log) => this.mapToOutput(log));

      const pagination: PaginationInfoOutput = {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page * pageSize < total,
        hasPreviousPage: page > 1,
      };

      return {
        items: mappedItems,
        pagination,
      };
    } catch (error) {
      this.logger.error('Failed to query audit logs', {
        error: error.message,
        stack: error.stack,
      });

      return {
        items: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }
  }

  /**
   * Get audit logs for a specific user
   *
   * @param userId - User ID
   * @param workspaceId - Workspace ID
   * @param limit - Maximum number of logs to return
   * @returns Paginated audit log results
   */
  async getUserAuditLogs(
    userId: string,
    workspaceId: string,
    limit = 100,
  ): Promise<PaginatedAuditLogOutput> {
    return this.queryAuditLogs(
      { userId, page: 1, pageSize: limit },
      workspaceId,
    );
  }

  /**
   * Get denied access logs (security monitoring)
   *
   * @param workspaceId - Workspace ID
   * @param limit - Maximum number of logs to return
   * @returns Paginated audit log results
   */
  async getDeniedAccessLogs(
    workspaceId: string,
    limit = 100,
  ): Promise<PaginatedAuditLogOutput> {
    try {
      const items = await this.auditRepository.findDeniedAccess(
        { limit },
        workspaceId,
      );

      const mappedItems = items.map((log) => this.mapToOutput(log));

      return {
        items: mappedItems,
        pagination: {
          page: 1,
          pageSize: limit,
          totalItems: items.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get denied access logs', {
        error: error.message,
      });

      return {
        items: [],
        pagination: {
          page: 1,
          pageSize: limit,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }
  }

  /**
   * Get audit logs by date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @param workspaceId - Workspace ID
   * @returns Paginated audit logs
   */
  async getLogsByDateRange(
    startDate: Date,
    endDate: Date,
    workspaceId: string,
  ): Promise<PaginatedAuditLogOutput> {
    this.logger.debug('Getting audit logs by date range', {
      startDate,
      endDate,
      workspaceId,
    });

    try {
      const items = await this.auditRepository.findByDateRange(
        startDate,
        endDate,
        { limit: 100 },
        workspaceId,
      );

      const mappedItems = items.map((log) => this.mapToOutput(log));

      return {
        items: mappedItems,
        pagination: {
          page: 1,
          pageSize: items.length,
          totalItems: items.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get logs by date range', {
        error: error.message,
      });

      return {
        items: [],
        pagination: {
          page: 1,
          pageSize: 0,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }
  }

  /**
   * Get audit statistics for monitoring
   *
   * @param workspaceId - Workspace ID
   * @param days - Number of days to look back
   * @returns Audit statistics
   */
  async getAuditStatistics(
    workspaceId: string,
    days = 7,
  ): Promise<{
    totalRequests: number;
    grantedCount: number;
    deniedCount: number;
    grantRate: number;
    topDeniedActions: Array<{ action: string; count: number }>;
    topDeniedResources: Array<{ resource: string; count: number }>;
  }> {
    this.logger.debug('Getting audit statistics', { workspaceId, days });

    const endDate = DateTimeUtils.now();
    const startDate = DateTimeUtils.subtract(endDate, { days });

    try {
      const items = await this.auditRepository.findByDateRange(
        DateTimeUtils.toDateRequired(startDate),
        DateTimeUtils.toDateRequired(endDate),
        { limit: 10000 },
        workspaceId,
      );

      const totalRequests = items.length;
      const grantedCount = items.filter(
        (l) => l.checkResult === CheckResult.PASS,
      ).length;
      const deniedCount = items.filter(
        (l) => l.checkResult === CheckResult.FAIL,
      ).length;
      const grantRate =
        totalRequests > 0 ? (grantedCount / totalRequests) * 100 : 0;

      // Count denied by action
      const deniedByAction = new Map<string, number>();

      for (const log of items.filter(
        (l) => l.checkResult === CheckResult.FAIL,
      )) {
        const actionKey = log.action || 'UNKNOWN';
        const count = deniedByAction.get(actionKey) || 0;

        deniedByAction.set(actionKey, count + 1);
      }

      const topDeniedActions = Array.from(deniedByAction.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Count denied by resource
      const deniedByResource = new Map<string, number>();

      for (const log of items.filter(
        (l) => l.checkResult === CheckResult.FAIL,
      )) {
        const resourceKey = log.objectName || 'UNKNOWN';
        const count = deniedByResource.get(resourceKey) || 0;

        deniedByResource.set(resourceKey, count + 1);
      }

      const topDeniedResources = Array.from(deniedByResource.entries())
        .map(([resource, count]) => ({ resource, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalRequests,
        grantedCount,
        deniedCount,
        grantRate: Math.round(grantRate * 100) / 100,
        topDeniedActions,
        topDeniedResources,
      };
    } catch (error) {
      this.logger.error('Failed to get audit statistics', {
        error: error.message,
      });

      return {
        totalRequests: 0,
        grantedCount: 0,
        deniedCount: 0,
        grantRate: 0,
        topDeniedActions: [],
        topDeniedResources: [],
      };
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToOutput(
    log: MktPermissionAuditWorkspaceEntity,
  ): AuditLogEntryOutput {
    return {
      id: log.id,
      userId: log.userId || log.workspaceMemberId,
      action: log.action,
      resourceType: log.objectName,
      resourceId: log.recordId,
      result: log.checkResult === CheckResult.PASS ? 'GRANTED' : 'DENIED',
      reason: log.denialReason,
      source: log.permissionSource,
      durationMs: log.checkDurationMs,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      context: log.requestContext as Record<string, unknown> | undefined,
      createdAt: new Date(log.createdAt),
    };
  }

  private mapResultToCheckResult(result?: string): CheckResult | undefined {
    if (!result) {
      return undefined;
    }

    if (result === 'GRANTED') {
      return CheckResult.PASS;
    }

    if (result === 'DENIED') {
      return CheckResult.FAIL;
    }

    return undefined;
  }
}
