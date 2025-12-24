import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

export const ORDER_CODE_PREFIX = process.env.ORDER_CODE_PREFIX || 'DEV';

// ============================================
// TYPES
// ============================================

export type RefundItem = {
  licenseId?: string | null;
  refundAmount?: number | null;
  remainingAmount?: number | null;
  originalAmount?: number;
  variant_name?: string;
};

export type ORDER_METADATA = {
  paymentMethods?: Array<{
    mktPaymentMethodId: string;
    name?: string;
    duration?: number;
    amount?: number;
  }>;
  customer?: { mktCustomerId: string; name?: string };
  orderAction?: ORDER_ACTION;
  trialOrderId?: string;
  authFirebase?: void;
  note?: string;
  oldOrderId?: string;
  oldLicenseId?: string;
  refund?: RefundItem[];
  licenseHistory?: Record<string, unknown> | null;
  licenseRefundIds?: string[];
};

// ============================================
// ORDER STATUS
// ============================================

/**
 * Order Status - Trạng thái đơn hàng
 *
 * Flow chính:
 * - NEW_ORDER: DRAFT → PENDING_PAYMENT → CONFIRMED → COMPLETED
 * - TRIAL: TRIAL → (TRIAL_EXPIRED | PENDING_PAYMENT)
 *
 * License creation rules:
 * - TRIAL: License được tạo ngay khi tạo đơn
 * - Khác: License được tạo sau khi ACCOUNTING_CONFIRMED
 */
export enum ORDER_STATUS {
  /** Nháp - Đơn hàng đang được soạn, chưa gửi đi */
  DRAFT = 'DRAFT',

  /** Chờ thanh toán - Đơn hàng đã gửi, đang chờ khách thanh toán */
  PENDING_PAYMENT = 'PENDING_PAYMENT',

  /** Đã xác nhận - Kế toán đã xác nhận thanh toán, license đã được tạo */
  CONFIRMED = 'CONFIRMED',

  /** Hoàn thành - Đơn hàng hoàn tất, license đã giao cho khách */
  COMPLETED = 'COMPLETED',

  /** Dùng thử - Đơn trial, license trial đã được tạo ngay */
  TRIAL = 'TRIAL',

  /** Trial hết hạn - Đơn trial đã hết thời gian dùng thử */
  TRIAL_EXPIRED = 'TRIAL_EXPIRED',

  /** Đã hủy - Đơn hàng bị hủy bởi khách hoặc sales */
  CANCELED = 'CANCELED',

  /** Quá hạn - Đơn hàng quá thời hạn thanh toán */
  OVERDUE = 'OVERDUE',

  /** Bị khóa - Đơn hàng bị khóa do vi phạm chính sách */
  BLOCKED = 'BLOCKED',

  /** Hoàn tiền - Đơn hàng đã được hoàn tiền toàn bộ */
  REFUND = 'REFUND',

  /** Hoàn tiền một phần - Đơn hàng đã được hoàn tiền một phần */
  REFUND_PARTIAL = 'REFUND_PARTIAL',
}

export const ORDER_STATUS_OPTIONS = {
  status: ORDER_STATUS,
  options: [
    {
      value: ORDER_STATUS.DRAFT,
      label: 'Nháp',
      color: 'gray' as TagColor,
      position: 0,
    },
    {
      value: ORDER_STATUS.PENDING_PAYMENT,
      label: 'Chờ thanh toán',
      color: 'orange' as TagColor,
      position: 1,
    },
    {
      value: ORDER_STATUS.CONFIRMED,
      label: 'Đã xác nhận',
      color: 'blue' as TagColor,
      position: 2,
    },
    {
      value: ORDER_STATUS.COMPLETED,
      label: 'Hoàn thành',
      color: 'green' as TagColor,
      position: 3,
    },
    {
      value: ORDER_STATUS.TRIAL,
      label: 'Dùng thử',
      color: 'yellow' as TagColor,
      position: 4,
    },
    {
      value: ORDER_STATUS.TRIAL_EXPIRED,
      label: 'Trial hết hạn',
      color: 'red' as TagColor,
      position: 5,
    },
    {
      value: ORDER_STATUS.CANCELED,
      label: 'Đã hủy',
      color: 'gray' as TagColor,
      position: 6,
    },
    {
      value: ORDER_STATUS.OVERDUE,
      label: 'Quá hạn',
      color: 'red' as TagColor,
      position: 7,
    },
    {
      value: ORDER_STATUS.BLOCKED,
      label: 'Bị khóa',
      color: 'purple' as TagColor,
      position: 8,
    },
    {
      value: ORDER_STATUS.REFUND,
      label: 'Hoàn tiền',
      color: 'cyan' as TagColor,
      position: 9,
    },
    {
      value: ORDER_STATUS.REFUND_PARTIAL,
      label: 'Hoàn tiền một phần',
      color: 'cyan' as TagColor,
      position: 10,
    },
  ],
  labels: {
    EN: {
      DRAFT: 'Draft',
      PENDING_PAYMENT: 'Pending Payment',
      CONFIRMED: 'Confirmed',
      COMPLETED: 'Completed',
      TRIAL: 'Trial',
      TRIAL_EXPIRED: 'Trial Expired',
      CANCELED: 'Canceled',
      OVERDUE: 'Overdue',
      BLOCKED: 'Blocked',
      REFUND: 'Refund',
      REFUND_PARTIAL: 'Partial Refund',
    },
    VI: {
      DRAFT: 'Nháp',
      PENDING_PAYMENT: 'Chờ thanh toán',
      CONFIRMED: 'Đã xác nhận',
      COMPLETED: 'Hoàn thành',
      TRIAL: 'Dùng thử',
      TRIAL_EXPIRED: 'Trial hết hạn',
      CANCELED: 'Đã hủy',
      OVERDUE: 'Quá hạn',
      BLOCKED: 'Bị khóa',
      REFUND: 'Hoàn tiền',
      REFUND_PARTIAL: 'Hoàn tiền một phần',
    },
  },
};

// ============================================
// ORDER ACTION
// ============================================

/**
 * Order Action - Hành động trên đơn hàng
 *
 * Phân loại:
 * - Create actions: NEW_ORDER, TRIAL, LICENSE_RENEWING
 * - Status change actions: ACCOUNTING_CONFIRMED, COMPLETE, CANCEL, BLOCK
 * - Refund actions: REFUND, REFUND_PARTIAL
 * - Special actions: TRIAL_TO_PAID, CHANGE_VARIANT
 */
export enum ORDER_ACTION {
  /** Tạo đơn hàng mới - License tạo sau khi xác nhận thanh toán */
  NEW_ORDER = 'NEW_ORDER',

  /** Tạo đơn trial - License trial được tạo ngay */
  TRIAL = 'TRIAL',

  /** Gia hạn license - License gia hạn sau khi xác nhận thanh toán */
  LICENSE_RENEWING = 'LICENSE_RENEWING',

  /** Đổi gói - Thay đổi variant/package của license */
  CHANGE_VARIANT = 'CHANGE_VARIANT',

  /** Kế toán xác nhận thanh toán - Trigger tạo license */
  ACCOUNTING_CONFIRMED = 'ACCOUNTING_CONFIRMED',

  /** Hoàn thành đơn hàng */
  COMPLETE = 'COMPLETE',

  /** Hủy đơn hàng */
  CANCEL = 'CANCEL',

  /** Khóa đơn hàng */
  BLOCK = 'BLOCK',

  /** Chuyển trial sang đơn trả phí - License mới sau xác nhận */
  TRIAL_TO_PAID = 'TRIAL_TO_PAID',

  /** Hoàn tiền toàn bộ */
  REFUND = 'REFUND',

  /** Hoàn tiền một phần */
  REFUND_PARTIAL = 'REFUND_PARTIAL',
}

/**
 * Actions that create license immediately (no payment confirmation needed)
 */
export const IMMEDIATE_LICENSE_ACTIONS: ORDER_ACTION[] = [ORDER_ACTION.TRIAL];

/**
 * Actions that require accounting confirmation before license creation
 */
export const DEFERRED_LICENSE_ACTIONS: ORDER_ACTION[] = [
  ORDER_ACTION.NEW_ORDER,
  ORDER_ACTION.LICENSE_RENEWING,
  ORDER_ACTION.TRIAL_TO_PAID,
  ORDER_ACTION.CHANGE_VARIANT,
];

/**
 * Check if action creates license immediately
 */
export const IS_IMMEDIATE_LICENSE_ACTION = (action: ORDER_ACTION): boolean =>
  IMMEDIATE_LICENSE_ACTIONS.includes(action);

/**
 * Check if action requires accounting confirmation
 */
export const IS_DEFERRED_LICENSE_ACTION = (action: ORDER_ACTION): boolean =>
  DEFERRED_LICENSE_ACTIONS.includes(action);

// ============================================
// ORDER ACTION TYPE RESTRICTIONS
// ============================================

/**
 * Actions cho phép khi TẠO đơn hàng
 * - NEW_ORDER: Tạo đơn hàng mới
 * - TRIAL: Tạo đơn trial
 * - LICENSE_RENEWING: Gia hạn license
 * - TRIAL_TO_PAID: Chuyển trial sang trả phí
 * - CHANGE_VARIANT: Đổi gói
 */
export type CreateOrderAction = Extract<
  ORDER_ACTION,
  | ORDER_ACTION.NEW_ORDER
  | ORDER_ACTION.TRIAL
  | ORDER_ACTION.LICENSE_RENEWING
  | ORDER_ACTION.TRIAL_TO_PAID
  | ORDER_ACTION.CHANGE_VARIANT
>;

/**
 * Array các actions cho phép khi tạo đơn hàng
 */
export const CREATE_ORDER_ACTIONS: CreateOrderAction[] = [
  ORDER_ACTION.NEW_ORDER,
  ORDER_ACTION.TRIAL,
  ORDER_ACTION.LICENSE_RENEWING,
  ORDER_ACTION.TRIAL_TO_PAID,
  ORDER_ACTION.CHANGE_VARIANT,
];

/**
 * Check if action is valid for creating order
 */
export const IS_CREATE_ORDER_ACTION = (
  action: ORDER_ACTION,
): action is CreateOrderAction =>
  CREATE_ORDER_ACTIONS.includes(action as CreateOrderAction);

/**
 * Actions cho phép khi XÁC NHẬN đơn hàng
 * - ACCOUNTING_CONFIRMED: Kế toán xác nhận thanh toán
 * - COMPLETE: Hoàn thành đơn hàng
 * - CANCEL: Hủy đơn hàng
 * - BLOCK: Khóa đơn hàng
 */
export type ConfirmOrderAction = Extract<
  ORDER_ACTION,
  | ORDER_ACTION.ACCOUNTING_CONFIRMED
  | ORDER_ACTION.COMPLETE
  | ORDER_ACTION.CANCEL
  | ORDER_ACTION.BLOCK
>;

/**
 * Array các actions cho phép khi confirm đơn hàng
 */
export const CONFIRM_ORDER_ACTIONS: ConfirmOrderAction[] = [
  ORDER_ACTION.ACCOUNTING_CONFIRMED,
  ORDER_ACTION.COMPLETE,
  ORDER_ACTION.CANCEL,
  ORDER_ACTION.BLOCK,
];

/**
 * Check if action is valid for confirming order
 */
export const IS_CONFIRM_ORDER_ACTION = (
  action: ORDER_ACTION,
): action is ConfirmOrderAction =>
  CONFIRM_ORDER_ACTIONS.includes(action as ConfirmOrderAction);

/**
 * Actions cho phép khi HOÀN TIỀN đơn hàng
 */
export type RefundOrderAction = Extract<
  ORDER_ACTION,
  ORDER_ACTION.REFUND | ORDER_ACTION.REFUND_PARTIAL
>;

/**
 * Array các actions cho phép khi refund đơn hàng
 */
export const REFUND_ORDER_ACTIONS: RefundOrderAction[] = [
  ORDER_ACTION.REFUND,
  ORDER_ACTION.REFUND_PARTIAL,
];

/**
 * Check if action is valid for refunding order
 */
export const IS_REFUND_ORDER_ACTION = (
  action: ORDER_ACTION,
): action is RefundOrderAction =>
  REFUND_ORDER_ACTIONS.includes(action as RefundOrderAction);

// ============================================
// SINVOICE STATUS
// ============================================

export enum SINVOICE_STATUS {
  PENDING = 'PENDING',
  SEND = 'SEND',
  FAILED = 'FAILED',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

// ============================================
// ORDER LICENSE STATUS
// ============================================

export enum MKT_ORDER_LICENSE_STATUS {
  /** Chờ tạo license - Đơn đang chờ xác nhận thanh toán */
  PENDING = 'PENDING',

  /** Đang tạo license - Đang gọi API MKT Server */
  CREATING = 'CREATING',

  /** Tạo thất bại - Lỗi khi gọi API */
  FAILED = 'FAILED',

  /** Lỗi hệ thống */
  ERROR = 'ERROR',

  /** Thành công - License đã tạo và active */
  SUCCESS = 'SUCCESS',

  /** Đã thu hồi - License bị revoke */
  REVOKED = 'REVOKED',

  /** Đã xóa - License bị xóa */
  DELETED = 'DELETED',

  /** Trial - License đang trong giai đoạn dùng thử */
  TRIAL = 'TRIAL',
}
