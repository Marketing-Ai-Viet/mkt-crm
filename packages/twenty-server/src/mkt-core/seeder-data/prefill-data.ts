import { customersAllView, prefillCustomers } from 'src/mkt-core/libs/customers/prefill-data';
import { PRODUCT_PREFILLS, PRODUCT_VIEWS } from 'src/mkt-core/libs/products';

export const MKT_VIEWS = [
  customersAllView,
  ...PRODUCT_VIEWS
];

export const MKT_PREFILLS = [
  prefillCustomers,
  ...PRODUCT_PREFILLS
];
