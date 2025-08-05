import { prefillMktProducts } from "src/mkt-core/dev-seeder/prefill-data/prefill-mkt-products";
import { prefillCustomers } from "src/mkt-core/mkt-example/libs/customers/prefill-data/prefill-customers";

export const MKT_PREFILLS = [
    prefillCustomers,
    prefillMktProducts,
    // add other prefills here if needed
];
