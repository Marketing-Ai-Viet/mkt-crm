import { Field, ObjectType, Int } from '@nestjs/graphql';

import { CouponOutput } from './coupon.output';

/**
 * Output for bulk coupon creation
 */
@ObjectType()
export class BulkCouponOutput {
  @Field(() => [CouponOutput])
  coupons: CouponOutput[];

  @Field(() => Int)
  totalCreated: number;

  @Field(() => String, { nullable: true })
  message: string | null;
}
