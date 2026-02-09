import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

export class StatisticsUtils {
  /**
   * Calculate percentage change between two values
   * percentageChange(100, 120) → 20
   * percentageChange(100, 80) → -20
   * percentageChange(0, 0) → 0 (handle division by zero)
   */
  static percentageChange(previousValue: number, currentValue: number): number {
    if (previousValue === 0 && currentValue === 0) return 0;
    if (previousValue === 0) return 100; // From zero to something = 100%

    return MoneyUtils.percentageChange(previousValue, currentValue).toNumber();
  }

  /**
   * Detect trend from array of values
   * detectTrend([10, 20, 30]) → 'UP'
   * detectTrend([30, 20, 10]) → 'DOWN'
   * detectTrend([10, 10, 10]) → 'STABLE'
   * detectTrend([]) → 'STABLE'
   */
  static detectTrend(values: number[]): 'UP' | 'DOWN' | 'STABLE' {
    if (values.length < 2) return 'STABLE';

    // Compare first half average vs second half average
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);

    const firstAvg = MoneyUtils.average(firstHalf).toNumber();
    const secondAvg = MoneyUtils.average(secondHalf).toNumber();

    const threshold = 0.05; // 5% threshold for stability
    const change = secondAvg - firstAvg;
    const relativeChange =
      firstAvg === 0 ? (secondAvg > 0 ? 1 : 0) : change / firstAvg;

    if (relativeChange > threshold) return 'UP';
    if (relativeChange < -threshold) return 'DOWN';

    return 'STABLE';
  }

  /**
   * Calculate growth rates between consecutive values
   * growthRates([100, 120, 150]) → [20, 25]
   */
  static growthRates(values: number[]): number[] {
    const rates: number[] = [];

    for (let i = 1; i < values.length; i++) {
      rates.push(StatisticsUtils.percentageChange(values[i - 1], values[i]));
    }

    return rates;
  }

  /**
   * Calculate collection rate (collected / total * 100)
   */
  static collectionRate(collected: number, total: number): number {
    if (total === 0) return 0;

    return MoneyUtils.percentageOf(collected, total).toNumber();
  }

  /**
   * Calculate achievement rate (achieved / total * 100)
   */
  static achievementRate(achieved: number, total: number): number {
    if (total === 0) return 0;

    return MoneyUtils.percentageOf(achieved, total).toNumber();
  }

  /**
   * Calculate projected value based on current progress and time remaining
   * E.g., if we've made 100K in first 10 days of month, project for 30 days
   */
  static projectValue(
    currentValue: number,
    elapsedDays: number,
    totalDays: number,
  ): number {
    if (elapsedDays <= 0) return 0;
    const dailyRate = MoneyUtils.divideSafe(currentValue, elapsedDays);

    return MoneyUtils.multiply(dailyRate.toNumber(), totalDays).toNumber();
  }
}
