import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

/**
 * Raw row types from SQL queries (matching the SQL columns)
 */
export type RawRevenueRow = {
  period: string;
  order_count: string; // Postgres returns numbers as strings
  total_revenue: string;
  avg_order_value: string;
};

export type RawRevenueByStaffRow = {
  staff_name: string;
  staff_id: string;
  order_count: string;
  total_revenue: string;
  department_name: string;
};

export type RawRevenueByDepartmentRow = {
  department_name: string;
  department_id: string;
  amount: string;
};

export type RawOrderStatusRow = {
  status: string;
  count: string;
  total_amount: string;
};

export type RawOrderTrendRow = {
  period: string;
  count: string;
  amount: string;
};

export type RawTopProductRow = {
  product_name: string;
  product_id: string;
  quantity: string;
  revenue: string;
};

export type RawCustomerTierRow = {
  tier: string;
  count: string;
  total_ltv: string;
};

export type RawCustomerGrowthRow = {
  period: string;
  new_customers: string;
  churned_customers: string;
};

export type RawPaymentStatusRow = {
  status: string;
  cnt: string;
  total_amount: string;
};

export type RawKpiCategoryRow = {
  kpi_category: string;
  total_kpis: string;
  achieved: string;
  achievement_rate: string;
};

export type RawOverdueOrderRow = {
  id: string;
  order_code: string;
  total_amount: string;
  payment_deadline: string;
  days_overdue: string;
};

export type RawExpiringContractRow = {
  id: string;
  name: string;
  contract_number: string;
  end_date: string;
  days_to_expiry: string;
};

export type RawLeaderboardRow = {
  staff_id: string;
  staff_name: string;
  department_name: string;
  order_count: string;
  total_revenue: string;
  collected_revenue?: string; // Cash basis — from cash_stats subquery (Phase 4)
  prev_month_revenue: string;
  new_customers: string;
  kpi_achievement: string;
};

/**
 * DashboardDataTransformer
 *
 * Transforms raw SQL query results into typed DTO outputs.
 * All numeric conversions use MoneyUtils for precision.
 */
export class DashboardDataTransformer {
  static transformRevenueByPeriod(rows: RawRevenueRow[]): Array<{
    period: string;
    amount: number;
    orderCount: number;
  }> {
    return rows.map((row) => ({
      period: row.period,
      amount: MoneyUtils.from(row.total_revenue).toNumber(),
      orderCount: Number(row.order_count),
    }));
  }

  static transformRevenueByStaff(rows: RawRevenueByStaffRow[]): Array<{
    staffName: string;
    amount: number;
    orderCount: number;
    rank: number;
  }> {
    return rows.map((row, index) => ({
      staffName: row.staff_name,
      amount: MoneyUtils.from(row.total_revenue).toNumber(),
      orderCount: Number(row.order_count),
      rank: index + 1,
    }));
  }

  static transformRevenueByDepartment(
    rows: RawRevenueByDepartmentRow[],
    totalRevenue: number,
  ): Array<{
    departmentName: string;
    amount: number;
    percentage: number;
  }> {
    return rows.map((row) => {
      const amount = MoneyUtils.from(row.amount).toNumber();

      return {
        departmentName: row.department_name,
        amount,
        percentage:
          totalRevenue > 0
            ? MoneyUtils.percentageOf(amount, totalRevenue).toNumber()
            : 0,
      };
    });
  }

  static transformOrdersByStatus(rows: RawOrderStatusRow[]): Array<{
    status: string;
    count: number;
    totalAmount: number;
  }> {
    return rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
      totalAmount: MoneyUtils.from(row.total_amount).toNumber(),
    }));
  }

  static transformOrderTrend(rows: RawOrderTrendRow[]): Array<{
    period: string;
    count: number;
    amount: number;
  }> {
    return rows.map((row) => ({
      period: row.period,
      count: Number(row.count),
      amount: MoneyUtils.from(row.amount).toNumber(),
    }));
  }

  static transformTopProducts(rows: RawTopProductRow[]): Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }> {
    return rows.map((row) => ({
      productName: row.product_name,
      quantity: Number(row.quantity),
      revenue: MoneyUtils.from(row.revenue).toNumber(),
    }));
  }

  static transformCustomerTierStats(rows: RawCustomerTierRow[]): Array<{
    tier: string;
    count: number;
    totalLtv: number;
  }> {
    return rows.map((row) => ({
      tier: row.tier,
      count: Number(row.count),
      totalLtv: MoneyUtils.from(row.total_ltv).toNumber(),
    }));
  }

  static transformCustomerGrowth(rows: RawCustomerGrowthRow[]): Array<{
    period: string;
    newCustomers: number;
    churnedCustomers: number;
    netGrowth: number;
  }> {
    return rows.map((row) => {
      const newCustomers = Number(row.new_customers);
      const churnedCustomers = Number(row.churned_customers);

      return {
        period: row.period,
        newCustomers,
        churnedCustomers,
        netGrowth: newCustomers - churnedCustomers,
      };
    });
  }

  static transformPaymentStatus(rows: RawPaymentStatusRow[]): Array<{
    status: string;
    count: number;
    amount: number;
  }> {
    return rows.map((row) => ({
      status: row.status,
      count: Number(row.cnt),
      amount: MoneyUtils.from(row.total_amount).toNumber(),
    }));
  }

  static transformKpiCategories(rows: RawKpiCategoryRow[]): Array<{
    category: string;
    total: number;
    achieved: number;
    rate: number;
  }> {
    return rows.map((row) => ({
      category: row.kpi_category,
      total: Number(row.total_kpis),
      achieved: Number(row.achieved),
      rate: Number(row.achievement_rate),
    }));
  }

  static transformOverdueOrders(rows: RawOverdueOrderRow[]): Array<{
    id: string;
    orderCode: string;
    daysOverdue: number;
  }> {
    return rows.map((row) => ({
      id: row.id,
      orderCode: row.order_code,
      daysOverdue: Math.floor(Number(row.days_overdue)),
    }));
  }

  static transformExpiringContracts(rows: RawExpiringContractRow[]): Array<{
    id: string;
    name: string;
    daysToExpiry: number;
  }> {
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      daysToExpiry: Number(row.days_to_expiry),
    }));
  }

  static transformLeaderboard(rows: RawLeaderboardRow[]): Array<{
    rank: number;
    staffName: string;
    departmentName: string;
    revenue: number;
    collectedRevenue: number | null;
    previousMonthRevenue: number;
    orderCount: number;
    newCustomers: number;
    kpiAchievement: number;
    overallScore: number;
  }> {
    return rows.map((row, index) => {
      const revenue = MoneyUtils.from(row.total_revenue).toNumber();
      const previousMonthRevenue = MoneyUtils.from(
        row.prev_month_revenue,
      ).toNumber();
      const orderCount = Number(row.order_count);
      const newCustomers = Number(row.new_customers);
      const kpiAchievement = Number(row.kpi_achievement);

      const collectedRevenue =
        row.collected_revenue != null
          ? MoneyUtils.from(row.collected_revenue).toNumber()
          : null;

      // Overall score = weighted combination
      // Revenue weight: 40% (prefer collectedRevenue/cash), Orders: 20%, Customers: 20%, KPI: 20%
      const revenueForScore = collectedRevenue ?? revenue;
      const overallScore = MoneyUtils.round(
        revenueForScore * 0.4 +
          orderCount * 0.2 +
          newCustomers * 0.2 +
          kpiAchievement * 0.2,
      ).toNumber();

      return {
        rank: index + 1,
        staffName: row.staff_name,
        departmentName: row.department_name,
        revenue,
        collectedRevenue,
        previousMonthRevenue,
        orderCount,
        newCustomers,
        kpiAchievement,
        overallScore,
      };
    });
  }
}
