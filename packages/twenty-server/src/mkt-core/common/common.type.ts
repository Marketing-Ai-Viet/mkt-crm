import { CustomEventName } from 'src/engine/workspace-event-emitter/types/custom-event-name.type';

export interface FIREBASE_AUTH_RESPONSE {
  idToken: string;
  refreshToken: string;
  localId: string;
}

export type CALL_FIREBASE_DATA = {
  orderCode: string | null;
  QRCodeUrl: string | null;
};

//LicenseApiResponse
export interface LICENSE_API_RESPONSE {
  licenseKey: string;
  status: string;
  expiresAt: string;
  licenseUuid?: string | null | undefined;
  // add other fields according to API response
}

// Use a const object instead of enum for computed/template literal string types
export const MKT_EVENT_TYPE = {
  MKT_PAYMENT: 'MKT_PAYMENT' as CustomEventName,
  MKT_ORDER: 'MKT_ORDER' as CustomEventName,
};

export enum MKT_ORDER_EVENT_TYPES {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_REFUNDED = 'ORDER_REFUNDED',
  //accountingConfirmed
  ACCOUNTING_CONFIRMED = 'ACCOUNTING_CONFIRMED',
  FROM_LICENSE = 'FROM_LICENSE',
}

export enum PAYMENT_HISTORY_TYPE {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  CHANGE_VARIANT = 'CHANGE_VARIANT',
  RENEW = 'RENEW',
}

export enum MKT_PAYMENT_STATUS {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum MKT_PAYMENT_METHOD_TYPE {
  CREDIT_CARD = 'CREDIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  QR_CODE = 'QR_CODE',
}
