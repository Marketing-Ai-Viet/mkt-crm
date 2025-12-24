import {
  MKT_ORDER_EVENT_TYPES,
  PAYMENT_HISTORY_TYPE,
} from 'src/mkt-core/common/common.type';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';

// ============================================
// ORDER ITEM DEFAULTS
// ============================================

export const ORDER_ITEM_DEFAULTS = {
  TAX_PERCENTAGE: 0,
  UNIT_NAME: 'pcs',
  QUANTITY: 1,
} as const;

// ============================================
// ORDER CALCULATION CONFIG
// ============================================

export const ORDER_CALCULATION_CONFIG = {
  /**
   * Tax percentage mặc định (%)
   */
  DEFAULT_TAX_PERCENTAGE: 0,

  /**
   * Số chữ số thập phân khi làm tròn
   */
  DECIMAL_PLACES: 2,

  /**
   * Default currency
   */
  DEFAULT_CURRENCY: 'VND',
} as const;

// ============================================
// STATUS ACTION MAPPING
// ============================================

/**
 * Mapping from ORDER_STATUS to default ORDER_ACTION
 * Used to determine which action to apply for a given status
 */
export const STATUS_ACTION_MAP: Record<ORDER_STATUS, ORDER_ACTION> = {
  [ORDER_STATUS.DRAFT]: ORDER_ACTION.NEW_ORDER,
  [ORDER_STATUS.PENDING_PAYMENT]: ORDER_ACTION.NEW_ORDER,
  [ORDER_STATUS.TRIAL]: ORDER_ACTION.TRIAL,
  [ORDER_STATUS.TRIAL_EXPIRED]: ORDER_ACTION.TRIAL,
  [ORDER_STATUS.CONFIRMED]: ORDER_ACTION.ACCOUNTING_CONFIRMED,
  [ORDER_STATUS.COMPLETED]: ORDER_ACTION.COMPLETE,
  [ORDER_STATUS.CANCELED]: ORDER_ACTION.CANCEL,
  [ORDER_STATUS.BLOCKED]: ORDER_ACTION.BLOCK,
  [ORDER_STATUS.OVERDUE]: ORDER_ACTION.CANCEL,
  [ORDER_STATUS.REFUND]: ORDER_ACTION.REFUND,
  [ORDER_STATUS.REFUND_PARTIAL]: ORDER_ACTION.REFUND_PARTIAL,
};

/**
 * Valid status transitions matrix
 * Key: current status, Value: array of allowed target statuses
 *
 * Flow chính:
 * - NEW_ORDER: DRAFT → PENDING_PAYMENT → CONFIRMED → COMPLETED
 * - TRIAL: TRIAL → (TRIAL_EXPIRED | PENDING_PAYMENT)
 */
export const VALID_STATUS_TRANSITIONS: Record<ORDER_STATUS, ORDER_STATUS[]> = {
  [ORDER_STATUS.DRAFT]: [
    ORDER_STATUS.PENDING_PAYMENT,
    ORDER_STATUS.TRIAL,
    ORDER_STATUS.CANCELED,
  ],
  [ORDER_STATUS.PENDING_PAYMENT]: [
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.CANCELED,
    ORDER_STATUS.OVERDUE,
  ],
  [ORDER_STATUS.TRIAL]: [
    ORDER_STATUS.PENDING_PAYMENT,
    ORDER_STATUS.TRIAL_EXPIRED,
    ORDER_STATUS.CANCELED,
  ],
  [ORDER_STATUS.TRIAL_EXPIRED]: [
    ORDER_STATUS.PENDING_PAYMENT,
    ORDER_STATUS.CANCELED,
  ],
  [ORDER_STATUS.CONFIRMED]: [
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.REFUND,
    ORDER_STATUS.REFUND_PARTIAL,
    ORDER_STATUS.BLOCKED,
  ],
  [ORDER_STATUS.COMPLETED]: [ORDER_STATUS.REFUND, ORDER_STATUS.REFUND_PARTIAL],
  [ORDER_STATUS.OVERDUE]: [
    ORDER_STATUS.PENDING_PAYMENT,
    ORDER_STATUS.CANCELED,
    ORDER_STATUS.BLOCKED,
  ],
  [ORDER_STATUS.BLOCKED]: [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.CANCELED]: [],
  [ORDER_STATUS.REFUND]: [],
  [ORDER_STATUS.REFUND_PARTIAL]: [ORDER_STATUS.REFUND],
};

/**
 * Valid actions for creating new orders
 */
export const VALID_CREATE_ACTIONS: ORDER_ACTION[] = [
  ORDER_ACTION.NEW_ORDER,
  ORDER_ACTION.TRIAL,
  ORDER_ACTION.TRIAL_TO_PAID,
  ORDER_ACTION.LICENSE_RENEWING,
  ORDER_ACTION.CHANGE_VARIANT,
];

/**
 * Initial statuses allowed when creating an order
 */
export const INITIAL_ORDER_STATUSES: ORDER_STATUS[] = [
  ORDER_STATUS.DRAFT,
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.TRIAL,
];

/**
 * Terminal statuses - no further transitions allowed
 */
export const TERMINAL_ORDER_STATUSES: ORDER_STATUS[] = [
  ORDER_STATUS.CANCELED,
  ORDER_STATUS.REFUND,
];

/**
 * Statuses that allow order modification
 */
export const MODIFIABLE_ORDER_STATUSES: ORDER_STATUS[] = [ORDER_STATUS.DRAFT];

// ============================================
// EVENT MAPPINGS
// ============================================

/**
 * Mapping from ORDER_ACTION to MKT_ORDER_EVENT_TYPES
 */
export const ACTION_TO_ORDER_EVENT_TYPE: Partial<
  Record<ORDER_ACTION, MKT_ORDER_EVENT_TYPES>
> = {
  [ORDER_ACTION.REFUND]: MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED,
  [ORDER_ACTION.REFUND_PARTIAL]: MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED,
  [ORDER_ACTION.LICENSE_RENEWING]: MKT_ORDER_EVENT_TYPES.FROM_LICENSE,
};

/**
 * Mapping from ORDER_ACTION to PAYMENT_HISTORY_TYPE
 */
export const ACTION_TO_PAYMENT_TYPE: Partial<
  Record<ORDER_ACTION, PAYMENT_HISTORY_TYPE>
> = {
  [ORDER_ACTION.REFUND]: PAYMENT_HISTORY_TYPE.REFUND,
  [ORDER_ACTION.REFUND_PARTIAL]: PAYMENT_HISTORY_TYPE.REFUND,
  [ORDER_ACTION.CHANGE_VARIANT]: PAYMENT_HISTORY_TYPE.CHANGE_VARIANT,
  [ORDER_ACTION.LICENSE_RENEWING]: PAYMENT_HISTORY_TYPE.RENEW,
};

// ============================================
// VALID ACTION TRANSITIONS BY STATUS
// ============================================

/**
 * Valid actions for each status (for confirm/update operations)
 */
export const VALID_ACTIONS_BY_STATUS: Record<ORDER_STATUS, ORDER_ACTION[]> = {
  [ORDER_STATUS.DRAFT]: [ORDER_ACTION.NEW_ORDER, ORDER_ACTION.TRIAL],
  [ORDER_STATUS.PENDING_PAYMENT]: [
    ORDER_ACTION.ACCOUNTING_CONFIRMED,
    ORDER_ACTION.CANCEL,
  ],
  [ORDER_STATUS.TRIAL]: [ORDER_ACTION.TRIAL_TO_PAID, ORDER_ACTION.CANCEL],
  [ORDER_STATUS.TRIAL_EXPIRED]: [
    ORDER_ACTION.TRIAL_TO_PAID,
    ORDER_ACTION.CANCEL,
  ],
  [ORDER_STATUS.CONFIRMED]: [
    ORDER_ACTION.COMPLETE,
    ORDER_ACTION.REFUND,
    ORDER_ACTION.REFUND_PARTIAL,
    ORDER_ACTION.BLOCK,
  ],
  [ORDER_STATUS.OVERDUE]: [
    ORDER_ACTION.ACCOUNTING_CONFIRMED,
    ORDER_ACTION.CANCEL,
  ],
  [ORDER_STATUS.COMPLETED]: [ORDER_ACTION.REFUND, ORDER_ACTION.REFUND_PARTIAL],
  [ORDER_STATUS.CANCELED]: [],
  [ORDER_STATUS.REFUND]: [],
  [ORDER_STATUS.BLOCKED]: [],
  [ORDER_STATUS.REFUND_PARTIAL]: [ORDER_ACTION.REFUND],
};

// ============================================
// TRIAL-RELATED ACTIONS
// ============================================

export const TRIAL_ACTIONS: ORDER_ACTION[] = [
  ORDER_ACTION.TRIAL,
  ORDER_ACTION.TRIAL_TO_PAID,
];

// ============================================
// REFUND-RELATED ACTIONS
// ============================================

export const REFUND_ACTIONS: ORDER_ACTION[] = [
  ORDER_ACTION.REFUND,
  ORDER_ACTION.REFUND_PARTIAL,
];

// ============================================
// LICENSE PROCESSING ACTIONS
// ============================================

/**
 * Actions that trigger license creation or modification
 * - TRIAL: Create trial license immediately
 * - ACCOUNTING_CONFIRMED: Create license after payment confirmation
 * - LICENSE_RENEWING: Renew existing license
 * - CHANGE_VARIANT: Change license variant
 */
export const LICENSE_PROCESSING_ACTIONS: ORDER_ACTION[] = [
  ORDER_ACTION.TRIAL,
  ORDER_ACTION.ACCOUNTING_CONFIRMED,
  ORDER_ACTION.LICENSE_RENEWING,
  ORDER_ACTION.CHANGE_VARIANT,
  ORDER_ACTION.REFUND,
  ORDER_ACTION.REFUND_PARTIAL,
];

// ============================================
// PAYMENT PROCESSING ACTIONS
// ============================================

/**
 * Actions that require payment processing
 */
export const PAYMENT_PROCESSING_ACTIONS: ORDER_ACTION[] = [
  ORDER_ACTION.NEW_ORDER,
  ORDER_ACTION.TRIAL_TO_PAID,
  ORDER_ACTION.LICENSE_RENEWING,
];
