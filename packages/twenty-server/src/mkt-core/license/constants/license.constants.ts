export enum MKT_LICENSE_STATUS {
  ACTIVE = 'ACTIVE', // Đang hoạt động, hợp lệ
  EXPIRED = 'EXPIRED', // Đã hết hạn
  REVOKED = 'REVOKED', // Bị thu hồi thủ công
  ERROR = 'ERROR', // Có lỗi, trạng thái không hợp lệ
  RENEWING = 'RENEWING', // Đang gia hạn
  CHANGE_VARIANT = 'CHANGE_VARIANT', // Thay đổi sản phẩm license
  REFUND = 'REFUND', // Hoàn tiền
  TRIAL = 'TRIAL', // Dùng thử
  TRIAL_RENEW = 'TRIAL_RENEW', // Gia hạn dùng thử chờ xử lý
}

export const MKT_LICENSE_STATUS_OPTIONS = {
  status: MKT_LICENSE_STATUS,
  options: [
    {
      value: MKT_LICENSE_STATUS.ACTIVE,
      label: 'Hoạt động',
      color: 'green',
      position: 0,
    },
    {
      value: MKT_LICENSE_STATUS.EXPIRED,
      label: 'Hết hạn',
      color: 'red',
      position: 1,
    },
    {
      value: MKT_LICENSE_STATUS.REVOKED,
      label: 'Bị thu hồi',
      color: 'gray',
      position: 2,
    },
    {
      value: MKT_LICENSE_STATUS.ERROR,
      label: 'Có lỗi',
      color: 'orange',
      position: 3,
    },
    {
      value: MKT_LICENSE_STATUS.RENEWING,
      label: 'Đang gia hạn',
      color: 'blue',
      position: 4,
    },
    {
      value: MKT_LICENSE_STATUS.CHANGE_VARIANT,
      label: 'Thay đổi sản phẩm',
      color: 'purple',
      position: 5,
    },
    {
      value: MKT_LICENSE_STATUS.REFUND,
      label: 'Hoàn tiền',
      color: 'black',
      position: 6,
    },
    {
      value: MKT_LICENSE_STATUS.TRIAL,
      label: 'Dùng thử',
      color: 'yellow',
      position: 7,
    },
    {
      value: MKT_LICENSE_STATUS.TRIAL_RENEW,
      label: 'Gia hạn dùng thử',
      color: 'cyan',
      position: 8,
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
      TRIAL_RENEW: 'Trial Renew',
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
      TRIAL_RENEW: 'Gia hạn dùng thử',
    },
  },
};

// Event constants
export const MKT_LICENSE_RENEWING_EVENT = 'MKT_LICENSE_RENEWING_EVENT';
