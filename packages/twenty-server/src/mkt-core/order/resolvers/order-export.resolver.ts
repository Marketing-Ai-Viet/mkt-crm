import { UseGuards, Logger } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';

import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { OrderExportService } from 'src/mkt-core/order/services/domain/order-export.service';
import {
  ExportOrdersInput,
  ExportFileOutput,
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
 * @remarks
 * - Dùng Mutation vì export có side-effect (audit log, resource consumption)
 * - Guards đảm bảo workspace scope và user authentication
 * - Sync export limit: 10K rows (vượt ngưỡng cần dùng async)
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class OrderExportResolver {
  private readonly logger = new Logger(RESOLVER_LOG_CONTEXT);

  constructor(private readonly orderExportService: OrderExportService) {}

  /**
   * Export danh sách đơn hàng ra file Excel/CSV
   *
   * @remarks
   * - Giới hạn sync export: 10K rows
   * - Support filter by status, date range, customer, sales staff
   * - Support xlsx và csv format
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

    // TODO: Audit log export action
    // await this.auditService.log({
    //   action: 'EXPORT_ORDERS',
    //   userId: user.id,
    //   workspaceId: workspace.id,
    //   metadata: { filter: input },
    // });

    const result = await this.orderExportService.exportOrders(
      input,
      workspace.id,
    );

    this.logger.log(
      `Export completed: ${result.rowCount} rows, file: ${result.filename}`,
    );

    return result;
  }
}
