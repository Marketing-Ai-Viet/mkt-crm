import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import { GapAnalysisOutput } from 'src/mkt-core/mkt-dashboard/dto/output/revenue-stats.output';
import {
  DailyRevenueItem,
  DailyRevenueMetric,
  DepartmentDailyRevenue,
  RevenueDailyWeekItem,
} from 'src/mkt-core/mkt-dashboard/dto/output/revenue-daily.output';

@ObjectType()
export class RevenueDailyByMonthOutput {
  @Field(() => Int)
  year: number;

  @Field(() => Int)
  month: number;

  @Field(() => String, { description: 'Ngay dau thang (yyyy-MM-dd)' })
  monthStart: string;

  @Field(() => String, { description: 'Ngay cuoi thang (yyyy-MM-dd)' })
  monthEnd: string;

  @Field(() => Int, { description: 'So ngay trong thang' })
  daysInMonth: number;

  @Field(() => Float, {
    description: 'Tong doanh thu chinh (cash khi CASH/DUAL, order khi ORDER)',
  })
  totalRevenue: number;

  @Field(() => [DailyRevenueItem], {
    description:
      'Doanh thu hang ngay (tat ca ngay trong thang, tu metric chinh)',
  })
  dailyRevenue: DailyRevenueItem[];

  @Field(() => DailyRevenueMetric, {
    nullable: true,
    description: 'Doanh thu da thu (Cash Basis). Null khi mode = ORDER.',
  })
  collected: DailyRevenueMetric | null;

  @Field(() => DailyRevenueMetric, {
    nullable: true,
    description: 'Doanh so don hang (Order Basis). Null khi mode = CASH.',
  })
  order: DailyRevenueMetric | null;

  @Field(() => GapAnalysisOutput, {
    nullable: true,
    description: 'Gap analysis giua cash va order. Chi co khi mode = DUAL.',
  })
  gap: GapAnalysisOutput | null;

  @Field(() => [RevenueDailyWeekItem], {
    description:
      'Breakdown theo tuan. Tuan bien (dau/cuoi thang) chi gom ngay thuoc thang.',
  })
  weeklyBreakdown: RevenueDailyWeekItem[];

  @Field(() => [DepartmentDailyRevenue], {
    nullable: true,
    description:
      'Phan tach theo phong ban/team. Chi co khi departmentScope != ALL.',
  })
  departmentBreakdown: DepartmentDailyRevenue[] | null;
}
