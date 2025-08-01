import { MktCustomerWorkspaceEntity } from 'src/mkt-core/libs/customers/entities/customer.workspace-entity';
import { FulfillmentWorkspaceEntity } from 'src/mkt-core/libs/orders/entities/fulfillment.workspace-entity';
import { OrderWorkspaceEntity } from 'src/mkt-core/libs/orders/entities/order.workspace-entity';
import { PaymentWorkspaceEntity } from 'src/mkt-core/libs/orders/entities/payment.workspace-entity';
export const MKT_ENTITIES = [
  MktCustomerWorkspaceEntity,
  OrderWorkspaceEntity,
  // OrderItemWorkspaceEntity,
  FulfillmentWorkspaceEntity,
  PaymentWorkspaceEntity,
];
