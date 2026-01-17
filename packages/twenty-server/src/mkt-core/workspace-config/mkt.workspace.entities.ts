import { MktCustomerTagWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-tag.workspace-entity';
import { MktCustomerTierHistoryWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-tier-history.workspace-entity';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktTagWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-tag.workspace-entity';
import { MktEmailWorkspaceEntity } from 'src/mkt-core/email/objects/mkt-email.workspace-entity';
import { MktI18nWorkspaceEntity } from 'src/mkt-core/i18n/objects/mkt-i18n.workspace-entity';
import { MktInvoiceWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-invoice.workspace-entity';
import { MktSInvoiceAuthWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-auth.workspace-entity';
import { MktSInvoiceFileWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-file.workspace-entity';
import { MktSInvoiceItemWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-item.workspace-entity';
import { MktSInvoiceMetadataWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-metadata.workspace-entity';
import { MktSInvoicePaymentWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-payment.workspace-entity';
import { MktSInvoiceTaxBreakdownWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice-tax-breakdown.workspace-entity';
import { MktSInvoiceWorkspaceEntity } from 'src/mkt-core/invoice/objects/mkt-sinvoice.workspace-entity';
import {
  MktDataAccessPolicyWorkspaceEntity,
  MktPermissionAuditWorkspaceEntity,
  MktTemporaryPermissionWorkspaceEntity,
  MktPermissionActionWorkspaceEntity,
  MktPermissionResourceWorkspaceEntity,
  MktPermissionTemplateWorkspaceEntity,
  MktTemplateResourcePermissionWorkspaceEntity,
  MktTemplateSystemActionWorkspaceEntity,
  MktUserPermissionTemplateWorkspaceEntity,
  MktUserPermissionOverrideWorkspaceEntity,
  MktTemplateAccessLimitationWorkspaceEntity,
  MktPermissionContextWorkspaceEntity,
  MktPermissionPriorityConfigWorkspaceEntity,
  MktCasbinRuleWorkspaceEntity,
  MktPolicyVersionWorkspaceEntity,
  MktPolicyChangeRequestWorkspaceEntity,
  MktPolicyApprovalWorkspaceEntity,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { MktDepartmentAncestryWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department-ancestry.workspace-entity';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department-hierarchy.workspace-entity';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department.workspace-entity';
import { MktEmploymentStatusWorkspaceEntity } from 'src/mkt-core/mkt-employment-status/mkt-employment-status.workspace-entity';
import { MktKpiHistoryWorkspaceEntity } from 'src/mkt-core/mkt-kpi-history/mkt-kpi-history.workspace-entity';
import { MktKpiTemplateWorkspaceEntity } from 'src/mkt-core/mkt-kpi-template/mkt-kpi-template.workspace-entity';
import { MktKpiWorkspaceEntity } from 'src/mkt-core/mkt-kpi/mkt-kpi.workspace-entity';
import { MktOrganizationLevelWorkspaceEntity } from 'src/mkt-core/mkt-organization-level/workspace-entity/mkt-organization-level.workspace-entity';
import { MktStaffStatusHistoryWorkspaceEntity } from 'src/mkt-core/mkt-staff-status-history/mkt-staff-status-history.workspace-entity';
import { MktContractWorkspaceEntity } from 'src/mkt-core/contract/workspace-entity/mkt-contract.workspace-entity';
import { MktOrderHistoryWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-history.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/mkt-sendmail-template/workspace-entity/mkt-template.workspace-entity';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import { MktPaymentHistoryWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment-history.workspace-entity';
import { MktReportWorkspaceEntity } from 'src/mkt-core/report/objects/mkt-report.workspace-entity';
import { MktOptionWorkspaceEntity } from 'src/mkt-core/setting/objects/mkt-option.workspace-entity';
import {
  MktGenericComboItemWorkspaceEntity,
  MktGenericComboWorkspaceEntity,
} from 'src/mkt-core/mkt-combo/objects';
import {
  MktPromotionWorkspaceEntity,
  MktPromotionRuleWorkspaceEntity,
  MktCouponWorkspaceEntity,
  MktPromotionUsageWorkspaceEntity,
  MktPromotionAuditWorkspaceEntity,
} from 'src/mkt-core/mkt-promotion/workspace-entities';
import { MktDepartmentSubManagerWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity';

export const MKT_WORKSPACE_ENTITIES = [
  //core
  MktOptionWorkspaceEntity,
  // I18n
  MktI18nWorkspaceEntity,
  // Customer
  MktCustomerWorkspaceEntity,
  MktCustomerTierHistoryWorkspaceEntity,
  MktTagWorkspaceEntity,
  MktCustomerTagWorkspaceEntity,
  MktEmailWorkspaceEntity,
  // Generic Combo
  MktGenericComboWorkspaceEntity,
  MktGenericComboItemWorkspaceEntity,
  // Order
  MktOrderWorkspaceEntity,
  MktOrderItemWorkspaceEntity,
  MktOrderHistoryWorkspaceEntity,
  // Promotion
  MktPromotionWorkspaceEntity,
  MktPromotionRuleWorkspaceEntity,
  MktCouponWorkspaceEntity,
  MktPromotionUsageWorkspaceEntity,
  MktPromotionAuditWorkspaceEntity,
  // Template
  MktTemplateWorkspaceEntity,
  // Contracts
  MktContractWorkspaceEntity,
  // Invoice
  MktInvoiceWorkspaceEntity,
  MktSInvoiceAuthWorkspaceEntity,
  MktSInvoiceWorkspaceEntity,
  MktSInvoicePaymentWorkspaceEntity,
  MktSInvoiceItemWorkspaceEntity,
  MktSInvoiceTaxBreakdownWorkspaceEntity,
  MktSInvoiceMetadataWorkspaceEntity,
  MktSInvoiceFileWorkspaceEntity,
  // Payment
  MktPaymentMethodWorkspaceEntity,
  MktPaymentWorkspaceEntity,
  MktPaymentHistoryWorkspaceEntity,
  // Report
  MktReportWorkspaceEntity,
  // Organization Level
  MktOrganizationLevelWorkspaceEntity,
  MktEmploymentStatusWorkspaceEntity,
  MktDepartmentWorkspaceEntity,
];

export const MKT_FINAL_WORKSPACE_ENTITIES = [
  MktStaffStatusHistoryWorkspaceEntity,
  // KPI System
  MktKpiWorkspaceEntity,
  MktKpiTemplateWorkspaceEntity,
  MktKpiHistoryWorkspaceEntity,
  // Temporary Permission
  MktTemporaryPermissionWorkspaceEntity,
  MktDepartmentHierarchyWorkspaceEntity,
  MktDepartmentAncestryWorkspaceEntity,
  MktDepartmentSubManagerWorkspaceEntity,
  MktDataAccessPolicyWorkspaceEntity,
  MktPermissionAuditWorkspaceEntity,
  // Permission Template System (order matters: actions -> resources -> templates -> mappings)
  MktPermissionActionWorkspaceEntity,
  MktPermissionResourceWorkspaceEntity,
  MktPermissionTemplateWorkspaceEntity,
  MktTemplateResourcePermissionWorkspaceEntity,
  MktTemplateSystemActionWorkspaceEntity,
  MktUserPermissionTemplateWorkspaceEntity,
  MktUserPermissionOverrideWorkspaceEntity,
  MktTemplateAccessLimitationWorkspaceEntity,
  MktPermissionContextWorkspaceEntity,
  MktPermissionPriorityConfigWorkspaceEntity,
  // Casbin RBAC
  MktCasbinRuleWorkspaceEntity,
  MktPolicyVersionWorkspaceEntity,
  MktPolicyChangeRequestWorkspaceEntity,
  MktPolicyApprovalWorkspaceEntity,
];
