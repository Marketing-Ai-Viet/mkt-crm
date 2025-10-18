/**
 * Date range utilities for calculating periods and time ranges
 */
export class DateRangeUtils {
  /**
   * Get the start and end dates for the current month
   */
  static getCurrentMonth(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return { start, end };
  }

  /**
   * Get the start and end dates for the previous month
   */
  static getLastMonth(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Get today's date range (00:00:00 to 23:59:59)
   */
  static getToday(): { start: Date; end: Date } {
    const today = new Date();
    const start = new Date(today);

    start.setHours(0, 0, 0, 0);
    const end = new Date(today);

    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Get yesterday's date range
   */
  static getYesterday(): { start: Date; end: Date } {
    const yesterday = new Date();

    yesterday.setDate(yesterday.getDate() - 1);
    const start = new Date(yesterday);

    start.setHours(0, 0, 0, 0);
    const end = new Date(yesterday);

    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Get date range for the last N days
   */
  static getLastNDays(days: number): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end);

    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Get date range for the last N months
   */
  static getLastNMonths(months: number): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end);

    start.setMonth(start.getMonth() - months);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Get date range for future period (used for expiring items)
   */
  static getFuturePeriod(days: number): { start: Date; end: Date } {
    const start = new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

    return { start, end };
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
    return date.toISOString();
  }

  /**
   * Get the difference in days between two dates
   */
  static getDaysDifference(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());

    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
