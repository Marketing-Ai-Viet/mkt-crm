/**
 * Seed Data Factory
 *
 * Factory functions to get seed data based on SeedProfile.
 * Separates master data (always needed) from demo data (development only).
 *
 * @see docs/MKT_ENVIRONMENT_BASED_SEEDING.md
 */

import {
  RecordSeedConfig,
  SeedProfile,
} from 'src/mkt-core/seeder/types/seed-profile.types';
import {
  MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
  MKT_ORGANIZATION_LEVEL_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-organization-level-data-seeds.constants';
import {
  MKT_EMPLOYMENT_STATUS_DATA_SEED_COLUMNS,
  MKT_EMPLOYMENT_STATUS_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-employment-status-data-seeds.constants';
import {
  MKT_DEPARTMENT_DATA_SEED_COLUMNS,
  MKT_DEPARTMENT_DATA_SEEDS,
} from 'src/mkt-core/seeder/department-seeder/mkt-department/mkt-department-data-seeds.constants';
import {
  MKT_PAYMENT_METHOD_DATA_SEED_COLUMNS,
  MKT_PAYMENT_METHOD_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-payment-method-data-seeds.constants';
import {
  MKT_OPTION_DATA_SEED_COLUMNS,
  MKT_OPTION_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-option-data-seeds.constants';
import {
  MKT_I18N_DATA_SEED_COLUMNS,
  MKT_I18N_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-i18n-data-seeds.constants';
import {
  MKT_TEMPLATE_DATA_SEED_COLUMNS,
  MKT_TEMPLATE_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-template-data-seeds.constants';
import {
  MKT_GENERIC_COMBO_DATA_SEED_COLUMNS,
  MKT_GENERIC_COMBO_DATA_SEEDS,
} from 'src/mkt-core/seeder/combo-seeder/mkt-generic-combo-data-seeds.constants';
import {
  MKT_GENERIC_COMBO_ITEM_DATA_SEED_COLUMNS,
  MKT_GENERIC_COMBO_ITEM_DATA_SEEDS,
} from 'src/mkt-core/seeder/combo-seeder/mkt-generic-combo-item-data-seeds.constants';
import {
  MKT_DEPARTMENT_HIERARCHY_DATA_SEED_COLUMNS,
  MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS,
} from 'src/mkt-core/seeder/department-seeder/mkt-department-hierarchy/mkt-department-hierarchy-data-seeds.constants';
import {
  MKT_CUSTOMER_DATA_SEED_COLUMNS,
  MKT_CUSTOMER_DATA_SEEDS,
} from 'src/mkt-core/seeder/customer-seeder/mkt-customer-data-seeds.constants';
import {
  MKT_TAG_DATA_SEED_COLUMNS,
  MKT_TAG_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-tag-data-seeds.constants';
import {
  MKT_CUSTOMER_TAG_DATA_SEED_COLUMNS,
  MKT_CUSTOMER_TAG_DATA_SEEDS,
} from 'src/mkt-core/seeder/customer-seeder/mkt-customer-tag-data-seeds.constants';
import {
  MKT_ORDER_DATA_SEED_COLUMNS,
  MKT_ORDER_DATA_SEEDS,
} from 'src/mkt-core/seeder/order-seeder/mkt-order-data-seeds.constants';
import {
  MKT_ORDER_ITEM_DATA_SEED_COLUMNS,
  MKT_ORDER_ITEM_DATA_SEEDS,
} from 'src/mkt-core/seeder/order-seeder/mkt-order-item-data-seeds.constants';
import {
  MKT_ORDER_HISTORY_DATA_SEED_COLUMNS,
  MKT_ORDER_HISTORY_DATA_SEEDS,
} from 'src/mkt-core/seeder/order-seeder/mkt-order-history-data-seeds.constants';
import {
  MKT_CONTRACT_DATA_SEED_COLUMNS,
  MKT_CONTRACT_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-contract-data-seeds.constants';
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
  MKT_SINVOICE_PAYMENT_DATA_SEED_COLUMNS,
  MKT_SINVOICE_PAYMENT_DATA_SEEDS,
} from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-payment-data-seeds.constants';
import {
  MKT_SINVOICE_TAX_BREAKDOWN_DATA_SEED_COLUMNS,
  MKT_SINVOICE_TAX_BREAKDOWN_DATA_SEEDS,
} from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-tax-breakdown-data-seeds.constants';
import {
  MKT_SINVOICE_METADATA_DATA_SEED_COLUMNS,
  MKT_SINVOICE_METADATA_DATA_SEEDS,
} from 'src/mkt-core/seeder/invoice-seeder/mkt-sinvoice-metadata-data-seeds.constants';
import {
  MKT_PAYMENT_DATA_SEED_COLUMNS,
  MKT_PAYMENT_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-payment-data-seeds.constants';
import {
  MKT_PAYMENT_HISTORY_DATA_SEED_COLUMNS,
  MKT_PAYMENT_HISTORY_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-payment-history-data-seeds.constants';
import {
  MKT_KPI_DATA_SEED_COLUMNS,
  MKT_KPI_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-kpi-data-seeds.constants';
import {
  MKT_KPI_TEMPLATE_DATA_SEED_COLUMNS,
  MKT_KPI_TEMPLATE_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-kpi-template-data-seeds.constants';
import {
  MKT_REPORT_DATA_SEED_COLUMNS,
  MKT_REPORT_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-report-data-seeds.constants';
import {
  MKT_EMAIL_DATA_SEED_COLUMNS,
  MKT_EMAIL_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-email-data-seeds.constants';
import {
  MKT_STAFF_STATUS_HISTORY_DATA_SEED_COLUMNS,
  MKT_STAFF_STATUS_HISTORY_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-staff-status-history-data-seeds.constants';
import {
  MKT_TEMPORARY_PERMISSION_DATA_SEED_COLUMNS,
  MKT_TEMPORARY_PERMISSION_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-temporary-permission-data-seeds.constants';
import {
  MKT_DATA_ACCESS_POLICY_DATA_SEED_COLUMNS,
  MKT_DATA_ACCESS_POLICY_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-data-access-policy-data-seeds.constants';
import {
  MKT_PERMISSION_AUDIT_DATA_SEED_COLUMNS,
  MKT_PERMISSION_AUDIT_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-audit/mkt-permission-audit-data-seeds.constants';
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

// ============================================
// MASTER DATA SEEDS (always included)
// ============================================

/**
 * First phase tables - must be seeded before others (no FK dependencies)
 * These are seeded for ALL profiles except EMPTY
 */
export const getMasterDataFirstPhaseSeeds = (): RecordSeedConfig[] => [
  // Organization structure
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

/**
 * Master data seeds - core configuration data needed for system to function
 * These are seeded for ALL profiles except EMPTY
 */
export const getMasterDataSeeds = (): RecordSeedConfig[] => [
  // Core options and settings
  {
    tableName: 'mktOption',
    pgColumns: MKT_OPTION_DATA_SEED_COLUMNS,
    recordSeeds: MKT_OPTION_DATA_SEEDS,
  },
  // Internationalization
  {
    tableName: 'mktI18N',
    pgColumns: MKT_I18N_DATA_SEED_COLUMNS,
    recordSeeds: MKT_I18N_DATA_SEEDS,
  },
  // Payment methods (required for orders)
  {
    tableName: 'mktPaymentMethod',
    pgColumns: MKT_PAYMENT_METHOD_DATA_SEED_COLUMNS,
    recordSeeds: MKT_PAYMENT_METHOD_DATA_SEEDS,
  },
  // Templates (email, document templates) - unified in mktTemplate
  {
    tableName: 'mktTemplate',
    pgColumns: MKT_TEMPLATE_DATA_SEED_COLUMNS,
    recordSeeds: MKT_TEMPLATE_DATA_SEEDS,
  },
  // Generic combos (dropdown options, etc.)
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
  // Department hierarchy
  {
    tableName: 'mktDepartmentHierarchy',
    pgColumns: MKT_DEPARTMENT_HIERARCHY_DATA_SEED_COLUMNS,
    recordSeeds: MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS,
  },
];

// ============================================
// DEMO DATA SEEDS (development/demo only)
// ============================================

/**
 * Demo data seeds - fake data for testing and development
 * Only seeded for DEVELOPMENT and DEMO profiles
 */
export const getDemoDataSeeds = (): RecordSeedConfig[] => [
  // Customer data
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

  // Order data
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
  {
    tableName: 'mktOrderHistory',
    pgColumns: MKT_ORDER_HISTORY_DATA_SEED_COLUMNS,
    recordSeeds: MKT_ORDER_HISTORY_DATA_SEEDS,
  },

  // Invoice data
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

  // Payment data
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

  // KPI data
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

  // Report data
  {
    tableName: 'mktReport',
    pgColumns: MKT_REPORT_DATA_SEED_COLUMNS,
    recordSeeds: MKT_REPORT_DATA_SEEDS,
  },

  // Email data
  {
    tableName: 'mktEmail',
    pgColumns: MKT_EMAIL_DATA_SEED_COLUMNS,
    recordSeeds: MKT_EMAIL_DATA_SEEDS,
  },

  // Staff history data
  {
    tableName: 'mktStaffStatusHistory',
    pgColumns: MKT_STAFF_STATUS_HISTORY_DATA_SEED_COLUMNS,
    recordSeeds: MKT_STAFF_STATUS_HISTORY_DATA_SEEDS,
  },

  // Permission data
  {
    tableName: 'mktTemporaryPermission',
    pgColumns: MKT_TEMPORARY_PERMISSION_DATA_SEED_COLUMNS,
    recordSeeds: MKT_TEMPORARY_PERMISSION_DATA_SEEDS,
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

  // Promotion data
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

// ============================================
// PROFILE-BASED SEED GETTERS
// ============================================

/**
 * Get first phase seeds based on profile
 * First phase tables have no FK dependencies and must be seeded first
 *
 * @param profile - Seed profile
 * @returns Array of first phase seed configs
 */
export const getFirstPhaseSeedsByProfile = (
  profile: SeedProfile,
): RecordSeedConfig[] => {
  if (profile === SeedProfile.EMPTY) {
    return [];
  }

  return getMasterDataFirstPhaseSeeds();
};

/**
 * Get all MKT seeds based on profile
 *
 * @param profile - Seed profile
 * @returns Array of seed configs appropriate for the profile
 *
 * @example
 * ```typescript
 * const seeds = getMktSeedsByProfile(SeedProfile.PRODUCTION);
 * // Returns only master data
 *
 * const devSeeds = getMktSeedsByProfile(SeedProfile.DEVELOPMENT);
 * // Returns master data + demo data
 * ```
 */
export const getMktSeedsByProfile = (
  profile: SeedProfile,
): RecordSeedConfig[] => {
  switch (profile) {
    case SeedProfile.EMPTY:
      return [];

    case SeedProfile.PRODUCTION:
    case SeedProfile.STAGING:
      // Only master data for production/staging
      return getMasterDataSeeds();

    case SeedProfile.DEMO:
    case SeedProfile.DEVELOPMENT:
    default:
      // Master data + demo data for development/demo
      return [...getMasterDataSeeds(), ...getDemoDataSeeds()];
  }
};

/**
 * Get complete seeds array including first phase tables
 * Use this for full database seeding
 *
 * @param profile - Seed profile
 * @returns Complete array of seed configs in correct order
 */
export const getCompleteMktSeedsByProfile = (
  profile: SeedProfile,
): RecordSeedConfig[] => {
  if (profile === SeedProfile.EMPTY) {
    return [];
  }

  return [
    ...getFirstPhaseSeedsByProfile(profile),
    ...getMktSeedsByProfile(profile),
  ];
};
