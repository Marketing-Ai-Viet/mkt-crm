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
import { mktOrdersAllView } from 'src/mkt-core/seeder/prefill-data/mkt-order-all.view';
import { mktOrderItemsAllView } from 'src/mkt-core/seeder/prefill-data/mkt-order-item-all.view';
import { mktPaymentsAllView } from 'src/mkt-core/seeder/prefill-data/mkt-payment-all.view';
import { mktPaymentMethodsAllView } from 'src/mkt-core/seeder/prefill-data/mkt-payment-method-all.view';
import { mktCustomersAllView } from 'src/mkt-core/seeder/customer-seeder/mkt-customer-all.view';
import { mktCustomerTagsAllView } from 'src/mkt-core/seeder/customer-seeder/mkt-customer-tag-all.view';
import { mktDataAccessPoliciesAllView } from 'src/mkt-core/seeder/prefill-view/mkt-data-access-policy-all.view';
import { mktDepartmentsAllView } from 'src/mkt-core/seeder/prefill-view/mkt-department-all.view';
import { mktGenericCombosAllView } from 'src/mkt-core/seeder/prefill-view/mkt-generic-combo-all.view';
import { mktGenericComboItemsAllView } from 'src/mkt-core/seeder/prefill-view/mkt-generic-combo-item-all.view';
import { mktDepartmentHierarchiesAllView } from 'src/mkt-core/seeder/prefill-view/mkt-department-hierarchy-all.view';
import { mktEmploymentStatusesAllView } from 'src/mkt-core/seeder/prefill-view/mkt-employment-status-all.view';
import { mktI18nAllView } from 'src/mkt-core/seeder/prefill-view/mkt-i18n-all.view';
import { mktKpisAllView } from 'src/mkt-core/seeder/prefill-view/mkt-kpi-all.view';
// REMOVED: License history module has been deleted
// import { mktLicenseHistoryAllView } from 'src/mkt-core/seeder/prefill-view/mkt-license-history-all.view';
import { mktOrganizationLevelsAllView } from 'src/mkt-core/seeder/prefill-view/mkt-organization-level-all.view';
import { mktPaymentHistoriesAllView } from 'src/mkt-core/seeder/prefill-view/mkt-payment-history-all.view';
import { mktPermissionAuditsAllView } from 'src/mkt-core/seeder/prefill-view/mkt-permission-audit-all.view';
import { mktStaffStatusHistoryAllView } from 'src/mkt-core/seeder/prefill-view/mkt-staff-status-history-all.view';
import { mktTagsAllView } from 'src/mkt-core/seeder/prefill-view/mkt-tag-all.view';
import { mktTemplatesAllView } from 'src/mkt-core/seeder/prefill-view/mkt-template-all.view';
import { mktTemporaryPermissionsAllView } from 'src/mkt-core/seeder/prefill-view/mkt-temporary-permission-all.view';
import { mktEmailAllView } from 'src/mkt-core/email/seeder/mkt-email-all.view';
import { mktReportsAllView } from 'src/mkt-core/seeder/mkt-report-seeder/mkt-report-all.view';
import { mktCouponsAllView } from 'src/mkt-core/seeder/promotion-seeder/mkt-coupon-all.view';
import { mktPromotionAuditsAllView } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-audit-all.view';
import { mktPromotionRulesAllView } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-rule-all.view';
import { mktPromotionUsagesAllView } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-usage-all.view';
import { mktPromotionsAllView } from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-all.view';
import { mktOptionsAllView } from 'src/mkt-core/seeder/mkt-option-seeder/mkt-option-all.view';

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
  mktDataAccessPoliciesAllView,
  mktPermissionAuditsAllView,
];
