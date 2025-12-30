/**
 * Order Overdue Types
 *
 * Types cho delayed job system xử lý order overdue.
 */

/**
 * Payload passed to overdue check job
 * Chứa thông tin cần thiết để xử lý overdue check
 */
export type OrderOverduePayload = {
  /** Order ID cần check */
  orderId: string;
  /** Workspace ID của order */
  workspaceId: string;
  /** Order code (optional, cho logging) */
  orderCode?: string;
};

/**
 * Result status của overdue check
 */
export type OrderOverdueStatus =
  | 'updated' // Order đã được update sang OVERDUE
  | 'skipped' // Order đã có status khác (đã thanh toán/huỷ)
  | 'not_found' // Order không tìm thấy
  | 'error'; // Có lỗi xảy ra

/**
 * Result của overdue check execution
 */
export type OrderOverdueCheckResult = {
  /** Order ID */
  orderId: string;
  /** Status của check */
  status: OrderOverdueStatus;
  /** Previous status của order (nếu có) */
  previousStatus?: string;
  /** Message mô tả kết quả */
  message: string;
};

/**
 * Schedule overdue check input
 */
export type ScheduleOverdueCheckInput = {
  /** Workspace ID */
  workspaceId: string;
  /** Order ID */
  orderId: string;
  /** Order code (optional) */
  orderCode?: string;
  /** Custom delay in ms (optional, default từ config) */
  customDelayMs?: number;
};

/**
 * Kết quả migration cho một order
 */
export type MigrationOrderResult = {
  orderId: string;
  orderCode?: string;
  status: 'scheduled' | 'immediate' | 'skipped' | 'error';
  delayMs?: number;
  error?: string;
};

/**
 * Kết quả migration cho một workspace
 */
export type MigrationWorkspaceResult = {
  workspaceId: string;
  totalOrders: number;
  scheduled: number;
  immediate: number;
  skipped: number;
  errors: number;
};
