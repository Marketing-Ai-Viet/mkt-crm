import pickBy from 'lodash.pickby';

/**
 * Remove undefined values from object
 * @example omitUndefined({ a: 1, b: undefined, c: 'test' }) => { a: 1, c: 'test' }
 */
export const omitUndefined = <T extends Record<string, unknown>>(
  obj: T,
): Partial<T> => pickBy(obj, (value) => value !== undefined) as Partial<T>;
