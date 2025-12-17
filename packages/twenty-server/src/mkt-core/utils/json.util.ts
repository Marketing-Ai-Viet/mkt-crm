import { Logger } from '@nestjs/common';

/**
 * Kết quả của JSON parse operation
 */
type JsonParseResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      data: null;
    };

/**
 * Options cho JSON parse
 */
type JsonParseOptions<T> = {
  /** Default value khi parse fail (nếu không có sẽ return null) */
  defaultValue?: T;
  /** Logger để ghi error (optional) */
  logger?: Logger;
  /** Context message cho logging */
  context?: string;
};

/**
 * Options cho JSON stringify
 */
type JsonStringifyOptions = {
  /** Logger để ghi error (optional) */
  logger?: Logger;
  /** Context message cho logging */
  context?: string;
  /** Số spaces để format JSON (default: 0 - compact) */
  spaces?: number;
};

/**
 * Helper: Log error với context
 */
function logError(
  logger: Logger | undefined,
  context: string | undefined,
  message: string,
): void {
  if (logger && context) {
    logger.error(`${context}: ${message}`);
  }
}

/**
 * Helper: Log debug với context
 */
function logDebug(
  logger: Logger | undefined,
  context: string | undefined,
  message: string,
): void {
  if (logger && context) {
    logger.debug(`${context}: ${message}`);
  }
}

/**
 * Helper: Tạo error result hoặc success result với default value
 */
function createFailureResult<T>(
  error: string,
  defaultValue: T | undefined,
): JsonParseResult<T> {
  return defaultValue !== undefined
    ? { success: true, data: defaultValue }
    : { success: false, error, data: null };
}

/**
 * Helper: Validate input string
 * @returns error message hoặc null nếu valid
 */
function validateJsonInput(
  jsonString: string | null | undefined,
): string | null {
  if (jsonString === null || jsonString === undefined) {
    return 'Input is null or undefined';
  }

  if (jsonString.trim() === '') {
    return 'Input is empty string';
  }

  return null;
}

/**
 * Parse JSON string một cách an toàn với error handling
 *
 * @param jsonString - JSON string cần parse
 * @param options - Parse options
 * @returns Object đã parse hoặc default value nếu fail
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = safeJsonParse<User>('{"name":"John"}');
 * if (result.success) {
 *   console.log(result.data.name);
 * }
 *
 * // Với default value
 * const user = safeJsonParse<User>('invalid', { defaultValue: { name: 'Guest' } });
 *
 * // Với logger
 * const result = safeJsonParse<Release>(cachedData, {
 *   logger: this.logger,
 *   context: 'Cache deserialization',
 * });
 * ```
 */
export function safeJsonParse<T = unknown>(
  jsonString: string | null | undefined,
  options?: JsonParseOptions<T>,
): JsonParseResult<T> {
  const { defaultValue, logger, context } = options || {};

  // Validate input
  const validationError = validateJsonInput(jsonString);

  if (validationError) {
    logDebug(logger, context, validationError);

    return createFailureResult(validationError, defaultValue);
  }

  // Parse JSON
  try {
    const parsed = JSON.parse(jsonString as string) as T;

    return { success: true, data: parsed };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logError(logger, context, `Failed to parse JSON - ${errorMessage}`);

    return createFailureResult(errorMessage, defaultValue);
  }
}

/**
 * Stringify object thành JSON string một cách an toàn với error handling
 *
 * @param value - Value cần stringify
 * @param options - Stringify options
 * @returns JSON string hoặc null nếu fail
 *
 * @example
 * ```typescript
 * // Basic usage
 * const json = safeJsonStringify({ name: 'John' });
 *
 * // Với formatting (pretty print)
 * const json = safeJsonStringify(data, { spaces: 2 });
 *
 * // Với logger
 * const json = safeJsonStringify(release, {
 *   logger: this.logger,
 *   context: 'Cache serialization',
 * });
 * ```
 */
export function safeJsonStringify<T = unknown>(
  value: T,
  options?: JsonStringifyOptions,
): string | null {
  const { logger, context, spaces = 0 } = options || {};

  // Early return: undefined input
  if (value === undefined) {
    const error = 'Cannot stringify undefined';

    if (logger && context) {
      logger.warn(`${context}: ${error}`);
    }

    return null;
  }

  try {
    return JSON.stringify(value, null, spaces);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (logger && context) {
      logger.error(`${context}: Failed to stringify JSON - ${errorMessage}`);
    }

    return null;
  }
}

/**
 * Parse JSON với default value (shorthand cho common use case)
 *
 * @param jsonString - JSON string cần parse
 * @param defaultValue - Default value khi parse fail
 * @returns Parsed data hoặc default value
 *
 * @example
 * ```typescript
 * const user = parseJsonOrDefault<User>('{"name":"John"}', { name: 'Guest' });
 * // user = { name: 'John' }
 *
 * const user = parseJsonOrDefault<User>('invalid', { name: 'Guest' });
 * // user = { name: 'Guest' }
 * ```
 */
export function parseJsonOrDefault<T>(
  jsonString: string | null | undefined,
  defaultValue: T,
): T {
  const result = safeJsonParse<T>(jsonString, { defaultValue });

  // Khi có defaultValue, result.data luôn có giá trị (không bao giờ null)
  return result.success ? result.data : defaultValue;
}

/**
 * Parse JSON hoặc null (shorthand cho common use case)
 *
 * @param jsonString - JSON string cần parse
 * @returns Parsed data hoặc null nếu fail
 *
 * @example
 * ```typescript
 * const user = parseJsonOrNull<User>('{"name":"John"}');
 * // user = { name: 'John' }
 *
 * const user = parseJsonOrNull<User>('invalid');
 * // user = null
 * ```
 */
export function parseJsonOrNull<T>(
  jsonString: string | null | undefined,
): T | null {
  const result = safeJsonParse<T>(jsonString);

  return result.success ? result.data : null;
}
