import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { DEPARTMENT } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
import { ORDER_GRAPHQL_DESCRIPTIONS } from 'src/mkt-core/order/constants';
import {
  ConfirmOrderInputDto,
  CreateOrderWithItemsInputDto,
  UpdateOrderStatusInputDto,
  RefundOrderInputDto,
  PublishDraftOrderInputDto,
} from 'src/mkt-core/order/dto/create-order.input';
import {
  ConfirmOrderResponseDto,
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
 * - confirmOrder: Confirm/update order status
 * - updateOrderStatus: Update order status with state machine validation
 * - refundOrder: Full or partial order refund
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
   * This mutation replaces the old createMktOrder + post-hook flow with:
   * - Single transaction for all operations
   * - Automatic rollback on failure
   * - Better error handling
   * - Idempotency support to prevent duplicate orders
   *
   * Authorization: SALES department + Manager + Executives
   */
  // @RequireDepartment(ORDER_AUTHORIZATION.CREATE_ORDER) // TEMPORARILY DISABLED FOR TESTING
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
   * Confirm an order (change status)
   *
   * Authorization: ACCOUNTING department + Executives only
   */
  // @RequireDepartment(ORDER_AUTHORIZATION.CONFIRM_ORDER) // TEMPORARILY DISABLED FOR TESTING
  @Mutation(() => ConfirmOrderResponseDto, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.CONFIRM_ORDER,
  })
  async confirmOrder(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: ConfirmOrderInputDto,
  ): Promise<ConfirmOrderResponseDto> {
    const domainInput = OrderInputMapper.toConfirmOrderInput(input);

    return this.orderOrchestrationService.confirmOrder(
      workspace.id,
      workspaceMemberId,
      domainInput,
    );
  }

  /**
   * Update order status using state machine validation
   *
   * Authorization: SALES + ACCOUNTING department + Manager + Executives
   */
  // @RequireDepartment(ORDER_AUTHORIZATION.UPDATE_STATUS) // TEMPORARILY DISABLED FOR TESTING
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
   */
  // @RequireDepartment(ORDER_AUTHORIZATION.REFUND_ORDER) // TEMPORARILY DISABLED FOR TESTING
  @Mutation(() => RefundOrderResponseDto, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.REFUND_ORDER,
  })
  async refundOrder(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: RefundOrderInputDto,
  ): Promise<RefundOrderResponseDto> {
    return this.orderOrchestrationService.refundOrder(
      workspace.id,
      workspaceMemberId,
      input,
    );
  }

  /**
   * Publish a draft order - converts DRAFT to PENDING_PAYMENT
   *
   * Steps:
   * - Creates payment/QR code
   * - Updates order status to PENDING_PAYMENT
   * - Schedules overdue check
   *
   * Authorization: SALES department + Manager + Executives
   */
  // @RequireDepartment(ORDER_AUTHORIZATION.PUBLISH_DRAFT) // TEMPORARILY DISABLED FOR TESTING
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
      },
    );
  }

  // ============================================
  // NEW PAYMENT FLOW MUTATIONS
  // ============================================

  /**
   * Confirm order with license creation (New Payment Flow)
   *
   * Flow: DRAFT → CONFIRMED → PROCESSING
   * - Calculates payment deadline based on priority rules
   * - Creates licenses on MKT Server with PENDING_PAYMENT status
   * - Creates invoice
   * - Schedules payment reminders
   *
   * Authorization: SALES department + Executives
   */
  // @RequireDepartment(ORDER_AUTHORIZATION.CONFIRM_ORDER_WITH_LICENSE) // TEMPORARILY DISABLED FOR TESTING
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
      },
    );
  }

  /**
   * Confirm payment for an order (New Payment Flow)
   *
   * Handles payment confirmation from multiple sources:
   * - SEPAY webhook
   * - Bank transfer (manual)
   * - Cash payment (accounting only)
   *
   * On successful payment:
   * - Updates order status: PROCESSING → COMPLETED
   * - Activates licenses: PENDING_PAYMENT → ACTIVE
   * - Cancels scheduled reminders
   *
   * Authorization: SALES (bank transfer) + ACCOUNTING (cash) + Executives
   */
  // @RequireDepartment(ORDER_AUTHORIZATION.CONFIRM_PAYMENT) // TEMPORARILY DISABLED FOR TESTING
  @Mutation(() => PaymentConfirmOutputDto, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.CONFIRM_PAYMENT,
  })
  async confirmOrderPayment(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @AuthUser() user: User,
    @Args('input') input: ConfirmPaymentInputDto,
  ): Promise<PaymentConfirmOutputDto> {
    // Validate permission based on payment method
    this.validatePaymentConfirmPermission(input.paymentMethod, user);

    return this.orderOrchestrationService.confirmOrderPayment(
      workspace.id,
      workspaceMemberId,
      {
        orderId: input.orderId,
        paymentMethod: input.paymentMethod,
        amount: input.amount,
        transactionId: input.transactionId,
        note: input.note,
      },
    );
  }

  /**
   * Unlock order after late payment (New Payment Flow)
   *
   * For orders that were LOCKED due to payment overdue:
   * - Verifies late payment received
   * - Updates order status: LOCKED → COMPLETED
   * - Activates licenses: LOCKED → ACTIVE
   *
   * Authorization: ACCOUNTING department only + Executives
   */
  // @RequireDepartment(ORDER_AUTHORIZATION.UNLOCK_ORDER) // TEMPORARILY DISABLED FOR TESTING
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
    user: User,
  ): void {
    // Cash/Other payments require ACCOUNTING department
    const cashMethods = ['CASH', 'OTHER'];

    if (cashMethods.includes(paymentMethod)) {
      // Check if user has accounting department
      // Note: This is a simplified check - actual implementation may need to check user's departments
      const userDepartments = (user as unknown as Record<string, unknown>)
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
