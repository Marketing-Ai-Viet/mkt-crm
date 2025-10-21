import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';

import {
  MktOrderOutput,
  UpdateManyOrderInput,
  UpdateManyOrdersOutput,
} from './dto';
import { MktOrderService } from './mkt-order.service';

@Resolver(() => MktOrderOutput)
export class MktOrderResolver {
  constructor(private readonly orderService: MktOrderService) {}

  @Mutation(() => UpdateManyOrdersOutput)
  @UseGuards(UserAuthGuard)
  async updateManyMktOrders(
    @Args('input') input: UpdateManyOrderInput,
  ): Promise<UpdateManyOrdersOutput> {
    const result = await this.orderService.updateManyOrders(input);

    return {
      result,
      success: result.updatedCount > 0,
      message: `Successfully updated ${result.updatedCount} out of ${input.updates.length} orders`,
    };
  }
}
