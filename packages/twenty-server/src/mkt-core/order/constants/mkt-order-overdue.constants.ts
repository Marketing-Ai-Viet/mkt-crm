/**
 * Order Overdue Static Constants
 *
 * Các giá trị static không thay đổi theo environment.
 * Các giá trị có thể thay đổi được quản lý trong order.config.ts
 *
 * @see order/config/order.config.ts - OrderOverdueConfig
 */

/**
 * DEPRECATED: Cron pattern cho polling job
 * Sử dụng delayed job thay thế, giữ lại để backup
 */
export const MKT_ORDER_OVERDUE_CRON_PATTERN = '*/30 * * * *';

/** Job name for overdue check */
export const ORDER_OVERDUE_JOB_NAME = 'ProcessOrderOverdue';

/** Job ID prefix - format: order-overdue:{orderId} */
export const ORDER_OVERDUE_JOB_ID_PREFIX = 'order-overdue';

/**
 * Generate job ID for an order
 * @param orderId - Order ID
 * @returns Job ID in format: order-overdue:{orderId}
 */
export const GET_OVERDUE_JOB_ID = (orderId: string): string =>
  `${ORDER_OVERDUE_JOB_ID_PREFIX}:${orderId}`;
