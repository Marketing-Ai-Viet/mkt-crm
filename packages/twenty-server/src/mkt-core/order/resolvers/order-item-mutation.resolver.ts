import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { UpdateOrderItemInputDto } from 'src/mkt-core/order/dto/create-order.input';
import { UpdateOrderItemResponseDto } from 'src/mkt-core/order/dto/order-response.output';
import { OrderOrchestrationService } from 'src/mkt-core/order/services/application';
import { RecalculateOrderItemsResponseDto } from 'src/mkt-core/order/dto';

/**
 * OrderItemMutationResolver - GraphQL resolver for order item mutations
 *
 * Provides mutations for:
 * - updateOrderItem: Update order item with optimistic locking
 * - recalculateOrderItems: Recalculate all order items for an order
 */
@Resolver()
export class OrderItemMutationResolver {
  constructor(
    private readonly orderOrchestrationService: OrderOrchestrationService,
  ) {}

  /**
   * Update an order item
   * Supports optimistic locking via updatedAt field
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => UpdateOrderItemResponseDto, {
    description: 'Update an order item with optimistic locking support',
  })
  async updateOrderItem(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: UpdateOrderItemInputDto,
  ): Promise<UpdateOrderItemResponseDto> {
    return this.orderOrchestrationService.updateOrderItem(workspace.id, {
      orderItemId: input.orderItemId,
      variantId: input.variantId,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      note: input.note,
      updatedAt: input.updatedAt,
    });
  }

  /**
   * Recalculate all order items for an order
   * Useful when variant prices change
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => RecalculateOrderItemsResponseDto, {
    description: 'Recalculate all order items for an order',
  })
  async recalculateOrderItems(
    @AuthWorkspace() workspace: Workspace,
    @Args('orderId') orderId: string,
  ): Promise<RecalculateOrderItemsResponseDto> {
    const result = await this.orderOrchestrationService.recalculateOrderItems(
      workspace.id,
      orderId,
    );

    return {
      success: result.success,
      updatedCount: result.updatedCount,
      error: result.error,
    };
  }
}
