import { customersAllView, prefillCustomers } from 'src/mkt-core/libs/customers/prefill-data';
import { prefillProducts, productsAllView } from 'src/mkt-core/libs/products';

export const MKT_VIEWS = [
  customersAllView,
  productsAllView
];

export const MKT_PREFILLS = [
  prefillCustomers,
  prefillProducts
];
