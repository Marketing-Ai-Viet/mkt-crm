import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import {
  toMktOrderOutput,
  toMktOrdersOutput,
} from 'src/mkt-core/order/dto/mkt-order.mapper';
import { EnterpriseRbacGuard } from 'src/mkt-core/mkt-rbac-enterprise-grade/guards/enterprise-rbac.guard';
import { Permission } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators/permission.decorator';
import { PermissionAction } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';
import { PERMISSION_RESOURCE_KEYS } from 'src/mkt-core/mkt-permission-template/constants';

import { MktOrderService } from './mkt-order.service';
import {
  CreateOrderWithItemsInput,
  DeleteOrderInput,
  DeleteOrderOutput,
  GetOrderInput,
  GetOrdersInput,
  MktOrderOutput,
  MktOrdersOutput,
  UpdateOrderInput,
} from './dto';

@Resolver(() => MktOrderOutput)
@UseGuards(UserAuthGuard, EnterpriseRbacGuard)
@Permission({
  resource: PERMISSION_RESOURCE_KEYS.ORDERS,
  action: PermissionAction.READ, // Default READ for queries
})
export class MktOrderResolver {
  constructor(private readonly orderService: MktOrderService) {}

  @Mutation(() => MktOrderOutput)
  @Permission({
    action: PermissionAction.CREATE,
  })
  async createMktOrderWithItems(
    @Args('input') input: CreateOrderWithItemsInput,
  ): Promise<MktOrderOutput> {
    const orderEntity = await this.orderService.createOrderWithItems(input);

    return toMktOrderOutput(orderEntity);
  }

  @Query(() => MktOrderOutput)
  async getMktOrderWithItems(
    @Args('input') input: GetOrderInput,
  ): Promise<MktOrderOutput> {
    const orderEntity = await this.orderService.getOrderWithItems(input);

    return toMktOrderOutput(orderEntity);
  }

  @Query(() => MktOrdersOutput)
  async getMktOrdersWithPaging(
    @Args('input') input: GetOrdersInput,
  ): Promise<MktOrdersOutput> {
    const { page = 1, limit = 10 } = input;

    const { orders, total } =
      await this.orderService.getOrdersWithPaging(input);

    return toMktOrdersOutput(orders, total, page, limit);
  }

  @Mutation(() => MktOrderOutput)
  @Permission({
    action: PermissionAction.UPDATE,
    recordIdPath: 'input.id', // Auto extract orderId from input.id
  })
  async updateMktOrderWithItems(
    @Args('input') input: UpdateOrderInput,
  ): Promise<MktOrderOutput> {
    const orderEntity = await this.orderService.updateOrder(input);

    return toMktOrderOutput(orderEntity);
  }

  @Mutation(() => DeleteOrderOutput)
  @Permission({
    action: PermissionAction.DELETE,
    recordIdPath: 'input.id', // Auto extract orderId from input.id
    errorMessage: 'You do not have permission to delete this order.',
  })
  async softDeleteMktOrder(
    @Args('input') input: DeleteOrderInput,
  ): Promise<DeleteOrderOutput> {
    return await this.orderService.deleteOrder(input);
  }
}
