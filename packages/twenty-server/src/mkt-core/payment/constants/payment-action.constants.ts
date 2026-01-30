import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Payment Action - Các hành động trên payment để lưu vào history
 */
export const PAYMENT_ACTION = {
  CREATED: 'CREATED',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  UPDATED: 'UPDATED',
  CANCELLED: 'CANCELLED',
} as const;

export type PaymentAction =
  (typeof PAYMENT_ACTION)[keyof typeof PAYMENT_ACTION];

export const PAYMENT_ACTION_OPTIONS = [
  {
    value: PAYMENT_ACTION.CREATED,
    label: 'Created',
    position: 0,
    color: 'blue' as TagColor,
  },
  {
    value: PAYMENT_ACTION.CONFIRMED,
    label: 'Confirmed',
    position: 1,
    color: 'green' as TagColor,
  },
  {
    value: PAYMENT_ACTION.REJECTED,
    label: 'Rejected',
    position: 2,
    color: 'red' as TagColor,
  },
  {
    value: PAYMENT_ACTION.REFUNDED,
    label: 'Refunded',
    position: 3,
    color: 'purple' as TagColor,
  },
  {
    value: PAYMENT_ACTION.PARTIALLY_REFUNDED,
    label: 'Partially Refunded',
    position: 4,
    color: 'orange' as TagColor,
  },
  {
    value: PAYMENT_ACTION.UPDATED,
    label: 'Updated',
    position: 5,
    color: 'gray' as TagColor,
  },
  {
    value: PAYMENT_ACTION.CANCELLED,
    label: 'Cancelled',
    position: 6,
    color: 'gray' as TagColor,
  },
];
