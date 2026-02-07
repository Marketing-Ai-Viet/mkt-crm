import {
  widgetFilterConfigSchema,
  widgetDisplayConfigSchema,
  widgetOrderItemSchema,
  widgetOrderSchema,
  globalFiltersSchema,
} from 'src/mkt-core/mkt-dashboard/types/dashboard-config.schema';

describe('Dashboard Config Schemas', () => {
  // ==========================================================
  // widgetFilterConfigSchema
  // ==========================================================
  describe('widgetFilterConfigSchema', () => {
    it('should accept empty object', () => {
      const result = widgetFilterConfigSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it('should accept valid object with all fields', () => {
      const input = {
        departmentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        staffId: '11111111-2222-3333-4444-555555555555',
        customerTier: 'GOLD',
        orderStatus: 'CONFIRMED',
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z',
        },
      };

      const result = widgetFilterConfigSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customerTier).toBe('GOLD');
        expect(result.data.orderStatus).toBe('CONFIRMED');
      }
    });

    it('should accept all valid customerTier values', () => {
      const tiers = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'] as const;

      for (const tier of tiers) {
        const result = widgetFilterConfigSchema.safeParse({
          customerTier: tier,
        });

        expect(result.success).toBe(true);
      }
    });

    it('should accept all valid orderStatus values', () => {
      const statuses = [
        'PENDING',
        'CONFIRMED',
        'COMPLETED',
        'LOCKED',
        'PROCESSING',
      ] as const;

      for (const status of statuses) {
        const result = widgetFilterConfigSchema.safeParse({
          orderStatus: status,
        });

        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid UUID for departmentId', () => {
      const result = widgetFilterConfigSchema.safeParse({
        departmentId: 'not-a-uuid',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID for staffId', () => {
      const result = widgetFilterConfigSchema.safeParse({
        staffId: '12345',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid customerTier enum value', () => {
      const result = widgetFilterConfigSchema.safeParse({
        customerTier: 'PLATINUM',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid orderStatus enum value', () => {
      const result = widgetFilterConfigSchema.safeParse({
        orderStatus: 'CANCELLED',
      });

      expect(result.success).toBe(false);
    });

    it('should reject unknown extra fields due to strict mode', () => {
      const result = widgetFilterConfigSchema.safeParse({
        departmentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        unknownField: 'should fail',
      });

      expect(result.success).toBe(false);
    });

    it('should accept dateRange with only start', () => {
      const result = widgetFilterConfigSchema.safeParse({
        dateRange: {
          start: '2024-06-01T00:00:00Z',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should accept dateRange with only end', () => {
      const result = widgetFilterConfigSchema.safeParse({
        dateRange: {
          end: '2024-12-31T23:59:59Z',
        },
      });

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================
  // widgetDisplayConfigSchema
  // ==========================================================
  describe('widgetDisplayConfigSchema', () => {
    it('should apply default limit of 10 for empty object', () => {
      const result = widgetDisplayConfigSchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
      }
    });

    it('should accept valid object with all fields', () => {
      const input = {
        chartColors: ['#FF0000', '#00FF00', '#0000FF'],
        showLegend: true,
        showTrend: false,
        compareWithPreviousPeriod: true,
        limit: 25,
      };

      const result = widgetDisplayConfigSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.chartColors).toEqual([
          '#FF0000',
          '#00FF00',
          '#0000FF',
        ]);
        expect(result.data.showLegend).toBe(true);
        expect(result.data.showTrend).toBe(false);
        expect(result.data.compareWithPreviousPeriod).toBe(true);
        expect(result.data.limit).toBe(25);
      }
    });

    it('should accept chartColors with exactly 10 items', () => {
      const colors = Array.from({ length: 10 }, (_, i) => `color-${i}`);
      const result = widgetDisplayConfigSchema.safeParse({
        chartColors: colors,
      });

      expect(result.success).toBe(true);
    });

    it('should reject chartColors with more than 10 items', () => {
      const colors = Array.from({ length: 11 }, (_, i) => `color-${i}`);
      const result = widgetDisplayConfigSchema.safeParse({
        chartColors: colors,
      });

      expect(result.success).toBe(false);
    });

    it('should reject limit below 1', () => {
      const result = widgetDisplayConfigSchema.safeParse({ limit: 0 });

      expect(result.success).toBe(false);
    });

    it('should reject limit above 100', () => {
      const result = widgetDisplayConfigSchema.safeParse({ limit: 101 });

      expect(result.success).toBe(false);
    });

    it('should accept limit at boundary values 1 and 100', () => {
      const resultMin = widgetDisplayConfigSchema.safeParse({ limit: 1 });
      const resultMax = widgetDisplayConfigSchema.safeParse({ limit: 100 });

      expect(resultMin.success).toBe(true);
      expect(resultMax.success).toBe(true);
    });

    it('should reject non-integer limit', () => {
      const result = widgetDisplayConfigSchema.safeParse({ limit: 5.5 });

      expect(result.success).toBe(false);
    });

    it('should reject unknown fields due to strict mode', () => {
      const result = widgetDisplayConfigSchema.safeParse({
        showLegend: true,
        fontSize: 14,
      });

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================
  // widgetOrderItemSchema & widgetOrderSchema
  // ==========================================================
  describe('widgetOrderItemSchema', () => {
    const validItem = {
      widgetCode: 'revenue_chart',
      gridCol: 1,
      gridRow: 1,
      colSpan: 6,
      rowSpan: 2,
      isVisible: true,
    };

    it('should accept a valid widget order item', () => {
      const result = widgetOrderItemSchema.safeParse(validItem);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validItem);
      }
    });

    it('should reject empty widgetCode', () => {
      const result = widgetOrderItemSchema.safeParse({
        ...validItem,
        widgetCode: '',
      });

      expect(result.success).toBe(false);
    });

    it('should reject gridCol of 0', () => {
      const result = widgetOrderItemSchema.safeParse({
        ...validItem,
        gridCol: 0,
      });

      expect(result.success).toBe(false);
    });

    it('should reject gridCol of 13', () => {
      const result = widgetOrderItemSchema.safeParse({
        ...validItem,
        gridCol: 13,
      });

      expect(result.success).toBe(false);
    });

    it('should accept gridCol boundary values 1 and 12', () => {
      const resultMin = widgetOrderItemSchema.safeParse({
        ...validItem,
        gridCol: 1,
      });
      const resultMax = widgetOrderItemSchema.safeParse({
        ...validItem,
        gridCol: 12,
      });

      expect(resultMin.success).toBe(true);
      expect(resultMax.success).toBe(true);
    });

    it('should reject rowSpan of 5', () => {
      const result = widgetOrderItemSchema.safeParse({
        ...validItem,
        rowSpan: 5,
      });

      expect(result.success).toBe(false);
    });

    it('should accept rowSpan boundary values 1 and 4', () => {
      const resultMin = widgetOrderItemSchema.safeParse({
        ...validItem,
        rowSpan: 1,
      });
      const resultMax = widgetOrderItemSchema.safeParse({
        ...validItem,
        rowSpan: 4,
      });

      expect(resultMin.success).toBe(true);
      expect(resultMax.success).toBe(true);
    });

    it('should reject colSpan of 0', () => {
      const result = widgetOrderItemSchema.safeParse({
        ...validItem,
        colSpan: 0,
      });

      expect(result.success).toBe(false);
    });

    it('should reject colSpan of 13', () => {
      const result = widgetOrderItemSchema.safeParse({
        ...validItem,
        colSpan: 13,
      });

      expect(result.success).toBe(false);
    });

    it('should reject gridRow of 0', () => {
      const result = widgetOrderItemSchema.safeParse({
        ...validItem,
        gridRow: 0,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('widgetOrderSchema', () => {
    const validItem = {
      widgetCode: 'revenue_chart',
      gridCol: 1,
      gridRow: 1,
      colSpan: 6,
      rowSpan: 2,
      isVisible: true,
    };

    it('should accept an empty array', () => {
      const result = widgetOrderSchema.safeParse([]);

      expect(result.success).toBe(true);
    });

    it('should accept array with valid items', () => {
      const items = [
        validItem,
        { ...validItem, widgetCode: 'order_stats', gridCol: 7 },
      ];

      const result = widgetOrderSchema.safeParse(items);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    it('should accept array with exactly 20 items', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        ...validItem,
        widgetCode: `widget_${i}`,
      }));

      const result = widgetOrderSchema.safeParse(items);

      expect(result.success).toBe(true);
    });

    it('should reject array with more than 20 items', () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        ...validItem,
        widgetCode: `widget_${i}`,
      }));

      const result = widgetOrderSchema.safeParse(items);

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================
  // globalFiltersSchema
  // ==========================================================
  describe('globalFiltersSchema', () => {
    it('should accept empty object', () => {
      const result = globalFiltersSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it('should accept valid object with all fields', () => {
      const input = {
        period: 'THIS_MONTH',
        departmentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z',
        },
      };

      const result = globalFiltersSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.period).toBe('THIS_MONTH');
      }
    });

    it('should accept all valid period values', () => {
      const periods = [
        'TODAY',
        'THIS_WEEK',
        'THIS_MONTH',
        'THIS_QUARTER',
        'THIS_YEAR',
        'CUSTOM',
      ] as const;

      for (const period of periods) {
        const result = globalFiltersSchema.safeParse({ period });

        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid period value', () => {
      const result = globalFiltersSchema.safeParse({
        period: 'LAST_MONTH',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid departmentId', () => {
      const result = globalFiltersSchema.safeParse({
        departmentId: 'invalid-uuid',
      });

      expect(result.success).toBe(false);
    });

    it('should reject unknown fields due to strict mode', () => {
      const result = globalFiltersSchema.safeParse({
        period: 'TODAY',
        extraField: 'should fail',
      });

      expect(result.success).toBe(false);
    });

    it('should require both start and end in dateRange', () => {
      const resultNoEnd = globalFiltersSchema.safeParse({
        dateRange: {
          start: '2024-01-01T00:00:00Z',
        },
      });

      const resultNoStart = globalFiltersSchema.safeParse({
        dateRange: {
          end: '2024-12-31T23:59:59Z',
        },
      });

      expect(resultNoEnd.success).toBe(false);
      expect(resultNoStart.success).toBe(false);
    });

    it('should reject invalid datetime format in dateRange', () => {
      const result = globalFiltersSchema.safeParse({
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      });

      expect(result.success).toBe(false);
    });
  });
});
