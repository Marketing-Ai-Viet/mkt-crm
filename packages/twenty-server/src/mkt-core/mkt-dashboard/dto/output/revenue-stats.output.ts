import { Field, ObjectType, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class RevenueByPeriodItem {
  @Field(() => String)
  period: string;

  @Field(() => Float)
  amount: number;

  @Field(() => Int)
  orderCount: number;
}

@ObjectType()
export class RevenueByDepartmentItem {
  @Field(() => String)
  departmentName: string;

  @Field(() => Float)
  amount: number;

  @Field(() => Float)
  percentage: number;
}

@ObjectType()
export class RevenueByStaffItem {
  @Field(() => String)
  staffName: string;

  @Field(() => Float)
  amount: number;

  @Field(() => Int)
  orderCount: number;

  @Field(() => Int)
  rank: number;
}

@ObjectType()
export class RevenueStatsOutput {
  @Field(() => Float)
  totalRevenue: number;

  @Field(() => [RevenueByPeriodItem])
  revenueByPeriod: RevenueByPeriodItem[];

  @Field(() => [RevenueByDepartmentItem])
  revenueByDepartment: RevenueByDepartmentItem[];

  @Field(() => [RevenueByStaffItem])
  revenueByStaff: RevenueByStaffItem[];

  @Field(() => Float)
  growthRate: number;

  @Field(() => Float, { nullable: true })
  projectedRevenue: number | null;
}
