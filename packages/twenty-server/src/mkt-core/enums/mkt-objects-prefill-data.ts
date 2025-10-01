import { prefillMktSInvoiceAuths } from 'src/mkt-core/dev-seeder/invoice-seeder/prefill-mkt-sinvoice-auths';
import { prefillMktSInvoiceItems } from 'src/mkt-core/dev-seeder/invoice-seeder/prefill-mkt-sinvoice-items';
import { prefillMktSInvoiceMetadata } from 'src/mkt-core/dev-seeder/invoice-seeder/prefill-mkt-sinvoice-metadata';
import { prefillMktSInvoicePayments } from 'src/mkt-core/dev-seeder/invoice-seeder/prefill-mkt-sinvoice-payments';
import { prefillMktSInvoiceTaxBreakdowns } from 'src/mkt-core/dev-seeder/invoice-seeder/prefill-mkt-sinvoice-tax-breakdowns';
import { prefillMktSInvoices } from 'src/mkt-core/dev-seeder/invoice-seeder/prefill-mkt-sinvoices';
import { prefillMktContracts } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-contracts';
import { prefillMktCustomerTags } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-customer-tags';
import { prefillMktCustomers } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-customers';
import { prefillMktDataAccessPolicies } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-data-access-policies';
import { prefillMktDepartmentHierarchies } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-department-hierarchies';
import { prefillMktDepartments } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-departments';
import { prefillMktEmploymentStatuses } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-employment-statuses';
import { prefillMktKpiTemplates } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-kpi-templates';
import { prefillMktKpis } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-kpis';
import { prefillMktLicenses } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-licenses';
import { prefillMktOrderItems } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-order-items';
import { prefillMktOrders } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-orders';
import { prefillMktOrganizationLevels } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-organization-levels';
import { prefillMktPaymentMethods } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-payment-methods';
import { prefillMktPayments } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-payments';
import { prefillMktPermissionAudits } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-permission-audits';
import { prefillMktResellerTierHistories } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-reseller-tier-histories';
import { prefillMktResellerTiers } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-reseller-tiers';
import { prefillMktResellers } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-resellers';
import { prefillMktStaffStatusHistories } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-staff-status-histories';
import { prefillMktTags } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-tags';
import { prefillMktTemplates } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-templates';
import { prefillMktCategories } from 'src/mkt-core/dev-seeder/product-seeder/prefill-mkt-categories';
import { prefillMktComboVariants } from 'src/mkt-core/dev-seeder/product-seeder/prefill-mkt-combo-variants';
import { prefillMktCombos } from 'src/mkt-core/dev-seeder/product-seeder/prefill-mkt-combos';
import { prefillMktProducts } from 'src/mkt-core/dev-seeder/product-seeder/prefill-mkt-products';
import { prefillMktVariantValues } from 'src/mkt-core/dev-seeder/product-seeder/prefill-mkt-variant-values';
import { prefillMktVariants } from 'src/mkt-core/dev-seeder/product-seeder/prefill-mkt-variants';
import { prefillMktPermissionResources } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-permission-resources';
import { prefillMktPermissionActions } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-permission-actions';
import { prefillMktPermissionTemplates } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-permission-templates';
import { prefillMktTemplateResourcePermissions } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-template-resource-permissions';
import { prefillMktTemplateAccessLimitations } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-template-access-limitations';
import { prefillMktTemplateSystemActions } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-template-system-actions';
import { prefillMktPermissionContexts } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-permission-contexts';
import { prefillMktUserPermissionTemplates } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-user-permission-templates';
import { prefillMktUserPermissionOverrides } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-user-permission-overrides';

export const MKT_PREFILLS = [
  // customer prefills
  prefillMktCustomers,
  prefillMktTags,
  prefillMktCustomerTags,
  // product prefills
  prefillMktCategories,
  prefillMktProducts,
  prefillMktVariants,
  prefillMktVariantValues,
  // combo prefills
  prefillMktCombos,
  prefillMktComboVariants,
  // order prefills
  prefillMktOrders,
  prefillMktOrderItems,
  // template prefills
  prefillMktTemplates,
  // contract prefills
  prefillMktContracts,
  // license prefills
  prefillMktLicenses,
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
  // reseller prefills
  prefillMktResellerTiers,
  prefillMktResellers,
  prefillMktResellerTierHistories,
  // organization level prefills
  prefillMktOrganizationLevels,
  prefillMktEmploymentStatuses,
  prefillMktDepartments,
  prefillMktStaffStatusHistories,
  prefillMktKpis,
  prefillMktKpiTemplates,
  // temporary permission prefills (should be last to ensure all dependencies exist)
  prefillMktDepartmentHierarchies,
  prefillMktDataAccessPolicies,
  prefillMktPermissionAudits,
  // permission resources (should be last to ensure all dependencies exist)
  prefillMktPermissionResources,
  prefillMktPermissionActions,
  prefillMktPermissionTemplates,
  prefillMktTemplateResourcePermissions,
  prefillMktTemplateSystemActions,
  prefillMktTemplateAccessLimitations,
  prefillMktPermissionContexts,
  prefillMktUserPermissionTemplates,
  prefillMktUserPermissionOverrides,
];
