import { Field, ObjectType, Int, Float } from '@nestjs/graphql';

// ============================================
// SHARED ITEM TYPES (dùng chung cho cả cash & order)
// ============================================

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

// ============================================
// DUAL-METRIC SUB-TYPES
// ============================================

/**
 * Một bộ chỉ số doanh thu (dùng cho cả cash basis và order basis)
 */
@ObjectType()
export class RevenueMetricOutput {
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

/**
 * Gap analysis giữa cash và order revenue
 */
@ObjectType()
export class GapAnalysisOutput {
  @Field(() => Float, {
    description: 'Tỷ lệ thu tiền (%) = collected / order * 100',
  })
  collectionRate: number;

  @Field(() => Float, { description: 'Chênh lệch = order - collected' })
  revenueGap: number;

  @Field(() => Float, {
    nullable: true,
    description: 'Số ngày thu tiền trung bình sau khi đơn hoàn tất',
  })
  avgCollectionDays: number | null;
}

// ============================================
// MAIN OUTPUT
// ============================================

@ObjectType()
export class RevenueStatsOutput {
  // ─── Backward compatible fields (giữ nguyên) ───────────────────────────────
  // Default = collected (cash basis) khi mode DUAL/CASH; = order khi mode ORDER

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

  // ─── Dual-Metric fields (mới) ───────────────────────────────────────────────

  @Field(() => RevenueMetricOutput, {
    nullable: true,
    description:
      'Doanh thu đã thu (Cash Basis — mktPayment.confirmedAt). Null khi mode = ORDER.',
  })
  collected: RevenueMetricOutput | null;

  @Field(() => RevenueMetricOutput, {
    nullable: true,
    description:
      'Doanh số đơn hàng (Accrual Basis — mktOrder.completedAt). Null khi mode = CASH.',
  })
  order: RevenueMetricOutput | null;

  @Field(() => GapAnalysisOutput, {
    nullable: true,
    description: 'Gap analysis giữa cash và order. Chỉ có khi mode = DUAL.',
  })
  gap: GapAnalysisOutput | null;
}
