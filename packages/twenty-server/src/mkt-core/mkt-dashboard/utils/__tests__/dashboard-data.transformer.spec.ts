import {
  DashboardDataTransformer,
  RawRevenueRow,
  RawRevenueByStaffRow,
  RawRevenueByDepartmentRow,
  RawOrderStatusRow,
  RawCustomerGrowthRow,
  RawPaymentStatusRow,
  RawLeaderboardRow,
  RawOverdueOrderRow,
  RawExpiringContractRow,
  RawKpiCategoryRow,
} from 'src/mkt-core/mkt-dashboard/utils/dashboard-data.transformer';

describe('DashboardDataTransformer', () => {
  // ==========================================================
  // transformRevenueByPeriod
  // ==========================================================
  describe('transformRevenueByPeriod', () => {
    it('should transform raw revenue rows to typed output', () => {
      const rows: RawRevenueRow[] = [
        {
          period: '2024-01',
          order_count: '10',
          total_revenue: '1000.50',
          avg_order_value: '100.05',
        },
      ];

      const result = DashboardDataTransformer.transformRevenueByPeriod(rows);

      expect(result).toEqual([
        { period: '2024-01', amount: 1000.5, orderCount: 10 },
      ]);
    });

    it('should handle multiple rows', () => {
      const rows: RawRevenueRow[] = [
        {
          period: '2024-01',
          order_count: '5',
          total_revenue: '500.00',
          avg_order_value: '100.00',
        },
        {
          period: '2024-02',
          order_count: '8',
          total_revenue: '1200.75',
          avg_order_value: '150.09',
        },
      ];

      const result = DashboardDataTransformer.transformRevenueByPeriod(rows);

      expect(result).toHaveLength(2);
      expect(result[0].period).toBe('2024-01');
      expect(result[0].amount).toBe(500);
      expect(result[1].amount).toBe(1200.75);
      expect(result[1].orderCount).toBe(8);
    });

    it('should return empty array for empty input', () => {
      const result = DashboardDataTransformer.transformRevenueByPeriod([]);

      expect(result).toEqual([]);
    });

    it('should handle zero values', () => {
      const rows: RawRevenueRow[] = [
        {
          period: '2024-03',
          order_count: '0',
          total_revenue: '0',
          avg_order_value: '0',
        },
      ];

      const result = DashboardDataTransformer.transformRevenueByPeriod(rows);

      expect(result[0].amount).toBe(0);
      expect(result[0].orderCount).toBe(0);
    });
  });

  // ==========================================================
  // transformRevenueByStaff
  // ==========================================================
  describe('transformRevenueByStaff', () => {
    it('should add rank based on array index', () => {
      const rows: RawRevenueByStaffRow[] = [
        {
          staff_name: 'Alice',
          staff_id: 'staff-001',
          order_count: '15',
          total_revenue: '5000.00',
          department_name: 'Sales',
        },
        {
          staff_name: 'Bob',
          staff_id: 'staff-002',
          order_count: '12',
          total_revenue: '4200.50',
          department_name: 'Marketing',
        },
        {
          staff_name: 'Charlie',
          staff_id: 'staff-003',
          order_count: '8',
          total_revenue: '2800.00',
          department_name: 'Sales',
        },
      ];

      const result = DashboardDataTransformer.transformRevenueByStaff(rows);

      expect(result).toHaveLength(3);
      expect(result[0].rank).toBe(1);
      expect(result[0].staffName).toBe('Alice');
      expect(result[0].amount).toBe(5000);
      expect(result[0].orderCount).toBe(15);
      expect(result[1].rank).toBe(2);
      expect(result[1].staffName).toBe('Bob');
      expect(result[1].amount).toBe(4200.5);
      expect(result[2].rank).toBe(3);
    });

    it('should return empty array for empty input', () => {
      const result = DashboardDataTransformer.transformRevenueByStaff([]);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================
  // transformRevenueByDepartment
  // ==========================================================
  describe('transformRevenueByDepartment', () => {
    it('should calculate percentage using totalRevenue parameter', () => {
      const rows: RawRevenueByDepartmentRow[] = [
        {
          department_name: 'Sales',
          department_id: 'dept-001',
          amount: '7500.00',
        },
        {
          department_name: 'Marketing',
          department_id: 'dept-002',
          amount: '2500.00',
        },
      ];

      const result = DashboardDataTransformer.transformRevenueByDepartment(
        rows,
        10000,
      );

      expect(result).toHaveLength(2);
      expect(result[0].departmentName).toBe('Sales');
      expect(result[0].amount).toBe(7500);
      expect(result[0].percentage).toBe(75);
      expect(result[1].departmentName).toBe('Marketing');
      expect(result[1].amount).toBe(2500);
      expect(result[1].percentage).toBe(25);
    });

    it('should return 0 percentage when totalRevenue is 0', () => {
      const rows: RawRevenueByDepartmentRow[] = [
        {
          department_name: 'Sales',
          department_id: 'dept-001',
          amount: '500.00',
        },
      ];

      const result = DashboardDataTransformer.transformRevenueByDepartment(
        rows,
        0,
      );

      expect(result[0].percentage).toBe(0);
      expect(result[0].amount).toBe(500);
    });

    it('should handle fractional percentages with precision', () => {
      const rows: RawRevenueByDepartmentRow[] = [
        {
          department_name: 'Engineering',
          department_id: 'dept-003',
          amount: '3333.33',
        },
      ];

      const result = DashboardDataTransformer.transformRevenueByDepartment(
        rows,
        10000,
      );

      // percentageOf rounds to 2 decimal places by default
      expect(result[0].percentage).toBe(33.33);
    });
  });

  // ==========================================================
  // transformOrdersByStatus
  // ==========================================================
  describe('transformOrdersByStatus', () => {
    it('should convert count and total_amount strings to numbers', () => {
      const rows: RawOrderStatusRow[] = [
        { status: 'PENDING', count: '25', total_amount: '12500.00' },
        { status: 'CONFIRMED', count: '40', total_amount: '35000.75' },
        { status: 'COMPLETED', count: '100', total_amount: '98000.00' },
      ];

      const result = DashboardDataTransformer.transformOrdersByStatus(rows);

      expect(result).toEqual([
        { status: 'PENDING', count: 25, totalAmount: 12500 },
        { status: 'CONFIRMED', count: 40, totalAmount: 35000.75 },
        { status: 'COMPLETED', count: 100, totalAmount: 98000 },
      ]);
    });

    it('should return empty array for empty input', () => {
      const result = DashboardDataTransformer.transformOrdersByStatus([]);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================
  // transformCustomerGrowth
  // ==========================================================
  describe('transformCustomerGrowth', () => {
    it('should calculate netGrowth as new minus churned', () => {
      const rows: RawCustomerGrowthRow[] = [
        {
          period: '2024-01',
          new_customers: '20',
          churned_customers: '5',
        },
        {
          period: '2024-02',
          new_customers: '15',
          churned_customers: '18',
        },
      ];

      const result = DashboardDataTransformer.transformCustomerGrowth(rows);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        period: '2024-01',
        newCustomers: 20,
        churnedCustomers: 5,
        netGrowth: 15,
      });
      expect(result[1]).toEqual({
        period: '2024-02',
        newCustomers: 15,
        churnedCustomers: 18,
        netGrowth: -3,
      });
    });

    it('should handle zero values', () => {
      const rows: RawCustomerGrowthRow[] = [
        {
          period: '2024-03',
          new_customers: '0',
          churned_customers: '0',
        },
      ];

      const result = DashboardDataTransformer.transformCustomerGrowth(rows);

      expect(result[0].netGrowth).toBe(0);
    });
  });

  // ==========================================================
  // transformPaymentStatus
  // ==========================================================
  describe('transformPaymentStatus', () => {
    it('should convert cnt and total_amount strings to numbers', () => {
      const rows: RawPaymentStatusRow[] = [
        { status: 'PAID', cnt: '50', total_amount: '75000.00' },
        { status: 'PENDING', cnt: '10', total_amount: '15000.50' },
      ];

      const result = DashboardDataTransformer.transformPaymentStatus(rows);

      expect(result).toEqual([
        { status: 'PAID', count: 50, amount: 75000 },
        { status: 'PENDING', count: 10, amount: 15000.5 },
      ]);
    });

    it('should return empty array for empty input', () => {
      const result = DashboardDataTransformer.transformPaymentStatus([]);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================
  // transformLeaderboard
  // ==========================================================
  describe('transformLeaderboard', () => {
    it('should calculate overallScore with weighted formula', () => {
      const rows: RawLeaderboardRow[] = [
        {
          staff_id: 'staff-001',
          staff_name: 'Alice',
          department_name: 'Sales',
          order_count: '20',
          total_revenue: '100',
          new_customers: '10',
          kpi_achievement: '80',
        },
      ];

      const result = DashboardDataTransformer.transformLeaderboard(rows);

      // overallScore = 100*0.4 + 20*0.2 + 10*0.2 + 80*0.2
      //             = 40 + 4 + 2 + 16 = 62
      expect(result[0].rank).toBe(1);
      expect(result[0].staffName).toBe('Alice');
      expect(result[0].departmentName).toBe('Sales');
      expect(result[0].revenue).toBe(100);
      expect(result[0].orderCount).toBe(20);
      expect(result[0].newCustomers).toBe(10);
      expect(result[0].kpiAchievement).toBe(80);
      expect(result[0].overallScore).toBe(62);
    });

    it('should assign ranks based on array index', () => {
      const rows: RawLeaderboardRow[] = [
        {
          staff_id: 'staff-001',
          staff_name: 'Alice',
          department_name: 'Sales',
          order_count: '30',
          total_revenue: '5000',
          new_customers: '15',
          kpi_achievement: '95',
        },
        {
          staff_id: 'staff-002',
          staff_name: 'Bob',
          department_name: 'Marketing',
          order_count: '20',
          total_revenue: '3500',
          new_customers: '10',
          kpi_achievement: '85',
        },
      ];

      const result = DashboardDataTransformer.transformLeaderboard(rows);

      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
    });

    it('should handle zero values in score calculation', () => {
      const rows: RawLeaderboardRow[] = [
        {
          staff_id: 'staff-001',
          staff_name: 'New Employee',
          department_name: 'Sales',
          order_count: '0',
          total_revenue: '0',
          new_customers: '0',
          kpi_achievement: '0',
        },
      ];

      const result = DashboardDataTransformer.transformLeaderboard(rows);

      expect(result[0].overallScore).toBe(0);
    });

    it('should return empty array for empty input', () => {
      const result = DashboardDataTransformer.transformLeaderboard([]);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================
  // transformOverdueOrders
  // ==========================================================
  describe('transformOverdueOrders', () => {
    it('should floor days_overdue to integer', () => {
      const rows: RawOverdueOrderRow[] = [
        {
          id: 'order-001',
          order_code: 'ORD-2024-001',
          total_amount: '5000.00',
          payment_deadline: '2024-01-15',
          days_overdue: '7.8',
        },
        {
          id: 'order-002',
          order_code: 'ORD-2024-002',
          total_amount: '3000.00',
          payment_deadline: '2024-01-10',
          days_overdue: '12.2',
        },
      ];

      const result = DashboardDataTransformer.transformOverdueOrders(rows);

      expect(result).toEqual([
        { id: 'order-001', orderCode: 'ORD-2024-001', daysOverdue: 7 },
        { id: 'order-002', orderCode: 'ORD-2024-002', daysOverdue: 12 },
      ]);
    });

    it('should handle integer days_overdue without change', () => {
      const rows: RawOverdueOrderRow[] = [
        {
          id: 'order-003',
          order_code: 'ORD-2024-003',
          total_amount: '1000.00',
          payment_deadline: '2024-02-01',
          days_overdue: '3',
        },
      ];

      const result = DashboardDataTransformer.transformOverdueOrders(rows);

      expect(result[0].daysOverdue).toBe(3);
    });

    it('should return empty array for empty input', () => {
      const result = DashboardDataTransformer.transformOverdueOrders([]);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================
  // transformExpiringContracts
  // ==========================================================
  describe('transformExpiringContracts', () => {
    it('should convert days_to_expiry string to number', () => {
      const rows: RawExpiringContractRow[] = [
        {
          id: 'contract-001',
          name: 'Enterprise License',
          contract_number: 'CTR-2024-001',
          end_date: '2024-03-15',
          days_to_expiry: '14',
        },
        {
          id: 'contract-002',
          name: 'Standard License',
          contract_number: 'CTR-2024-002',
          end_date: '2024-02-28',
          days_to_expiry: '3',
        },
      ];

      const result = DashboardDataTransformer.transformExpiringContracts(rows);

      expect(result).toEqual([
        { id: 'contract-001', name: 'Enterprise License', daysToExpiry: 14 },
        { id: 'contract-002', name: 'Standard License', daysToExpiry: 3 },
      ]);
    });

    it('should handle zero days to expiry', () => {
      const rows: RawExpiringContractRow[] = [
        {
          id: 'contract-003',
          name: 'Expiring Today',
          contract_number: 'CTR-2024-003',
          end_date: '2024-02-07',
          days_to_expiry: '0',
        },
      ];

      const result = DashboardDataTransformer.transformExpiringContracts(rows);

      expect(result[0].daysToExpiry).toBe(0);
    });

    it('should return empty array for empty input', () => {
      const result = DashboardDataTransformer.transformExpiringContracts([]);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================
  // transformKpiCategories
  // ==========================================================
  describe('transformKpiCategories', () => {
    it('should map kpi_category to category', () => {
      const rows: RawKpiCategoryRow[] = [
        {
          kpi_category: 'Revenue',
          total_kpis: '5',
          achieved: '3',
          achievement_rate: '60.00',
        },
        {
          kpi_category: 'Customer Acquisition',
          total_kpis: '8',
          achieved: '6',
          achievement_rate: '75.00',
        },
      ];

      const result = DashboardDataTransformer.transformKpiCategories(rows);

      expect(result).toEqual([
        { category: 'Revenue', total: 5, achieved: 3, rate: 60 },
        {
          category: 'Customer Acquisition',
          total: 8,
          achieved: 6,
          rate: 75,
        },
      ]);
    });

    it('should handle zero values', () => {
      const rows: RawKpiCategoryRow[] = [
        {
          kpi_category: 'New Category',
          total_kpis: '0',
          achieved: '0',
          achievement_rate: '0',
        },
      ];

      const result = DashboardDataTransformer.transformKpiCategories(rows);

      expect(result[0]).toEqual({
        category: 'New Category',
        total: 0,
        achieved: 0,
        rate: 0,
      });
    });

    it('should return empty array for empty input', () => {
      const result = DashboardDataTransformer.transformKpiCategories([]);

      expect(result).toEqual([]);
    });
  });
});
