export enum MKT_EMAIL_STATUS {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export const MKT_EMAIL_STATUS_OPTIONS = {
  status: MKT_EMAIL_STATUS,
  options: [
    {
      value: MKT_EMAIL_STATUS.DRAFT,
      label: 'Nháp',
      position: 0,
      color: 'gray',
    },
    {
      value: MKT_EMAIL_STATUS.SENT,
      label: 'Đã gửi',
      position: 1,
      color: 'green',
    },
    {
      value: MKT_EMAIL_STATUS.FAILED,
      label: 'Thất bại',
      position: 2,
      color: 'red',
    },
  ],
  labels: {
    EN: {
      DRAFT: 'Draft',
      SENT: 'Sent',
      FAILED: 'Failed',
    },
    VI: {
      DRAFT: 'Nháp',
      SENT: 'Đã gửi',
      FAILED: 'Thất bại',
    },
  },
};
