import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import { GapAnalysisOutput } from 'src/mkt-core/mkt-dashboard/dto/output/revenue-stats.output';
import {
  DailyRevenueItem,
  DailyRevenueMetric,
  DepartmentDailyRevenue,
} from 'src/mkt-core/mkt-dashboard/dto/output/revenue-daily.output';

@ObjectType()
export class QuarterMonthItem {
  @Field(() => Int, { description: 'Thang (1-12)' })
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
}

@ObjectType()
export class QuarterBreakdownItem {
  @Field(() => Int, { description: 'Quy (1-4)' })
  quarter: number;

  @Field(() => String, { description: 'Ngay dau quy (yyyy-MM-dd)' })
  quarterStart: string;

  @Field(() => String, { description: 'Ngay cuoi quy (yyyy-MM-dd)' })
  quarterEnd: string;

  @Field(() => Int, { description: 'Tong so ngay trong quy' })
  totalDays: number;

  @Field(() => Float, {
    description: 'Tong doanh thu chinh (cash khi CASH/DUAL, order khi ORDER)',
  })
  totalRevenue: number;

  @Field(() => [DailyRevenueItem], {
    description: 'Doanh thu hang ngay (tat ca ngay trong quy, tu metric chinh)',
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

  @Field(() => [QuarterMonthItem], {
    description: 'Breakdown theo 3 thang trong quy.',
  })
  monthlyBreakdown: QuarterMonthItem[];
}

@ObjectType()
export class RevenueDailyByQuarterOutput {
  @Field(() => Int)
  year: number;

  @Field(() => Int, {
    nullable: true,
    description:
      'Quy (1-4). Null khi query tat ca cac quy (khong truyen quarter).',
  })
  quarter: number | null;

  @Field(() => String, { description: 'Ngay dau quy (yyyy-MM-dd)' })
  quarterStart: string;

  @Field(() => String, { description: 'Ngay cuoi quy (yyyy-MM-dd)' })
  quarterEnd: string;

  @Field(() => Int, { description: 'Tong so ngay trong quy' })
  totalDays: number;

  @Field(() => Float, {
    description: 'Tong doanh thu chinh (cash khi CASH/DUAL, order khi ORDER)',
  })
  totalRevenue: number;

  @Field(() => [DailyRevenueItem], {
    description: 'Doanh thu hang ngay (tat ca ngay trong quy, tu metric chinh)',
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

  @Field(() => [QuarterMonthItem], {
    description: 'Breakdown theo 3 thang trong quy. Luon co dung 3 items.',
  })
  monthlyBreakdown: QuarterMonthItem[];

  @Field(() => [QuarterBreakdownItem], {
    nullable: true,
    description:
      'Breakdown theo 4 quy. Chi co khi khong truyen quarter (query ca nam). Null khi query 1 quy cu the.',
  })
  quarterlyBreakdown: QuarterBreakdownItem[] | null;

  @Field(() => [DepartmentDailyRevenue], {
    nullable: true,
    description:
      'Phan tach theo phong ban/team. Chi co khi departmentScope != ALL.',
  })
  departmentBreakdown: DepartmentDailyRevenue[] | null;
}
