import { CUSTOMER_EMAIL_TEMPLATE } from 'src/mkt-core/customer/commands/mkt-customer.email-template';
import { ORDER_EMAIL_TEMPLATE } from 'src/mkt-core/order/constants/mkt-order.email-template';
import { MKT_TEMPLATE_EXAMPLES } from 'src/mkt-core/order/constants/mkt-template.example';

// prettier-ignore
export const MKT_TEMPLATE_DATA_SEED_COLUMNS = [
  'id',
  'name',
  'type',
  'content',
  'version',
  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
  'locale',
  'templateKey',
];

// prettier-ignore
export const MKT_TEMPLATE_DATA_SEEDS: Record<string, unknown>[] = [
  ...MKT_TEMPLATE_EXAMPLES,
  ...CUSTOMER_EMAIL_TEMPLATE,
  ...ORDER_EMAIL_TEMPLATE
]
