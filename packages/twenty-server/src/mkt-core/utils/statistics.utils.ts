/**
 * Mathematical utilities for statistical calculations
 */
export class StatisticsUtils {
  /**
   * Calculate percentage change between two numbers
   */
  static calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Number((((current - previous) / previous) * 100).toFixed(2));
  }

  /**
   * Calculate absolute change between two numbers
   */
  static calculateAbsoluteChange(current: number, previous: number): number {
    return current - previous;
  }

  /**
   * Calculate growth rate
   */
  static calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 1 : 0;
    }

    return Number((current / previous).toFixed(2));
  }

  /**
   * Calculate average from an array of numbers
   */
  static calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);

    return Number((sum / numbers.length).toFixed(2));
  }

  /**
   * Calculate sum from an array of numbers
   */
  static calculateSum(numbers: number[]): number {
    return numbers.reduce((acc, num) => acc + num, 0);
  }

  /**
   * Find maximum value in an array
   */
  static findMax(numbers: number[]): number {
    return numbers.length > 0 ? Math.max(...numbers) : 0;
  }

  /**
   * Find minimum value in an array
   */
  static findMin(numbers: number[]): number {
    return numbers.length > 0 ? Math.min(...numbers) : 0;
  }

  /**
   * Calculate median from an array of numbers
   */
  static calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
  }

  /**
   * Round number to specified decimal places
   */
  static roundToDecimal(value: number, decimals = 2): number {
    return Number(value.toFixed(decimals));
  }

  /**
   * Format number as currency
   */
  static formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  /**
   * Format number with thousands separator
   */
  static formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  /**
   * Calculate trend based on data points
   */
  static calculateTrend(dataPoints: number[]): 'up' | 'down' | 'stable' {
    if (dataPoints.length < 2) return 'stable';

    const first = dataPoints[0];
    const last = dataPoints[dataPoints.length - 1];

    if (last > first) return 'up';
    if (last < first) return 'down';

    return 'stable';
  }
}
