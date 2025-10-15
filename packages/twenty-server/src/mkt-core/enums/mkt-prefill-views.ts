import { mktSInvoicesAllView } from 'src/mkt-core/dev-seeder/invoice-seeder/mkt-sinvoice-all.view';
import { mktSInvoiceAuthsAllView } from 'src/mkt-core/dev-seeder/invoice-seeder/mkt-sinvoice-auth-all.view';
import { mktSInvoiceItemsAllView } from 'src/mkt-core/dev-seeder/invoice-seeder/mkt-sinvoice-item-all.view';
import { mktSInvoiceMetadataAllView } from 'src/mkt-core/dev-seeder/invoice-seeder/mkt-sinvoice-metadata-all.view';
import { mktSInvoicePaymentsAllView } from 'src/mkt-core/dev-seeder/invoice-seeder/mkt-sinvoice-payment-all.view';
import { mktSInvoiceTaxBreakdownsAllView } from 'src/mkt-core/dev-seeder/invoice-seeder/mkt-sinvoice-tax-breakdown-all.view';
import { mktOrderHistoryAllView } from 'src/mkt-core/dev-seeder/order-seeder/mkt-order-history-all.view';
import { mktContractsAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-contract-all.view';
import { mktLicensesAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-license-all.view';
import { mktOrdersAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-order-all.view';
import { mktOrderItemsAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-order-item-all.view';
import { mktPaymentsAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-payment-all.view';
import { mktPaymentMethodsAllView } from 'src/mkt-core/dev-seeder/prefill-data/mkt-payment-method-all.view';
import { mktCustomersAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-customer-all.view';
import { mktCustomerTagsAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-customer-tag-all.view';
import { mktDataAccessPoliciesAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-data-access-policy-all.view';
import { mktDepartmentsAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-department-all.view';
import { mktDepartmentHierarchiesAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-department-hierarchy-all.view';
import { mktEmploymentStatusesAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-employment-status-all.view';
import { mktI18nAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-i18n-all.view';
import { mktKpisAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-kpi-all.view';
import { mktLicenseHistoryAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-license-history-all.view';
import { mktOrganizationLevelsAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-organization-level-all.view';
import { mktPaymentHistoriesAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-payment-history-all.view';
import { mktPermissionAuditsAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-permission-audit-all.view';
import { mktResellersAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-reseller-all.view';
import { mktResellerTiersAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-reseller-tier-all.view';
import { mktResellerTierHistoriesAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-reseller-tier-history-all.view';
import { mktStaffStatusHistoryAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-staff-status-history-all.view';
import { mktTagsAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-tag-all.view';
import { mktTemplatesAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-template-all.view';
import { mktTemporaryPermissionsAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-temporary-permission-all.view';
import { mktCategoriesAllView } from 'src/mkt-core/dev-seeder/product-seeder/mkt-category-all.view';
import { mktCombosAllView } from 'src/mkt-core/dev-seeder/product-seeder/mkt-combo-all.view';
import { mktComboVariantsAllView } from 'src/mkt-core/dev-seeder/product-seeder/mkt-combo-variant-all.view';
import { mktProductsAllView } from 'src/mkt-core/dev-seeder/product-seeder/mkt-product-all.view';
import { mktVariantsAllView } from 'src/mkt-core/dev-seeder/product-seeder/mkt-variant-all.view';
import { mktVariantValuesAllView } from 'src/mkt-core/dev-seeder/product-seeder/mkt-variant-value-all.view';
import { mktReportsAllView } from 'src/mkt-core/report/seeder/mkt-report-all.view';
import { mktOptionsAllView } from 'src/mkt-core/setting/seeder/mkt-option-all.view';

export const MKT_ALL_VIEWS = [
  // core views
  mktOptionsAllView,
  // report views
  mktReportsAllView,
  // i18n views
  mktI18nAllView,
  // customer views
  mktCustomersAllView,
  mktTagsAllView,
  mktCustomerTagsAllView,
  // product views
  mktCategoriesAllView,
  mktProductsAllView,
  mktVariantsAllView,
  mktVariantValuesAllView,
  // combo views
  mktCombosAllView,
  mktComboVariantsAllView,
  // order views
  mktOrdersAllView,
  mktOrderItemsAllView,
  mktOrderHistoryAllView,
  // template views
  mktTemplatesAllView,
  // license views
  mktLicensesAllView,
  mktLicenseHistoryAllView,
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
  // reseller views
  mktResellerTiersAllView,
  mktResellersAllView,
  mktResellerTierHistoriesAllView,
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
