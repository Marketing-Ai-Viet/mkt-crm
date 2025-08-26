import { SeedAttributeModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-attribute-data-seed-dev-workspace.command';
import { SeedComboModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-combo-data-seed-dev-workspace.command';
import { SeedComboVariantModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-combo-variant-data-seed-dev-workspace.command';
import { SeedContractModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-contract-data-seed-dev-workspace.command';
import { SeedCustomerModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-customer-data-seed-dev-workspace.command';
import { SeedDepartmentModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-department-data-seed-dev-workspace.command';
import { SeedEmploymentStatusModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-employment-status-data-seed-dev-workspace.command';
import { SeedInvoiceModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-invoice-data-seed-dev-workspace.command';
import { SeedMktKpiCommand } from 'src/mkt-core/dev-seeder/commands/mkt-kpi-data-seed-dev-workspace.command';
import { SeedMktKpiTemplateCommand } from 'src/mkt-core/dev-seeder/commands/mkt-kpi-template-data-seed-dev-workspace.command';
import { SeedLicenseModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-license-data-seed-dev-workspace.command';
import { SeedOrderModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-order-data-seed-dev-workspace.command';
import { SeedOrderItemModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-order-item-data-seed-dev-workspace.command';
import { SeedOrganizationLevelModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-organization-level-data-seed-dev-workspace.command';
import { MktPaymentDataSeedDevWorkspaceCommand } from 'src/mkt-core/dev-seeder/commands/mkt-payment-data-seed-dev-workspace.command';
import { MktPaymentMethodDataSeedDevWorkspaceCommand } from 'src/mkt-core/dev-seeder/commands/mkt-payment-method-data-seed-dev-workspace.command';
import { SeedProductModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-product-data-seed-dev-workspace.command';
import { SeedResellerModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-reseller-data-seed-dev-workspace.command';
import { SeedResellerTierModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-reseller-tier-data-seed-dev-workspace.command';
import { SeedResellerTierHistoryModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-reseller-tier-history-data-seed-dev-workspace.command';
import { SeedTemplateModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-template-data-seed-dev-workspace.command';
import { SeedMktTemporaryPermissionCommand } from 'src/mkt-core/dev-seeder/commands/mkt-temporary-permission-data-seed-dev-workspace.command';
import { SeedValueModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-value-data-seed-dev-workspace.command';
import { SeedVariantAttributeModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-variant-attribute-data-seed-dev-workspace.command';
import { SeedVariantModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-variant-data-seed-dev-workspace.command';
import { SeedMktDepartmentHierarchyCommand } from 'src/mkt-core/dev-seeder/commands/mkt-department-hierarchy-data-seed-dev-workspace.command';
import { SeedMktDataAccessPolicyCommand } from 'src/mkt-core/dev-seeder/commands/mkt-data-access-policy-data-seed-dev-workspace.command';
import { SeedMktPermissionAuditCommand } from 'src/mkt-core/dev-seeder/commands/mkt-permission-audit-data-seed-dev-workspace.command';

export const MKT_DATABASE_COMMAND_MODULES = [
  // customer commands
  SeedCustomerModuleCommand,
  // product commands
  SeedProductModuleCommand,
  SeedAttributeModuleCommand,
  SeedVariantModuleCommand,
  SeedValueModuleCommand,
  SeedVariantAttributeModuleCommand,
  SeedComboModuleCommand,
  SeedComboVariantModuleCommand,
  // order commands
  SeedOrderModuleCommand,
  SeedOrderItemModuleCommand,
  // template commands
  SeedTemplateModuleCommand,
  // contract commands
  SeedContractModuleCommand,
  // license commands
  SeedLicenseModuleCommand,
  // invoice commands
  SeedInvoiceModuleCommand,
  // payment commands
  MktPaymentMethodDataSeedDevWorkspaceCommand,
  MktPaymentDataSeedDevWorkspaceCommand,
  // reseller commands
  SeedResellerTierModuleCommand,
  SeedResellerModuleCommand,
  SeedResellerTierHistoryModuleCommand,
  // organization level commands
  SeedOrganizationLevelModuleCommand,
  SeedEmploymentStatusModuleCommand,
  SeedDepartmentModuleCommand,
  SeedMktKpiCommand,
  SeedMktKpiTemplateCommand,
  // temporary permission commands
  SeedMktTemporaryPermissionCommand,
  SeedMktDepartmentHierarchyCommand,
  SeedMktDataAccessPolicyCommand,
  SeedMktPermissionAuditCommand,
];
