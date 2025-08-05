import { SeedProductModuleCommand } from "src/mkt-core/commands/mkt-product-data-seed-dev-workspace.command.ts";
import {SeedCustomerModuleCommand} from "src/mkt-core/mkt-example/libs/customers/seed-customer-module.command";

export const MKT_DATABASE_COMMAND_MODULES = [
    SeedCustomerModuleCommand,
    SeedProductModuleCommand,
    // Add other commands here if needed
]
