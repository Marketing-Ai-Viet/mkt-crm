/**
 * Legacy Services
 *
 * These services are from the original implementation.
 * They are kept for backward compatibility but should be
 * gradually migrated to the new architecture.
 *
 * @deprecated Use core/, domain/, and application/ services instead
 */
export * from './order.service';
export * from './order.action.service';
export * from './order.confirm.service';
export * from './order.payload.service';
export * from './order.license-renew.service';
export * from './mkt-order-overdue.service';
export * from './mkt-order-overdue-registration.service';
