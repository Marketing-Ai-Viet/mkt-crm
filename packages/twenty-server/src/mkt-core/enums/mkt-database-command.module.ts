import { SeedAttributeModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-attribute-data-seed-dev-workspace.command';
import { SeedContractModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-contract-data-seed-dev-workspace.command';
import { SeedLicenseModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-license-data-seed-dev-workspace.command';
import { SeedOrderModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-order-data-seed-dev-workspace.command';
import { SeedProductModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-product-data-seed-dev-workspace.command.ts';
import { SeedValueModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-value-data-seed-dev-workspace.command';
import { SeedVariantAttributeModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-variant-attribute-data-seed-dev-workspace.command';
import { SeedVariantModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-variant-data-seed-dev-workspace.command';

export const MKT_DATABASE_COMMAND_MODULES = [
  // product commands
  SeedProductModuleCommand,
  SeedAttributeModuleCommand,
  SeedVariantModuleCommand,
  SeedValueModuleCommand,
  SeedVariantAttributeModuleCommand,
  // order commands
  SeedOrderModuleCommand,
  SeedLicenseModuleCommand,
  SeedContractModuleCommand,
];
