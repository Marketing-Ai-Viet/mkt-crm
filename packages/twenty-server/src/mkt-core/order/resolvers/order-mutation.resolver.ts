import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { RequireDepartment } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators/require-department.decorator';
import {
  ORDER_GRAPHQL_DESCRIPTIONS,
  ORDER_AUTHORIZATION,
} from 'src/mkt-core/order/constants';
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
  @RequireDepartment(ORDER_AUTHORIZATION.CREATE_ORDER)
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
  @RequireDepartment(ORDER_AUTHORIZATION.CONFIRM_ORDER)
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
  @RequireDepartment(ORDER_AUTHORIZATION.UPDATE_STATUS)
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
  @RequireDepartment(ORDER_AUTHORIZATION.REFUND_ORDER)
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
  @RequireDepartment(ORDER_AUTHORIZATION.PUBLISH_DRAFT)
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
}
