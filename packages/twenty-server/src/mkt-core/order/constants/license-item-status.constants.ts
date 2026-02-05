/**
 * License Item Status Constants
 *
 * Status tracking cho từng order item trong async license creation flow.
 * Mỗi order item có thể có nhiều licenses (multi-device).
 * Status này track trạng thái tổng thể của item, không phải từng license.
 *
 * Flow:
 * NOT_APPLICABLE → (skip non-licensable items)
 * PENDING → PROCESSING → CREATED/UPGRADED → ACTIVATED
 *                    ↓
 *                 FAILED
 */

import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

// ============================================
// LICENSE ITEM STATUS ENUM
// ============================================

export const LICENSE_ITEM_STATUS = {
  /** Item không cần license (non-digital, internal product) */
  NOT_APPLICABLE: 'NOT_APPLICABLE',

  /** Job đã enqueue, đang chờ worker xử lý */
  PENDING: 'PENDING',

  /** Job đang được worker xử lý (calling MKT Server API) */
  PROCESSING: 'PROCESSING',

  /** License đã được tạo thành công (trial hoặc official) */
  CREATED: 'CREATED',

  /** License đã được upgrade từ trial sang official */
  UPGRADED: 'UPGRADED',

  /** License đã được activate (order completed) */
  ACTIVATED: 'ACTIVATED',

  /** License đã bị revoke (order refunded) */
  REVOKED: 'REVOKED',

  /** Job failed sau max retries, cần manual intervention */
  FAILED: 'FAILED',
} as const;

export type LicenseItemStatus =
  (typeof LICENSE_ITEM_STATUS)[keyof typeof LICENSE_ITEM_STATUS];

// ============================================
// STATUS OPTIONS FOR UI
// ============================================

export const LICENSE_ITEM_STATUS_OPTIONS = {
  status: LICENSE_ITEM_STATUS,
  options: [
    {
      value: LICENSE_ITEM_STATUS.NOT_APPLICABLE,
      label: 'Không áp dụng',
      color: 'gray' as TagColor,
      position: 0,
    },
    {
      value: LICENSE_ITEM_STATUS.PENDING,
      label: 'Chờ xử lý',
      color: 'orange' as TagColor,
      position: 1,
    },
    {
      value: LICENSE_ITEM_STATUS.PROCESSING,
      label: 'Đang xử lý',
      color: 'blue' as TagColor,
      position: 2,
    },
    {
      value: LICENSE_ITEM_STATUS.CREATED,
      label: 'Đã tạo',
      color: 'green' as TagColor,
      position: 3,
    },
    {
      value: LICENSE_ITEM_STATUS.UPGRADED,
      label: 'Đã nâng cấp',
      color: 'green' as TagColor,
      position: 4,
    },
    {
      value: LICENSE_ITEM_STATUS.ACTIVATED,
      label: 'Đã kích hoạt',
      color: 'green' as TagColor,
      position: 5,
    },
    {
      value: LICENSE_ITEM_STATUS.REVOKED,
      label: 'Đã thu hồi',
      color: 'red' as TagColor,
      position: 6,
    },
    {
      value: LICENSE_ITEM_STATUS.FAILED,
      label: 'Thất bại',
      color: 'red' as TagColor,
      position: 7,
    },
  ],
  labels: {
    EN: {
      NOT_APPLICABLE: 'Not Applicable',
      PENDING: 'Pending',
      PROCESSING: 'Processing',
      CREATED: 'Created',
      UPGRADED: 'Upgraded',
      ACTIVATED: 'Activated',
      REVOKED: 'Revoked',
      FAILED: 'Failed',
    },
    VI: {
      NOT_APPLICABLE: 'Không áp dụng',
      PENDING: 'Chờ xử lý',
      PROCESSING: 'Đang xử lý',
      CREATED: 'Đã tạo',
      UPGRADED: 'Đã nâng cấp',
      ACTIVATED: 'Đã kích hoạt',
      REVOKED: 'Đã thu hồi',
      FAILED: 'Thất bại',
    },
  },
};

// ============================================
// STATUS TRANSITIONS
// ============================================

/**
 * Valid status transitions for license items.
 * Used for validation and state machine logic.
 */
export const LICENSE_ITEM_STATUS_TRANSITIONS: Record<
  LicenseItemStatus,
  LicenseItemStatus[]
> = {
  [LICENSE_ITEM_STATUS.NOT_APPLICABLE]: [LICENSE_ITEM_STATUS.PENDING], // Enable when item becomes licensable
  [LICENSE_ITEM_STATUS.PENDING]: [
    LICENSE_ITEM_STATUS.PROCESSING,
    LICENSE_ITEM_STATUS.FAILED, // Job expired/cancelled
  ],
  [LICENSE_ITEM_STATUS.PROCESSING]: [
    LICENSE_ITEM_STATUS.CREATED,
    LICENSE_ITEM_STATUS.FAILED,
  ],
  [LICENSE_ITEM_STATUS.CREATED]: [
    LICENSE_ITEM_STATUS.UPGRADED,
    LICENSE_ITEM_STATUS.ACTIVATED,
    LICENSE_ITEM_STATUS.REVOKED,
    LICENSE_ITEM_STATUS.FAILED, // Activation failed
  ],
  [LICENSE_ITEM_STATUS.UPGRADED]: [
    LICENSE_ITEM_STATUS.ACTIVATED,
    LICENSE_ITEM_STATUS.REVOKED,
    LICENSE_ITEM_STATUS.FAILED,
  ],
  [LICENSE_ITEM_STATUS.ACTIVATED]: [
    LICENSE_ITEM_STATUS.REVOKED, // Refund
  ],
  [LICENSE_ITEM_STATUS.REVOKED]: [], // Terminal state
  [LICENSE_ITEM_STATUS.FAILED]: [
    LICENSE_ITEM_STATUS.PENDING, // Manual retry
  ],
};

// ============================================
// STATUS GROUPS
// ============================================

/** Statuses indicating job is in progress */
export const LICENSE_ITEM_PENDING_STATUSES: LicenseItemStatus[] = [
  LICENSE_ITEM_STATUS.PENDING,
  LICENSE_ITEM_STATUS.PROCESSING,
];

/** Statuses indicating license exists */
export const LICENSE_ITEM_SUCCESS_STATUSES: LicenseItemStatus[] = [
  LICENSE_ITEM_STATUS.CREATED,
  LICENSE_ITEM_STATUS.UPGRADED,
  LICENSE_ITEM_STATUS.ACTIVATED,
];

/** Terminal statuses (no further transitions expected) */
export const LICENSE_ITEM_TERMINAL_STATUSES: LicenseItemStatus[] = [
  LICENSE_ITEM_STATUS.ACTIVATED,
  LICENSE_ITEM_STATUS.REVOKED,
  LICENSE_ITEM_STATUS.FAILED,
];

/** Statuses that need attention */
export const LICENSE_ITEM_ALERT_STATUSES: LicenseItemStatus[] = [
  LICENSE_ITEM_STATUS.FAILED,
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Helper functions for license item status operations.
 * Grouped in object to comply with UPPER_CASE naming convention.
 */
export const LICENSE_ITEM_STATUS_HELPERS = {
  /** Check if a status transition is valid */
  isValidTransition: (
    from: LicenseItemStatus,
    to: LicenseItemStatus,
  ): boolean => LICENSE_ITEM_STATUS_TRANSITIONS[from]?.includes(to) ?? false,

  /** Check if item needs license processing */
  needsProcessing: (status: LicenseItemStatus): boolean =>
    LICENSE_ITEM_PENDING_STATUSES.includes(status),

  /** Check if item has active license */
  hasActiveLicense: (status: LicenseItemStatus): boolean =>
    LICENSE_ITEM_SUCCESS_STATUSES.includes(status),

  /** Check if item is in terminal state */
  isTerminal: (status: LicenseItemStatus): boolean =>
    LICENSE_ITEM_TERMINAL_STATUSES.includes(status),

  /** Check if item needs attention (alert) */
  needsAttention: (status: LicenseItemStatus): boolean =>
    LICENSE_ITEM_ALERT_STATUSES.includes(status),

  /** Get default status for new order items based on item type */
  getDefault: (isLicensable: boolean): LicenseItemStatus =>
    isLicensable
      ? LICENSE_ITEM_STATUS.PENDING
      : LICENSE_ITEM_STATUS.NOT_APPLICABLE,
};
