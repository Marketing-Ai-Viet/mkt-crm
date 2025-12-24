import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import { OrderPaymentSummaryOutput } from 'src/mkt-core/order/dto/order-response.output';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

/**
 * OrderQueryResolver - GraphQL resolver for order queries
 *
 * Provides queries for:
 * - getOrderPaymentSummary: Get payment summary for an order
 */
@Resolver()
export class OrderQueryResolver {
  constructor(private readonly orderRepository: MktOrderRepository) {}

  /**
   * Get payment summary for an order
   *
   * Returns:
   * - totalAmount: Order total
   * - paidAmount: Total confirmed payments
   * - remainingAmount: Amount left to pay
   * - paymentStatus: PENDING | PARTIAL | PAID | OVERPAID
   * - paidPercent: Percentage of total paid (0-100)
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => OrderPaymentSummaryOutput, {
    description: 'Get payment summary for an order',
    nullable: true,
  })
  async getOrderPaymentSummary(
    @AuthWorkspace() workspace: Workspace,
    @Args('orderId', { type: () => String }) orderId: string,
  ): Promise<OrderPaymentSummaryOutput | null> {
    const order = await this.orderRepository.findById(workspace.id, orderId);

    if (!order) {
      return null;
    }

    const totalAmount = order.totalAmount ?? 0;
    const paidAmount = order.paidAmount ?? 0;
    const remainingAmount = order.remainingAmount ?? 0;
    const paymentStatus =
      (order.paymentStatus as PAYMENT_STATUS) ?? PAYMENT_STATUS.PENDING;

    // Calculate paid percentage
    const paidPercent =
      totalAmount > 0
        ? MoneyUtils.round(
            MoneyUtils.multiply(
              MoneyUtils.divideSafe(paidAmount, totalAmount).toNumber(),
              100,
            ).toNumber(),
            2,
          ).toNumber()
        : 0;

    return {
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentStatus,
      paidPercent,
    };
  }
}
