import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';

export const MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN = '15 2 * * *'; // Chạy mỗi ngày lúc 2 giờ 15 phút sáng

/**
 * Order statuses that count towards tier calculation
 * Only completed orders contribute to customer tier
 */
export const COMPLETED_ORDER_STATUSES: ORDER_STATUS[] = [
  ORDER_STATUS.COMPLETED,
] as const;

/**
 * Bulk processing configuration for tier updates
 */
export const TIER_BULK_PROCESSING_CONFIG = {
  /** Number of customers per batch for bulk queries */
  BATCH_SIZE: 100,
  /** Number of concurrent update operations */
  CONCURRENCY: 5,
  /** Default calculation period in days (12 months) */
  DEFAULT_PERIOD_DAYS: 365,
} as const;
