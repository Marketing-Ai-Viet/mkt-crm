import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  ManualConfirmPaymentInputDto,
  RejectPaymentInputDto,
  RefundPaymentInputDto,
} from 'src/mkt-core/payment/dto/payment.input';
import { PaymentActionResponseDto } from 'src/mkt-core/payment/dto/payment.output';
import {
  PaymentConfirmationService,
  PaymentRefundService,
} from 'src/mkt-core/payment/services/core';
import { PAYMENT_DATA_SCOPE } from 'src/mkt-core/payment/constants';
import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';

/**
 * PaymentConfirmationResolver - GraphQL resolver for payment confirmation mutations
 *
 * Handles manual payment operations:
 * - confirmPayment: Manually confirm a pending payment
 * - rejectPayment: Reject a pending payment
 * - refundPayment: Process full or partial refund
 */
@Resolver()
export class PaymentConfirmationResolver {
  constructor(
    private readonly paymentConfirmationService: PaymentConfirmationService,
    private readonly paymentRefundService: PaymentRefundService,
  ) {}

  /**
   * Manually confirm a pending payment
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(PAYMENT_DATA_SCOPE.MUTATION_CONFIRM)
  @Mutation(() => PaymentActionResponseDto, {
    description: 'Manually confirm a pending payment',
  })
  async confirmPayment(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: ManualConfirmPaymentInputDto,
  ): Promise<PaymentActionResponseDto> {
    if (!workspaceMemberId) {
      return {
        success: false,
        message: 'Workspace member ID is required',
      };
    }

    const result = await this.paymentConfirmationService.confirmPayment(
      { paymentId: input.paymentId, note: input.note },
      workspaceMemberId,
      workspace.id,
    );

    return this.mapConfirmResult(result);
  }

  /**
   * Reject a pending payment
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(PAYMENT_DATA_SCOPE.MUTATION_REJECT)
  @Mutation(() => PaymentActionResponseDto, {
    description: 'Reject a pending payment with reason',
  })
  async rejectPayment(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: RejectPaymentInputDto,
  ): Promise<PaymentActionResponseDto> {
    if (!workspaceMemberId) {
      return {
        success: false,
        message: 'Workspace member ID is required',
      };
    }

    const result = await this.paymentConfirmationService.rejectPayment(
      { paymentId: input.paymentId, rejectionReason: input.reason },
      workspaceMemberId,
      workspace.id,
    );

    return this.mapConfirmResult(result);
  }

  /**
   * Refund a confirmed payment (full or partial)
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @DataScope(PAYMENT_DATA_SCOPE.MUTATION_REFUND)
  @Mutation(() => PaymentActionResponseDto, {
    description: 'Refund a confirmed payment (full or partial)',
  })
  async refundPayment(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: RefundPaymentInputDto,
  ): Promise<PaymentActionResponseDto> {
    if (!workspaceMemberId) {
      return {
        success: false,
        message: 'Workspace member ID is required',
      };
    }

    const result = await this.paymentRefundService.refundPayment(
      {
        paymentId: input.paymentId,
        amount: input.amount,
        reason: input.reason,
      },
      workspaceMemberId,
      workspace.id,
    );

    return this.mapRefundResult(result);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapConfirmResult(result: {
    success: boolean;
    error?: string;
    payment?: { id: string; status: string };
    order?: {
      orderId: string;
      orderCode?: string;
      paidAmount: number;
      remainingAmount: number;
      paymentStatus: string;
      paidPercent: number;
    } | null;
  }): PaymentActionResponseDto {
    if (!result.success) {
      return {
        success: false,
        message: result.error,
      };
    }

    return {
      success: true,
      message: 'Payment action completed successfully',
      payment: result.payment
        ? { id: result.payment.id, status: result.payment.status }
        : undefined,
      order: result.order
        ? {
            orderId: result.order.orderId,
            orderCode: result.order.orderCode,
            paidAmount: result.order.paidAmount,
            remainingAmount: result.order.remainingAmount,
            paymentStatus: result.order.paymentStatus,
            paidPercent: result.order.paidPercent,
          }
        : undefined,
    };
  }

  private mapRefundResult(result: {
    success: boolean;
    error?: string;
    payment?: { id: string; status: string; refundedAmount: number };
    order?: {
      orderId: string;
      orderCode?: string;
      paidAmount: number;
      remainingAmount: number;
      paymentStatus: string;
      paidPercent: number;
    } | null;
    refundedAmount?: number;
  }): PaymentActionResponseDto {
    if (!result.success) {
      return {
        success: false,
        message: result.error,
      };
    }

    return {
      success: true,
      message: 'Payment refunded successfully',
      payment: result.payment
        ? {
            id: result.payment.id,
            status: result.payment.status,
            refundedAmount: result.payment.refundedAmount,
          }
        : undefined,
      order: result.order
        ? {
            orderId: result.order.orderId,
            orderCode: result.order.orderCode,
            paidAmount: result.order.paidAmount,
            remainingAmount: result.order.remainingAmount,
            paymentStatus: result.order.paymentStatus,
            paidPercent: result.order.paidPercent,
          }
        : undefined,
      refundedAmount: result.refundedAmount,
    };
  }
}
