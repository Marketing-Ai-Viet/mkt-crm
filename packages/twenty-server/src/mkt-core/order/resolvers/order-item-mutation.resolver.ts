import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { ORDER_GRAPHQL_DESCRIPTIONS } from 'src/mkt-core/order/constants';
import { UpdateOrderItemInputDto } from 'src/mkt-core/order/dto/create-order.input';
import {
  RecalculateOrderItemsResponseDto,
  UpdateOrderItemResponseDto,
} from 'src/mkt-core/order/dto';
import { OrderOrchestrationService } from 'src/mkt-core/order/services/application';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

/**
 * OrderItemMutationResolver - GraphQL resolver for order item mutations
 *
 * Provides mutations for:
 * - updateOrderItem: Update order item with optimistic locking
 * - recalculateOrderItems: Recalculate all order items for an order
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard)
export class OrderItemMutationResolver {
  constructor(
    private readonly orderOrchestrationService: OrderOrchestrationService,
  ) {}

  /**
   * Update an order item
   * Supports optimistic locking via updatedAt field
   */
  @Mutation(() => UpdateOrderItemResponseDto, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.UPDATE_ORDER_ITEM,
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
  @Mutation(() => RecalculateOrderItemsResponseDto, {
    description: ORDER_GRAPHQL_DESCRIPTIONS.RECALCULATE_ORDER_ITEMS,
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
