import { createHash } from 'node:crypto';

/**
 * Promotion mapper utilities
 *
 * Provides basic mapper functions for transforming promotion entities
 * to different output formats.
 */

/**
 * Map promotion entity to snapshot format for orders
 */
export const mapPromotionToSnapshot = (
  promotion: Record<string, unknown>,
  discountAmount: number,
  couponCode?: string,
): Record<string, unknown> => ({
  promotionId: promotion.id,
  promotionCode: promotion.code,
  promotionName: promotion.name,
  promotionType: promotion.promotionType,
  discountValue: promotion.discountValue,
  couponCode: couponCode ?? null,
  discountAmount,
  appliedAt: new Date().toISOString(),
});

/**
 * Calculate checksum for promotion snapshot
 */
export const calculatePromotionChecksum = (
  snapshot: Record<string, unknown>,
): string => {
  const data = JSON.stringify(snapshot);

  return createHash('sha256').update(data).digest('hex');
};

/**
 * Verify promotion snapshot checksum
 */
export const verifyPromotionChecksum = (
  snapshot: Record<string, unknown>,
  expectedChecksum: string,
): boolean => {
  const actualChecksum = calculatePromotionChecksum(snapshot);

  return actualChecksum === expectedChecksum;
};
