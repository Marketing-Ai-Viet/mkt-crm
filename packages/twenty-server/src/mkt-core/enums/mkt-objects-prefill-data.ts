import { prefillMktAttributes } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-attributes';
import { prefillMktProducts } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-products';
import { prefillMktValues } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-values';
import { prefillMktVariantAttributes } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-variant-attribute';
import { prefillMktVariants } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-variants';
import { prefillCustomers } from 'src/mkt-core/mkt-example/libs/customers/prefill-data/prefill-customers';

export const MKT_PREFILLS = [
  prefillCustomers,
  prefillMktProducts,
  prefillMktAttributes,
  prefillMktValues,
  prefillMktVariants,
  prefillMktVariantAttributes,
  // add other prefills here if needed
];
