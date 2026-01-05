/**
 * Domain Services
 *
 * Domain-specific operations:
 * - CRUD operations for orders
 * - Order item management
 * - License query operations
 *
 * Note: Trial license creation moved to MktLicenseResolver.mktCreateTrialLicense
 */
export * from './order-crud.service';
export * from './order-item.service';
export * from './order-license-query.service';
