import { Field, ObjectType, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class CustomerTierStatsItem {
  @Field(() => String)
  tier: string;

  @Field(() => Int)
  count: number;

  @Field(() => Float)
  totalLtv: number;
}

@ObjectType()
export class CustomerGrowthItem {
  @Field(() => String)
  period: string;

  @Field(() => Int)
  newCustomers: number;

  @Field(() => Int)
  churnedCustomers: number;

  @Field(() => Int)
  netGrowth: number;
}

@ObjectType()
export class EngagementDistributionItem {
  @Field(() => String)
  range: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class TopCustomerByRevenueItem {
  @Field(() => String)
  name: string;

  @Field(() => Float)
  revenue: number;

  @Field(() => Int)
  orderCount: number;
}

@ObjectType()
export class CustomerStatsOutput {
  @Field(() => [CustomerTierStatsItem])
  customersByTier: CustomerTierStatsItem[];

  @Field(() => [CustomerGrowthItem])
  customerGrowth: CustomerGrowthItem[];

  @Field(() => Float)
  averageLtv: number;

  @Field(() => Float)
  churnRate: number;

  @Field(() => [EngagementDistributionItem])
  engagementDistribution: EngagementDistributionItem[];

  @Field(() => [TopCustomerByRevenueItem])
  topCustomersByRevenue: TopCustomerByRevenueItem[];
}
