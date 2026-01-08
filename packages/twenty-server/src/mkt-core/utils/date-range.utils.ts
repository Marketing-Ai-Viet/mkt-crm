import { DateTimeUtils } from './date-time.utils';

/**
 * Date range type
 */
export type DateRange = {
  start: Date;
  end: Date;
};

/**
 * Milliseconds per day constant
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Date range utilities for calculating periods and time ranges
 * Uses DateTimeUtils for consistent date handling
 */
export class DateRangeUtils {
  /**
   * Get the start and end dates for the current month
   */
  static getCurrentMonth(): DateRange {
    const now = DateTimeUtils.now();
    const startOfMonth = DateTimeUtils.startOf(now, 'month');
    const endOfMonth = DateTimeUtils.endOf(now, 'month');

    return {
      start: DateTimeUtils.toDate(startOfMonth) ?? new Date(),
      end: DateTimeUtils.toDate(endOfMonth) ?? new Date(),
    };
  }

  /**
   * Get the start and end dates for the previous month
   */
  static getLastMonth(): DateRange {
    const now = DateTimeUtils.now();
    const lastMonth = DateTimeUtils.subtract(now, { months: 1 });
    const startOfLastMonth = DateTimeUtils.startOf(lastMonth, 'month');
    const endOfLastMonth = DateTimeUtils.endOf(lastMonth, 'month');

    return {
      start: DateTimeUtils.toDate(startOfLastMonth) ?? new Date(),
      end: DateTimeUtils.toDate(endOfLastMonth) ?? new Date(),
    };
  }

  /**
   * Get today's date range (00:00:00 to 23:59:59)
   */
  static getToday(): DateRange {
    const now = DateTimeUtils.now();
    const startOfDay = DateTimeUtils.startOf(now, 'day');
    const endOfDay = DateTimeUtils.endOf(now, 'day');

    return {
      start: DateTimeUtils.toDate(startOfDay) ?? new Date(),
      end: DateTimeUtils.toDate(endOfDay) ?? new Date(),
    };
  }

  /**
   * Get yesterday's date range
   */
  static getYesterday(): DateRange {
    const now = DateTimeUtils.now();
    const yesterday = DateTimeUtils.subtract(now, { days: 1 });
    const startOfYesterday = DateTimeUtils.startOf(yesterday, 'day');
    const endOfYesterday = DateTimeUtils.endOf(yesterday, 'day');

    return {
      start: DateTimeUtils.toDate(startOfYesterday) ?? new Date(),
      end: DateTimeUtils.toDate(endOfYesterday) ?? new Date(),
    };
  }

  /**
   * Get date range for the last N days
   */
  static getLastNDays(days: number): DateRange {
    const now = DateTimeUtils.now();
    const startDate = DateTimeUtils.subtract(now, { days });
    const startOfStartDate = DateTimeUtils.startOf(startDate, 'day');
    const endOfNow = DateTimeUtils.endOf(now, 'day');

    return {
      start: DateTimeUtils.toDate(startOfStartDate) ?? new Date(),
      end: DateTimeUtils.toDate(endOfNow) ?? new Date(),
    };
  }

  /**
   * Get date range for the last N months
   */
  static getLastNMonths(months: number): DateRange {
    const now = DateTimeUtils.now();
    const startDate = DateTimeUtils.subtract(now, { months });
    const startOfStartMonth = DateTimeUtils.startOf(startDate, 'month');
    const endOfNow = DateTimeUtils.endOf(now, 'day');

    return {
      start: DateTimeUtils.toDate(startOfStartMonth) ?? new Date(),
      end: DateTimeUtils.toDate(endOfNow) ?? new Date(),
    };
  }

  /**
   * Get date range for future period (used for expiring items)
   */
  static getFuturePeriod(days: number): DateRange {
    const now = DateTimeUtils.now();
    const futureDate = DateTimeUtils.add(now, { days });

    return {
      start: DateTimeUtils.toDate(now) ?? new Date(),
      end: DateTimeUtils.toDate(futureDate) ?? new Date(),
    };
  }

  /**
   * Check if a date is within a range
   */
  static isDateInRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }

  /**
   * Format date for database queries (ISO string)
   */
  static toISOString(date: Date): string {
    const dateTime = DateTimeUtils.fromDate(date);

    return DateTimeUtils.toISO(dateTime);
  }

  /**
   * Get the difference in days between two dates
   */
  static getDaysDifference(start: Date, end: Date): number {
    const startDateTime = DateTimeUtils.fromDate(start);
    const endDateTime = DateTimeUtils.fromDate(end);
    const diffDays = Math.abs(
      DateTimeUtils.diffInDays(startDateTime, endDateTime),
    );

    return Math.ceil(diffDays);
  }

  /**
   * Get current timestamp in milliseconds
   */
  static nowMs(): number {
    return DateTimeUtils.toMillis(DateTimeUtils.now());
  }

  /**
   * Calculate milliseconds for a given number of days
   */
  static daysToMs(days: number): number {
    return days * MS_PER_DAY;
  }
}
