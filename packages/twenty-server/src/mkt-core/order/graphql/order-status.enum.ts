import { registerEnumType } from '@nestjs/graphql';

import { ORDER_STATUS as OrderStatus } from 'src/mkt-core/order/constants';

export enum OrderStatusGraphQL {
  COMPLETED = OrderStatus.COMPLETED,
  TRIAL = OrderStatus.TRIAL,
  DRAFT = OrderStatus.DRAFT,
  WAIT = OrderStatus.WAIT,
  OVERDUE = OrderStatus.OVERDUE,
  REFUSE = OrderStatus.REFUSE,
}

registerEnumType(OrderStatusGraphQL, {
  name: 'OrderStatus',
  description: 'Order status enum',
  valuesMap: {
    TRIAL: {
      description: 'Order is in trial period',
    },
    DRAFT: {
      description: 'Order is draft',
    },
    COMPLETED: {
      description: 'Order is completed',
    },
    WAIT: {
      description: 'Order is waiting',
    },
    OVERDUE: {
      description: 'Order is overdue',
    },
    REFUSE: {
      description: 'Order is refused',
    },
  },
});
