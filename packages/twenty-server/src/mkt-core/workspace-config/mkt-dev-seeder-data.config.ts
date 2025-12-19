//Order configs
import {
  MKT_CONTRACT_DATA_SEED_COLUMNS,
  MKT_CONTRACT_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-contract-data-seeds.constants';
import {
  MKT_CUSTOMER_DATA_SEED_COLUMNS,
  MKT_CUSTOMER_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-customer-data-seeds.constants';
import {
  MKT_CUSTOMER_TAG_DATA_SEED_COLUMNS,
  MKT_CUSTOMER_TAG_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-customer-tag-data-seeds.constants';
import {
  MKT_DATA_ACCESS_POLICY_DATA_SEED_COLUMNS,
  MKT_DATA_ACCESS_POLICY_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-data-access-policy-data-seeds.constants';
import {
  MKT_DEPARTMENT_DATA_SEED_COLUMNS,
  MKT_DEPARTMENT_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-department-data-seeds.constants';
import {
  MKT_DEPARTMENT_HIERARCHY_DATA_SEED_COLUMNS,
  MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-department-hierarchy-data-seeds.constants';
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
} from 'src/mkt-core/seeder/constants/mkt-order-data-seeds.constants';
import {
  MKT_ORDER_HISTORY_DATA_SEED_COLUMNS,
  MKT_ORDER_HISTORY_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-order-history-data-seeds.constants';
import {
  MKT_ORDER_ITEM_DATA_SEED_COLUMNS,
  MKT_ORDER_ITEM_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-order-item-data-seeds.constants';
import {
  MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
  MKT_ORGANIZATION_LEVEL_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-organization-level-data-seeds.constants';
import {
  MKT_PAYMENT_DATA_SEED_COLUMNS,
  MKT_PAYMENT_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-payment-data-seeds.constants';
import {
  MKT_PAYMENT_HISTORY_DATA_SEED_COLUMNS,
  MKT_PAYMENT_HISTORY_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-payment-history-data-seeds.constants';
import {
  MKT_PAYMENT_METHOD_DATA_SEED_COLUMNS,
  MKT_PAYMENT_METHOD_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-payment-method-data-seeds.constants';
import {
  MKT_PERMISSION_AUDIT_DATA_SEED_COLUMNS,
  MKT_PERMISSION_AUDIT_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-permission-audit-data-seeds.constants';
import {
  MKT_REPORT_DATA_SEED_COLUMNS,
  MKT_REPORT_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-report-data-seeds.constants';
import {
  MKT_SENDMAIL_TEMPLATE_DATA_SEED_COLUMNS,
  MKT_SENDMAIL_TEMPLATE_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-sendmail-template-seeds.constant.ts';
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
} from 'src/mkt-core/seeder/constants/mkt-generic-combo-data-seeds.constants';
import {
  MKT_GENERIC_COMBO_ITEM_DATA_SEED_COLUMNS,
  MKT_GENERIC_COMBO_ITEM_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-generic-combo-item-data-seeds.constants';
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
    tableName: 'mktDataAccessPolicy',
    pgColumns: MKT_DATA_ACCESS_POLICY_DATA_SEED_COLUMNS,
    recordSeeds: MKT_DATA_ACCESS_POLICY_DATA_SEEDS,
  },
  {
    tableName: 'mktPermissionAudit',
    pgColumns: MKT_PERMISSION_AUDIT_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PERMISSION_AUDIT_DATA_SEEDS,
  },
  {
    tableName: 'mktSendmailTemplate',
    pgColumns: MKT_SENDMAIL_TEMPLATE_DATA_SEED_COLUMNS,
    recordSeeds: MKT_SENDMAIL_TEMPLATE_DATA_SEEDS,
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
];
