import { Field, ObjectType, Float } from '@nestjs/graphql';

import { PromotionOutput } from './promotion.output';

/**
 * Output for applied promotion
 */
@ObjectType()
export class AppliedPromotionOutput {
  @Field(() => String)
  promotionId: string;

  @Field(() => String)
  promotionName: string;

  @Field(() => String)
  promotionCode: string;

  @Field(() => String, { nullable: true })
  couponCode: string | null;

  @Field(() => String)
  discountType: string;

  @Field(() => Float)
  discountValue: number;

  @Field(() => Float)
  discountAmount: number;
}

/**
 * Output for discount calculation
 */
@ObjectType()
export class CalculateDiscountOutput {
  @Field(() => [AppliedPromotionOutput])
  promotions: AppliedPromotionOutput[];

  @Field(() => Float)
  totalDiscount: number;

  @Field(() => Float)
  finalOrderAmount: number;
}

/**
 * Output for validation error
 */
@ObjectType()
export class ValidationErrorOutput {
  @Field(() => String)
  code: string;

  @Field(() => String, { nullable: true })
  field: string | null;

  @Field(() => String)
  message: string;
}

/**
 * Output for coupon application result
 */
@ObjectType()
export class ApplyCouponOutput {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => PromotionOutput, { nullable: true })
  promotion: PromotionOutput | null;

  @Field(() => Float, { nullable: true })
  discountAmount: number | null;

  @Field(() => [ValidationErrorOutput], { nullable: true })
  errors: ValidationErrorOutput[] | null;
}
