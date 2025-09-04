import { Module } from '@nestjs/common';

import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { MktRbacModule } from 'src/mkt-core/mkt-rbac/mkt-rbac.module';

import { MktOrderResolver } from './mkt-order.resolver';
import { MktOrderService } from './mkt-order.service';

import { MktOrderUpdateOnePreQueryHook } from './hooks/mkt-order-update-one.pre-query.hook';

@Module({
  imports: [MessageQueueModule, MktRbacModule.forRoot()],
  providers: [MktOrderResolver, MktOrderService, MktOrderUpdateOnePreQueryHook],
  exports: [MktOrderService],
})
export class MktOrderModule {}
