import { SeedContractModuleCommand } from 'src/mkt-core/seeder/commands/mkt-contract-data-seed-dev-workspace.command';
import { SeedCustomerModuleCommand } from 'src/mkt-core/seeder/customer-seeder/mkt-customer-data-seed-dev-workspace.command';
import { SeedCustomerTagModuleCommand } from 'src/mkt-core/seeder/customer-seeder/mkt-customer-tag-data-seed-dev-workspace.command';
import { SeedMktDataAccessPolicyCommand } from 'src/mkt-core/seeder/commands/mkt-data-access-policy-data-seed-dev-workspace.command';
import { SeedDepartmentModuleCommand } from 'src/mkt-core/seeder/commands/mkt-department-data-seed-dev-workspace.command';
import { MktGenericComboDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/commands/mkt-generic-combo-data-seed-dev-workspace.command';
import { MktGenericComboItemDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/commands/mkt-generic-combo-item-data-seed-dev-workspace.command';
import { SeedMktDepartmentHierarchyCommand } from 'src/mkt-core/seeder/commands/mkt-department-hierarchy-data-seed-dev-workspace.command';
import { SeedEmploymentStatusModuleCommand } from 'src/mkt-core/seeder/commands/mkt-employment-status-data-seed-dev-workspace.command';
import { SeedI18nModuleCommand } from 'src/mkt-core/seeder/commands/mkt-i18n-data-seed-dev-workspace.command';
import { SeedMktKpiCommand } from 'src/mkt-core/seeder/commands/mkt-kpi-data-seed-dev-workspace.command';
import { SeedMktKpiTemplateCommand } from 'src/mkt-core/seeder/commands/mkt-kpi-template-data-seed-dev-workspace.command';
import { SeedOrderModuleCommand } from 'src/mkt-core/seeder/commands/mkt-order-data-seed-dev-workspace.command';
import { SeedMktOrderHistoryModuleCommand } from 'src/mkt-core/seeder/commands/mkt-order-history-data-seed-dev-workspace.command';
import { SeedOrderItemModuleCommand } from 'src/mkt-core/seeder/commands/mkt-order-item-data-seed-dev-workspace.command';
import { SeedOrganizationLevelModuleCommand } from 'src/mkt-core/seeder/commands/mkt-organization-level-data-seed-dev-workspace.command';
import { MktPaymentDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/commands/mkt-payment-data-seed-dev-workspace.command';
import { SeedMktPaymentHistoryModuleCommand } from 'src/mkt-core/seeder/commands/mkt-payment-history-data-seed-dev-workspace.command';
import { MktPaymentMethodDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/commands/mkt-payment-method-data-seed-dev-workspace.command';
import { SeedMktPermissionAuditCommand } from 'src/mkt-core/seeder/commands/mkt-permission-audit-data-seed-dev-workspace.command';
import { SeedTagModuleCommand } from 'src/mkt-core/seeder/commands/mkt-tag-data-seed-dev-workspace.command';
import { SeedTemplateModuleCommand } from 'src/mkt-core/seeder/commands/mkt-template-data-seed-dev-workspace.command';
import { SeedMktTemporaryPermissionCommand } from 'src/mkt-core/seeder/commands/mkt-temporary-permission-data-seed-dev-workspace.command';
import { SeedSInvoiceAuthModuleCommand } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-auth-data-seed-dev-workspace.command';
import { SeedSInvoiceModuleCommand } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-data-seed-dev-workspace.command';
import { SeedSInvoiceItemModuleCommand } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-item-data-seed-dev-workspace.command';
import { SeedSInvoiceMetadataModuleCommand } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-metadata-data-seed-dev-workspace.command';
import { SeedSInvoicePaymentModuleCommand } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-payment-data-seed-dev-workspace.command';
import { SeedSInvoiceTaxBreakdownModuleCommand } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-tax-breakdown-data-seed-dev-workspace.command';
import { SeedMktEmailModuleCommand } from 'src/mkt-core/email/seeder/mkt-email-data-seed-dev-workspace.command';
import { SeedMktReportModuleCommand } from 'src/mkt-core/report/seeder/mkt-report-data-seed-dev-workspace.command';
import { SeedMktOptionModuleCommand } from 'src/mkt-core/setting/seeder/mkt-option-data-seed-dev-workspace.command';
// Promotion seeder commands
import { MktPromotionDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-data-seed-dev-workspace.command';
import { MktPromotionRuleDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-rule-data-seed-dev-workspace.command';
import { MktCouponDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/promotion-seeder/mkt-coupon-data-seed-dev-workspace.command';
import { MktPromotionAuditDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-audit-data-seed-dev-workspace.command';
import { MktPromotionUsageDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-usage-data-seed-dev-workspace.command';

export const MKT_DATABASE_COMMAND_MODULES = [
  // core commands
  SeedMktOptionModuleCommand,
  SeedMktEmailModuleCommand,
  // report commands
  SeedMktReportModuleCommand,
  // i18n commands
  SeedI18nModuleCommand,
  // customer commands
  SeedCustomerModuleCommand,
  SeedTagModuleCommand,
  SeedCustomerTagModuleCommand,
  // product commands
  // generic combo commands
  MktGenericComboDataSeedDevWorkspaceCommand,
  MktGenericComboItemDataSeedDevWorkspaceCommand,
  // order commands
  SeedOrderModuleCommand,
  SeedOrderItemModuleCommand,
  SeedMktOrderHistoryModuleCommand,
  // template commands
  SeedTemplateModuleCommand,
  // contract commands
  SeedContractModuleCommand,
  // license commands - COMMENTED OUT: License module has been removed
  // SeedLicenseModuleCommand,
  // SeedLicenseHistoryModuleCommand,
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
  SeedMktPaymentHistoryModuleCommand,
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
  // promotion commands (order matters: Promotion -> Rule -> Coupon -> Audit -> Usage)
  MktPromotionDataSeedDevWorkspaceCommand,
  MktPromotionRuleDataSeedDevWorkspaceCommand,
  MktCouponDataSeedDevWorkspaceCommand,
  MktPromotionAuditDataSeedDevWorkspaceCommand,
  MktPromotionUsageDataSeedDevWorkspaceCommand,
];
