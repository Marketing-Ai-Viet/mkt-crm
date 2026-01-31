//Order configs
import {
  MKT_CONTRACT_DATA_SEED_COLUMNS,
  MKT_CONTRACT_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-contract-data-seeds.constants';
import {
  MKT_CUSTOMER_DATA_SEED_COLUMNS,
  MKT_CUSTOMER_DATA_SEEDS,
} from 'src/mkt-core/seeder/customer-seeder/customer/mkt-customer-data-seeds.constants';
import {
  MKT_CUSTOMER_TAG_DATA_SEED_COLUMNS,
  MKT_CUSTOMER_TAG_DATA_SEEDS,
} from 'src/mkt-core/seeder/customer-seeder/mkt-customer-tag/mkt-customer-tag-data-seeds.constants';
import {
  MKT_CUSTOMER_TIER_HISTORY_DATA_SEED_COLUMNS,
  MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS,
} from 'src/mkt-core/seeder/customer-seeder/mkt-customer-tier-histories/mkt-customer-tier-history-data-seeds.constants';
import {
  MKT_CUSTOMER_NOTE_DATA_SEED_COLUMNS,
  MKT_CUSTOMER_NOTE_DATA_SEEDS,
} from 'src/mkt-core/seeder/customer-seeder/mkt-customer-note/mkt-customer-note-data-seeds.constants';
import {
  MKT_DATA_ACCESS_POLICY_DATA_SEED_COLUMNS,
  MKT_DATA_ACCESS_POLICY_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-data-access-policy/mkt-data-access-policy-data-seeds.constants';
import {
  MKT_PERMISSION_CONTEXT_DATA_SEED_COLUMNS,
  MKT_PERMISSION_CONTEXT_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-context/mkt-permission-context-data-seeds.constants';
import {
  MKT_DEPARTMENT_DATA_SEED_COLUMNS,
  MKT_DEPARTMENT_DATA_SEEDS,
} from 'src/mkt-core/seeder/department-seeder/mkt-department/mkt-department-data-seeds.constants';
import {
  MKT_DEPARTMENT_ANCESTRY_DATA_SEED_COLUMNS,
  MKT_DEPARTMENT_ANCESTRY_DATA_SEEDS,
} from 'src/mkt-core/seeder/department-seeder/mkt-department-ancestry/mkt-department-ancestry-data-seeds.constants';
import {
  MKT_DEPARTMENT_HIERARCHY_DATA_SEED_COLUMNS,
  MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS,
} from 'src/mkt-core/seeder/department-seeder/mkt-department-hierarchy/mkt-department-hierarchy-data-seeds.constants';
import {
  MKT_DEPARTMENT_SUB_MANAGER_DATA_SEED_COLUMNS,
  MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS,
} from 'src/mkt-core/seeder/department-seeder/mkt-department-sub-manager/mkt-department-sub-manager-data-seeds.constants';
import {
  MKT_EMAIL_DATA_SEED_COLUMNS,
  MKT_EMAIL_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-email-data-seeds.constants';
import {
  MKT_EMPLOYMENT_STATUS_DATA_SEED_COLUMNS,
  MKT_EMPLOYMENT_STATUS_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-employment-status-data-seeds.constants';
import {
  MKT_I18N_DATA_SEED_COLUMNS,
  MKT_I18N_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-i18n-data-seeds.constants';
import {
  MKT_KPI_DATA_SEED_COLUMNS,
  MKT_KPI_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-kpi-data-seeds.constants';
import {
  MKT_KPI_TEMPLATE_DATA_SEED_COLUMNS,
  MKT_KPI_TEMPLATE_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-kpi-template-data-seeds.constants';
import {
  MKT_OPTION_DATA_SEED_COLUMNS,
  MKT_OPTION_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-option-data-seeds.constants';
import {
  MKT_ORDER_DATA_SEED_COLUMNS,
  MKT_ORDER_DATA_SEEDS,
} from 'src/mkt-core/seeder/order-seeder/mkt-order-data-seeds.constants';
import {
  MKT_ORDER_HISTORY_DATA_SEED_COLUMNS,
  MKT_ORDER_HISTORY_DATA_SEEDS,
} from 'src/mkt-core/seeder/order-seeder/mkt-order-history-data-seeds.constants';
import {
  MKT_ORDER_ITEM_DATA_SEED_COLUMNS,
  MKT_ORDER_ITEM_DATA_SEEDS,
} from 'src/mkt-core/seeder/order-seeder/mkt-order-item-data-seeds.constants';
import {
  MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
  MKT_ORGANIZATION_LEVEL_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-organization-level-data-seeds.constants';
import {
  MKT_PAYMENT_DATA_SEED_COLUMNS,
  MKT_PAYMENT_DATA_SEEDS,
} from 'src/mkt-core/seeder/payment-seeder/mkt-payment/mkt-payment-data-seeds.constants';
import {
  MKT_PAYMENT_HISTORY_DATA_SEED_COLUMNS,
  MKT_PAYMENT_HISTORY_DATA_SEEDS,
} from 'src/mkt-core/seeder/payment-seeder/mkt-payment-history/mkt-payment-history-data-seeds.constants';
import {
  MKT_PAYMENT_METHOD_DATA_SEED_COLUMNS,
  MKT_PAYMENT_METHOD_DATA_SEEDS,
} from 'src/mkt-core/seeder/payment-seeder/payment-method/mkt-payment-method-data-seeds.constants';
import {
  MKT_PERMISSION_AUDIT_DATA_SEED_COLUMNS,
  MKT_PERMISSION_AUDIT_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-audit/mkt-permission-audit-data-seeds.constants';
import {
  MKT_REPORT_DATA_SEED_COLUMNS,
  MKT_REPORT_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-report-data-seeds.constants';
import {
  MKT_STAFF_STATUS_HISTORY_DATA_SEED_COLUMNS,
  MKT_STAFF_STATUS_HISTORY_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-staff-status-history-data-seeds.constants';
import {
  MKT_TAG_DATA_SEED_COLUMNS,
  MKT_TAG_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-tag-data-seeds.constants';
import {
  MKT_TEMPLATE_DATA_SEED_COLUMNS,
  MKT_TEMPLATE_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-template-data-seeds.constants';
import {
  MKT_TEMPORARY_PERMISSION_DATA_SEED_COLUMNS,
  MKT_TEMPORARY_PERMISSION_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-temporary-permission-data-seeds.constants';
import {
  MKT_SINVOICE_AUTH_DATA_SEED_COLUMNS,
  MKT_SINVOICE_AUTH_DATA_SEEDS,
} from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-auth-data-seeds.constants';
import {
  MKT_SINVOICE_DATA_SEED_COLUMNS,
  MKT_SINVOICE_DATA_SEEDS,
} from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-data-seeds.constants';
import {
  MKT_SINVOICE_ITEM_DATA_SEED_COLUMNS,
  MKT_SINVOICE_ITEM_DATA_SEEDS,
} from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-item-data-seeds.constants';
import {
  MKT_SINVOICE_METADATA_DATA_SEED_COLUMNS,
  MKT_SINVOICE_METADATA_DATA_SEEDS,
} from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-metadata-data-seeds.constants';
import {
  MKT_SINVOICE_PAYMENT_DATA_SEED_COLUMNS,
  MKT_SINVOICE_PAYMENT_DATA_SEEDS,
} from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-payment-data-seeds.constants';
import {
  MKT_SINVOICE_TAX_BREAKDOWN_DATA_SEED_COLUMNS,
  MKT_SINVOICE_TAX_BREAKDOWN_DATA_SEEDS,
} from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-tax-breakdown-data-seeds.constants';
import {
  MKT_GENERIC_COMBO_DATA_SEED_COLUMNS,
  MKT_GENERIC_COMBO_DATA_SEEDS,
} from 'src/mkt-core/seeder/combo-seeder/mkt-generic-combo-data-seeds.constants';
import {
  MKT_GENERIC_COMBO_ITEM_DATA_SEED_COLUMNS,
  MKT_GENERIC_COMBO_ITEM_DATA_SEEDS,
} from 'src/mkt-core/seeder/combo-seeder/mkt-generic-combo-item-data-seeds.constants';
// Promotion seeder configs
import {
  MKT_PROMOTION_DATA_SEED_COLUMNS,
  MKT_PROMOTION_DATA_SEEDS,
} from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-data-seeds.constants';
import {
  MKT_PROMOTION_RULE_DATA_SEED_COLUMNS,
  MKT_PROMOTION_RULE_DATA_SEEDS,
} from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-rule-data-seeds.constants';
import {
  MKT_COUPON_DATA_SEED_COLUMNS,
  MKT_COUPON_DATA_SEEDS,
} from 'src/mkt-core/seeder/promotion-seeder/mkt-coupon-data-seeds.constants';
import {
  MKT_PROMOTION_AUDIT_DATA_SEED_COLUMNS,
  MKT_PROMOTION_AUDIT_DATA_SEEDS,
} from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-audit-data-seeds.constants';
import {
  MKT_PROMOTION_USAGE_DATA_SEED_COLUMNS,
  MKT_PROMOTION_USAGE_DATA_SEEDS,
} from 'src/mkt-core/seeder/promotion-seeder/mkt-promotion-usage-data-seeds.constants';
// Permission template seeder configs
import {
  MKT_PERMISSION_ACTION_DATA_SEED_COLUMNS,
  MKT_PERMISSION_ACTION_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-action/mkt-permission-action-data-seeds.constants';
import {
  MKT_PERMISSION_RESOURCE_DATA_SEED_COLUMNS,
  MKT_PERMISSION_RESOURCE_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-resource/mkt-permission-resource-data-seeds.constants';
import {
  MKT_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS,
  MKT_PERMISSION_TEMPLATE_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-template/mkt-permission-template-data-seeds.constants';
import {
  MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_COLUMNS,
  MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-template-resource-permission/mkt-template-resource-permission-data-seeds.constants';
import {
  MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_COLUMNS,
  MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-template-system-action/mkt-template-system-action-data-seeds.constants';
import {
  MKT_USER_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS,
  MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-user-permission-template/mkt-user-permission-template-data-seeds.constants';
// Casbin seeder configs
import {
  MKT_CASBIN_RULE_DATA_SEED_COLUMNS,
  MKT_CASBIN_RULE_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/casbin-seeder/mkt-casbin-rule/mkt-casbin-rule-data-seeds.constants';
import {
  MKT_POLICY_VERSION_DATA_SEED_COLUMNS,
  MKT_POLICY_VERSION_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/casbin-seeder/mkt-policy-version/mkt-policy-version-data-seeds.constants';
import {
  MKT_POLICY_CHANGE_REQUEST_DATA_SEED_COLUMNS,
  MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/casbin-seeder/mkt-policy-change-request/mkt-policy-change-request-data-seeds.constants';
import {
  MKT_POLICY_APPROVAL_DATA_SEED_COLUMNS,
  MKT_POLICY_APPROVAL_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/casbin-seeder/mkt-policy-approval/mkt-policy-approval-data-seeds.constants';
// Department manager update (Phase 3 - after workspace members are seeded)
import { updateMktDepartmentManagers } from 'src/mkt-core/seeder/department-seeder/mkt-department/update-mkt-department-managers';

export const MKT_RECORD_SEEDS_CONFIGS_FIRST_PHASE_TABLES = [
  // Organization configs
  {
    tableName: 'mktOrganizationLevel',
    pgColumns: MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
    recordSeeds: MKT_ORGANIZATION_LEVEL_DATA_SEEDS,
  },
  {
    tableName: 'mktEmploymentStatus',
    pgColumns: MKT_EMPLOYMENT_STATUS_DATA_SEED_COLUMNS,
    recordSeeds: MKT_EMPLOYMENT_STATUS_DATA_SEEDS,
  },
  {
    tableName: 'mktDepartment',
    pgColumns: MKT_DEPARTMENT_DATA_SEED_COLUMNS,
    recordSeeds: MKT_DEPARTMENT_DATA_SEEDS,
  },
];

export const MKT_RECORD_SEEDS_CONFIGS = [
  // core
  {
    tableName: 'mktOption',
    pgColumns: MKT_OPTION_DATA_SEED_COLUMNS,
    recordSeeds: MKT_OPTION_DATA_SEEDS,
  },
  // I18n configs
  {
    tableName: 'mktI18N',
    pgColumns: MKT_I18N_DATA_SEED_COLUMNS,
    recordSeeds: MKT_I18N_DATA_SEEDS,
  },
  // Customer configs
  {
    tableName: 'mktCustomer',
    pgColumns: MKT_CUSTOMER_DATA_SEED_COLUMNS,
    recordSeeds: MKT_CUSTOMER_DATA_SEEDS,
  },
  {
    tableName: 'mktTag',
    pgColumns: MKT_TAG_DATA_SEED_COLUMNS,
    recordSeeds: MKT_TAG_DATA_SEEDS,
  },
  {
    tableName: 'mktCustomerTag',
    pgColumns: MKT_CUSTOMER_TAG_DATA_SEED_COLUMNS,
    recordSeeds: MKT_CUSTOMER_TAG_DATA_SEEDS,
  },
  {
    tableName: 'mktCustomerTierHistory',
    pgColumns: MKT_CUSTOMER_TIER_HISTORY_DATA_SEED_COLUMNS,
    recordSeeds: MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS,
  },
  {
    tableName: 'mktCustomerNote',
    pgColumns: MKT_CUSTOMER_NOTE_DATA_SEED_COLUMNS,
    recordSeeds: MKT_CUSTOMER_NOTE_DATA_SEEDS,
  },
  // Generic combo configs
  {
    tableName: 'mktGenericCombo',
    pgColumns: MKT_GENERIC_COMBO_DATA_SEED_COLUMNS,
    recordSeeds: MKT_GENERIC_COMBO_DATA_SEEDS,
  },
  {
    tableName: 'mktGenericComboItem',
    pgColumns: MKT_GENERIC_COMBO_ITEM_DATA_SEED_COLUMNS,
    recordSeeds: MKT_GENERIC_COMBO_ITEM_DATA_SEEDS,
  },
  {
    tableName: 'mktTemplate',
    pgColumns: MKT_TEMPLATE_DATA_SEED_COLUMNS,
    recordSeeds: MKT_TEMPLATE_DATA_SEEDS,
  },
  {
    tableName: 'mktOrder',
    pgColumns: MKT_ORDER_DATA_SEED_COLUMNS,
    recordSeeds: MKT_ORDER_DATA_SEEDS,
  },
  {
    tableName: 'mktContract',
    pgColumns: MKT_CONTRACT_DATA_SEED_COLUMNS,
    recordSeeds: MKT_CONTRACT_DATA_SEEDS,
  },
  {
    tableName: 'mktOrderItem',
    pgColumns: MKT_ORDER_ITEM_DATA_SEED_COLUMNS,
    recordSeeds: MKT_ORDER_ITEM_DATA_SEEDS,
  },
  // Order History configs
  {
    tableName: 'mktOrderHistory',
    pgColumns: MKT_ORDER_HISTORY_DATA_SEED_COLUMNS,
    recordSeeds: MKT_ORDER_HISTORY_DATA_SEEDS,
  },
  // Invoice configs
  {
    tableName: 'mktSInvoiceAuth',
    pgColumns: MKT_SINVOICE_AUTH_DATA_SEED_COLUMNS,
    recordSeeds: MKT_SINVOICE_AUTH_DATA_SEEDS,
  },
  {
    tableName: 'mktSInvoice',
    pgColumns: MKT_SINVOICE_DATA_SEED_COLUMNS,
    recordSeeds: MKT_SINVOICE_DATA_SEEDS,
  },
  {
    tableName: 'mktSInvoicePayment',
    pgColumns: MKT_SINVOICE_PAYMENT_DATA_SEED_COLUMNS,
    recordSeeds: MKT_SINVOICE_PAYMENT_DATA_SEEDS,
  },
  {
    tableName: 'mktSInvoiceItem',
    pgColumns: MKT_SINVOICE_ITEM_DATA_SEED_COLUMNS,
    recordSeeds: MKT_SINVOICE_ITEM_DATA_SEEDS,
  },
  {
    tableName: 'mktSInvoiceTaxBreakdown',
    pgColumns: MKT_SINVOICE_TAX_BREAKDOWN_DATA_SEED_COLUMNS,
    recordSeeds: MKT_SINVOICE_TAX_BREAKDOWN_DATA_SEEDS,
  },
  {
    tableName: 'mktSInvoiceMetadata',
    pgColumns: MKT_SINVOICE_METADATA_DATA_SEED_COLUMNS,
    recordSeeds: MKT_SINVOICE_METADATA_DATA_SEEDS,
  },
  // Payment configs
  {
    tableName: 'mktPaymentMethod',
    pgColumns: MKT_PAYMENT_METHOD_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PAYMENT_METHOD_DATA_SEEDS,
  },
  {
    tableName: 'mktPayment',
    pgColumns: MKT_PAYMENT_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PAYMENT_DATA_SEEDS,
  },
  {
    tableName: 'mktPaymentHistory',
    pgColumns: MKT_PAYMENT_HISTORY_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PAYMENT_HISTORY_DATA_SEEDS,
  },
  // KPI System configs
  {
    tableName: 'mktKpi',
    pgColumns: MKT_KPI_DATA_SEED_COLUMNS,
    recordSeeds: MKT_KPI_DATA_SEEDS,
  },
  {
    tableName: 'mktKpiTemplate',
    pgColumns: MKT_KPI_TEMPLATE_DATA_SEED_COLUMNS,
    recordSeeds: MKT_KPI_TEMPLATE_DATA_SEEDS,
  },
  //reports
  {
    tableName: 'mktReport',
    pgColumns: MKT_REPORT_DATA_SEED_COLUMNS,
    recordSeeds: MKT_REPORT_DATA_SEEDS,
  },
  // Customer configs
  {
    tableName: 'mktCustomer',
    pgColumns: MKT_CUSTOMER_DATA_SEED_COLUMNS,
    recordSeeds: MKT_CUSTOMER_DATA_SEEDS,
  },
  {
    tableName: 'mktEmail',
    pgColumns: MKT_EMAIL_DATA_SEED_COLUMNS,
    recordSeeds: MKT_EMAIL_DATA_SEEDS,
  },
  // Staff Status History - needs to be after workspace members
  {
    tableName: 'mktStaffStatusHistory',
    pgColumns: MKT_STAFF_STATUS_HISTORY_DATA_SEED_COLUMNS,
    recordSeeds: MKT_STAFF_STATUS_HISTORY_DATA_SEEDS,
  },
  // Temporary Permission - needs to be after workspace members
  {
    tableName: 'mktTemporaryPermission',
    pgColumns: MKT_TEMPORARY_PERMISSION_DATA_SEED_COLUMNS,
    recordSeeds: MKT_TEMPORARY_PERMISSION_DATA_SEEDS,
  },
  {
    tableName: 'mktDepartmentHierarchy',
    pgColumns: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_COLUMNS,
    recordSeeds: MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS,
  },
  {
    tableName: 'mktDepartmentSubManager',
    pgColumns: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEED_COLUMNS,
    recordSeeds: MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS,
  },
  {
    tableName: 'mktDepartmentAncestry',
    pgColumns: MKT_DEPARTMENT_ANCESTRY_DATA_SEED_COLUMNS,
    recordSeeds: MKT_DEPARTMENT_ANCESTRY_DATA_SEEDS,
  },
  // Permission context (template layer) - phải seed trước Data Access Policy
  {
    tableName: 'mktPermissionContext',
    pgColumns: MKT_PERMISSION_CONTEXT_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PERMISSION_CONTEXT_DATA_SEEDS,
  },
  {
    tableName: 'mktDataAccessPolicy',
    pgColumns: MKT_DATA_ACCESS_POLICY_DATA_SEED_COLUMNS,
    recordSeeds: MKT_DATA_ACCESS_POLICY_DATA_SEEDS,
  },
  {
    tableName: 'mktPermissionAudit',
    pgColumns: MKT_PERMISSION_AUDIT_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PERMISSION_AUDIT_DATA_SEEDS,
  },
  // Promotion configs (order matters: Promotion -> Rule -> Coupon -> Audit -> Usage)
  {
    tableName: 'mktPromotion',
    pgColumns: MKT_PROMOTION_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PROMOTION_DATA_SEEDS,
  },
  {
    tableName: 'mktPromotionRule',
    pgColumns: MKT_PROMOTION_RULE_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PROMOTION_RULE_DATA_SEEDS,
  },
  {
    tableName: 'mktCoupon',
    pgColumns: MKT_COUPON_DATA_SEED_COLUMNS,
    recordSeeds: MKT_COUPON_DATA_SEEDS,
  },
  {
    tableName: 'mktPromotionAudit',
    pgColumns: MKT_PROMOTION_AUDIT_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PROMOTION_AUDIT_DATA_SEEDS,
  },
  {
    tableName: 'mktPromotionUsage',
    pgColumns: MKT_PROMOTION_USAGE_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PROMOTION_USAGE_DATA_SEEDS,
  },
  // Permission template configs (order matters: actions -> resources -> templates -> mappings)
  {
    tableName: 'mktPermissionAction',
    pgColumns: MKT_PERMISSION_ACTION_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PERMISSION_ACTION_DATA_SEEDS,
  },
  {
    tableName: 'mktPermissionResource',
    pgColumns: MKT_PERMISSION_RESOURCE_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PERMISSION_RESOURCE_DATA_SEEDS,
  },
  {
    tableName: 'mktPermissionTemplate',
    pgColumns: MKT_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PERMISSION_TEMPLATE_DATA_SEEDS,
  },
  {
    tableName: 'mktTemplateResourcePermission',
    pgColumns: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_COLUMNS,
    recordSeeds: MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS,
  },
  {
    tableName: 'mktTemplateSystemAction',
    pgColumns: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_COLUMNS,
    recordSeeds: MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS,
  },
  {
    tableName: 'mktUserPermissionTemplate',
    pgColumns: MKT_USER_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS,
    recordSeeds: MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS,
  },
  // Casbin configs (order matters: policy version -> casbin rules -> change requests -> approvals)
  {
    tableName: 'mktPolicyVersion',
    pgColumns: MKT_POLICY_VERSION_DATA_SEED_COLUMNS,
    recordSeeds: MKT_POLICY_VERSION_DATA_SEEDS,
  },
  {
    tableName: 'mktCasbinRule',
    pgColumns: MKT_CASBIN_RULE_DATA_SEED_COLUMNS,
    recordSeeds: MKT_CASBIN_RULE_DATA_SEEDS,
  },
  {
    tableName: 'mktPolicyChangeRequest',
    pgColumns: MKT_POLICY_CHANGE_REQUEST_DATA_SEED_COLUMNS,
    recordSeeds: MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS,
  },
  {
    tableName: 'mktPolicyApproval',
    pgColumns: MKT_POLICY_APPROVAL_DATA_SEED_COLUMNS,
    recordSeeds: MKT_POLICY_APPROVAL_DATA_SEEDS,
  },
];

/**
 * Post-standard-seeds update functions
 * Chạy SAU khi workspace members đã được seed để giải quyết circular dependency
 */
export const MKT_POST_STANDARD_SEEDS_UPDATES = [updateMktDepartmentManagers];
