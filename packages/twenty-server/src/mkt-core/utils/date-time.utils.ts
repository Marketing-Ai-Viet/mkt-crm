import { DateTime, Duration, DurationLikeObject, Interval } from 'luxon';

/**
 * Date range type using luxon DateTime
 */
export type DateTimeRange = {
  start: DateTime;
  end: DateTime;
};

/**
 * Common date formats
 */
export const DATE_TIME_FORMATS = {
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  DATE_ONLY: 'yyyy-MM-dd',
  TIME_ONLY: 'HH:mm:ss',
  DISPLAY_DATE: 'dd/MM/yyyy',
  DISPLAY_DATE_TIME: 'dd/MM/yyyy HH:mm:ss',
  DISPLAY_DATE_TIME_SHORT: 'dd/MM/yyyy HH:mm',
  SQL_DATE: 'yyyy-MM-dd',
  SQL_DATE_TIME: 'yyyy-MM-dd HH:mm:ss',
} as const;

/**
 * Luxon DateTime utilities for common date/time operations
 */
export class DateTimeUtils {
  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Get current UTC DateTime
   */
  static now(): DateTime {
    return DateTime.utc();
  }

  /**
   * Get current local DateTime
   */
  static nowLocal(): DateTime {
    return DateTime.local();
  }

  /**
   * Create DateTime from JavaScript Date
   */
  static fromDate(date: Date): DateTime {
    return DateTime.fromJSDate(date, { zone: 'utc' });
  }

  /**
   * Create DateTime from ISO string
   */
  static fromISO(isoString: string): DateTime {
    return DateTime.fromISO(isoString, { zone: 'utc' });
  }

  /**
   * Create DateTime from SQL date string
   */
  static fromSQL(sqlString: string): DateTime {
    return DateTime.fromSQL(sqlString, { zone: 'utc' });
  }

  /**
   * Create DateTime from milliseconds timestamp
   */
  static fromMillis(millis: number): DateTime {
    return DateTime.fromMillis(millis, { zone: 'utc' });
  }

  /**
   * Create DateTime from seconds timestamp
   */
  static fromSeconds(seconds: number): DateTime {
    return DateTime.fromSeconds(seconds, { zone: 'utc' });
  }

  // ============================================
  // Conversion Methods
  // ============================================

  /**
   * Convert DateTime to JavaScript Date (returns undefined if invalid)
   */
  static toDate(dateTime?: DateTime): Date | undefined {
    return dateTime?.isValid ? dateTime.toJSDate() : undefined;
  }

  /**
   * Convert DateTime to JavaScript Date (throws if invalid)
   */
  static toDateRequired(dateTime: DateTime): Date {
    if (!dateTime.isValid) {
      throw new Error(`Invalid DateTime: ${dateTime.invalidReason}`);
    }

    return dateTime.toJSDate();
  }

  /**
   * Convert DateTime to ISO string
   */
  static toISO(dateTime: DateTime): string {
    return dateTime.toISO() ?? '';
  }

  /**
   * Convert DateTime to SQL format
   */
  static toSQL(dateTime: DateTime): string {
    return dateTime.toSQL() ?? '';
  }

  /**
   * Convert DateTime to milliseconds timestamp
   */
  static toMillis(dateTime: DateTime): number {
    return dateTime.toMillis();
  }

  /**
   * Convert DateTime to seconds timestamp
   */
  static toSeconds(dateTime: DateTime): number {
    return dateTime.toSeconds();
  }

  /**
   * Format DateTime with custom format
   */
  static format(dateTime: DateTime, format: string): string {
    return dateTime.toFormat(format);
  }

  // ============================================
  // Date Range Methods
  // ============================================

  /**
   * Get start and end of today (UTC)
   */
  static getToday(): DateTimeRange {
    const now = DateTime.utc();

    return {
      start: now.startOf('day'),
      end: now.endOf('day'),
    };
  }

  /**
   * Get start and end of yesterday (UTC)
   */
  static getYesterday(): DateTimeRange {
    const yesterday = DateTime.utc().minus({ days: 1 });

    return {
      start: yesterday.startOf('day'),
      end: yesterday.endOf('day'),
    };
  }

  /**
   * Get start and end of current week (UTC)
   */
  static getCurrentWeek(): DateTimeRange {
    const now = DateTime.utc();

    return {
      start: now.startOf('week'),
      end: now.endOf('week'),
    };
  }

  /**
   * Get start and end of current month (UTC)
   */
  static getCurrentMonth(): DateTimeRange {
    const now = DateTime.utc();

    return {
      start: now.startOf('month'),
      end: now.endOf('month'),
    };
  }

  /**
   * Get start and end of previous month (UTC)
   */
  static getLastMonth(): DateTimeRange {
    const lastMonth = DateTime.utc().minus({ months: 1 });

    return {
      start: lastMonth.startOf('month'),
      end: lastMonth.endOf('month'),
    };
  }

  /**
   * Get start and end of current quarter (UTC)
   */
  static getCurrentQuarter(): DateTimeRange {
    const now = DateTime.utc();

    return {
      start: now.startOf('quarter'),
      end: now.endOf('quarter'),
    };
  }

  /**
   * Get start and end of current year (UTC)
   */
  static getCurrentYear(): DateTimeRange {
    const now = DateTime.utc();

    return {
      start: now.startOf('year'),
      end: now.endOf('year'),
    };
  }

  /**
   * Get date range for last N days
   */
  static getLastNDays(days: number): DateTimeRange {
    const now = DateTime.utc();

    return {
      start: now.minus({ days }).startOf('day'),
      end: now.endOf('day'),
    };
  }

  /**
   * Get date range for last N months
   */
  static getLastNMonths(months: number): DateTimeRange {
    const now = DateTime.utc();

    return {
      start: now.minus({ months }).startOf('month'),
      end: now.endOf('day'),
    };
  }

  /**
   * Get date range for next N days (future period)
   */
  static getNextNDays(days: number): DateTimeRange {
    const now = DateTime.utc();

    return {
      start: now,
      end: now.plus({ days }).endOf('day'),
    };
  }

  // ============================================
  // Comparison Methods
  // ============================================

  /**
   * Check if DateTime is in the past
   */
  static isPast(dateTime: DateTime): boolean {
    return dateTime < DateTime.utc();
  }

  /**
   * Check if DateTime is in the future
   */
  static isFuture(dateTime: DateTime): boolean {
    return dateTime > DateTime.utc();
  }

  /**
   * Check if DateTime is today
   */
  static isToday(dateTime: DateTime): boolean {
    return dateTime.hasSame(DateTime.utc(), 'day');
  }

  /**
   * Check if DateTime is within a range
   */
  static isInRange(
    dateTime: DateTime,
    start: DateTime,
    end: DateTime,
  ): boolean {
    return dateTime >= start && dateTime <= end;
  }

  /**
   * Check if DateTime is expired (before now)
   */
  static isExpired(dateTime: DateTime): boolean {
    return dateTime < DateTime.utc();
  }

  /**
   * Check if DateTime will expire within given duration
   */
  static willExpireWithin(
    dateTime: DateTime,
    duration: DurationLikeObject,
  ): boolean {
    const threshold = DateTime.utc().plus(duration);

    return dateTime <= threshold;
  }

  // ============================================
  // Difference Methods
  // ============================================

  /**
   * Get difference in milliseconds
   */
  static diffInMillis(start: DateTime, end: DateTime): number {
    return end.diff(start).milliseconds;
  }

  /**
   * Get difference in seconds
   */
  static diffInSeconds(start: DateTime, end: DateTime): number {
    return end.diff(start, 'seconds').seconds;
  }

  /**
   * Get difference in minutes
   */
  static diffInMinutes(start: DateTime, end: DateTime): number {
    return end.diff(start, 'minutes').minutes;
  }

  /**
   * Get difference in hours
   */
  static diffInHours(start: DateTime, end: DateTime): number {
    return end.diff(start, 'hours').hours;
  }

  /**
   * Get difference in days
   */
  static diffInDays(start: DateTime, end: DateTime): number {
    return end.diff(start, 'days').days;
  }

  /**
   * Get difference in months
   */
  static diffInMonths(start: DateTime, end: DateTime): number {
    return end.diff(start, 'months').months;
  }

  /**
   * Get time until expiration in seconds (negative if expired)
   */
  static secondsUntilExpiry(expiresAt: DateTime): number {
    return Math.floor(expiresAt.diff(DateTime.utc()).as('seconds'));
  }

  // ============================================
  // Manipulation Methods
  // ============================================

  /**
   * Add duration to DateTime
   */
  static add(dateTime: DateTime, duration: DurationLikeObject): DateTime {
    return dateTime.plus(duration);
  }

  /**
   * Subtract duration from DateTime
   */
  static subtract(dateTime: DateTime, duration: DurationLikeObject): DateTime {
    return dateTime.minus(duration);
  }

  /**
   * Get start of unit (day, month, year, etc.)
   */
  static startOf(
    dateTime: DateTime,
    unit: 'day' | 'week' | 'month' | 'quarter' | 'year',
  ): DateTime {
    return dateTime.startOf(unit);
  }

  /**
   * Get end of unit (day, month, year, etc.)
   */
  static endOf(
    dateTime: DateTime,
    unit: 'day' | 'week' | 'month' | 'quarter' | 'year',
  ): DateTime {
    return dateTime.endOf(unit);
  }

  // ============================================
  // Interval Methods
  // ============================================

  /**
   * Create interval from DateTimeRange
   */
  static createInterval(range: DateTimeRange): Interval {
    return Interval.fromDateTimes(range.start, range.end);
  }

  /**
   * Check if two intervals overlap
   */
  static intervalsOverlap(
    interval1: DateTimeRange,
    interval2: DateTimeRange,
  ): boolean {
    const i1 = Interval.fromDateTimes(interval1.start, interval1.end);
    const i2 = Interval.fromDateTimes(interval2.start, interval2.end);

    return i1.overlaps(i2);
  }

  /**
   * Get duration of interval
   */
  static getIntervalDuration(range: DateTimeRange): Duration {
    return Interval.fromDateTimes(range.start, range.end).toDuration();
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Parse any date input to DateTime
   */
  static parse(input: Date | string | number | DateTime): DateTime {
    if (input instanceof DateTime) {
      return input;
    }

    if (input instanceof Date) {
      return DateTime.fromJSDate(input, { zone: 'utc' });
    }

    if (typeof input === 'number') {
      return DateTime.fromMillis(input, { zone: 'utc' });
    }

    return DateTime.fromISO(input, { zone: 'utc' });
  }

  /**
   * Check if input is valid DateTime or can be parsed
   */
  static isValid(input: Date | string | number | DateTime): boolean {
    try {
      const dt = this.parse(input);

      return dt.isValid;
    } catch {
      return false;
    }
  }

  /**
   * Get human-readable relative time (e.g., "2 hours ago", "in 3 days")
   */
  static toRelative(dateTime: DateTime): string {
    return dateTime.toRelative() ?? '';
  }

  /**
   * Convert DateTimeRange to JS Date range
   */
  static toDateRange(range: DateTimeRange): { start: Date; end: Date } {
    return {
      start: range.start.toJSDate(),
      end: range.end.toJSDate(),
    };
  }
}
