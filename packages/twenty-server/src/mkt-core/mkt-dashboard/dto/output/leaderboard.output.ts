import { Field, ObjectType, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class LeaderboardRankingItem {
  @Field(() => Int)
  rank: number;

  @Field(() => String)
  staffName: string;

  @Field(() => String)
  departmentName: string;

  @Field(() => Float, { description: 'Doanh số đơn hàng (order basis)' })
  revenue: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Doanh thu đã thu (cash basis — mktPayment.confirmedAt)',
  })
  collectedRevenue: number | null;

  @Field(() => Float)
  previousMonthRevenue: number;

  @Field(() => Int)
  orderCount: number;

  @Field(() => Int)
  newCustomers: number;

  @Field(() => Float)
  kpiAchievement: number;

  @Field(() => Float)
  overallScore: number;
}

@ObjectType()
export class LeaderboardPeriod {
  @Field(() => String)
  start: string;

  @Field(() => String)
  end: string;
}

@ObjectType()
export class StaffLeaderboardOutput {
  @Field(() => [LeaderboardRankingItem])
  rankings: LeaderboardRankingItem[];

  @Field(() => LeaderboardPeriod)
  period: LeaderboardPeriod;
}
