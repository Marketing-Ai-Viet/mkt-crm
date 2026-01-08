type AppliedPromotion = {
  promotionId: string;
  promotionName: string;
  promotionCode: string;
  couponCode?: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
};

export class PromotionCreatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly promotionId: string,
    public readonly promotionCode: string,
    public readonly createdBy: string,
  ) {}
}

export class PromotionActivatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly promotionId: string,
    public readonly activatedBy: string,
  ) {}
}

export class PromotionPausedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly promotionId: string,
    public readonly pausedBy: string,
  ) {}
}

export class PromotionExpiredEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly promotionId: string,
    public readonly reason: 'DATE_EXPIRED' | 'USAGE_LIMIT_REACHED',
  ) {}
}

export class PromotionCancelledEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly promotionId: string,
    public readonly cancelledBy: string,
  ) {}
}

export class CouponCreatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly couponId: string,
    public readonly couponCode: string,
    public readonly promotionId: string,
  ) {}
}

export class CouponRedeemedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly couponId: string,
    public readonly couponCode: string,
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly discountAmount: number,
  ) {}
}

export class CouponExpiredEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly couponId: string,
    public readonly couponCode: string,
  ) {}
}

export class PromotionAppliedToOrderEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly orderId: string,
    public readonly appliedPromotions: AppliedPromotion[],
    public readonly totalDiscount: number,
  ) {}
}
