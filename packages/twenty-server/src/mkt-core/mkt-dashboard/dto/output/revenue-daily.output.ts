import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import { GapAnalysisOutput } from 'src/mkt-core/mkt-dashboard/dto/output/revenue-stats.output';

// ============================================
// DAILY REVENUE ITEM TYPES
// ============================================

@ObjectType()
export class DailyRevenueItem {
  @Field(() => String, { description: 'Ngày (ISO date string yyyy-MM-dd)' })
  date: string;

  @Field(() => String, {
    description: 'Tên ngày trong tuần (Monday, Tuesday, ...)',
  })
  dayOfWeek: string;

  @Field(() => Float, { description: 'Doanh thu trong ngày' })
  amount: number;

  @Field(() => Int, { description: 'Số đơn hàng trong ngày' })
  orderCount: number;
}

@ObjectType()
export class DailyRevenueMetric {
  @Field(() => Float, { description: 'Tổng doanh thu trong tuần' })
  totalRevenue: number;

  @Field(() => [DailyRevenueItem], {
    description: 'Doanh thu chi tiết từng ngày (7 ngày)',
  })
  dailyRevenue: DailyRevenueItem[];
}

// ============================================
// DEPARTMENT BREAKDOWN
// ============================================

@ObjectType()
export class DepartmentDailyRevenue {
  @Field(() => String)
  departmentId: string;

  @Field(() => String)
  departmentName: string;

  @Field(() => String, {
    description: 'Loại phòng ban (TEAM hoặc DEPARTMENT)',
  })
  departmentType: string;

  @Field(() => Float)
  totalRevenue: number;

  @Field(() => [DailyRevenueItem])
  dailyRevenue: DailyRevenueItem[];
}

// ============================================
// MAIN OUTPUT
// ============================================

@ObjectType()
export class RevenueDailyOutput {
  @Field(() => Int)
  year: number;

  @Field(() => Int)
  week: number;

  @Field(() => String, { description: 'Ngày bắt đầu tuần (Monday)' })
  weekStart: string;

  @Field(() => String, { description: 'Ngày kết thúc tuần (Sunday)' })
  weekEnd: string;

  // ─── Backward compatible top-level fields ─────────────────────────────
  @Field(() => Float, {
    description: 'Tổng doanh thu chính (cash khi CASH/DUAL, order khi ORDER)',
  })
  totalRevenue: number;

  @Field(() => [DailyRevenueItem], {
    description: 'Doanh thu hàng ngày (từ metric chính)',
  })
  dailyRevenue: DailyRevenueItem[];

  // ─── Dual-Metric fields ───────────────────────────────────────────────
  @Field(() => DailyRevenueMetric, {
    nullable: true,
    description: 'Doanh thu đã thu (Cash Basis). Null khi mode = ORDER.',
  })
  collected: DailyRevenueMetric | null;

  @Field(() => DailyRevenueMetric, {
    nullable: true,
    description: 'Doanh số đơn hàng (Accrual Basis). Null khi mode = CASH.',
  })
  order: DailyRevenueMetric | null;

  @Field(() => GapAnalysisOutput, {
    nullable: true,
    description: 'Gap analysis giữa cash và order. Chỉ có khi mode = DUAL.',
  })
  gap: GapAnalysisOutput | null;

  // ─── Department breakdown ─────────────────────────────────────────────
  @Field(() => [DepartmentDailyRevenue], {
    nullable: true,
    description:
      'Phân tách theo phòng ban/team. Chỉ có khi departmentScope != ALL.',
  })
  departmentBreakdown: DepartmentDailyRevenue[] | null;
}
