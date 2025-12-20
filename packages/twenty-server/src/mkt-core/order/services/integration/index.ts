/**
 * Order Integration Services
 *
 * These services bridge the Order module with other MKT modules:
 * - Product Integration: Validate products, create snapshots
 * - License Integration: Create and manage licenses
 * - Promotion Integration: Calculate discounts, record usage
 */

export * from './order-product.integration';
export * from './order-license.integration';
export * from './order-promotion.integration';
