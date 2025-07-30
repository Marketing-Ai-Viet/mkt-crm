import { CUSTOMER_SEEDS_CONSTANT } from 'src/mkt-core/libs/customers/constants';
import { PRODUCT_SEEDS } from 'src/mkt-core/libs/products';

//seeder for npx nx database:reset twenty-server
export const MKT_SEEDS = [
  CUSTOMER_SEEDS_CONSTANT,
  ...PRODUCT_SEEDS
  // Add other seeds here if needed
];
