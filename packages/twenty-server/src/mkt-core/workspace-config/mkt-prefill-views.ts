import { mktSInvoicesAllView } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-all.view';
import { mktSInvoiceAuthsAllView } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-auth-all.view';
import { mktSInvoiceItemsAllView } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-item-all.view';
import { mktSInvoiceMetadataAllView } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-metadata-all.view';
import { mktSInvoicePaymentsAllView } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-payment-all.view';
import { mktSInvoiceTaxBreakdownsAllView } from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-tax-breakdown-all.view';
import { mktOrderHistoryAllView } from 'src/mkt-core/seeder/order-seeder/mkt-order-history-all.view';
import { mktContractsAllView } from 'src/mkt-core/seeder/prefill-data/mkt-contract-all.view';
// REMOVED: License module has been deleted
// import { mktLicensesAllView } from 'src/mkt-core/seeder/prefill-data/mkt-license-all.view';
import { mktOrdersAllView } from 'src/mkt-core/seeder/order-seeder/mkt-order-all.view';
import { mktOrderItemsAllView } from 'src/mkt-core/seeder/order-seeder/mkt-order-item-all.view';
import { mktPaymentsAllView } from 'src/mkt-core/seeder/payment-seeder/mkt-payment/mkt-payment-all.view';
import { mktPaymentMethodsAllView } from 'src/mkt-core/seeder/payment-seeder/payment-method/mkt-payment-method-all.view';
import { mktCustomersAllView } from 'src/mkt-core/seeder/customer-seeder/customer/mkt-customer-all.view';
import { mktCustomerTagsAllView } from 'src/mkt-core/seeder/customer-seeder/mkt-customer-tag/mkt-customer-tag-all.view';
import { mktCustomerTierHistoriesAllView } from 'src/mkt-core/seeder/customer-seeder/mkt-customer-tier-histories/mkt-customer-tier-history-all.view';
import { mktCustomerNotesAllView } from 'src/mkt-core/seeder/customer-seeder/mkt-customer-note/mkt-customer-note-all.view';
import { mktDataAccessPoliciesAllView } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-data-access-policy/mkt-data-access-policy-all.view';
import { mktPermissionContextsAllView } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-context/mkt-permission-context-all.view';
import { mktDepartmentsAllView } from 'src/mkt-core/seeder/department-seeder/mkt-department/mkt-department-all.view';
import { mktGenericCombosAllView } from 'src/mkt-core/seeder/combo-seeder/mkt-generic-combo-all.view';
import { mktGenericComboItemsAllView } from 'src/mkt-core/seeder/combo-seeder/mkt-generic-combo-item-all.view';
import { mktDepartmentHierarchiesAllView } from 'src/mkt-core/seeder/department-seeder/mkt-department-hierarchy/mkt-department-hierarchy-all.view';
import { mktDepartmentSubManagersAllView } from 'src/mkt-core/seeder/department-seeder/mkt-department-sub-manager/mkt-department-sub-manager-all.view';
import { mktDepartmentAncestriesAllView } from 'src/mkt-core/seeder/department-seeder/mkt-department-ancestry/mkt-department-ancestry-all.view';
import { mktEmploymentStatusesAllView } from 'src/mkt-core/seeder/prefill-view/mkt-employment-status-all.view';
import { mktI18nAllView } from 'src/mkt-core/seeder/prefill-view/mkt-i18n-all.view';
import { mktKpisAllView } from 'src/mkt-core/seeder/prefill-view/mkt-kpi-all.view';
// REMOVED: License history module has been deleted
// import { mktLicenseHistoryAllView } from 'src/mkt-core/seeder/prefill-view/mkt-license-history-all.view';
import { mktOrganizationLevelsAllView } from 'src/mkt-core/seeder/prefill-view/mkt-organization-level-all.view';
import { mktPaymentHistoriesAllView } from 'src/mkt-core/seeder/payment-seeder/mkt-payment-history/mkt-payment-history-all.view';
import { mktPermissionAuditsAllView } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-audit/mkt-permission-audit-all.view';
import { mktStaffStatusHistoryAllView } from 'src/mkt-core/seeder/prefill-view/mkt-staff-status-history-all.view';
import { mktTagsAllView } from 'src/mkt-core/seeder/prefill-view/mkt-tag-all.view';
import { mktTemplatesAllView } from 'src/mkt-core/seeder/prefill-view/mkt-template-all.view';
import { mktTemporaryPermissionsAllView } from 'src/mkt-core/seeder/prefill-view/mkt-temporary-permission-all.view';
import { mktEmailAllView } from 'src/mkt-core/seeder/email-seeder/mkt-email-all.view';
import { mktReportsAllView } from 'src/mkt-core/seeder/mkt-report-seeder/mkt-report-all.view';
import { mktCouponsAllView } from 'src/mkt-core/seeder/promotion-seeder/mkt-coupon-all.view';
import { mktPromotionAuditsAllView } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-audit-all.view';
import { mktPromotionRulesAllView } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-rule-all.view';
import { mktPromotionUsagesAllView } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-usage-all.view';
import { mktPromotionsAllView } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-all.view';
import { mktOptionsAllView } from 'src/mkt-core/seeder/mkt-option-seeder/mkt-option-all.view';
// Permission template seeder view imports
import { mktPermissionActionsAllView } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-action/mkt-permission-action-all.view';
import { mktPermissionResourcesAllView } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-resource/mkt-permission-resource-all.view';
import { mktPermissionTemplatesAllView } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-template/mkt-permission-template-all.view';
import { mktTemplateResourcePermissionsAllView } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-template-resource-permission/mkt-template-resource-permission-all.view';
import { mktTemplateSystemActionsAllView } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-template-system-action/mkt-template-system-action-all.view';
import { mktUserPermissionTemplatesAllView } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-user-permission-template/mkt-user-permission-template-all.view';
// Casbin seeder view imports
import { mktCasbinRulesAllView } from 'src/mkt-core/seeder/rbac-seeder/casbin-seeder/mkt-casbin-rule/mkt-casbin-rule-all.view';
import { mktPolicyVersionsAllView } from 'src/mkt-core/seeder/rbac-seeder/casbin-seeder/mkt-policy-version/mkt-policy-version-all.view';
import { mktPolicyChangeRequestsAllView } from 'src/mkt-core/seeder/rbac-seeder/casbin-seeder/mkt-policy-change-request/mkt-policy-change-request-all.view';
import { mktPolicyApprovalsAllView } from 'src/mkt-core/seeder/rbac-seeder/casbin-seeder/mkt-policy-approval/mkt-policy-approval-all.view';

export const MKT_ALL_VIEWS = [
  // core views
  mktOptionsAllView,
  mktEmailAllView,
  // report views
  mktReportsAllView,
  // i18n views
  mktI18nAllView,
  // customer views
  mktCustomersAllView,
  mktTagsAllView,
  mktCustomerTagsAllView,
  mktCustomerTierHistoriesAllView,
  mktCustomerNotesAllView,
  // generic combo views
  mktGenericCombosAllView,
  mktGenericComboItemsAllView,
  // order views
  mktOrdersAllView,
  mktOrderItemsAllView,
  mktOrderHistoryAllView,
  // promotion views
  mktPromotionsAllView,
  mktPromotionRulesAllView,
  mktCouponsAllView,
  mktPromotionUsagesAllView,
  mktPromotionAuditsAllView,
  // template views
  mktTemplatesAllView,
  // REMOVED: license views - License module has been deleted
  // mktLicensesAllView,
  // mktLicenseHistoryAllView,
  // contract views
  mktContractsAllView,
  // invoice views
  mktSInvoiceAuthsAllView,
  mktSInvoicesAllView,
  mktSInvoicePaymentsAllView,
  mktSInvoiceItemsAllView,
  mktSInvoiceTaxBreakdownsAllView,
  mktSInvoiceMetadataAllView,
  // payment views
  mktPaymentMethodsAllView,
  mktPaymentsAllView,
  mktPaymentHistoriesAllView,
  // organization level views
  mktOrganizationLevelsAllView,
  mktEmploymentStatusesAllView,
  mktDepartmentsAllView,
  mktStaffStatusHistoryAllView,
  // prefillMktKpiTemplates,
  mktKpisAllView,
  // temporary permission views
  mktTemporaryPermissionsAllView,
  mktDepartmentHierarchiesAllView,
  mktDepartmentSubManagersAllView,
  mktDepartmentAncestriesAllView,
  // Permission context views (template layer)
  mktPermissionContextsAllView,
  mktDataAccessPoliciesAllView,
  mktPermissionAuditsAllView,
  // permission template views
  mktPermissionActionsAllView,
  mktPermissionResourcesAllView,
  mktPermissionTemplatesAllView,
  mktTemplateResourcePermissionsAllView,
  mktTemplateSystemActionsAllView,
  mktUserPermissionTemplatesAllView,
  // casbin views
  mktPolicyVersionsAllView,
  mktCasbinRulesAllView,
  mktPolicyChangeRequestsAllView,
  mktPolicyApprovalsAllView,
];
