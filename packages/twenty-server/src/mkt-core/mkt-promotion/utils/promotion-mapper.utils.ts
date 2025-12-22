import { createHash } from 'node:crypto';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';

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
  appliedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
});

/**
 * Calculate checksum for promotion snapshot
 */
export const calculatePromotionChecksum = (
  snapshot: Record<string, unknown>,
): string => {
  const data = safeJsonStringify(snapshot) ?? '';

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
