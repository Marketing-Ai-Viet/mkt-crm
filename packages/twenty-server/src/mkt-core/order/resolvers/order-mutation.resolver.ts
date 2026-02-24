import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { DEPARTMENT } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
import {
  ORDER_GRAPHQL_DESCRIPTIONS,
  // ORDER_DATA_SCOPE,
} from 'src/mkt-core/order/constants';
import {
  CreateOrderWithItemsInputDto,
  UpdateOrderStatusInputDto,
  RefundOrderInputDto,
  PublishDraftOrderInputDto,
} from 'src/mkt-core/order/dto/create-order.input';
import {
  CreateOrderResponseDto,
  RefundOrderResponseDto,
  UpdateOrderStatusResponseDto,
  PublishDraftOrderResponseDto,
} from 'src/mkt-core/order/dto/order-response.output';
import {
  ConfirmOrderWithLicenseInputDto,
  ConfirmOrderWithLicenseOutputDto,
  ConfirmPaymentInputDto,
  PaymentConfirmOutputDto,
  UnlockOrderInputDto,
  UnlockOrderOutputDto,
} from 'src/mkt-core/order/dto/payment-flow.dto';
import { OrderInputMapper } from 'src/mkt-core/order/mappers';
import { OrderOrchestrationService } from 'src/mkt-core/order/services/application';
import { OrderStatusService } from 'src/mkt-core/order/services/core';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
// TEMPORARILY DISABLED: RBAC decorators for workflow testing
// import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
// import {
//   RequireOrderCreateAccess,
//   RequireOrderUpdateAccess,
//   RequireOrderConfirmAccess,
//   RequireOrderPaymentAccess,
//   RequireOrderRefundAccess,
//   RequireOrderUnlockAccess,
// } from 'src/mkt-core/order/decorators/require-order-access.decorator';

/**
 * OrderMutationResolver - GraphQL resolver for order mutations
 *
 * Responsibilities:
 * - Authentication & Authorization (Guards)
 * - Input transformation (DTO → Domain via Mapper)
 * - Delegation to OrderOrchestrationService
 *
 * NO business logic in this layer.
 *
 * Provides mutations for:
 * - createOrderWithItems: Create new order with items, licenses, and payment
 * - updateOrderStatus: Update order status with state machine validation
 * - refundOrder: Full or partial order refund
 * - publishDraftOrder: Convert draft order to pending payment
 * - confirmOrderWithLicense: Confirm order and create licenses (New Payment Flow)
 * - confirmOrderPayment: Confirm payment and activate licenses (New Payment Flow)
 * - unlockOrderAfterPayment: Unlock order after late payment (New Payment Flow)
 *
 * Note: Trial license creation is handled by MktLicenseResolver.mktCreateTrialLicense
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard)
export class OrderMutationResolver {
  constructor(
    private readonly orderOrchestrationService: OrderOrchestrationService,
    private readonly orderStatusService: OrderStatusService,
  ) {}

  /**
   * Create a new order with items using the saga pattern
   *
   * Authorization: SALES department + Manager + Executives
   * TODO: Re-enable @RequireOrderCreateAccess() and @DataScope after RBAC testing
   */
  // @RequireOrderCreateAccess()
  // @DataScope(ORDER_DATA_SCOPE.MUTATION_CREATE)
  @Mutation(() => CreateOrderResponseDto, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.CREATE_ORDER_WITH_ITEMS,
  })
  async createOrderWithItems(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: CreateOrderWithItemsInputDto,
  ): Promise<CreateOrderResponseDto> {
    const domainInput = OrderInputMapper.toCreateOrderInput(input);

    return this.orderOrchestrationService.createOrderWithItems(
      workspace.id,
      workspaceMemberId,
      domainInput,
    );
  }

  /**
   * Update order status using state machine validation
   *
   * Authorization: SALES + ACCOUNTING department + Manager + Executives
   * TODO: Re-enable @RequireOrderUpdateAccess() and @DataScope after RBAC testing
   */
  // @RequireOrderUpdateAccess()
  // @DataScope(ORDER_DATA_SCOPE.MUTATION_UPDATE_STATUS)
  @Mutation(() => UpdateOrderStatusResponseDto, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.UPDATE_ORDER_STATUS,
  })
  async updateOrderStatus(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: UpdateOrderStatusInputDto,
  ): Promise<UpdateOrderStatusResponseDto> {
    const domainInput = OrderInputMapper.toUpdateOrderStatusInput(
      input,
      this.orderStatusService,
    );

    return this.orderOrchestrationService.updateOrderStatus(
      workspace.id,
      workspaceMemberId,
      domainInput,
    );
  }

  /**
   * Refund an order (full or partial)
   *
   * Authorization: ACCOUNTING department + Executives only
   * TODO: Re-enable @RequireOrderRefundAccess() and @DataScope after RBAC testing
   */
  // @RequireOrderRefundAccess()
  // @DataScope(ORDER_DATA_SCOPE.MUTATION_REFUND)
  @Mutation(() => RefundOrderResponseDto, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.REFUND_ORDER,
  })
  async refundOrder(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: RefundOrderInputDto,
  ): Promise<RefundOrderResponseDto> {
    const domainInput = OrderInputMapper.toRefundOrderInput(input);

    return this.orderOrchestrationService.refundOrder(
      workspace.id,
      workspaceMemberId,
      domainInput,
    );
  }

  /**
   * Publish a draft order - converts DRAFT to PENDING_PAYMENT
   *
   * Authorization: SALES department + Manager + Executives
   * TODO: Re-enable @RequireOrderUpdateAccess() and @DataScope after RBAC testing
   */
  // @RequireOrderUpdateAccess()
  // @DataScope(ORDER_DATA_SCOPE.MUTATION_UPDATE_STATUS)
  @Mutation(() => PublishDraftOrderResponseDto, {
    description:
      'Publish a draft order to create payment and start the payment flow',
  })
  async publishDraftOrder(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: PublishDraftOrderInputDto,
  ): Promise<PublishDraftOrderResponseDto> {
    return this.orderOrchestrationService.publishDraftOrder(
      workspace.id,
      workspaceMemberId,
      {
        orderId: input.orderId,
        paymentMethods: input.paymentMethods?.map((p) => ({
          paymentMethodId: p.paymentMethodId,
          name: p.name,
          duration: p.duration,
          amount: p.amount,
        })),
        note: input.note,
        expectedVersion: input.expectedVersion,
      },
    );
  }

  // ============================================
  // NEW PAYMENT FLOW MUTATIONS
  // ============================================

  /**
   * Confirm order with license creation (New Payment Flow)
   *
   * Authorization: SALES department + Executives
   * TODO: Re-enable @RequireOrderConfirmAccess() and @DataScope after RBAC testing
   */
  // @RequireOrderConfirmAccess()
  // @DataScope(ORDER_DATA_SCOPE.MUTATION_CONFIRM)
  @Mutation(() => ConfirmOrderWithLicenseOutputDto, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.CONFIRM_ORDER_WITH_LICENSE,
  })
  async confirmOrderWithLicense(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: ConfirmOrderWithLicenseInputDto,
  ): Promise<ConfirmOrderWithLicenseOutputDto> {
    return this.orderOrchestrationService.confirmOrderWithLicense(
      workspace.id,
      workspaceMemberId,
      {
        orderId: input.orderId,
        manualDeadlineHours: input.paymentDeadlineHours,
        note: input.note,
        expectedVersion: input.expectedVersion,
      },
    );
  }

  /**
   * Confirm payment for an order (New Payment Flow)
   *
   * Authorization: SALES (bank transfer) + ACCOUNTING (cash) + Executives
   * TODO: Re-enable @RequireOrderPaymentAccess() and @DataScope after RBAC testing
   */
  // @RequireOrderPaymentAccess()
  // @DataScope(ORDER_DATA_SCOPE.MUTATION_CONFIRM_PAYMENT)
  @Mutation(() => PaymentConfirmOutputDto, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.CONFIRM_PAYMENT,
  })
  async confirmOrderPayment(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @AuthUser() user: User,
    @Args('input') input: ConfirmPaymentInputDto,
  ): Promise<PaymentConfirmOutputDto> {
    // TEMPORARILY DISABLED: payment method permission check for testing
    // this.validatePaymentConfirmPermission(input.paymentMethod, user);

    return this.orderOrchestrationService.confirmOrderPayment(
      workspace.id,
      workspaceMemberId,
      {
        orderId: input.orderId,
        paymentMethod: input.paymentMethod,
        amount: input.amount,
        transactionId: input.transactionId,
        note: input.note,
        expectedVersion: input.expectedVersion,
      },
    );
  }

  /**
   * Unlock order after late payment (New Payment Flow)
   *
   * Authorization: ACCOUNTING department only + Executives
   * TODO: Re-enable @RequireOrderUnlockAccess() and @DataScope after RBAC testing
   */
  // @RequireOrderUnlockAccess()
  // @DataScope(ORDER_DATA_SCOPE.MUTATION_UNLOCK)
  @Mutation(() => UnlockOrderOutputDto, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.UNLOCK_ORDER,
  })
  async unlockOrderAfterPayment(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: UnlockOrderInputDto,
  ): Promise<UnlockOrderOutputDto> {
    return this.orderOrchestrationService.unlockOrderAfterPayment(
      workspace.id,
      workspaceMemberId,
      {
        orderId: input.orderId,
        amount: input.amount,
        transactionId: input.transactionId,
        note: input.note,
        expectedVersion: input.expectedVersion,
      },
    );
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Validate payment confirmation permission based on payment method
   *
   * Cash/Other payments require ACCOUNTING department
   */
  private validatePaymentConfirmPermission(
    paymentMethod: string,
    _user: User,
  ): void {
    // Cash/Other payments require ACCOUNTING department
    const cashMethods = ['CASH', 'OTHER'];

    if (cashMethods.includes(paymentMethod)) {
      // Check if user has accounting department
      // Note: This is a simplified check - actual implementation may need to check user's departments
      const userDepartments = (_user as unknown as Record<string, unknown>)
        .departments as string[] | undefined;

      const hasAccounting = userDepartments?.some(
        (dept) =>
          dept === DEPARTMENT.ACCOUNTING ||
          dept.startsWith(`${DEPARTMENT.ACCOUNTING}_`),
      );

      if (!hasAccounting) {
        throw new ForbiddenException(
          'Cash payments must be confirmed by Accounting department',
        );
      }
    }
  }
}
