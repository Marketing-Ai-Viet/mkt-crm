import { Request } from 'express';

import { User } from 'src/engine/core-modules/user/user.entity';
import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

export type callFireBaseType = {
  orderCode: string | null;
  QRCodeUrl: string | null;
};

export enum MKT_PAYMENT_METHOD_TYPE {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PAYPAL = 'PAYPAL',
  STRIPE = 'STRIPE',
  CASH = 'CASH',
  CHECK = 'CHECK',
  CRYPTOCURRENCY = 'CRYPTOCURRENCY',
  QR_CODE = 'QR_CODE',
  OTHER = 'OTHER',
}

export type CALL_FIREBASE_DATA = {
  orderCode: string | null;
  QRCodeUrl: string | null;
};

/**
 * Auth context từ JWT token cho SePay webhook
 */
export type RequestSepayJWT = {
  user: User;
  workspaceId: string;
  workspaceMemberId: string;
  userWorkspaceId: string;
};

/**
 * Extended Express Request với auth context từ JWT
 * Dùng cho controller khi cần truy cập cả request info (headers, ip) và auth context
 */
export type SepayWebhookRequest = Request & RequestSepayJWT;

export enum PAYMENT_HISTORY_TYPE {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  CHANGE_VARIANT = 'CHANGE_VARIANT',
  RENEW = 'RENEW',
}

export const PAYMENT_HISTORY_OPTIONS = [
  {
    value: PAYMENT_HISTORY_TYPE.PAYMENT,
    label: 'Thanh toán',
    color: 'green' as TagColor,
    position: 0,
  },
  {
    value: PAYMENT_HISTORY_TYPE.REFUND,
    label: 'Hoàn tiền',
    color: 'red' as TagColor,
    position: 1,
  },
  {
    value: PAYMENT_HISTORY_TYPE.CHANGE_VARIANT,
    label: 'Thay đổi gói',
    color: 'blue' as TagColor,
    position: 2,
  },
  {
    value: PAYMENT_HISTORY_TYPE.RENEW,
    label: 'Gia hạn',
    color: 'purple' as TagColor,
    position: 3,
  },
];
