export enum MKT_CONTRACT_STATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
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
      ACTIVE: 'Active',
      INACTIVE: 'Inactive',
      EXPIRED: 'Expired',
      REVOKED: 'Revoked',
    },
    VI: {
      ACTIVE: 'Hoạt động',
      INACTIVE: 'Không hoạt động',
      EXPIRED: 'Hết hạn',
      REVOKED: 'Bị thu hồi',
    },
  },
};

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
};
