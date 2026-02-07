import { z } from 'zod';

export const widgetFilterConfigSchema = z
  .object({
    departmentId: z.string().uuid().optional(),
    staffId: z.string().uuid().optional(),
    customerTier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'DIAMOND']).optional(),
    orderStatus: z
      .enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'LOCKED', 'PROCESSING'])
      .optional(),
    dateRange: z
      .object({
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional(),
      })
      .optional(),
  })
  .strict();

export type WidgetFilterConfig = z.infer<typeof widgetFilterConfigSchema>;

export const widgetDisplayConfigSchema = z
  .object({
    chartColors: z.array(z.string()).max(10).optional(),
    showLegend: z.boolean().optional(),
    showTrend: z.boolean().optional(),
    compareWithPreviousPeriod: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).default(10),
  })
  .strict();

export type WidgetDisplayConfig = z.infer<typeof widgetDisplayConfigSchema>;

export const widgetOrderItemSchema = z.object({
  widgetCode: z.string().min(1),
  gridCol: z.number().int().min(1).max(12),
  gridRow: z.number().int().min(1),
  colSpan: z.number().int().min(1).max(12),
  rowSpan: z.number().int().min(1).max(4),
  isVisible: z.boolean(),
});

export const widgetOrderSchema = z.array(widgetOrderItemSchema).max(20);

export type WidgetOrderItem = z.infer<typeof widgetOrderItemSchema>;

export const globalFiltersSchema = z
  .object({
    period: z
      .enum([
        'TODAY',
        'THIS_WEEK',
        'THIS_MONTH',
        'THIS_QUARTER',
        'THIS_YEAR',
        'CUSTOM',
      ])
      .optional(),
    departmentId: z.string().uuid().optional(),
    dateRange: z
      .object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
      .optional(),
  })
  .strict();

export type GlobalFilters = z.infer<typeof globalFiltersSchema>;
