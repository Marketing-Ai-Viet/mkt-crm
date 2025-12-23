import { prefillMktSInvoiceAuths } from 'src/mkt-core/seeder/invoice-seeder/prefill-mkt-sinvoice-auths';
import { prefillMktSInvoiceItems } from 'src/mkt-core/seeder/invoice-seeder/prefill-mkt-sinvoice-items';
import { prefillMktSInvoiceMetadata } from 'src/mkt-core/seeder/invoice-seeder/prefill-mkt-sinvoice-metadata';
import { prefillMktSInvoicePayments } from 'src/mkt-core/seeder/invoice-seeder/prefill-mkt-sinvoice-payments';
import { prefillMktSInvoiceTaxBreakdowns } from 'src/mkt-core/seeder/invoice-seeder/prefill-mkt-sinvoice-tax-breakdowns';
import { prefillMktSInvoices } from 'src/mkt-core/seeder/invoice-seeder/prefill-mkt-sinvoices';
import { prefillMktContracts } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-contracts';
import { prefillMktCustomerTags } from 'src/mkt-core/seeder/customer-seeder/prefill-mkt-customer-tags';
import { prefillMktCustomers } from 'src/mkt-core/seeder/customer-seeder/prefill-mkt-customers';
import { prefillMktDataAccessPolicies } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-data-access-policies';
import { prefillMktDepartmentHierarchies } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-department-hierarchies';
import { prefillMktDepartments } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-departments';
import { prefillMktGenericComboItems } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-generic-combo-items';
import { prefillMktGenericCombos } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-generic-combos';
import { prefillMktEmploymentStatuses } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-employment-statuses';
import { prefillMktI18n } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-i18n';
import { prefillMktKpiTemplates } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-kpi-templates';
import { prefillMktKpis } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-kpis';
import { prefillMktOrderHistories } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-order-histories';
import { prefillMktOrderItems } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-order-items';
import { prefillMktOrders } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-orders';
import { prefillMktOrganizationLevels } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-organization-levels';
import { prefillMktPaymentHistories } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-payment-histories';
import { prefillMktPaymentMethods } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-payment-methods';
import { prefillMktPayments } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-payments';
import { prefillMktPermissionAudits } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-permission-audits';
import { prefillMktStaffStatusHistories } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-staff-status-histories';
import { prefillMktTags } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-tags';
import { prefillMktTemplates } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-templates';
import { prefillMktTemporaryPermissions } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-temporary-permissions';
import { prefillMktEmails } from 'src/mkt-core/email/seeder/prefill-mkt-emails';
import { prefillMktReports } from 'src/mkt-core/report/seeder/prefill-mkt-reports';
import { prefillMktCoupons } from 'src/mkt-core/seeder/promotion-seeder/prefill-mkt-coupons';
import { prefillMktPromotionAudits } from 'src/mkt-core/seeder/promotion-seeder/prefill-mkt-promotion-audits';
import { prefillMktPromotionRules } from 'src/mkt-core/seeder/promotion-seeder/prefill-mkt-promotion-rules';
import { prefillMktPromotionUsages } from 'src/mkt-core/seeder/promotion-seeder/prefill-mkt-promotion-usages';
import { prefillMktPromotions } from 'src/mkt-core/seeder/promotion-seeder/prefill-mkt-promotions';
import { prefillMktOptions } from 'src/mkt-core/setting/seeder/prefill-mkt-options';

export const MKT_PREFILLS = [
  // core prefills
  prefillMktOptions,
  prefillMktEmails,
  // report prefills
  prefillMktReports,
  // i18n prefills
  prefillMktI18n,
  // customer prefills
  prefillMktCustomers,
  prefillMktTags,
  prefillMktCustomerTags,
  // generic combo prefills
  prefillMktGenericCombos,
  prefillMktGenericComboItems,
  // order prefills
  prefillMktOrders,
  prefillMktOrderItems,
  prefillMktOrderHistories,
  // promotion prefills
  prefillMktPromotions,
  prefillMktPromotionRules,
  prefillMktCoupons,
  prefillMktPromotionUsages,
  prefillMktPromotionAudits,
  // template prefills
  prefillMktTemplates,
  // contract prefills
  prefillMktContracts,
  // license prefills - COMMENTED OUT: License module has been removed
  // prefillMktLicenses,
  // prefillMktLicenseHistory,
  // invoice prefills
  prefillMktSInvoiceAuths,
  prefillMktSInvoices,
  prefillMktSInvoicePayments,
  prefillMktSInvoiceItems,
  prefillMktSInvoiceTaxBreakdowns,
  prefillMktSInvoiceMetadata,
  // payment prefills (after orders to reference existing orders)
  prefillMktPaymentMethods,
  prefillMktPayments,
  prefillMktPaymentHistories,
  // organization level prefills
  prefillMktOrganizationLevels,
  prefillMktEmploymentStatuses,
  prefillMktDepartments,
  prefillMktStaffStatusHistories,
  prefillMktKpis,
  prefillMktKpiTemplates,
  // temporary permission prefills (should be last to ensure all dependencies exist)
  prefillMktTemporaryPermissions,
  prefillMktDepartmentHierarchies,
  prefillMktDataAccessPolicies,
  prefillMktPermissionAudits,
];
