import {SeedCustomerModuleCommand} from "src/mkt-core/libs/customers/seed-customer-module.command";
import {PRODUCT_COMMANDS} from "src/mkt-core/libs/products";

export const MKT_COMMANDS = [
    SeedCustomerModuleCommand,
    ...PRODUCT_COMMANDS,
    // Add any additional commands here
];
