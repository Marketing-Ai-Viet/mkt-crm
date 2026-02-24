import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import { GapAnalysisOutput } from 'src/mkt-core/mkt-dashboard/dto/output/revenue-stats.output';

@ObjectType()
export class StaffDepartmentInfo {
  @Field(() => String, { nullable: true })
  departmentId: string | null;

  @Field(() => String, { nullable: true })
  departmentName: string | null;

  @Field(() => String, { nullable: true, description: 'DEPARTMENT or TEAM' })
  departmentType: string | null;
}

@ObjectType()
export class StaffRevenueItem {
  @Field(() => String)
  staffId: string;

  @Field(() => String)
  staffName: string;

  @Field(() => StaffDepartmentInfo, { nullable: true })
  directDepartment: StaffDepartmentInfo | null;

  @Field(() => StaffDepartmentInfo, { nullable: true })
  rootDepartment: StaffDepartmentInfo | null;

  @Field(() => Float, { description: 'Primary metric based on revenueMode' })
  totalRevenue: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Collected revenue (null when ORDER mode)',
  })
  collectedRevenue: number | null;

  @Field(() => Float, {
    nullable: true,
    description: 'Order revenue (null when CASH mode)',
  })
  orderRevenue: number | null;

  @Field(() => Int)
  orderCount: number;
}

@ObjectType()
export class StaffRevenuePeriod {
  @Field(() => String)
  start: string;

  @Field(() => String)
  end: string;
}

@ObjectType()
export class StaffRevenueOutput {
  @Field(() => [StaffRevenueItem])
  items: StaffRevenueItem[];

  @Field(() => StaffRevenuePeriod)
  period: StaffRevenuePeriod;

  @Field(() => Int)
  totalCount: number;

  @Field(() => GapAnalysisOutput, {
    nullable: true,
    description: 'Aggregate gap analysis (DUAL mode only)',
  })
  gap: GapAnalysisOutput | null;
}
