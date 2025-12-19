import { Field, ObjectType, Int, Float, ID } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

/**
 * Output for promotion rule
 */
@ObjectType()
export class PromotionRuleOutput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  ruleType: string;

  @Field(() => String)
  operator: string;

  @Field(() => [String], { nullable: true })
  targetIds: string[] | null;

  @Field(() => GraphQLJSON, { nullable: true })
  targetValues: JSON | null;

  @Field(() => Boolean)
  isRequired: boolean;

  @Field(() => String)
  logicOperator: string;

  @Field(() => Int)
  position: number;
}

/**
 * Output for promotion
 */
@ObjectType()
export class PromotionOutput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  code: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => String)
  status: string;

  @Field(() => String)
  promotionType: string;

  @Field(() => Float)
  discountValue: number;

  @Field(() => Float, { nullable: true })
  maxDiscountAmount: number | null;

  @Field(() => Float, { nullable: true })
  minOrderAmount: number | null;

  @Field(() => String)
  currency: string;

  @Field(() => Date)
  startDate: Date;

  @Field(() => Date, { nullable: true })
  endDate: Date | null;

  @Field(() => Int, { nullable: true })
  usageLimit: number | null;

  @Field(() => Int, { nullable: true })
  usageLimitPerCustomer: number | null;

  @Field(() => Int)
  currentUsageCount: number;

  @Field(() => Int)
  priority: number;

  @Field(() => Boolean)
  stackable: boolean;

  @Field(() => Boolean)
  isAutoApply: boolean;

  @Field(() => [PromotionRuleOutput], { nullable: true })
  rules?: PromotionRuleOutput[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
