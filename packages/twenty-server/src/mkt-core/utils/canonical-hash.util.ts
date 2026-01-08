import { createHash } from 'crypto';

import isNil from 'lodash.isnil';
import isObject from 'lodash.isobject';
import sortBy from 'lodash.sortby';

import { DateTimeUtils } from './date-time.utils';
import { safeJsonStringify } from './json.util';

/**
 * Fields to exclude from hash (volatile/non-deterministic)
 */
const VOLATILE_FIELDS = new Set([
  'timestamp',
  'createdAt',
  'updatedAt',
  'requestId',
  'traceId',
  'correlationId',
  '_meta',
]);

/**
 * Check if field should be skipped (volatile or undefined)
 */
const shouldSkipField = (key: string, value: unknown): boolean =>
  VOLATILE_FIELDS.has(key) || value === undefined;

/**
 * Process object: sort keys and filter volatile fields
 */
const processObject = (obj: Record<string, unknown>): Record<string, unknown> =>
  sortBy(Object.keys(obj)).reduce<Record<string, unknown>>((result, key) => {
    const value = obj[key];

    if (!shouldSkipField(key, value)) {
      result[key] = sortObjectKeys(value);
    }

    return result;
  }, {});

/**
 * Convert Date to ISO string
 */
const processDate = (date: Date): string =>
  DateTimeUtils.toISO(DateTimeUtils.fromDate(date));

/**
 * Recursively sort object keys for canonical representation
 */
const sortObjectKeys = (obj: unknown): unknown => {
  if (isNil(obj)) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  if (obj instanceof Date) {
    return processDate(obj);
  }

  if (isObject(obj)) {
    return processObject(obj as Record<string, unknown>);
  }

  return obj;
};

/**
 * Convert object to canonical JSON string
 * - Sorts keys recursively
 * - Removes undefined values
 * - Excludes volatile fields (timestamp, requestId, etc.)
 * - Handles Date objects
 */
export const toCanonicalJson = (data: unknown): string => {
  const sorted = sortObjectKeys(data);

  return safeJsonStringify(sorted) ?? '';
};

/**
 * Generate SHA-256 hash of canonical JSON
 *
 * @param data - Data to hash
 * @param length - Hash length (default: 16 chars)
 * @returns Truncated SHA-256 hash
 *
 * @example
 * ```typescript
 * // Same data with different key order → same hash
 * canonicalHash({ b: 2, a: 1 }) === canonicalHash({ a: 1, b: 2 })
 *
 * // Volatile fields ignored
 * canonicalHash({ id: 1, timestamp: 123 }) === canonicalHash({ id: 1, timestamp: 456 })
 * ```
 */
export const canonicalHash = (data: unknown, length = 16): string => {
  const canonical = toCanonicalJson(data);

  return createHash('sha256').update(canonical).digest('hex').slice(0, length);
};

/**
 * Sensitive fields to exclude from cache
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
  'privateKey',
]);

/**
 * Default max size for cached response (10KB)
 */
const DEFAULT_MAX_CACHE_SIZE_BYTES = 10240;

/**
 * Pick only allowed fields from response
 */
const pickAllowedFields = <T extends Record<string, unknown>>(
  response: T,
  allowedFields: string[],
): Partial<T> =>
  allowedFields.reduce<Partial<T>>((result, field) => {
    if (field in response) {
      result[field as keyof T] = response[field as keyof T];
    }

    return result;
  }, {} as Partial<T>);

/**
 * Remove sensitive fields from response
 */
const removeSensitiveFields = <T extends Record<string, unknown>>(
  response: T,
): Partial<T> =>
  Object.entries(response).reduce<Partial<T>>((result, [key, value]) => {
    if (!SENSITIVE_FIELDS.has(key)) {
      result[key as keyof T] = value as T[keyof T];
    }

    return result;
  }, {} as Partial<T>);

/**
 * Create truncated response when size exceeds limit
 */
const createTruncatedResponse = <T extends Record<string, unknown>>(
  result: Partial<T>,
  originalSize: number,
): Partial<T> =>
  ({
    _truncated: true,
    _originalSize: originalSize,
    id: result['id' as keyof T],
  }) as unknown as Partial<T>;

/**
 * Truncate result if exceeds max size
 */
const truncateIfNeeded = <T extends Record<string, unknown>>(
  result: Partial<T>,
  maxSizeBytes: number,
): Partial<T> => {
  const jsonStr = safeJsonStringify(result) ?? '';

  if (jsonStr.length > maxSizeBytes) {
    return createTruncatedResponse(result, jsonStr.length);
  }

  return result;
};

/**
 * Extract allowed fields from response for caching
 * Removes sensitive/large fields
 */
export const sanitizeResponseForCache = <T extends Record<string, unknown>>(
  response: T,
  allowedFields?: string[],
  maxSizeBytes = DEFAULT_MAX_CACHE_SIZE_BYTES,
): Partial<T> => {
  if (!isObject(response)) {
    return response;
  }

  const hasAllowedFields = allowedFields && allowedFields.length > 0;

  const result = hasAllowedFields
    ? pickAllowedFields(response, allowedFields)
    : removeSensitiveFields(response);

  return truncateIfNeeded(result, maxSizeBytes);
};
