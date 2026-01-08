import { Field, ObjectType, Int } from '@nestjs/graphql';

import { CouponOutput } from './coupon.output';

/**
 * Output for paginated coupons list
 */
@ObjectType()
export class PaginatedCouponsOutput {
  @Field(() => [CouponOutput])
  items: CouponOutput[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  offset: number;

  @Field(() => Boolean)
  hasMore: boolean;
}
