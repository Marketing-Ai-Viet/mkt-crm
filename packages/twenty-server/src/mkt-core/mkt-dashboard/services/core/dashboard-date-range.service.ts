import { Injectable, BadRequestException } from '@nestjs/common';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';

export type DateRange = {
  startDate: string; // ISO string
  endDate: string; // ISO string
};

@Injectable()
export class DashboardDateRangeService {
  /**
   * Resolve period type to actual date range
   * For CUSTOM period, startDate and endDate must be provided
   */
  resolve(
    period: DashboardPeriod,
    customStartDate?: string,
    customEndDate?: string,
  ): DateRange {
    switch (period) {
      case 'TODAY': {
        const range = DateTimeUtils.getToday();

        return {
          startDate: DateTimeUtils.toISO(range.start),
          endDate: DateTimeUtils.toISO(range.end),
        };
      }
      case 'THIS_WEEK': {
        const range = DateTimeUtils.getCurrentWeek();

        return {
          startDate: DateTimeUtils.toISO(range.start),
          endDate: DateTimeUtils.toISO(range.end),
        };
      }
      case 'THIS_MONTH': {
        const range = DateTimeUtils.getCurrentMonth();

        return {
          startDate: DateTimeUtils.toISO(range.start),
          endDate: DateTimeUtils.toISO(range.end),
        };
      }
      case 'THIS_QUARTER': {
        const range = DateTimeUtils.getCurrentQuarter();

        return {
          startDate: DateTimeUtils.toISO(range.start),
          endDate: DateTimeUtils.toISO(range.end),
        };
      }
      case 'THIS_YEAR': {
        const range = DateTimeUtils.getCurrentYear();

        return {
          startDate: DateTimeUtils.toISO(range.start),
          endDate: DateTimeUtils.toISO(range.end),
        };
      }
      case 'CUSTOM': {
        if (!customStartDate || !customEndDate) {
          throw new BadRequestException(
            'startDate and endDate are required for CUSTOM period',
          );
        }

        return {
          startDate: customStartDate,
          endDate: customEndDate,
        };
      }
      default: {
        // Fallback to this month
        const range = DateTimeUtils.getCurrentMonth();

        return {
          startDate: DateTimeUtils.toISO(range.start),
          endDate: DateTimeUtils.toISO(range.end),
        };
      }
    }
  }

  /**
   * Get the previous period's date range (for comparison)
   * E.g., if current period is THIS_MONTH (Jan 1-31), previous is Dec 1-31
   */
  getPreviousPeriod(
    period: DashboardPeriod,
    currentRange: DateRange,
  ): DateRange {
    const start = DateTimeUtils.fromISO(currentRange.startDate);
    const end = DateTimeUtils.fromISO(currentRange.endDate);
    const durationDays = DateTimeUtils.diffInDays(start, end);

    const previousEnd = DateTimeUtils.subtract(start, { days: 1 });
    const previousStart = DateTimeUtils.subtract(previousEnd, {
      days: durationDays,
    });

    return {
      startDate: DateTimeUtils.toISO(previousStart),
      endDate: DateTimeUtils.toISO(previousEnd),
    };
  }

  /**
   * Calculate elapsed and total days for current period (for projections)
   */
  getPeriodProgress(range: DateRange): {
    elapsedDays: number;
    totalDays: number;
  } {
    const start = DateTimeUtils.fromISO(range.startDate);
    const end = DateTimeUtils.fromISO(range.endDate);
    const now = DateTimeUtils.now();

    const totalDays = DateTimeUtils.diffInDays(start, end) + 1;
    const elapsedDays = Math.min(
      DateTimeUtils.diffInDays(start, now) + 1,
      totalDays,
    );

    return { elapsedDays, totalDays };
  }
}
