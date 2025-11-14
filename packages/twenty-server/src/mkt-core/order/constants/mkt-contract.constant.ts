export enum MKT_CONTRACT_STATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
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
