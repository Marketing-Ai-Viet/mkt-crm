import { UseGuards } from '@nestjs/common';
import { Args, Context, Query, Resolver } from '@nestjs/graphql';

import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { MktPublicOrderPaymentResponseDto } from 'src/mkt-core/order/dto/public/order-payment-public.output';
import { OrderPublicService } from 'src/mkt-core/order/services/public/order-public.service';

// ============================================
// TYPES
// ============================================

type PublicGraphQLContext = {
  req?: {
    ip?: string;
    socket?: { remoteAddress?: string };
  };
};

// ============================================
// RESOLVER
// ============================================

@Resolver()
export class OrderPublicResolver {
  constructor(private readonly orderPublicService: OrderPublicService) {}

  @UseGuards(PublicEndpointGuard)
  @Query(() => MktPublicOrderPaymentResponseDto, {
    description: 'Get public order payment info for payment page rendering',
  })
  async mktPublicOrderPayment(
    @Args('orderCode', { type: () => String }) orderCode: string,
    @Context() ctx: PublicGraphQLContext,
  ): Promise<MktPublicOrderPaymentResponseDto> {
    const clientIp = ctx.req?.ip ?? ctx.req?.socket?.remoteAddress ?? 'unknown';

    return this.orderPublicService.getOrderPaymentPublicInfo(
      orderCode,
      clientIp,
    );
  }
}
