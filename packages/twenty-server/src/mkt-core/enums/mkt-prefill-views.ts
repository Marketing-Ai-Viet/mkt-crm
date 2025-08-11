import { mktAttributesAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-attribute-all.view';
import { mktContractsAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-contract-all.view';
import { mktLicensesAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-license-all.view';
import { mktOrdersAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-order-all.view';
import { mktProductsAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-product-all.view';
import { mktValuesAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-value-all.view';
import { mktVariantsAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-variant-all.view';
import { mktVariantAttributesAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-variant-attribute-all.view';

export const MKT_ALL_VIEWS = [
  // product views
  mktProductsAllView,
  mktAttributesAllView,
  mktVariantsAllView,
  mktValuesAllView,
  mktVariantAttributesAllView,
  // order views
  mktOrdersAllView,
  mktLicensesAllView,
  mktContractsAllView,
];
