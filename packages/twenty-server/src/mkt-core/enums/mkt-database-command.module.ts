import { SeedContractModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-contract-data-seed-dev-workspace.command';
import { SeedCustomerModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-customer-data-seed-dev-workspace.command';
import { SeedCustomerTagModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-customer-tag-data-seed-dev-workspace.command';
import { SeedMktDataAccessPolicyCommand } from 'src/mkt-core/dev-seeder/commands/mkt-data-access-policy-data-seed-dev-workspace.command';
import { SeedDepartmentModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-department-data-seed-dev-workspace.command';
import { SeedMktDepartmentHierarchyCommand } from 'src/mkt-core/dev-seeder/commands/mkt-department-hierarchy-data-seed-dev-workspace.command';
import { SeedEmploymentStatusModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-employment-status-data-seed-dev-workspace.command';
import { SeedMktKpiCommand } from 'src/mkt-core/dev-seeder/commands/mkt-kpi-data-seed-dev-workspace.command';
import { SeedMktKpiTemplateCommand } from 'src/mkt-core/dev-seeder/commands/mkt-kpi-template-data-seed-dev-workspace.command';
import { SeedLicenseModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-license-data-seed-dev-workspace.command';
import { SeedOrderModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-order-data-seed-dev-workspace.command';
import { SeedOrderItemModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-order-item-data-seed-dev-workspace.command';
import { SeedOrganizationLevelModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-organization-level-data-seed-dev-workspace.command';
import { MktPaymentDataSeedDevWorkspaceCommand } from 'src/mkt-core/dev-seeder/commands/mkt-payment-data-seed-dev-workspace.command';
import { MktPaymentMethodDataSeedDevWorkspaceCommand } from 'src/mkt-core/dev-seeder/commands/mkt-payment-method-data-seed-dev-workspace.command';
import { SeedMktPermissionAuditCommand } from 'src/mkt-core/dev-seeder/commands/mkt-permission-audit-data-seed-dev-workspace.command';
import { SeedResellerModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-reseller-data-seed-dev-workspace.command';
import { SeedResellerTierModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-reseller-tier-data-seed-dev-workspace.command';
import { SeedResellerTierHistoryModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-reseller-tier-history-data-seed-dev-workspace.command';
import { SeedTagModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-tag-data-seed-dev-workspace.command';
import { SeedTemplateModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-template-data-seed-dev-workspace.command';
import { SeedMktTemporaryPermissionCommand } from 'src/mkt-core/dev-seeder/commands/mkt-temporary-permission-data-seed-dev-workspace.command';
import { SeedSInvoiceAuthModuleCommand } from 'src/mkt-core/dev-seeder/invoice-seeder/mkt-sinvoice-auth-data-seed-dev-workspace.command';
import { SeedSInvoiceModuleCommand } from 'src/mkt-core/dev-seeder/invoice-seeder/mkt-sinvoice-data-seed-dev-workspace.command';
import { SeedSInvoiceItemModuleCommand } from 'src/mkt-core/dev-seeder/invoice-seeder/mkt-sinvoice-item-data-seed-dev-workspace.command';
import { SeedSInvoiceMetadataModuleCommand } from 'src/mkt-core/dev-seeder/invoice-seeder/mkt-sinvoice-metadata-data-seed-dev-workspace.command';
import { SeedSInvoicePaymentModuleCommand } from 'src/mkt-core/dev-seeder/invoice-seeder/mkt-sinvoice-payment-data-seed-dev-workspace.command';
import { SeedSInvoiceTaxBreakdownModuleCommand } from 'src/mkt-core/dev-seeder/invoice-seeder/mkt-sinvoice-tax-breakdown-data-seed-dev-workspace.command';
import { SeedCategoryModuleCommand } from 'src/mkt-core/dev-seeder/product-seeder/mkt-category-data-seed-dev-workspace.command';
import { SeedComboModuleCommand } from 'src/mkt-core/dev-seeder/product-seeder/mkt-combo-data-seed-dev-workspace.command';
import { SeedComboVariantModuleCommand } from 'src/mkt-core/dev-seeder/product-seeder/mkt-combo-variant-data-seed-dev-workspace.command';
import { SeedProductModuleCommand } from 'src/mkt-core/dev-seeder/product-seeder/mkt-product-data-seed-dev-workspace.command';
import { SeedVariantModuleCommand } from 'src/mkt-core/dev-seeder/product-seeder/mkt-variant-data-seed-dev-workspace.command';
import { SeedVariantValueModuleCommand } from 'src/mkt-core/dev-seeder/product-seeder/mkt-variant-value-data-seed-dev-workspace.command';
import { EnsureOrderUpdatedAtTriggerCommand } from 'src/mkt-core/order/commands/mkt-order-optimistic-locking.command';
import { SeedPermissionResourceModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-permission-resource-data-seed-dev-workspace.command';
import { SeedPermissionActionModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-permission-action-data-seed-dev-workspace.command';
import { SeedPermissionTemplateModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-permission-template-data-seed-dev-workspace.command';
import { SeedTemplateResourcePermissionModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-template-resource-permission-data-seed-dev-workspace.command';
import { SeedTemplateAccessLimitationModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-template-access-limitation-data-seed-dev-workspace.command';
import { SeedTemplateSystemActionModuleCommand } from 'src/mkt-core/dev-seeder/commands/mkt-template-system-action-data-seed-dev-workspace.command';

export const MKT_DATABASE_COMMAND_MODULES = [
  // customer commands
  SeedCustomerModuleCommand,
  SeedTagModuleCommand,
  SeedCustomerTagModuleCommand,
  // product commands
  SeedCategoryModuleCommand,
  SeedProductModuleCommand,
  SeedVariantModuleCommand,
  SeedComboModuleCommand,
  SeedComboVariantModuleCommand,
  SeedVariantValueModuleCommand,
  // order commands
  SeedOrderModuleCommand,
  SeedOrderItemModuleCommand,
  EnsureOrderUpdatedAtTriggerCommand,
  // template commands
  SeedTemplateModuleCommand,
  // contract commands
  SeedContractModuleCommand,
  // license commands
  SeedLicenseModuleCommand,
  // invoice commands
  SeedSInvoiceAuthModuleCommand,
  SeedSInvoiceModuleCommand,
  SeedSInvoicePaymentModuleCommand,
  SeedSInvoiceItemModuleCommand,
  SeedSInvoiceTaxBreakdownModuleCommand,
  SeedSInvoiceMetadataModuleCommand,
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
  // permission resource commands
  SeedPermissionResourceModuleCommand,
  SeedPermissionActionModuleCommand,
  SeedPermissionTemplateModuleCommand,
  SeedTemplateResourcePermissionModuleCommand,
  SeedTemplateSystemActionModuleCommand,
  SeedTemplateAccessLimitationModuleCommand,
];
