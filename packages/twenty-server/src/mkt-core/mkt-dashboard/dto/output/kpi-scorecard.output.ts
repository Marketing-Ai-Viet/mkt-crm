import { Field, ObjectType, Float } from '@nestjs/graphql';

@ObjectType()
export class KpiDetailItem {
  @Field(() => String)
  name: string;

  @Field(() => Float)
  target: number;

  @Field(() => Float)
  actual: number;

  @Field(() => Float)
  progress: number;

  @Field(() => String)
  status: string;
}

@ObjectType()
export class KpiCategoryGroup {
  @Field(() => String)
  category: string;

  @Field(() => [KpiDetailItem])
  kpis: KpiDetailItem[];
}

@ObjectType()
export class KpiTrendItem {
  @Field(() => String)
  period: string;

  @Field(() => Float)
  achievementRate: number;
}

@ObjectType()
export class KpiScorecardOutput {
  @Field(() => Float)
  overallAchievementRate: number;

  @Field(() => [KpiCategoryGroup])
  kpisByCategory: KpiCategoryGroup[];

  @Field(() => [KpiTrendItem])
  trends: KpiTrendItem[];
}
