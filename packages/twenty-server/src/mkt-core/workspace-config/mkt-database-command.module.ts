import { SeedContractModuleCommand } from 'src/mkt-core/seeder/commands/mkt-contract-data-seed-dev-workspace.command';
import { SeedCustomerModuleCommand } from 'src/mkt-core/seeder/customer-seeder/customer/mkt-customer-data-seed-dev-workspace.command';
import { SeedCustomerTagModuleCommand } from 'src/mkt-core/seeder/customer-seeder/mkt-customer-tag/mkt-customer-tag-data-seed-dev-workspace.command';
import { SeedCustomerTierHistoryModuleCommand } from 'src/mkt-core/seeder/customer-seeder/mkt-customer-tier-histories/mkt-customer-tier-history-data-seed-dev-workspace.command';
import { SeedCustomerNoteModuleCommand } from 'src/mkt-core/seeder/customer-seeder/mkt-customer-note/mkt-customer-note-data-seed-dev-workspace.command';
import { SeedMktDataAccessPolicyCommand } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-data-access-policy/mkt-data-access-policy-data-seed-dev-workspace.command';
import { SeedMktPermissionContextCommand } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-context/mkt-permission-context-data-seed-dev-workspace.command';
import { SeedDepartmentModuleCommand } from 'src/mkt-core/seeder/department-seeder/mkt-department/mkt-department-data-seed-dev-workspace.command';
import { MktGenericComboDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/combo-seeder/mkt-generic-combo-data-seed-dev-workspace.command';
import { MktGenericComboItemDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/combo-seeder/mkt-generic-combo-item-data-seed-dev-workspace.command';
import { SeedMktDepartmentHierarchyCommand } from 'src/mkt-core/seeder/department-seeder/mkt-department-hierarchy/mkt-department-hierarchy-data-seed-dev-workspace.command';
import { SeedDepartmentSubManagerCommand } from 'src/mkt-core/seeder/department-seeder/mkt-department-sub-manager/mkt-department-sub-manager-data-seed-dev-workspace.command';
import { SeedDepartmentAncestryCommand } from 'src/mkt-core/seeder/department-seeder/mkt-department-ancestry/mkt-department-ancestry-data-seed-dev-workspace.command';
import { SeedEmploymentStatusModuleCommand } from 'src/mkt-core/seeder/commands/mkt-employment-status-data-seed-dev-workspace.command';
import { SeedI18nModuleCommand } from 'src/mkt-core/seeder/commands/mkt-i18n-data-seed-dev-workspace.command';
import { SeedMktKpiCommand } from 'src/mkt-core/seeder/commands/mkt-kpi-data-seed-dev-workspace.command';
import { SeedMktKpiTemplateCommand } from 'src/mkt-core/seeder/commands/mkt-kpi-template-data-seed-dev-workspace.command';
import { SeedOrderModuleCommand } from 'src/mkt-core/seeder/order-seeder/order/mkt-order-data-seed-dev-workspace.command';
import { SeedMktOrderHistoryModuleCommand } from 'src/mkt-core/seeder/order-seeder/mkt-order-history-data-seed-dev-workspace.command';
import { SeedOrderItemModuleCommand } from 'src/mkt-core/seeder/order-seeder/mkt-order-item/mkt-order-item-data-seed-dev-workspace.command';
import { SeedOrganizationLevelModuleCommand } from 'src/mkt-core/seeder/commands/mkt-organization-level-data-seed-dev-workspace.command';
import { MktPaymentDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/payment-seeder/mkt-payment/mkt-payment-data-seed-dev-workspace.command';
import { SeedMktPaymentHistoryModuleCommand } from 'src/mkt-core/seeder/payment-seeder/mkt-payment-history/mkt-payment-history-data-seed-dev-workspace.command';
import { MktWebhookLogDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/commands/mkt-webhook-log-data-seed-dev-workspace.command';
import { MktPaymentMethodDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/payment-seeder/payment-method/mkt-payment-method-data-seed-dev-workspace.command';
import { MktVirtualAccountDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/payment-seeder/mkt-virtual-account/mkt-virtual-account-data-seed-dev-workspace.command';
import { SeedMktPermissionAuditCommand } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-audit/mkt-permission-audit-data-seed-dev-workspace.command';
import { SeedTagModuleCommand } from 'src/mkt-core/seeder/commands/mkt-tag-data-seed-dev-workspace.command';
import { SeedTemplateModuleCommand } from 'src/mkt-core/seeder/commands/mkt-template-data-seed-dev-workspace.command';
import { SeedMktTemporaryPermissionCommand } from 'src/mkt-core/seeder/commands/mkt-temporary-permission-data-seed-dev-workspace.command';
import { SeedSInvoiceAuthModuleCommand } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-auth-data-seed-dev-workspace.command';
import { SeedSInvoiceModuleCommand } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-data-seed-dev-workspace.command';
import { SeedSInvoiceItemModuleCommand } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-item-data-seed-dev-workspace.command';
import { SeedSInvoiceMetadataModuleCommand } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-metadata-data-seed-dev-workspace.command';
import { SeedSInvoicePaymentModuleCommand } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-payment-data-seed-dev-workspace.command';
import { SeedSInvoiceTaxBreakdownModuleCommand } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-tax-breakdown-data-seed-dev-workspace.command';
import { SeedMktEmailModuleCommand } from 'src/mkt-core/seeder/email-seeder/mkt-email-data-seed-dev-workspace.command';
import { SeedMktReportModuleCommand } from 'src/mkt-core/seeder/mkt-report-seeder/mkt-report-data-seed-dev-workspace.command';
import { SeedMktOptionModuleCommand } from 'src/mkt-core/seeder/mkt-option-seeder/mkt-option-data-seed-dev-workspace.command';
// Promotion seeder commands
import { MktPromotionDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-data-seed-dev-workspace.command';
import { MktPromotionRuleDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-rule-data-seed-dev-workspace.command';
import { MktCouponDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/promotion-seeder/mkt-coupon-data-seed-dev-workspace.command';
import { MktPromotionAuditDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-audit-data-seed-dev-workspace.command';
import { MktPromotionUsageDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-usage-data-seed-dev-workspace.command';
// Permission template seeder command imports
import { MktPermissionActionDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-action/mkt-permission-action-data-seed-dev-workspace.command';
import { MktPermissionResourceDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-resource/mkt-permission-resource-data-seed-dev-workspace.command';
import { MktPermissionTemplateDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-template/mkt-permission-template-data-seed-dev-workspace.command';
import { MktTemplateResourcePermissionDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-template-resource-permission/mkt-template-resource-permission-data-seed-dev-workspace.command';
import { MktTemplateSystemActionDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-template-system-action/mkt-template-system-action-data-seed-dev-workspace.command';
import { MktUserPermissionTemplateDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-user-permission-template/mkt-user-permission-template-data-seed-dev-workspace.command';
// Casbin seeder command imports
import { MktCasbinRuleDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/rbac-seeder/casbin-seeder/mkt-casbin-rule/mkt-casbin-rule-data-seed-dev-workspace.command';
import { MktPolicyVersionDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/rbac-seeder/casbin-seeder/mkt-policy-version/mkt-policy-version-data-seed-dev-workspace.command';
import { MktPolicyChangeRequestDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/rbac-seeder/casbin-seeder/mkt-policy-change-request/mkt-policy-change-request-data-seed-dev-workspace.command';
import { MktPolicyApprovalDataSeedDevWorkspaceCommand } from 'src/mkt-core/seeder/rbac-seeder/casbin-seeder/mkt-policy-approval/mkt-policy-approval-data-seed-dev-workspace.command';

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
  SeedCustomerTierHistoryModuleCommand,
  SeedCustomerNoteModuleCommand,
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
  MktWebhookLogDataSeedDevWorkspaceCommand,
  MktVirtualAccountDataSeedDevWorkspaceCommand,
  // organization level commands
  SeedOrganizationLevelModuleCommand,
  SeedEmploymentStatusModuleCommand,
  SeedDepartmentModuleCommand,
  SeedMktKpiCommand,
  SeedMktKpiTemplateCommand,
  // temporary permission commands
  SeedMktTemporaryPermissionCommand,
  SeedMktDepartmentHierarchyCommand,
  SeedDepartmentSubManagerCommand,
  SeedDepartmentAncestryCommand,
  SeedMktPermissionContextCommand, // Permission context phải seed trước Data Access Policy
  SeedMktDataAccessPolicyCommand,
  SeedMktPermissionAuditCommand,
  // promotion commands (order matters: Promotion -> Rule -> Coupon -> Audit -> Usage)
  MktPromotionDataSeedDevWorkspaceCommand,
  MktPromotionRuleDataSeedDevWorkspaceCommand,
  MktCouponDataSeedDevWorkspaceCommand,
  MktPromotionAuditDataSeedDevWorkspaceCommand,
  MktPromotionUsageDataSeedDevWorkspaceCommand,
  // permission template commands (order matters: actions -> resources -> templates -> resource permissions -> system actions -> user templates)
  MktPermissionActionDataSeedDevWorkspaceCommand,
  MktPermissionResourceDataSeedDevWorkspaceCommand,
  MktPermissionTemplateDataSeedDevWorkspaceCommand,
  MktTemplateResourcePermissionDataSeedDevWorkspaceCommand,
  MktTemplateSystemActionDataSeedDevWorkspaceCommand,
  MktUserPermissionTemplateDataSeedDevWorkspaceCommand,
  // casbin commands (order matters: policy version -> casbin rules -> change requests -> approvals)
  MktPolicyVersionDataSeedDevWorkspaceCommand,
  MktCasbinRuleDataSeedDevWorkspaceCommand,
  MktPolicyChangeRequestDataSeedDevWorkspaceCommand,
  MktPolicyApprovalDataSeedDevWorkspaceCommand,
];
