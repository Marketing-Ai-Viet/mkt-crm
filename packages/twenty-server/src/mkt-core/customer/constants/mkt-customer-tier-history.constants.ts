import { FieldMetadataComplexOption } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Reasons for tier changes
 */
export const TIER_CHANGE_REASON = {
  ORDER_COMPLETED: 'ORDER_COMPLETED',
  CRON_RECALCULATION: 'CRON_RECALCULATION',
  MANUAL_UPDATE: 'MANUAL_UPDATE',
  INACTIVITY_DOWNGRADE: 'INACTIVITY_DOWNGRADE',
  INITIAL_ASSIGNMENT: 'INITIAL_ASSIGNMENT',
} as const;

export type TierChangeReason =
  (typeof TIER_CHANGE_REASON)[keyof typeof TIER_CHANGE_REASON];

export const TIER_CHANGE_REASON_OPTIONS: FieldMetadataComplexOption[] = [
  {
    value: TIER_CHANGE_REASON.ORDER_COMPLETED,
    label: 'Order Completed',
    color: 'green',
    position: 0,
  },
  {
    value: TIER_CHANGE_REASON.CRON_RECALCULATION,
    label: 'Cron Recalculation',
    color: 'blue',
    position: 1,
  },
  {
    value: TIER_CHANGE_REASON.MANUAL_UPDATE,
    label: 'Manual Update',
    color: 'yellow',
    position: 2,
  },
  {
    value: TIER_CHANGE_REASON.INACTIVITY_DOWNGRADE,
    label: 'Inactivity Downgrade',
    color: 'red',
    position: 3,
  },
  {
    value: TIER_CHANGE_REASON.INITIAL_ASSIGNMENT,
    label: 'Initial Assignment',
    color: 'gray',
    position: 4,
  },
];

/**
 * Default pagination for tier history queries
 */
export const TIER_HISTORY_DEFAULT_LIMIT = 50;

/**
 * Log context for tier history
 */
export const MKT_TIER_HISTORY_LOG_CONTEXT = 'MktCustomerTierHistory';
