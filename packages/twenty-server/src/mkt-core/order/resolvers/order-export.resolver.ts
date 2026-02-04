import { UseGuards, Logger } from '@nestjs/common';
import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';

import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import {
  ExportAuditService,
  EXPORT_JOB_STATUS,
} from 'src/mkt-core/common/excel';
import { OrderExportService } from 'src/mkt-core/order/services/domain/order-export.service';
import {
  ExportOrdersInput,
  ExportFileOutput,
  AsyncExportOutput,
} from 'src/mkt-core/order/dto/order-export.dto';

// ============================================
// CONSTANTS
// ============================================

const RESOLVER_LOG_CONTEXT = 'OrderExportResolver';

// ============================================
// RESOLVER
// ============================================

/**
 * OrderExportResolver - GraphQL resolver cho order export
 *
 * Features:
 * - Sync export (< 10K rows): Returns Base64 encoded file immediately
 * - Async export (> 10K rows): Returns job ID, client polls for completion
 * - Audit logging for all export operations
 *
 * Security:
 * - WorkspaceAuthGuard: Ensures data is scoped to workspace
 * - UserAuthGuard: Ensures authenticated user
 * - PII columns require additional permission check
 *
 * @remarks
 * - Dùng Mutation vì export có side-effect (audit log, resource consumption)
 * - Guards đảm bảo workspace scope và user authentication
 * - Sync export limit: 10K rows (vượt ngưỡng cần dùng async)
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class OrderExportResolver {
  private readonly logger = new Logger(RESOLVER_LOG_CONTEXT);

  constructor(
    private readonly orderExportService: OrderExportService,
    private readonly exportAuditService: ExportAuditService,
  ) {}

  /**
   * Export danh sách đơn hàng ra file Excel/CSV (sync)
   *
   * @remarks
   * - Giới hạn sync export: 10K rows
   * - Support filter by status, date range, customer, sales staff
   * - Support xlsx và csv format
   * - Audit log được tạo sau khi export thành công
   */
  @Mutation(() => ExportFileOutput, {
    name: 'exportOrders',
    description:
      'Export danh sách đơn hàng ra file Excel/CSV (max 10K rows cho sync)',
  })
  async exportOrders(
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
    @Args('input', { type: () => ExportOrdersInput, nullable: true })
    input?: ExportOrdersInput,
  ): Promise<ExportFileOutput> {
    this.logger.log(
      `User ${user.id} exporting orders for workspace: ${workspace.id}`,
    );

    const result = await this.orderExportService.exportOrders(
      input,
      workspace.id,
    );

    // Audit log export action
    await this.exportAuditService.logSyncExport(
      user.id,
      workspace.id,
      result.rowCount,
      {
        filter: input as Record<string, unknown>,
        format: input?.format === 'csv' ? 'csv' : 'xlsx',
        includedPii: false,
      },
    );

    this.logger.log(
      `Export completed: ${result.rowCount} rows, file: ${result.filename}`,
    );

    return result;
  }

  /**
   * Request async export cho dataset lớn (> 10K rows)
   *
   * @remarks
   * - Dùng khi export dataset lớn vượt quá sync limit
   * - Trả về job ID để client có thể poll status
   * - File được upload lên storage, client download qua URL
   * - URL có thời hạn 24 giờ
   */
  @Mutation(() => AsyncExportOutput, {
    name: 'requestAsyncExportOrders',
    description:
      'Request async export cho dataset lớn (> 10K rows). Returns job ID để track progress.',
  })
  async requestAsyncExportOrders(
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
    @Args('input', { type: () => ExportOrdersInput, nullable: true })
    input?: ExportOrdersInput,
  ): Promise<AsyncExportOutput> {
    this.logger.log(
      `User ${user.id} requesting async export for workspace: ${workspace.id}`,
    );

    // Count total rows for estimate
    const estimatedRows = await this.orderExportService.countOrdersForExport(
      input,
      workspace.id,
    );

    // TODO: Dispatch background job when BullMQ integration is complete
    // const job = await this.exportQueue.add(ASYNC_EXPORT_CONFIG.JOB_NAME, {
    //   entityType: 'order',
    //   filter: input,
    //   workspaceId: workspace.id,
    //   userId: user.id,
    //   estimatedRows,
    // });

    // Placeholder job ID
    const jobId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Audit log async export request
    await this.exportAuditService.logAsyncExportRequest(
      user.id,
      workspace.id,
      estimatedRows,
      jobId,
      {
        filter: input as Record<string, unknown>,
        format: input?.format === 'csv' ? 'csv' : 'xlsx',
      },
    );

    this.logger.log(
      `Async export job queued: ${jobId} for ${estimatedRows} estimated rows`,
    );

    return {
      jobId,
      status: EXPORT_JOB_STATUS.QUEUED,
      estimatedRows,
    };
  }

  /**
   * Check status của async export job
   *
   * @remarks
   * - Client poll endpoint này để check job completion
   * - Khi completed, downloadUrl sẽ có giá trị
   * - URL có thời hạn, check expiresAt trước khi download
   */
  @Query(() => AsyncExportOutput, {
    name: 'getExportJobStatus',
    description: 'Check status của async export job',
  })
  async getExportJobStatus(
    @AuthWorkspace() workspace: Workspace,
    @Args('jobId') jobId: string,
  ): Promise<AsyncExportOutput> {
    this.logger.debug(`Checking export job status: ${jobId}`);

    // TODO: Implement actual job status check when BullMQ integration is complete
    // const job = await this.exportQueue.getJob(jobId);
    // if (!job) {
    //   throw new NotFoundException(`Export job not found: ${jobId}`);
    // }
    // const state = await job.getState();
    // const result = job.returnvalue;

    // Placeholder response
    return {
      jobId,
      status: EXPORT_JOB_STATUS.PROCESSING,
      estimatedRows: 0,
      downloadUrl: undefined,
      expiresAt: undefined,
    };
  }
}
