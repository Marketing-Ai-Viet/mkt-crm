import { StatisticsUtils } from 'src/mkt-core/mkt-dashboard/utils/statistics.utils';

describe('StatisticsUtils', () => {
  describe('percentageChange', () => {
    it('should return 0 when both values are zero', () => {
      expect(StatisticsUtils.percentageChange(0, 0)).toBe(0);
    });

    it('should return 100 when previous value is zero and current is positive', () => {
      expect(StatisticsUtils.percentageChange(0, 50)).toBe(100);
    });

    it('should return positive percentage for an increase', () => {
      expect(StatisticsUtils.percentageChange(100, 120)).toBe(20);
    });

    it('should return negative percentage for a decrease', () => {
      expect(StatisticsUtils.percentageChange(100, 80)).toBe(-20);
    });

    it('should return 0 when current equals previous (non-zero)', () => {
      expect(StatisticsUtils.percentageChange(100, 100)).toBe(0);
    });

    it('should return -100 when current drops to zero from non-zero', () => {
      expect(StatisticsUtils.percentageChange(50, 0)).toBe(-100);
    });
  });

  describe('detectTrend', () => {
    it('should return STABLE for an empty array', () => {
      expect(StatisticsUtils.detectTrend([])).toBe('STABLE');
    });

    it('should return STABLE for a single value', () => {
      expect(StatisticsUtils.detectTrend([10])).toBe('STABLE');
    });

    it('should return UP for increasing values', () => {
      expect(StatisticsUtils.detectTrend([10, 20, 30])).toBe('UP');
    });

    it('should return DOWN for decreasing values', () => {
      expect(StatisticsUtils.detectTrend([30, 20, 10])).toBe('DOWN');
    });

    it('should return STABLE for constant values', () => {
      expect(StatisticsUtils.detectTrend([10, 10, 10])).toBe('STABLE');
    });

    it('should return UP when values go from zero to positive', () => {
      expect(StatisticsUtils.detectTrend([0, 0, 10, 20])).toBe('UP');
    });

    it('should return STABLE for two equal values', () => {
      expect(StatisticsUtils.detectTrend([5, 5])).toBe('STABLE');
    });

    it('should return DOWN when values go from positive to zero', () => {
      expect(StatisticsUtils.detectTrend([20, 10, 0, 0])).toBe('DOWN');
    });
  });

  describe('growthRates', () => {
    it('should return an empty array for an empty input', () => {
      expect(StatisticsUtils.growthRates([])).toEqual([]);
    });

    it('should return an empty array for a single value', () => {
      expect(StatisticsUtils.growthRates([100])).toEqual([]);
    });

    it('should calculate growth rates between consecutive values', () => {
      expect(StatisticsUtils.growthRates([100, 120, 150])).toEqual([20, 25]);
    });

    it('should handle zero as the starting value', () => {
      const rates = StatisticsUtils.growthRates([0, 50, 100]);

      expect(rates[0]).toBe(100);
      expect(rates[1]).toBe(100);
    });

    it('should handle negative growth', () => {
      expect(StatisticsUtils.growthRates([200, 100])).toEqual([-50]);
    });
  });

  describe('collectionRate', () => {
    it('should return 0 when both collected and total are zero', () => {
      expect(StatisticsUtils.collectionRate(0, 0)).toBe(0);
    });

    it('should return the correct collection percentage', () => {
      expect(StatisticsUtils.collectionRate(50, 100)).toBe(50);
    });

    it('should return 100 when collected equals total', () => {
      expect(StatisticsUtils.collectionRate(100, 100)).toBe(100);
    });

    it('should handle partial collection', () => {
      expect(StatisticsUtils.collectionRate(25, 200)).toBe(12.5);
    });
  });

  describe('achievementRate', () => {
    it('should return 0 when both achieved and total are zero', () => {
      expect(StatisticsUtils.achievementRate(0, 0)).toBe(0);
    });

    it('should return the correct achievement percentage', () => {
      expect(StatisticsUtils.achievementRate(80, 100)).toBe(80);
    });

    it('should return 100 when fully achieved', () => {
      expect(StatisticsUtils.achievementRate(100, 100)).toBe(100);
    });

    it('should handle over-achievement', () => {
      expect(StatisticsUtils.achievementRate(150, 100)).toBe(150);
    });
  });

  describe('projectValue', () => {
    it('should return 0 when elapsed days is zero', () => {
      expect(StatisticsUtils.projectValue(100, 0, 30)).toBe(0);
    });

    it('should return 0 when elapsed days is negative', () => {
      expect(StatisticsUtils.projectValue(100, -5, 30)).toBe(0);
    });

    it('should project value linearly based on elapsed and total days', () => {
      expect(StatisticsUtils.projectValue(100, 10, 30)).toBe(300);
    });

    it('should return approximately the current value when elapsed equals total days', () => {
      // divideSafe rounds to 6 decimal places, so 100/30 * 30 may not be exactly 100
      expect(StatisticsUtils.projectValue(100, 30, 30)).toBeCloseTo(100, 0);
    });

    it('should handle fractional projections', () => {
      const projected = StatisticsUtils.projectValue(50, 7, 30);

      // dailyRate = 50/7 ≈ 7.142857, projected = 7.142857 * 30 ≈ 214.285710
      // MoneyUtils rounds divideSafe to 6 decimal places by default
      expect(projected).toBeCloseTo(214.29, 0);
    });
  });
});
