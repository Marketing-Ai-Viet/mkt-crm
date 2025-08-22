import { Module } from '@nestjs/common';

import { MktOrderUpdateOnePreQueryHook } from './hooks/mkt-order-update-one.pre-query.hook';
import { MktOrderResolver } from './mkt-order.resolver';
import { MktOrderService } from './mkt-order.service';

@Module({
  imports: [],
  providers: [MktOrderResolver, MktOrderService, MktOrderUpdateOnePreQueryHook],
  exports: [MktOrderService],
})
export class MktOrderModule {}
