/**
 * Type definitions for Promotion Calculation
 */

import { PromotionType } from 'src/mkt-core/mkt-promotion/constants';

// Import workspace entities (will be defined later)
// import type { MktPromotionWorkspaceEntity } from '../workspace-entities/mkt-promotion.workspace-entity';
// import type { MktCouponWorkspaceEntity } from '../workspace-entities/mkt-coupon.workspace-entity';

// Placeholder types for entities (will be replaced with actual imports when entities are created)
type MktPromotionWorkspaceEntity = Record<string, unknown>;

type MktCouponWorkspaceEntity = Record<string, unknown>;

// ============================================
// CALCULATION INPUT
// ============================================

export type CalculationInput = {
  workspaceId: string;
  promotionId: string;
  couponId?: string | null;
  orderItems: CalculationOrderItem[];
  orderSubtotal: number;
  shippingCost?: number;
  customerId: string;
  customerTags?: string[];
  isFirstOrder?: boolean;
};

export type CalculationOrderItem = {
  itemId: string;
  productId: string;
  variantId?: string | null;
  categoryId?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

// ============================================
// CALCULATION RESULT
// ============================================

export type CalculationResult = {
  applicable: boolean;
  promotion: MktPromotionWorkspaceEntity | null;
  coupon: MktCouponWorkspaceEntity | null;
  discountAmount: number;
  discountBreakdown: DiscountBreakdown;
  affectedItems: AffectedOrderItem[];
  reason?: string | null;
};

export type DiscountBreakdown = {
  subtotalDiscount: number;
  shippingDiscount: number;
  itemDiscounts: ItemDiscount[];
  totalDiscount: number;
};

export type ItemDiscount = {
  itemId: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  discountPercent: number;
};

export type AffectedOrderItem = {
  itemId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  originalUnitPrice: number;
  discountedUnitPrice: number;
  originalTotalPrice: number;
  discountedTotalPrice: number;
  discountAmount: number;
};

// ============================================
// PROMOTION CALCULATION STRATEGY
// ============================================

export type PercentageCalculation = {
  type: 'PERCENTAGE';
  discountPercent: number;
  maxDiscountAmount: number | null;
  appliedToItems: string[];
};

export type FixedAmountCalculation = {
  type: 'FIXED_AMOUNT';
  discountAmount: number;
  distributionMethod: 'EQUAL' | 'PROPORTIONAL';
  appliedToItems: string[];
};

export type BuyXGetYCalculation = {
  type: 'BUY_X_GET_Y';
  buyQuantity: number;
  getQuantity: number;
  buyProductIds: string[];
  getProductIds: string[];
  discountPercent: number;
  maxApplications: number | null;
};

export type FreeShippingCalculation = {
  type: 'FREE_SHIPPING';
  shippingDiscount: number;
};

export type CalculationStrategy =
  | PercentageCalculation
  | FixedAmountCalculation
  | BuyXGetYCalculation
  | FreeShippingCalculation;

// ============================================
// MULTI-PROMOTION CALCULATION
// ============================================

export type MultiPromotionCalculationInput = {
  workspaceId: string;
  promotions: PromotionToApply[];
  orderItems: CalculationOrderItem[];
  orderSubtotal: number;
  shippingCost?: number;
  customerId: string;
};

export type PromotionToApply = {
  promotionId: string;
  couponId?: string | null;
  priority: number;
  stackable: boolean;
};

export type MultiPromotionCalculationResult = {
  appliedPromotions: AppliedPromotionDetail[];
  totalDiscount: number;
  finalOrderAmount: number;
  finalShippingCost: number;
  itemsAfterDiscount: AffectedOrderItem[];
};

export type AppliedPromotionDetail = {
  promotionId: string;
  promotionName: string;
  promotionCode: string;
  promotionType: PromotionType;
  couponCode?: string | null;
  discountValue: number;
  discountAmount: number;
  priority: number;
  appliedAt: Date;
};

// ============================================
// CALCULATION METADATA
// ============================================

export type CalculationMetadata = {
  calculatedAt: Date;
  calculationVersion: string;
  appliedRules: string[];
  matchedConditions: Record<string, unknown>;
  warnings?: string[];
};

// ============================================
// BUY X GET Y SPECIFIC TYPES
// ============================================

export type BuyXGetYConfig = {
  buyQuantity: number;
  getQuantity: number;
  buyProductIds: string[];
  getProductIds: string[];
  discountPercent: number;
  maxApplications: number | null;
};

export type BuyXGetYMatch = {
  buyItems: MatchedOrderItem[];
  getItems: MatchedOrderItem[];
  discountAmount: number;
  applicationCount: number;
};

export type MatchedOrderItem = {
  itemId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

// ============================================
// DISCOUNT DISTRIBUTION
// ============================================

export type DistributionMethod = 'EQUAL' | 'PROPORTIONAL' | 'SEQUENTIAL';

export type DistributionConfig = {
  method: DistributionMethod;
  totalDiscount: number;
  items: DistributionItem[];
};

export type DistributionItem = {
  itemId: string;
  originalPrice: number;
  weight?: number; // For proportional distribution
};

export type DistributionResult = {
  items: DistributedItem[];
  totalDistributed: number;
  remainder: number;
};

export type DistributedItem = {
  itemId: string;
  discountAmount: number;
  finalPrice: number;
};
