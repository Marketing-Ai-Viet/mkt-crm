/**
 * /!\ DO NOT EDIT THE IDS OF THIS FILE /!\
 * Relation IDs for promotion entities
 */

export const MKT_PROMOTION_RELATION_IDS = {
  // Promotion relations
  mktPromotionToRules: '660e8400-e29b-41d4-a716-446655440201',
  mktPromotionToCoupons: '660e8400-e29b-41d4-a716-446655440202',
  mktPromotionToUsages: '660e8400-e29b-41d4-a716-446655440203',
  mktPromotionToAudits: '660e8400-e29b-41d4-a716-446655440204',
  mktPromotionToCreatedBy: '660e8400-e29b-41d4-a716-446655440205',

  // Rule relations
  mktRuleToPromotion: '660e8400-e29b-41d4-a716-446655440301',

  // Coupon relations
  mktCouponToPromotion: '660e8400-e29b-41d4-a716-446655440401',
  mktCouponToAssignedCustomer: '660e8400-e29b-41d4-a716-446655440402',
  mktCouponToUsages: '660e8400-e29b-41d4-a716-446655440403',

  // Usage relations
  mktUsageToPromotion: '660e8400-e29b-41d4-a716-446655440501',
  mktUsageToCoupon: '660e8400-e29b-41d4-a716-446655440502',
  mktUsageToOrder: '660e8400-e29b-41d4-a716-446655440503',
  mktUsageToCustomer: '660e8400-e29b-41d4-a716-446655440504',

  // Audit relations
  mktAuditToPromotion: '660e8400-e29b-41d4-a716-446655440601',
} as const;
