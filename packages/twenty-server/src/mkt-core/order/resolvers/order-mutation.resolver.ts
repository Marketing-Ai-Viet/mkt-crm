import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import {
  ConfirmOrderInputDto,
  CreateOrderWithItemsInputDto,
  UpdateOrderStatusInputDto,
  RefundOrderInputDto,
} from 'src/mkt-core/order/dto/create-order.input';
import {
  ConfirmOrderResponseDto,
  CreateOrderResponseDto,
  RefundOrderResponseDto,
  UpdateOrderStatusResponseDto,
  ValidationResultDto,
} from 'src/mkt-core/order/dto/order-response.output';
import { OrderOrchestrationService } from 'src/mkt-core/order/services/application';

/**
 * OrderMutationResolver - GraphQL resolver for order mutations
 *
 * Provides mutations for:
 * - createOrderWithItems: Create new order with items, licenses, and payment
 * - confirmOrder: Confirm/update order status
 * - updateOrderStatus: Update order status with state machine validation
 * - refundOrder: Full or partial order refund
 * - validateOrderInput: Validate order input before creation
 */
@Resolver()
export class OrderMutationResolver {
  constructor(
    private readonly orderOrchestrationService: OrderOrchestrationService,
  ) {}

  /**
   * Create a new order with items using the saga pattern
   *
   * This mutation replaces the old createMktOrder + post-hook flow with:
   * - Single transaction for all operations
   * - Automatic rollback on failure
   * - Better error handling
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => CreateOrderResponseDto, {
    description: 'Create a new order with items, licenses, and payment',
  })
  async createOrderWithItems(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: CreateOrderWithItemsInputDto,
  ): Promise<CreateOrderResponseDto> {
    return this.orderOrchestrationService.createOrderWithItems(
      workspace.id,
      workspaceMemberId,
      {
        customerId: input.customerId,
        name: input.name,
        currency: input.currency,
        note: input.note,
        requireContract: input.requireContract,
        discountPercent: input.discountPercent,
        variants: input.variants?.map((v) => ({
          variantId: v.variantId,
          quantity: v.quantity,
        })),
        externalProducts: input.externalProducts?.map((p) => ({
          productId: p.productId,
          packageId: p.packageId,
          quantity: p.quantity,
        })),
        orderLanguage: input.orderLanguage as 'vi' | 'en' | 'ko' | undefined,
        paymentMethods: input.paymentMethods?.map((p) => ({
          paymentMethodId: p.paymentMethodId,
          name: p.name,
          duration: p.duration,
          amount: p.amount,
        })),
        action: input.action,
        licenseId: input.licenseId,
        trialOrderId: input.trialOrderId,
      },
    );
  }

  /**
   * Confirm an order (change status)
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => ConfirmOrderResponseDto, {
    description: 'Confirm or update order status',
  })
  async confirmOrder(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: ConfirmOrderInputDto,
  ): Promise<ConfirmOrderResponseDto> {
    return this.orderOrchestrationService.confirmOrder(workspace.id, {
      orderId: input.orderId,
      action: input.action,
      accountingConfirmed: input.accountingConfirmed,
      note: input.note,
    });
  }

  /**
   * Validate order input before creation
   * Useful for client-side validation
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Query(() => ValidationResultDto, {
    description: 'Validate order input before creation',
  })
  async validateOrderInput(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: CreateOrderWithItemsInputDto,
  ): Promise<ValidationResultDto> {
    const result =
      await this.orderOrchestrationService.validateCreateOrderInput(
        workspace.id,
        {
          customerId: input.customerId,
          name: input.name,
          currency: input.currency,
          note: input.note,
          requireContract: input.requireContract,
          discountPercent: input.discountPercent,
          variants: input.variants?.map((v) => ({
            variantId: v.variantId,
            quantity: v.quantity,
          })),
          externalProducts: input.externalProducts?.map((p) => ({
            productId: p.productId,
            packageId: p.packageId,
            quantity: p.quantity,
          })),
          orderLanguage: input.orderLanguage as 'vi' | 'en' | 'ko' | undefined,
          paymentMethods: input.paymentMethods?.map((p) => ({
            paymentMethodId: p.paymentMethodId,
            name: p.name,
            duration: p.duration,
            amount: p.amount,
          })),
          action: input.action,
          licenseId: input.licenseId,
          trialOrderId: input.trialOrderId,
        },
      );

    return {
      valid: result.valid,
      errors: result.errors.map((e) => ({
        field: e.field,
        message: e.message,
        code: e.code,
      })),
    };
  }

  /**
   * Update order status using state machine validation
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => UpdateOrderStatusResponseDto, {
    description: 'Update order status with state machine validation',
  })
  async updateOrderStatus(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: UpdateOrderStatusInputDto,
  ): Promise<UpdateOrderStatusResponseDto> {
    return this.orderOrchestrationService.updateOrderStatus(workspace.id, {
      orderId: input.orderId,
      status: this.mapActionToStatus(input.action),
      note: input.note,
    });
  }

  /**
   * Refund an order (full or partial)
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => RefundOrderResponseDto, {
    description: 'Refund an order (full or partial)',
  })
  async refundOrder(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: RefundOrderInputDto,
  ): Promise<RefundOrderResponseDto> {
    return this.orderOrchestrationService.refundOrder(workspace.id, {
      orderId: input.orderId,
      licenseIds: input.licenseIds,
      refundAmount: input.refundAmount,
      reason: input.reason,
      isPartial: input.isPartial,
    });
  }

  /**
   * Map ORDER_ACTION to ORDER_STATUS
   */
  private mapActionToStatus(action: ORDER_ACTION): ORDER_STATUS {
    const actionToStatusMap: Partial<Record<ORDER_ACTION, ORDER_STATUS>> = {
      [ORDER_ACTION.DRAFT]: ORDER_STATUS.DRAFT,
      [ORDER_ACTION.CONFIRMED]: ORDER_STATUS.CONFIRMED,
      [ORDER_ACTION.COMPLETED]: ORDER_STATUS.COMPLETED,
      [ORDER_ACTION.LOCKED]: ORDER_STATUS.BLOCKED,
      [ORDER_ACTION.CANCELLED]: ORDER_STATUS.REFUSE,
      [ORDER_ACTION.OVERDUE]: ORDER_STATUS.OVERDUE,
      [ORDER_ACTION.REFUND]: ORDER_STATUS.REFUND,
      [ORDER_ACTION.REFUND_PARTIAL]: ORDER_STATUS.REFUND_PARTIAL,
      [ORDER_ACTION.TRIAL]: ORDER_STATUS.TRIAL,
      [ORDER_ACTION.TRIAL_TO_PAID]: ORDER_STATUS.WAIT,
      [ORDER_ACTION.LICENSE_RENEWING]: ORDER_STATUS.WAIT,
      [ORDER_ACTION.SINVOICE]: ORDER_STATUS.COMPLETED,
      [ORDER_ACTION.WAIT]: ORDER_STATUS.WAIT,
      [ORDER_ACTION.REFUSE]: ORDER_STATUS.REFUSE,
      [ORDER_ACTION.PAID]: ORDER_STATUS.CONFIRMED,
      [ORDER_ACTION.PROCESSING]: ORDER_STATUS.WAIT,
      [ORDER_ACTION.FREE]: ORDER_STATUS.COMPLETED,
      [ORDER_ACTION.LICENSE]: ORDER_STATUS.COMPLETED,
      [ORDER_ACTION.TRIAL_TO_CONFIRMED]: ORDER_STATUS.CONFIRMED,
      [ORDER_ACTION.CHANGE_VARIANT]: ORDER_STATUS.WAIT,
    };

    return actionToStatusMap[action] ?? ORDER_STATUS.DRAFT;
  }
}
