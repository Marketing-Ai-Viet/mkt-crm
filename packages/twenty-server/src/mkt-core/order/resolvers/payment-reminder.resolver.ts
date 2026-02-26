/**
 * PaymentReminderResolver
 *
 * GraphQL resolver for payment reminder operations.
 *
 * Operations:
 * - sendPaymentReminder: Send single payment reminder email
 * - sendBulkPaymentReminders: Send reminders to multiple orders
 * - getOrdersNeedingReminder: Query orders that need payment reminder
 */

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import {
  SendPaymentReminderInput,
  SendBulkPaymentRemindersInput,
  GetOrdersNeedingReminderInput,
  SendPaymentReminderOutput,
  SendBulkPaymentRemindersOutput,
  GetOrdersNeedingReminderOutput,
  OrderNeedingReminderOutput,
  BulkReminderResultItemOutput,
  PaymentReminderPageInfo,
} from 'src/mkt-core/order/dto/payment-reminder.dto';
import { PaymentReminderService } from 'src/mkt-core/order/services/domain/payment-reminder.service';
import { PaymentReminderContext } from 'src/mkt-core/order/types/payment-reminder.types';
import { ORDER_DATA_SCOPE } from 'src/mkt-core/order/constants';
import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';

/**
 * PaymentReminderResolver
 *
 * Handles GraphQL operations for payment reminder feature.
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class PaymentReminderResolver {
  constructor(
    private readonly paymentReminderService: PaymentReminderService,
  ) {}

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Send payment reminder for a single order
   *
   * @throws GraphQLError với error code trong extensions
   */
  @DataScope(ORDER_DATA_SCOPE.MUTATION_UPDATE_STATUS)
  @Mutation(() => SendPaymentReminderOutput, {
    description: 'Send payment reminder email for a single order',
  })
  async sendPaymentReminder(
    @Args('input') input: SendPaymentReminderInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ): Promise<SendPaymentReminderOutput> {
    const context = this.buildContext(workspace.id, workspaceMemberId);

    const result = await this.paymentReminderService.sendReminder(
      {
        orderId: input.orderId,
        idempotencyKey: input.idempotencyKey,
        templateKey: input.templateKey,
        note: input.note,
        forceResend: input.forceResend,
      },
      context,
    );

    return {
      orderId: result.orderId,
      orderCode: result.orderCode,
      customerEmail: result.customerEmail,
      sentAt: result.sentAt,
      reminderCount: result.reminderCount,
      previousReminderCount: result.previousReminderCount,
    };
  }

  /**
   * Send payment reminders to multiple orders
   *
   * Supports:
   * - Specific order IDs
   * - Filter-based selection
   * - Dry run preview mode
   */
  @DataScope(ORDER_DATA_SCOPE.MUTATION_UPDATE_STATUS)
  @Mutation(() => SendBulkPaymentRemindersOutput, {
    description:
      'Send payment reminders to multiple orders. Supports dry run preview.',
  })
  async sendBulkPaymentReminders(
    @Args('input') input: SendBulkPaymentRemindersInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ): Promise<SendBulkPaymentRemindersOutput> {
    const context = this.buildContext(workspace.id, workspaceMemberId);

    const result = await this.paymentReminderService.sendBulkReminders(
      {
        orderIds: input.orderIds,
        filter: input.filter
          ? {
              status: input.filter.status,
              paymentStatus: input.filter.paymentStatus,
              daysPastDeadline: input.filter.daysPastDeadline,
              maxRemindersSent: input.filter.maxRemindersSent,
            }
          : undefined,
        templateKey: input.templateKey,
        dryRun: input.dryRun,
      },
      context,
    );

    return {
      totalProcessed: result.totalProcessed,
      totalSent: result.totalSent,
      totalSkipped: result.totalSkipped,
      totalFailed: result.totalFailed,
      isDryRun: result.isDryRun,
      results: result.results.map(
        (r): BulkReminderResultItemOutput => ({
          orderId: r.orderId,
          orderCode: r.orderCode,
          sent: r.sent,
          skipped: r.skipped,
          skipReason: r.skipReason,
          sentAt: r.sentAt,
        }),
      ),
    };
  }

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get list of orders that need payment reminder
   *
   * Default filters:
   * - status: PROCESSING
   * - paymentStatus: PENDING or PARTIAL
   * - Not confirmed by sale or accounting
   * - remindersSent < MAX_REMINDERS
   */
  @DataScope(ORDER_DATA_SCOPE.QUERY_LIST)
  @Query(() => GetOrdersNeedingReminderOutput, {
    description: 'Get paginated list of orders needing payment reminder',
  })
  async getOrdersNeedingReminder(
    @Args('input', { nullable: true }) input: GetOrdersNeedingReminderInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ): Promise<GetOrdersNeedingReminderOutput> {
    const context = this.buildContext(workspace.id, workspaceMemberId);

    const result = await this.paymentReminderService.getOrdersNeedingReminder(
      input?.filter
        ? {
            status: input.filter.status,
            paymentStatus: input.filter.paymentStatus,
            daysPastDeadline: input.filter.daysPastDeadline,
            maxRemindersSent: input.filter.maxRemindersSent,
          }
        : undefined,
      input?.pagination
        ? {
            limit: input.pagination.limit,
            offset: input.pagination.offset,
            cursor: input.pagination.cursor,
          }
        : undefined,
      context,
    );

    // Map internal types to GraphQL output types
    const orders: OrderNeedingReminderOutput[] = result.orders.map((order) => ({
      id: order.id,
      orderCode: order.orderCode,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      totalAmount: this.formatCurrency(order.totalAmount),
      paidAmount: this.formatCurrency(order.paidAmount),
      remainingAmount: this.formatCurrency(order.remainingAmount),
      paymentDeadline: order.paymentDeadline,
      remindersSent: order.remindersSent,
      lastReminderAt: order.lastReminderAt,
      daysPastDeadline: order.daysPastDeadline,
      status: order.status,
      paymentStatus: order.paymentStatus,
      canSendReminder: order.canSendReminder,
    }));

    const pageInfo: PaymentReminderPageInfo = {
      hasNextPage: result.pageInfo.hasNextPage,
      hasPreviousPage: result.pageInfo.hasPreviousPage,
      startCursor: result.pageInfo.startCursor,
      endCursor: result.pageInfo.endCursor,
    };

    return {
      orders,
      totalCount: result.totalCount,
      pageInfo,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Build context for service calls
   */
  private buildContext(
    workspaceId: string,
    workspaceMemberId: string | undefined,
  ): PaymentReminderContext {
    return {
      workspaceId,
      userId: workspaceMemberId ?? 'system',
    };
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }
}
