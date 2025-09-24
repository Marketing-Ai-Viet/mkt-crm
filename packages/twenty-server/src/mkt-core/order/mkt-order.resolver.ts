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
@Permission({ action: PermissionAction.READ, objectName: 'mktOrder' })
export class MktOrderResolver {
  constructor(private readonly orderService: MktOrderService) {}

  @Mutation(() => MktOrderOutput)
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
  async updateMktOrderWithItems(
    @Args('input') input: UpdateOrderInput,
  ): Promise<MktOrderOutput> {
    const orderEntity = await this.orderService.updateOrder(input);

    return toMktOrderOutput(orderEntity);
  }

  @Mutation(() => DeleteOrderOutput)
  async softDeleteMktOrder(
    @Args('input') input: DeleteOrderInput,
  ): Promise<DeleteOrderOutput> {
    return await this.orderService.deleteOrder(input);
  }
}
