import Big from 'big.js';

/**
 * Rounding modes for money calculations
 */
export const ROUNDING_MODE = {
  /** Round towards positive infinity */
  ROUND_UP: Big.roundUp,
  /** Round towards negative infinity */
  ROUND_DOWN: Big.roundDown,
  /** Round towards nearest neighbor, ties to even (banker's rounding) */
  ROUND_HALF_EVEN: Big.roundHalfEven,
  /** Round towards nearest neighbor, ties away from zero */
  ROUND_HALF_UP: Big.roundHalfUp,
} as const;

/**
 * Default decimal places for money calculations
 */
export const MONEY_DECIMAL_PLACES = {
  /** Standard currency (VND, USD, etc.) */
  CURRENCY: 2,
  /** Percentage calculations */
  PERCENTAGE: 4,
  /** Internal calculations (higher precision) */
  INTERNAL: 6,
} as const;

/**
 * Money input type - accepts various formats
 */
export type MoneyInput = string | number | Big;

/**
 * Money calculation result
 */
export type MoneyResult = {
  /** Big instance for further calculations */
  value: Big;
  /** Number value (use for storage) */
  toNumber: () => number;
  /** String value (use for display) */
  toString: () => string;
  /** Formatted string with fixed decimal places */
  toFixed: (dp?: number) => string;
};

/**
 * Percentage calculation options
 */
export type PercentageOptions = {
  /** Decimal places for result (default: 2) */
  decimalPlaces?: number;
  /** Rounding mode (default: ROUND_HALF_UP) */
  roundingMode?: Big.RoundingMode;
};

/**
 * Money utilities using Big.js for precise decimal calculations
 * Prevents floating-point errors in financial calculations
 */
export class MoneyUtils {
  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Create Big from any input
   * @example MoneyUtils.from(100.50) // Big('100.5')
   */
  static from(value: MoneyInput): Big {
    if (value instanceof Big) {
      return value;
    }

    return new Big(value);
  }

  /**
   * Create Big from value, return zero if invalid
   * @example MoneyUtils.fromSafe(null) // Big('0')
   */
  static fromSafe(value: MoneyInput | null | undefined): Big {
    if (value === null || value === undefined) {
      return new Big(0);
    }

    try {
      return this.from(value);
    } catch {
      return new Big(0);
    }
  }

  /**
   * Create zero value
   */
  static zero(): Big {
    return new Big(0);
  }

  // ============================================
  // Arithmetic Methods
  // ============================================

  /**
   * Add two or more values
   * @example MoneyUtils.add(100, 50, 25) // Big('175')
   */
  static add(...values: MoneyInput[]): Big {
    return values.reduce<Big>(
      (acc, val) => acc.plus(this.from(val)),
      new Big(0),
    );
  }

  /**
   * Subtract values from first value
   * @example MoneyUtils.subtract(100, 30, 20) // Big('50')
   */
  static subtract(value: MoneyInput, ...subtrahends: MoneyInput[]): Big {
    return subtrahends.reduce<Big>(
      (acc, val) => acc.minus(this.from(val)),
      this.from(value),
    );
  }

  /**
   * Multiply two or more values
   * @example MoneyUtils.multiply(100, 1.1, 2) // Big('220')
   */
  static multiply(...values: MoneyInput[]): Big {
    if (values.length === 0) {
      return new Big(0);
    }

    return values.reduce<Big>(
      (acc, val, index) =>
        index === 0 ? this.from(val) : acc.times(this.from(val)),
      new Big(1),
    );
  }

  /**
   * Divide value by divisor
   * @example MoneyUtils.divide(100, 3) // Big('33.333...')
   */
  static divide(
    value: MoneyInput,
    divisor: MoneyInput,
    decimalPlaces = MONEY_DECIMAL_PLACES.INTERNAL,
  ): Big {
    const divisorBig = this.from(divisor);

    if (divisorBig.eq(0)) {
      throw new Error('Division by zero');
    }

    return this.from(value).div(divisorBig).round(decimalPlaces);
  }

  /**
   * Safe divide - returns zero if divisor is zero
   * @example MoneyUtils.divideSafe(100, 0) // Big('0')
   */
  static divideSafe(
    value: MoneyInput,
    divisor: MoneyInput,
    decimalPlaces = MONEY_DECIMAL_PLACES.INTERNAL,
  ): Big {
    const divisorBig = this.from(divisor);

    if (divisorBig.eq(0)) {
      return new Big(0);
    }

    return this.from(value).div(divisorBig).round(decimalPlaces);
  }

  // ============================================
  // Percentage Methods
  // ============================================

  /**
   * Calculate percentage of a value
   * @example MoneyUtils.percentage(1000, 10) // Big('100') (10% of 1000)
   */
  static percentage(
    value: MoneyInput,
    percent: MoneyInput,
    options?: PercentageOptions,
  ): Big {
    const { decimalPlaces = MONEY_DECIMAL_PLACES.CURRENCY } = options ?? {};

    return this.from(value)
      .times(this.from(percent))
      .div(100)
      .round(decimalPlaces);
  }

  /**
   * Apply discount percentage
   * @example MoneyUtils.applyDiscount(1000, 10) // Big('900') (10% off)
   */
  static applyDiscount(
    value: MoneyInput,
    discountPercent: MoneyInput,
    options?: PercentageOptions,
  ): Big {
    const { decimalPlaces = MONEY_DECIMAL_PLACES.CURRENCY } = options ?? {};
    const discount = this.percentage(value, discountPercent, options);

    return this.from(value).minus(discount).round(decimalPlaces);
  }

  /**
   * Apply tax/markup percentage
   * @example MoneyUtils.applyTax(1000, 10) // Big('1100') (10% tax added)
   */
  static applyTax(
    value: MoneyInput,
    taxPercent: MoneyInput,
    options?: PercentageOptions,
  ): Big {
    const { decimalPlaces = MONEY_DECIMAL_PLACES.CURRENCY } = options ?? {};
    const tax = this.percentage(value, taxPercent, options);

    return this.from(value).plus(tax).round(decimalPlaces);
  }

  /**
   * Calculate what percentage one value is of another
   * @example MoneyUtils.percentageOf(25, 100) // Big('25') (25 is 25% of 100)
   */
  static percentageOf(
    part: MoneyInput,
    total: MoneyInput,
    options?: PercentageOptions,
  ): Big {
    const { decimalPlaces = MONEY_DECIMAL_PLACES.CURRENCY } = options ?? {};
    const totalBig = this.from(total);

    if (totalBig.eq(0)) {
      return new Big(0);
    }

    return this.from(part).times(100).div(totalBig).round(decimalPlaces);
  }

  /**
   * Calculate percentage change between two values
   * @example MoneyUtils.percentageChange(100, 120) // Big('20') (20% increase)
   */
  static percentageChange(
    oldValue: MoneyInput,
    newValue: MoneyInput,
    options?: PercentageOptions,
  ): Big {
    const { decimalPlaces = MONEY_DECIMAL_PLACES.CURRENCY } = options ?? {};
    const oldBig = this.from(oldValue);

    if (oldBig.eq(0)) {
      return new Big(0);
    }

    return this.from(newValue)
      .minus(oldBig)
      .times(100)
      .div(oldBig)
      .round(decimalPlaces);
  }

  // ============================================
  // Rounding Methods
  // ============================================

  /**
   * Round to specified decimal places
   * @example MoneyUtils.round(100.456, 2) // Big('100.46')
   */
  static round(
    value: MoneyInput,
    decimalPlaces = MONEY_DECIMAL_PLACES.CURRENCY,
    roundingMode: Big.RoundingMode = ROUNDING_MODE.ROUND_HALF_UP,
  ): Big {
    return this.from(value).round(decimalPlaces, roundingMode);
  }

  /**
   * Round up (ceiling)
   * @example MoneyUtils.ceil(100.01) // Big('101')
   */
  static ceil(value: MoneyInput, decimalPlaces = 0): Big {
    return this.from(value).round(decimalPlaces, ROUNDING_MODE.ROUND_UP);
  }

  /**
   * Round down (floor)
   * @example MoneyUtils.floor(100.99) // Big('100')
   */
  static floor(value: MoneyInput, decimalPlaces = 0): Big {
    return this.from(value).round(decimalPlaces, ROUNDING_MODE.ROUND_DOWN);
  }

  // ============================================
  // Comparison Methods
  // ============================================

  /**
   * Check if value equals another
   */
  static equals(value1: MoneyInput, value2: MoneyInput): boolean {
    return this.from(value1).eq(this.from(value2));
  }

  /**
   * Check if value is greater than another
   */
  static greaterThan(value1: MoneyInput, value2: MoneyInput): boolean {
    return this.from(value1).gt(this.from(value2));
  }

  /**
   * Check if value is greater than or equal to another
   */
  static greaterThanOrEqual(value1: MoneyInput, value2: MoneyInput): boolean {
    return this.from(value1).gte(this.from(value2));
  }

  /**
   * Check if value is less than another
   */
  static lessThan(value1: MoneyInput, value2: MoneyInput): boolean {
    return this.from(value1).lt(this.from(value2));
  }

  /**
   * Check if value is less than or equal to another
   */
  static lessThanOrEqual(value1: MoneyInput, value2: MoneyInput): boolean {
    return this.from(value1).lte(this.from(value2));
  }

  /**
   * Check if value is zero
   */
  static isZero(value: MoneyInput): boolean {
    return this.from(value).eq(0);
  }

  /**
   * Check if value is positive (greater than zero)
   */
  static isPositive(value: MoneyInput): boolean {
    return this.from(value).gt(0);
  }

  /**
   * Check if value is negative (less than zero)
   */
  static isNegative(value: MoneyInput): boolean {
    return this.from(value).lt(0);
  }

  /**
   * Get minimum value from array
   */
  static min(...values: MoneyInput[]): Big {
    if (values.length === 0) {
      return new Big(0);
    }

    return values.reduce<Big>((min, val) => {
      const current = this.from(val);

      return current.lt(min) ? current : min;
    }, this.from(values[0]));
  }

  /**
   * Get maximum value from array
   */
  static max(...values: MoneyInput[]): Big {
    if (values.length === 0) {
      return new Big(0);
    }

    return values.reduce<Big>((max, val) => {
      const current = this.from(val);

      return current.gt(max) ? current : max;
    }, this.from(values[0]));
  }

  // ============================================
  // Aggregation Methods
  // ============================================

  /**
   * Sum array of values
   * @example MoneyUtils.sum([100, 200, 300]) // Big('600')
   */
  static sum(values: MoneyInput[]): Big {
    return values.reduce<Big>(
      (acc, val) => acc.plus(this.fromSafe(val)),
      new Big(0),
    );
  }

  /**
   * Sum array of objects by key
   * @example MoneyUtils.sumBy(items, 'price') // Big('600')
   */
  static sumBy<T>(items: T[], key: keyof T): Big {
    return items.reduce<Big>((acc, item) => {
      const value = item[key];

      if (typeof value === 'number' || typeof value === 'string') {
        return acc.plus(this.fromSafe(value));
      }

      return acc;
    }, new Big(0));
  }

  /**
   * Calculate average of values
   * @example MoneyUtils.average([100, 200, 300]) // Big('200')
   */
  static average(
    values: MoneyInput[],
    decimalPlaces = MONEY_DECIMAL_PLACES.CURRENCY,
  ): Big {
    if (values.length === 0) {
      return new Big(0);
    }

    return this.sum(values).div(values.length).round(decimalPlaces);
  }

  // ============================================
  // Conversion Methods
  // ============================================

  /**
   * Convert Big to number
   */
  static toNumber(value: MoneyInput): number {
    return this.from(value).toNumber();
  }

  /**
   * Convert Big to string
   */
  static toString(value: MoneyInput): string {
    return this.from(value).toString();
  }

  /**
   * Convert Big to fixed decimal string
   * @example MoneyUtils.toFixed(100.5, 2) // '100.50'
   */
  static toFixed(
    value: MoneyInput,
    decimalPlaces = MONEY_DECIMAL_PLACES.CURRENCY,
  ): string {
    return this.from(value).toFixed(decimalPlaces);
  }

  /**
   * Get absolute value
   */
  static abs(value: MoneyInput): Big {
    return this.from(value).abs();
  }

  /**
   * Negate value
   * @example MoneyUtils.negate(100) // Big('-100')
   */
  static negate(value: MoneyInput): Big {
    return this.from(value).neg();
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Create result object with convenient conversion methods
   * @example
   * const result = MoneyUtils.result(MoneyUtils.add(100, 50));
   * result.toNumber(); // 150
   * result.toFixed(2); // '150.00'
   */
  static result(value: Big): MoneyResult {
    return {
      value,
      toNumber: () => value.toNumber(),
      toString: () => value.toString(),
      toFixed: (dp = MONEY_DECIMAL_PLACES.CURRENCY) => value.toFixed(dp),
    };
  }

  /**
   * Clamp value between min and max
   * @example MoneyUtils.clamp(150, 0, 100) // Big('100')
   */
  static clamp(value: MoneyInput, min: MoneyInput, max: MoneyInput): Big {
    const val = this.from(value);
    const minVal = this.from(min);
    const maxVal = this.from(max);

    if (val.lt(minVal)) {
      return minVal;
    }

    if (val.gt(maxVal)) {
      return maxVal;
    }

    return val;
  }

  /**
   * Check if value is within range (inclusive)
   */
  static isInRange(
    value: MoneyInput,
    min: MoneyInput,
    max: MoneyInput,
  ): boolean {
    const val = this.from(value);

    return val.gte(this.from(min)) && val.lte(this.from(max));
  }

  /**
   * Calculate difference between two values (absolute)
   * @example MoneyUtils.difference(100, 80) // Big('20')
   */
  static difference(value1: MoneyInput, value2: MoneyInput): Big {
    return this.from(value1).minus(this.from(value2)).abs();
  }

  /**
   * Distribute total amount across parts (handles remainder)
   * @example MoneyUtils.distribute(100, 3) // [Big('33.34'), Big('33.33'), Big('33.33')]
   */
  static distribute(
    total: MoneyInput,
    parts: number,
    decimalPlaces = MONEY_DECIMAL_PLACES.CURRENCY,
  ): Big[] {
    if (parts <= 0) {
      return [];
    }

    const totalBig = this.from(total);
    const partValue = totalBig.div(parts).round(decimalPlaces);
    const remainder = totalBig.minus(partValue.times(parts));

    const result: Big[] = [];

    for (let i = 0; i < parts; i++) {
      // Add remainder to first part
      result.push(i === 0 ? partValue.plus(remainder) : partValue);
    }

    return result;
  }
}
