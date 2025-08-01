import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FulfillmentWorkspaceEntity } from './entities/fulfillment.workspace-entity';
import { OrderWorkspaceEntity } from './entities/order.workspace-entity';
import { PaymentWorkspaceEntity } from './entities/payment.workspace-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderWorkspaceEntity,
      // OrderItemWorkspaceEntity,
      PaymentWorkspaceEntity,
      FulfillmentWorkspaceEntity,
    ]),
  ],
  providers: [
  ],
  exports: [],
})
export class OrderModule {}
