import { ORDER_STATUS } from 'src/mkt-core/order/constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

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

// Template keys mapping
export const ORDER_STATUS_TEMPLATE_MAP: Partial<
  Record<ORDER_STATUS, string | ((order: MktOrderWorkspaceEntity) => boolean)>
> = {
  [ORDER_STATUS.PENDING_PAYMENT]: 'new_order_notification',
  [ORDER_STATUS.TRIAL]: 'order_trial_notification',
} as const;

// Default values
export const DEFAULT_LOCALE = 'VI';
export const DEFAULT_COMPANY_NAME = 'Phần Mềm MKT';
export const DEFAULT_CUSTOMER_NAME = 'Quý khách';
export const DEFAULT_TRIAL_PERIOD_DAYS = 7;
