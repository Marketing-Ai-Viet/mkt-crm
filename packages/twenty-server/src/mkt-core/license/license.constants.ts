export enum MKT_LICENSE_STATUS {
  ACTIVE = 'ACTIVE', // Đang hoạt động, hợp lệ
  EXPIRED = 'EXPIRED', // Đã hết hạn
  REVOKED = 'REVOKED', // Bị thu hồi thủ công
  ERROR = 'ERROR', // Có lỗi, trạng thái không hợp lệ
  RENEWING = 'RENEWING', // Đang gia hạn
  CHANGE_VARIANT = 'CHANGE_VARIANT', // Thay đổi sản phẩm license
  REFUND = 'REFUND', // Hoàn tiền
  TRIAL = 'TRIAL', // Dùng thử
}

export const MKT_LICENSE_STATUS_OPTIONS = {
  status: MKT_LICENSE_STATUS,
  options: [
    {
      value: MKT_LICENSE_STATUS.ACTIVE,
      label: 'Active',
      color: 'green',
      position: 0,
    },
    {
      value: MKT_LICENSE_STATUS.EXPIRED,
      label: 'Expired',
      color: 'red',
      position: 1,
    },
    {
      value: MKT_LICENSE_STATUS.REVOKED,
      label: 'Revoked',
      color: 'gray',
      position: 2,
    },
    {
      value: MKT_LICENSE_STATUS.ERROR,
      label: 'Error',
      color: 'orange',
      position: 3,
    },
    {
      value: MKT_LICENSE_STATUS.RENEWING,
      label: 'Renewing',
      color: 'blue',
      position: 4,
    },
    {
      value: MKT_LICENSE_STATUS.CHANGE_VARIANT,
      label: 'Change Variant',
      color: 'purple',
      position: 5,
    },
    {
      value: MKT_LICENSE_STATUS.REFUND,
      label: 'Refund',
      color: 'black',
      position: 6,
    },
    {
      value: MKT_LICENSE_STATUS.TRIAL,
      label: 'Trial',
      color: 'yellow',
      position: 7,
    },
  ],
  labels: {
    EN: {
      ACTIVE: 'Active',
      EXPIRED: 'Expired',
      REVOKED: 'Revoked',
      ERROR: 'Error',
      RENEWING: 'Renewing',
      CHANGE_VARIANT: 'Change Variant',
      REFUND: 'Refund',
      TRIAL: 'Trial',
    },
    VI: {
      ACTIVE: 'Đang hoạt động',
      EXPIRED: 'Đã hết hạn',
      REVOKED: 'Bị thu hồi',
      ERROR: 'Có lỗi',
      RENEWING: 'Đang gia hạn',
      CHANGE_VARIANT: 'Thay đổi sản phẩm',
      REFUND: 'Hoàn tiền',
      TRIAL: 'Dùng thử',
    },
  },
};

// Event constants
export const MKT_LICENSE_RENEWING_EVENT = 'MKT_LICENSE_RENEWING_EVENT';
