/**
 * Domain Services
 *
 * Domain-specific operations:
 * - CRUD operations for orders
 * - Order item management
 * - License query operations
 * - Query helpers (where clause building, mapping)
 * - Payment confirmation (sale/accounting)
 *
 * Note: Trial license creation moved to MktLicenseResolver.mktCreateTrialLicense
 */
export * from './order-crud.service';
export * from './order-item.service';
export * from './order-license-query.service';
export * from './order-query.service';
export * from './payment-confirmation.service';
