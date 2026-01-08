import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class CustomerTierStatisticsOutput {
  @Field(() => GraphQLJSON, {
    description: 'Distribution of customers by tier',
  })
  tierDistribution: Record<string, number>;

  @Field(() => Int, { description: 'Total number of customers' })
  totalCustomers: number;

  @Field(() => Float, {
    description: 'Average order value across all customers',
  })
  averageOrderValue: number;

  @Field(() => Float, { description: 'Average number of orders per customer' })
  averageOrderCount: number;
}

@ObjectType()
export class CustomerUpgradeEligibilityOutput {
  @Field(() => String, { description: 'Current customer tier' })
  currentTier: string;

  @Field(() => Boolean, {
    description: 'Whether customer can upgrade to next tier',
  })
  canUpgrade: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'Next tier if upgrade is possible',
  })
  nextTier?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Requirements needed for upgrade',
  })
  requirements?: string;
}
