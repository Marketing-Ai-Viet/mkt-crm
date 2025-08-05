import { CUSTOMER_DATA_SEED_COLUMNS, CUSTOMER_DATA_SEEDS } from "src/mkt-core/mkt-example/libs/customers/constants/customer-data-seeds.constant";
import { MKT_PRODUCT_DATA_SEED_COLUMNS, MKT_PRODUCT_DATA_SEEDS } from "src/mkt-core/dev-seeder/constants/mkt-prroduct-data-seeds.constants";

export const MKT_RECORD_SEEDS_CONFIGS = [
    {
        tableName: 'mktCustomer',
        pgColumns: CUSTOMER_DATA_SEED_COLUMNS,
        recordSeeds: CUSTOMER_DATA_SEEDS,
    },
    {
        tableName: 'mktProduct',
        pgColumns: MKT_PRODUCT_DATA_SEED_COLUMNS,
        recordSeeds: MKT_PRODUCT_DATA_SEEDS,
    },
    // add other records here if needed
]
