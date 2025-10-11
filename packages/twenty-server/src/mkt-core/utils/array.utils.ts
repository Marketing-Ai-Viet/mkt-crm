/**
 * Utilities for processing arrays and collections
 */
export class ArrayUtils {
  /**
   * Group array items by a key
   */
  static groupBy<T, K extends keyof T>(
    array: T[],
    key: K,
  ): Record<string, T[]> {
    return array.reduce(
      (groups, item) => {
        const groupKey = String(item[key]);

        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(item);

        return groups;
      },
      {} as Record<string, T[]>,
    );
  }

  /**
   * Group array items by a custom function
   */
  static groupByFunction<T>(
    array: T[],
    groupFunction: (item: T) => string,
  ): Record<string, T[]> {
    return array.reduce(
      (groups, item) => {
        const groupKey = groupFunction(item);

        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(item);

        return groups;
      },
      {} as Record<string, T[]>,
    );
  }

  /**
   * Extract unique values from array by key
   */
  static uniqueBy<T, K extends keyof T>(array: T[], key: K): T[] {
    const seen = new Set();

    return array.filter((item) => {
      const value = item[key];

      if (seen.has(value)) {
        return false;
      }
      seen.add(value);

      return true;
    });
  }

  /**
   * Sort array by multiple criteria
   */
  static sortBy<T>(
    array: T[],
    ...criteria: Array<(item: T) => string | number | Date>
  ): T[] {
    return [...array].sort((a, b) => {
      for (const criterion of criteria) {
        const valueA = criterion(a);
        const valueB = criterion(b);

        if (valueA < valueB) return -1;
        if (valueA > valueB) return 1;
      }

      return 0;
    });
  }

  /**
   * Filter array by multiple conditions
   */
  static filterBy<T>(array: T[], conditions: Array<(item: T) => boolean>): T[] {
    return array.filter((item) =>
      conditions.every((condition) => condition(item)),
    );
  }

  /**
   * Paginate array
   */
  static paginate<T>(
    array: T[],
    page: number,
    pageSize: number,
  ): {
    items: T[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const items = array.slice(startIndex, endIndex);
    const totalItems = array.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      items,
      totalItems,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Calculate sum of numeric property in array
   */
  static sumBy<T>(
    array: T[],
    keyOrFunction: keyof T | ((item: T) => number),
  ): number {
    return array.reduce((sum, item) => {
      const value =
        typeof keyOrFunction === 'function'
          ? keyOrFunction(item)
          : Number(item[keyOrFunction]) || 0;

      return sum + value;
    }, 0);
  }

  /**
   * Find items that match a condition
   */
  static findAll<T>(array: T[], condition: (item: T) => boolean): T[] {
    return array.filter(condition);
  }

  /**
   * Count items that match a condition
   */
  static countBy<T>(array: T[], condition: (item: T) => boolean): number {
    return array.filter(condition).length;
  }

  /**
   * Check if array contains any item matching condition
   */
  static some<T>(array: T[], condition: (item: T) => boolean): boolean {
    return array.some(condition);
  }

  /**
   * Check if all items in array match condition
   */
  static every<T>(array: T[], condition: (item: T) => boolean): boolean {
    return array.every(condition);
  }

  /**
   * Create chunks of array
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }

    return chunks;
  }

  /**
   * Flatten nested arrays
   */
  static flatten<T>(arrays: T[][]): T[] {
    return arrays.reduce((flat, arr) => flat.concat(arr), []);
  }

  /**
   * Remove duplicates from array
   */
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  /**
   * Get intersection of two arrays
   */
  static intersection<T>(array1: T[], array2: T[]): T[] {
    return array1.filter((item) => array2.includes(item));
  }

  /**
   * Get difference between two arrays
   */
  static difference<T>(array1: T[], array2: T[]): T[] {
    return array1.filter((item) => !array2.includes(item));
  }
}
