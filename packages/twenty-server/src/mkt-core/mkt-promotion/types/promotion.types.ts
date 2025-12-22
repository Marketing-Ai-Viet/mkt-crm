/**
 * Type definitions for Promotion module
 */

import {
  PromotionStatus,
  PromotionType,
  PromotionRuleType,
  RuleOperator,
  LogicOperator,
} from 'src/mkt-core/mkt-promotion/constants';
import { MktPromotionWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion.workspace-entity';
import { MktPromotionRuleWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion-rule.workspace-entity';
import { MktCouponWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-coupon.workspace-entity';

// ============================================
// PROMOTION WITH RELATIONS
// ============================================

export type PromotionWithRules = {
  promotion: MktPromotionWorkspaceEntity;
  rules: MktPromotionRuleWorkspaceEntity[];
};

export type PromotionWithCoupons = {
  promotion: MktPromotionWorkspaceEntity;
  coupons: MktCouponWorkspaceEntity[];
};

export type PromotionFull = {
  promotion: MktPromotionWorkspaceEntity;
  rules: MktPromotionRuleWorkspaceEntity[];
  coupons: MktCouponWorkspaceEntity[];
};

// ============================================
// CREATE/UPDATE DATA
// ============================================

export type CreatePromotionData = {
  name: string;
  code: string;
  description?: string | null;
  promotionType: PromotionType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  currency?: string;
  startDate: Date;
  endDate?: Date | null;
  usageLimit?: number | null;
  usageLimitPerCustomer?: number | null;
  priority?: number;
  stackable?: boolean;
  isAutoApply?: boolean;
  metadata?: Record<string, unknown> | null;
  rules?: CreatePromotionRuleData[];
};

export type UpdatePromotionData = Partial<
  Omit<CreatePromotionData, 'code' | 'rules'>
> & {
  id: string;
};

export type CreatePromotionRuleData = {
  name: string;
  ruleType: PromotionRuleType;
  operator: RuleOperator;
  targetIds?: string[] | null;
  targetValues?: Record<string, unknown> | null;
  isRequired?: boolean;
  logicOperator?: LogicOperator;
  position?: number;
};

export type UpdatePromotionRuleData = Partial<
  Omit<CreatePromotionRuleData, 'ruleType'>
>;

// ============================================
// COUPON DATA
// ============================================

export type CreateCouponData = {
  code?: string | null; // Auto-generate if not provided
  promotionId: string;
  usageLimit?: number | null;
  validFrom?: Date | null;
  validTo?: Date | null;
  assignedCustomerId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CreateBulkCouponsData = {
  promotionId: string;
  quantity: number;
  prefix?: string;
  usageLimit?: number | null;
  validFrom?: Date | null;
  validTo?: Date | null;
};

// ============================================
// CALCULATION TYPES
// ============================================

export type PromotionEvaluationContext = {
  workspaceId: string;
  customerId: string;
  orderItems: OrderItemForPromotion[];
  orderSubtotal: number;
  couponCode?: string | null;
  customerTags?: string[];
  isFirstOrder?: boolean;
};

export type OrderItemForPromotion = {
  productId: string;
  variantId?: string | null;
  categoryId?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type PromotionCalculationResult = {
  applicable: boolean;
  promotion: MktPromotionWorkspaceEntity | null;
  coupon: MktCouponWorkspaceEntity | null;
  discountAmount: number;
  discountedItems?: DiscountedItem[];
  reason?: string | null;
  errors?: PromotionValidationError[];
};

export type DiscountedItem = {
  orderItemIndex: number;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
};

export type AppliedPromotionsResult = {
  promotions: AppliedPromotion[];
  totalDiscount: number;
  finalOrderAmount: number;
};

export type AppliedPromotion = {
  promotionId: string;
  promotionName: string;
  promotionCode: string;
  couponCode?: string | null;
  discountType: PromotionType;
  discountValue: number;
  discountAmount: number;
};

// ============================================
// VALIDATION TYPES
// ============================================

export type PromotionValidationError = {
  code: string;
  field?: string | null;
  message: string;
};

// NOTE: RuleEvaluationResult is exported from './rule.types.ts'
// Use that for detailed rule evaluation results

// ============================================
// FILTER TYPES
// ============================================

export type PromotionFilter = {
  status?: PromotionStatus;
  promotionType?: PromotionType;
  startDateFrom?: Date;
  startDateTo?: Date;
  isAutoApply?: boolean;
  stackable?: boolean;
  search?: string;
};

// ============================================
// SNAPSHOT FOR ORDER
// ============================================

export type PromotionSnapshot = {
  promotionId: string;
  promotionCode: string;
  promotionName: string;
  promotionType: PromotionType;
  discountValue: number;
  couponCode?: string | null;
  discountAmount: number;
  appliedAt: string;
  checksum: string;
};

// ============================================
// PAGINATION TYPES
// ============================================

export type PaginationInput = {
  limit?: number;
  offset?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  hasMore: boolean;
};

// ============================================
// USAGE STATS TYPES
// ============================================

export type PromotionUsageStats = {
  totalUsageCount: number;
  uniqueCustomerCount: number;
  totalDiscountAmount: number;
  averageDiscountAmount: number;
  lastUsedAt: Date | null;
};
