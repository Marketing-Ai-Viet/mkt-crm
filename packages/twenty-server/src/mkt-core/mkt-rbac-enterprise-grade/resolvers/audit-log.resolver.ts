import { Resolver, Query, Args, ObjectType, Field, Int } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import {
  MktPermissionAuditRepository,
  AuditQueryOptions,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories/audit/mkt-permission-audit.repository';
import { PolicyApprovalService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/policy-approval.service';
import { QueryAuditLogInput } from 'src/mkt-core/mkt-rbac-enterprise-grade/dto/inputs';
import {
  PaginatedAuditLogOutput,
  AuditLogEntryOutput,
  PaginationInfoOutput,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/dto/outputs';
import { CheckResult } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Audit statistics output
 */
@ObjectType('AuditStatisticsOutput')
class AuditStatisticsOutput {
  @Field(() => Int, { description: 'Total audit entries' })
  totalEntries: number;

  @Field(() => Int, { description: 'Granted count' })
  grantedCount: number;

  @Field(() => Int, { description: 'Denied count' })
  deniedCount: number;

  @Field(() => Number, { description: 'Grant rate percentage' })
  grantRate: number;
}

/**
 * Policy audit entry output (for policy change audit)
 */
@ObjectType('PolicyAuditEntryOutput')
class PolicyAuditEntryOutput {
  @Field(() => String, { description: 'ID' })
  id: string;

  @Field(() => String, { description: 'Change type' })
  changeType: string;

  @Field(() => String, { description: 'Status' })
  status: string;

  @Field(() => String, { description: 'Requester ID' })
  requesterId: string;

  @Field(() => String, { nullable: true, description: 'Request reason' })
  requestReason?: string;

  @Field(() => Int, { description: 'Required approvals' })
  requiredApprovals: number;

  @Field(() => Int, { description: 'Current approvals' })
  currentApprovals: number;

  @Field(() => String, { description: 'Created at' })
  createdAt: string;
}

/**
 * Audit export output
 */
@ObjectType('AuditExportOutput')
class AuditExportOutput {
  @Field(() => String, { description: 'JSON export' })
  json: string;

  @Field(() => String, { description: 'CSV export' })
  csv: string;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Audit Log Resolver
 *
 * GraphQL resolver for querying audit logs.
 *
 * Queries:
 * - rbacAuditLogs: Get paginated permission audit logs
 * - rbacAuditStatistics: Get audit statistics
 * - rbacDeniedAccess: Get recent denied access attempts
 * - rbacPolicyAuditTrail: Get policy change audit trail
 * - rbacExportPolicyAudit: Export policy audit for compliance
 */
@Resolver()
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class AuditLogResolver {
  private readonly logger = new Logger(AuditLogResolver.name);

  constructor(
    private readonly auditRepository: MktPermissionAuditRepository,
    private readonly policyApprovalService: PolicyApprovalService,
  ) {}

  /**
   * Get paginated audit logs
   */
  @Query(() => PaginatedAuditLogOutput, {
    name: 'rbacAuditLogs',
    description: 'Get paginated permission audit logs',
  })
  async getAuditLogs(
    @Args('input', { nullable: true }) input: QueryAuditLogInput | undefined,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<PaginatedAuditLogOutput> {
    const page = input?.page ?? 1;
    const pageSize = Math.min(
      input?.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const offset = (page - 1) * pageSize;

    // Build query options
    const queryOptions: AuditQueryOptions = {
      userId: input?.userId,
      objectName: input?.resourceType,
      action: input?.action as AuditQueryOptions['action'],
      checkResult: this.mapResultToCheckResult(input?.result),
      fromDate: input?.startDate ? new Date(input.startDate) : undefined,
      toDate: input?.endDate ? new Date(input.endDate) : undefined,
      limit: pageSize,
      offset,
    };

    const { items, total } = await this.auditRepository.query(
      workspace.id,
      queryOptions,
    );

    const totalPages = Math.ceil(total / pageSize);

    const auditEntries: AuditLogEntryOutput[] = items.map((item) => ({
      id: item.id,
      userId: item.userId ?? '',
      action: item.action,
      resourceType: item.objectName,
      resourceId: item.recordId ?? undefined,
      result: item.checkResult,
      reason: item.denialReason ?? undefined,
      source: item.permissionSource ?? undefined,
      durationMs: item.checkDurationMs ?? undefined,
      ipAddress: item.ipAddress ?? undefined,
      userAgent: item.userAgent ?? undefined,
      context: item.requestContext as Record<string, unknown> | undefined,
      createdAt: DateTimeUtils.toDateRequired(
        DateTimeUtils.parse(item.createdAt),
      ),
    }));

    const pagination: PaginationInfoOutput = {
      page,
      pageSize,
      totalItems: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return {
      items: auditEntries,
      pagination,
    };
  }

  /**
   * Get audit statistics
   */
  @Query(() => AuditStatisticsOutput, {
    name: 'rbacAuditStatistics',
    description: 'Get permission audit statistics',
  })
  async getAuditStatistics(
    @AuthWorkspace() workspace: Workspace,
  ): Promise<AuditStatisticsOutput> {
    const [totalEntries, grantedCount, deniedCount] = await Promise.all([
      this.auditRepository.countWithWorkspace(workspace.id),
      this.auditRepository.countByCheckResult(workspace.id, CheckResult.PASS),
      this.auditRepository.countByCheckResult(workspace.id, CheckResult.FAIL),
    ]);

    const grantRate =
      totalEntries > 0 ? (grantedCount / totalEntries) * 100 : 0;

    return {
      totalEntries,
      grantedCount,
      deniedCount,
      grantRate: Math.round(grantRate * 100) / 100,
    };
  }

  /**
   * Get recent denied access attempts
   */
  @Query(() => [AuditLogEntryOutput], {
    name: 'rbacDeniedAccess',
    description: 'Get recent denied access attempts',
  })
  async getDeniedAccess(
    @Args('limit', { nullable: true, defaultValue: 50 }) limit: number,
    @Args('fromDate', { nullable: true }) fromDate: string | undefined,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<AuditLogEntryOutput[]> {
    const items = await this.auditRepository.findDeniedAccess(workspace.id, {
      limit: Math.min(limit, MAX_PAGE_SIZE),
      fromDate: fromDate ? new Date(fromDate) : undefined,
    });

    return items.map((item) => ({
      id: item.id,
      userId: item.userId ?? '',
      action: item.action,
      resourceType: item.objectName,
      resourceId: item.recordId ?? undefined,
      result: item.checkResult,
      reason: item.denialReason ?? undefined,
      source: item.permissionSource ?? undefined,
      durationMs: item.checkDurationMs ?? undefined,
      ipAddress: item.ipAddress ?? undefined,
      userAgent: item.userAgent ?? undefined,
      context: item.requestContext as Record<string, unknown> | undefined,
      createdAt: DateTimeUtils.toDateRequired(
        DateTimeUtils.parse(item.createdAt),
      ),
    }));
  }

  /**
   * Get policy change audit trail
   */
  @Query(() => [PolicyAuditEntryOutput], {
    name: 'rbacPolicyAuditTrail',
    description: 'Get policy change audit trail for SOC2 compliance',
  })
  async getPolicyAuditTrail(
    @Args('limit', { nullable: true, defaultValue: 100 }) limit: number,
    @Args('requesterId', { nullable: true }) requesterId: string | undefined,
    @Args('fromDate', { nullable: true }) fromDate: string | undefined,
    @Args('toDate', { nullable: true }) toDate: string | undefined,
  ): Promise<PolicyAuditEntryOutput[]> {
    const auditEntries = await this.policyApprovalService.getAuditTrail({
      requesterId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      limit: Math.min(limit, MAX_PAGE_SIZE),
    });

    return auditEntries.map((entry) => ({
      id: entry.id,
      changeType: entry.changeType,
      status: entry.status,
      requesterId: entry.requesterId,
      requestReason: entry.requestReason ?? undefined,
      requiredApprovals: entry.requiredApprovals,
      currentApprovals: entry.currentApprovals,
      createdAt: entry.createdAt.toString(),
    }));
  }

  /**
   * Export policy audit for compliance reporting
   */
  @Query(() => AuditExportOutput, {
    name: 'rbacExportPolicyAudit',
    description: 'Export policy change audit trail for compliance reporting',
  })
  async exportPolicyAudit(
    @Args('fromDate', { nullable: true }) fromDate: string | undefined,
    @Args('toDate', { nullable: true }) toDate: string | undefined,
  ): Promise<AuditExportOutput> {
    return this.policyApprovalService.exportAuditTrail({
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  // ==================== Private Methods ====================

  private mapResultToCheckResult(
    result: string | undefined,
  ): CheckResult | undefined {
    if (!result) {
      return undefined;
    }

    const upperResult = result.toUpperCase();

    if (upperResult === 'GRANTED' || upperResult === 'PASS') {
      return CheckResult.PASS;
    }

    if (upperResult === 'DENIED' || upperResult === 'FAIL') {
      return CheckResult.FAIL;
    }

    return undefined;
  }
}
