/**
 * Contract Status Constants
 *
 * Định nghĩa các trạng thái của hợp đồng
 */

export enum MKT_CONTRACT_STATUS {
  /** Chờ chuyển đổi - Contract được tạo để tham chiếu, đợi chuyển đổi thành hợp đồng chính thức */
  PENDING_CONVERSION = 'PENDING_CONVERSION',
  /** Hoạt động - Contract đang có hiệu lực */
  ACTIVE = 'ACTIVE',
  /** Không hoạt động - Contract tạm ngừng */
  INACTIVE = 'INACTIVE',
  /** Hết hạn - Contract đã hết thời hạn */
  EXPIRED = 'EXPIRED',
  /** Bị thu hồi - Contract bị hủy bỏ */
  REVOKED = 'REVOKED',
}

export enum MKT_CONTRACT_TYPE {
  ORIGIN = 'ORIGIN', // Hợp đồng gốc
  RENEW = 'RENEW', // Hợp đồng gia hạn
  UPGRADE = 'UPGRADE', // Hợp đồng nâng cấp
}

export const MKT_CONTRACT_STATUS_OPTIONS = {
  status: MKT_CONTRACT_STATUS,
  options: [
    {
      value: MKT_CONTRACT_STATUS.PENDING_CONVERSION,
      color: 'yellow',
      label: 'Chờ chuyển đổi',
      position: 0,
    },
    {
      value: MKT_CONTRACT_STATUS.ACTIVE,
      color: 'green',
      label: 'Hoạt động',
      position: 1,
    },
    {
      value: MKT_CONTRACT_STATUS.INACTIVE,
      color: 'gray',
      label: 'Không hoạt động',
      position: 2,
    },
    {
      value: MKT_CONTRACT_STATUS.EXPIRED,
      color: 'red',
      label: 'Hết hạn',
      position: 3,
    },
    {
      value: MKT_CONTRACT_STATUS.REVOKED,
      color: 'orange',
      label: 'Bị thu hồi',
      position: 4,
    },
  ],
  labels: {
    EN: {
      PENDING_CONVERSION: 'Pending Conversion',
      ACTIVE: 'Active',
      INACTIVE: 'Inactive',
      EXPIRED: 'Expired',
      REVOKED: 'Revoked',
    },
    VI: {
      PENDING_CONVERSION: 'Chờ chuyển đổi',
      ACTIVE: 'Hoạt động',
      INACTIVE: 'Không hoạt động',
      EXPIRED: 'Hết hạn',
      REVOKED: 'Bị thu hồi',
    },
  },
} as const;

export const MKT_CONTRACT_TYPE_OPTIONS = {
  contractType: MKT_CONTRACT_TYPE,
  options: [
    {
      value: MKT_CONTRACT_TYPE.ORIGIN,
      color: 'blue',
      label: 'Hợp đồng gốc',
      position: 1,
    },
    {
      value: MKT_CONTRACT_TYPE.RENEW,
      color: 'green',
      label: 'Hợp đồng gia hạn',
      position: 2,
    },
    {
      value: MKT_CONTRACT_TYPE.UPGRADE,
      color: 'purple',
      label: 'Hợp đồng nâng cấp',
      position: 3,
    },
  ],
  labels: {
    EN: {
      ORIGIN: 'Original Contract',
      RENEW: 'Renewal Contract',
      UPGRADE: 'Upgrade Contract',
    },
    VI: {
      ORIGIN: 'Hợp đồng gốc',
      RENEW: 'Hợp đồng gia hạn',
      UPGRADE: 'Hợp đồng nâng cấp',
    },
  },
} as const;

// Contract number prefix
export const CONTRACT_NUMBER_PREFIX = 'CT';

// Default contract duration in years
export const DEFAULT_CONTRACT_DURATION_YEARS = 1;

// Số chữ số cho số thứ tự hợp đồng
export const CONTRACT_SEQUENCE_DIGITS = 3;

// Số chữ số cho timestamp fallback
export const TIMESTAMP_DIGITS = 6;

/**
 * Mapping từ ORDER_ACTION sang MKT_CONTRACT_TYPE
 *
 * Dùng để xác định loại hợp đồng khi tạo từ đơn hàng:
 * - NEW_ORDER, TRIAL_TO_PAID → ORIGIN (hợp đồng gốc)
 * - LICENSE_RENEWING → RENEW (hợp đồng gia hạn)
 * - CHANGE_VARIANT → UPGRADE (hợp đồng nâng cấp)
 */
export const ORDER_ACTION_TO_CONTRACT_TYPE: Record<string, MKT_CONTRACT_TYPE> =
  {
    NEW_ORDER: MKT_CONTRACT_TYPE.ORIGIN,
    TRIAL_TO_PAID: MKT_CONTRACT_TYPE.ORIGIN,
    LICENSE_RENEWING: MKT_CONTRACT_TYPE.RENEW,
    CHANGE_VARIANT: MKT_CONTRACT_TYPE.UPGRADE,
  } as const;

/** Default contract type khi không xác định được từ order action */
export const DEFAULT_CONTRACT_TYPE = MKT_CONTRACT_TYPE.ORIGIN;
