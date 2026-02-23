import { Field, ObjectType, Int, Float } from '@nestjs/graphql';

import { AlertsOutput } from './alerts.output';
import { RevenueByPeriodItem } from './revenue-stats.output';

@ObjectType()
export class PeriodOutput {
  @Field(() => String)
  start: string;

  @Field(() => String)
  end: string;

  @Field(() => String)
  periodType: string;
}

@ObjectType()
export class RevenueByMonthItem {
  @Field(() => String)
  period: string;

  @Field(() => Float)
  amount: number;
}

@ObjectType()
export class RevenueSummary {
  // ─── Backward compatible fields (giữ nguyên) ───────────────────────────────

  @Field(() => Float)
  totalRevenue: number;

  @Field(() => Float)
  previousPeriodRevenue: number;

  @Field(() => Float)
  percentageChange: number;

  @Field(() => String)
  trend: string;

  @Field(() => [RevenueByMonthItem])
  revenueByMonth: RevenueByMonthItem[];

  // ─── Dual-Metric fields (mới) ───────────────────────────────────────────────

  @Field(() => Float, {
    nullable: true,
    description: 'Tổng doanh thu đã thu (Cash Basis)',
  })
  collectedRevenue: number | null;

  @Field(() => Float, {
    nullable: true,
    description: 'Tổng doanh số đơn hàng (Accrual Basis)',
  })
  orderRevenue: number | null;

  @Field(() => Float, {
    nullable: true,
    description: 'Tỷ lệ thu tiền (%) = collectedRevenue / orderRevenue * 100',
  })
  collectionRate: number | null;

  @Field(() => Float, {
    nullable: true,
    description: 'Chênh lệch = orderRevenue - collectedRevenue',
  })
  revenueGap: number | null;

  @Field(() => [RevenueByPeriodItem], {
    nullable: true,
    description: 'Cash revenue theo từng kỳ',
  })
  collectedByMonth: RevenueByPeriodItem[] | null;

  @Field(() => [RevenueByPeriodItem], {
    nullable: true,
    description: 'Order revenue theo từng kỳ',
  })
  orderByMonth: RevenueByPeriodItem[] | null;
}

@ObjectType()
export class OrdersByStatusItem {
  @Field(() => String)
  status: string;

  @Field(() => Int)
  count: number;

  @Field(() => Float)
  totalAmount: number;
}

@ObjectType()
export class OrdersSummary {
  @Field(() => Int)
  totalOrders: number;

  @Field(() => [OrdersByStatusItem])
  ordersByStatus: OrdersByStatusItem[];

  @Field(() => Int)
  newOrdersThisPeriod: number;

  @Field(() => Int)
  previousPeriodOrders: number;

  @Field(() => Float)
  percentageChange: number;

  @Field(() => Float)
  averageOrderValue: number;
}

@ObjectType()
export class CustomersByTierItem {
  @Field(() => String)
  tier: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class CustomersByLifecycleItem {
  @Field(() => String)
  stage: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class TopCustomerItem {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => Float)
  totalOrderValue: number;

  @Field(() => String, { nullable: true })
  tier: string | null;
}

@ObjectType()
export class CustomersSummary {
  @Field(() => Int)
  totalCustomers: number;

  @Field(() => Int)
  newCustomersThisPeriod: number;

  @Field(() => Int)
  previousPeriodNewCustomers: number;

  @Field(() => Float)
  percentageChange: number;

  @Field(() => [CustomersByTierItem])
  customersByTier: CustomersByTierItem[];

  @Field(() => [CustomersByLifecycleItem])
  customersByLifecycle: CustomersByLifecycleItem[];

  @Field(() => Float)
  churnRate: number;

  @Field(() => [TopCustomerItem])
  topCustomers: TopCustomerItem[];
}

@ObjectType()
export class PaymentsByStatusItem {
  @Field(() => String)
  status: string;

  @Field(() => Int)
  count: number;

  @Field(() => Float)
  amount: number;
}

@ObjectType()
export class PaymentsSummary {
  @Field(() => Float)
  totalCollected: number;

  @Field(() => Float)
  pendingAmount: number;

  @Field(() => Float)
  collectionRate: number;

  @Field(() => [PaymentsByStatusItem])
  paymentsByStatus: PaymentsByStatusItem[];

  @Field(() => Int)
  overduePayments: number;
}

@ObjectType()
export class KpisByCategoryItem {
  @Field(() => String)
  category: string;

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  achieved: number;

  @Field(() => Float)
  rate: number;
}

@ObjectType()
export class TopKpiItem {
  @Field(() => String)
  kpiName: string;

  @Field(() => Float)
  targetValue: number;

  @Field(() => Float)
  actualValue: number;

  @Field(() => Float)
  progress: number;
}

@ObjectType()
export class KpisSummary {
  @Field(() => Int)
  totalKpis: number;

  @Field(() => Int)
  achievedCount: number;

  @Field(() => Int)
  inProgressCount: number;

  @Field(() => Float)
  achievementRate: number;

  @Field(() => [KpisByCategoryItem])
  kpisByCategory: KpisByCategoryItem[];

  @Field(() => [TopKpiItem])
  topKpis: TopKpiItem[];
}

@ObjectType()
export class ContractsSummary {
  @Field(() => Int)
  totalActive: number;

  @Field(() => Int)
  expiringThisMonth: number;

  @Field(() => Int)
  newThisPeriod: number;
}

@ObjectType()
export class DashboardSummaryOutput {
  @Field(() => PeriodOutput)
  period: PeriodOutput;

  @Field(() => RevenueSummary)
  revenue: RevenueSummary;

  @Field(() => OrdersSummary)
  orders: OrdersSummary;

  @Field(() => CustomersSummary)
  customers: CustomersSummary;

  @Field(() => PaymentsSummary)
  payments: PaymentsSummary;

  @Field(() => KpisSummary)
  kpis: KpisSummary;

  @Field(() => ContractsSummary)
  contracts: ContractsSummary;

  @Field(() => AlertsOutput)
  alerts: AlertsOutput;
}
