import { CustomEventName } from 'src/engine/workspace-event-emitter/types/custom-event-name.type';

/**
 * Alias for CustomEventName to avoid confusion with Vite's CustomEventName
 * Use this type in mkt-core module
 */
export type MktCustomEventName = CustomEventName;

/**
 * Event types for mkt-core module
 * Use const object instead of enum for computed/template literal string types
 */
export const MKT_EVENT_TYPE = {
  MKT_PAYMENT: 'MKT_PAYMENT' as MktCustomEventName,
  MKT_ORDER: 'MKT_ORDER' as MktCustomEventName,
};

/**
 * Order event types for order lifecycle events
 */
export enum MKT_ORDER_EVENT_TYPES {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_REFUNDED = 'ORDER_REFUNDED',
  ORDER_OVERDUE = 'ORDER_OVERDUE',
  ACCOUNTING_CONFIRMED = 'ACCOUNTING_CONFIRMED',
  FROM_LICENSE = 'FROM_LICENSE',
}
