/**
 * Customer Module Constants
 *
 * Re-exports all constants for easy importing
 */

// Customer enums and options
export {
  MKT_CUSTOMER_TYPE,
  MKT_CUSTOMER_TYPE_OPTIONS,
  MKT_CUSTOMER_STATUS,
  MKT_CUSTOMER_STATUS_OPTIONS,
  MKT_CUSTOMER_TIER,
  MKT_CUSTOMER_TIER_OPTIONS,
  MKT_CUSTOMER_TIER_THRESHOLDS,
  MKT_CUSTOMER_LIFECYCLE_STAGE,
  MKT_CUSTOMER_LIFECYCLE_STAGE_OPTIONS,
  MKT_CUSTOMER_TAGS,
  MKT_CUSTOMER_TAGS_OPTIONS,
  MKT_CUSTOMER_COMPANY_SIZE,
  MKT_CUSTOMER_COMPANY_SIZE_OPTIONS,
  MKT_CUSTOMER_COMPANY_SIZE_SELECT_OPTIONS,
  MKT_CUSTOMER_INDUSTRY,
  MKT_CUSTOMER_INDUSTRY_OPTIONS,
  MKT_CUSTOMER_INDUSTRY_SELECT_OPTIONS,
  MKT_CUSTOMER_DATA_SEEDS_IDS,
  MKT_CUSTOMER_CATEGORIZATION_THRESHOLDS,
  MKT_CUSTOMER_AUTO_ASSIGN_CONFIG,
} from './mkt-customer.constant';

// Tier update cron pattern
export { MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN } from './mkt-customer-tier.constants';

// Categorization constants
export * from './mkt-customer-categorization.constants';

// Tag constants
export * from './mkt-tag.constant';

// Linked account constants
export * from './linked-account.constants';

// Customer note constants
export * from './mkt-customer-note.constants';

// DataScope constants
export * from './customer-data-scope.constants';
