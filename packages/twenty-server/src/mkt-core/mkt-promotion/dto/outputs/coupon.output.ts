import { Field, ObjectType, Int, ID } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

/**
 * Output for coupon
 */
@ObjectType()
export class CouponOutput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  code: string;

  @Field(() => String)
  status: string;

  @Field(() => Int, { nullable: true })
  usageLimit: number | null;

  @Field(() => Int)
  currentUsageCount: number;

  @Field(() => Date, { nullable: true })
  validFrom: Date | null;

  @Field(() => Date, { nullable: true })
  validTo: Date | null;

  @Field(() => String, { nullable: true })
  assignedCustomerId: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata: JSON | null;

  @Field(() => String)
  promotionId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
