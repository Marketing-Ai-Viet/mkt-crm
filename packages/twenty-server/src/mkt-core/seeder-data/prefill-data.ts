import {
  customersAllView,
  prefillCustomers,
} from 'src/mkt-core/libs/customers/prefill-data';

// VIEWS
import { fulfillmentsAllView } from 'src/mkt-core/libs/orders/view/fulfillment-all.view';
import { ordersAllView } from 'src/mkt-core/libs/orders/view/order-all.view';
import { paymentsAllView } from 'src/mkt-core/libs/orders/view/payment-all.view';

// PREFILLS
import { prefillFulfillments } from 'src/mkt-core/libs/orders/seeds/prefill-fulfillment.seed';
import { prefillOrders } from 'src/mkt-core/libs/orders/seeds/prefill-order.seed';
import { prefillPayments } from 'src/mkt-core/libs/orders/seeds/prefill-payment.seed';

export const MKT_VIEWS = [
  customersAllView,
  ordersAllView,
  // orderItemsAllView,
  fulfillmentsAllView,
  paymentsAllView,
];

export const MKT_PREFILLS = [
  prefillCustomers,
  prefillOrders,
  // prefillOrderItems,
  prefillFulfillments,
  prefillPayments,
];
