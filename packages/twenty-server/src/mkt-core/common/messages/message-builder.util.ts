import {
  BASE_ERROR_MESSAGES,
  BASE_INFO_MESSAGES,
  BASE_OPERATION_MESSAGES,
  BASE_SUCCESS_MESSAGES,
  BASE_WARNING_MESSAGES,
  BaseErrorMessageKey,
  BaseInfoMessageKey,
  BaseOperationMessageKey,
  BaseSuccessMessageKey,
  BaseWarningMessageKey,
} from './base-messages.constant';
import {
  BulkOperationResult,
  MESSAGE_CATEGORY,
  MessageCategory,
  ResponseMessage,
  ValidationErrorDetail,
} from './message.types';

// =============================================================================
// MESSAGE PLACEHOLDER REPLACER
// =============================================================================

type PlaceholderValues = Record<string, string | number>;

/**
 * Replace placeholders trong message template
 * @example
 * replacePlaceholders('{entity} created successfully', { entity: 'License' })
 * // => 'License created successfully'
 */
export const replacePlaceholders = (
  template: string,
  values: PlaceholderValues,
): string => {
  let result = template;

  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }

  return result;
};

// =============================================================================
// MODULE MESSAGE FACTORY
// =============================================================================

export type ModuleMessagesConfig<
  TCustomSuccess extends string = never,
  TCustomError extends string = never,
  TCustomOperation extends string = never,
  TCustomWarning extends string = never,
  TCustomInfo extends string = never,
> = {
  entityName: string;
  entityNamePlural?: string;
  customSuccess?: Record<TCustomSuccess, string>;
  customError?: Record<TCustomError, string>;
  customOperation?: Record<TCustomOperation, string>;
  customWarning?: Record<TCustomWarning, string>;
  customInfo?: Record<TCustomInfo, string>;
};

export type ModuleMessages<
  TCustomSuccess extends string = never,
  TCustomError extends string = never,
  TCustomOperation extends string = never,
  TCustomWarning extends string = never,
  TCustomInfo extends string = never,
> = {
  SUCCESS: Record<BaseSuccessMessageKey | TCustomSuccess, string>;
  ERROR: Record<BaseErrorMessageKey | TCustomError, string>;
  OPERATION: Record<BaseOperationMessageKey | TCustomOperation, string>;
  WARNING: Record<BaseWarningMessageKey | TCustomWarning, string>;
  INFO: Record<BaseInfoMessageKey | TCustomInfo, string>;
  // Builder functions
  success: (
    key: BaseSuccessMessageKey | TCustomSuccess,
    extra?: PlaceholderValues,
  ) => string;
  error: (
    key: BaseErrorMessageKey | TCustomError,
    extra?: PlaceholderValues,
  ) => string;
  operation: (
    key: BaseOperationMessageKey | TCustomOperation,
    extra?: PlaceholderValues,
  ) => string;
  warning: (
    key: BaseWarningMessageKey | TCustomWarning,
    extra?: PlaceholderValues,
  ) => string;
  info: (
    key: BaseInfoMessageKey | TCustomInfo,
    extra?: PlaceholderValues,
  ) => string;
  // Extended builders
  errorWithDetails: (
    key: BaseErrorMessageKey | TCustomError,
    details: string,
  ) => string;
  notFoundWithId: (id: string) => string;
  bulkSuccess: (
    operation: 'created' | 'updated' | 'deleted',
    count: number,
  ) => string;
  bulkError: (
    operation: 'create' | 'update' | 'delete',
    error: string,
  ) => string;
};

/**
 * Factory function để tạo messages cho một module
 * Cho phép extend base messages với custom messages
 *
 * @example
 * const LICENSE_MESSAGES = createModuleMessages({
 *   entityName: 'License',
 *   entityNamePlural: 'Licenses',
 *   customSuccess: {
 *     RENEWED: 'License renewed successfully',
 *     REVOKED: 'License revoked successfully',
 *   },
 *   customError: {
 *     EXPIRED: 'License has expired',
 *     INVALID_KEY: 'Invalid license key',
 *   },
 * });
 *
 * // Usage:
 * LICENSE_MESSAGES.SUCCESS.CREATED // => 'License created successfully'
 * LICENSE_MESSAGES.SUCCESS.RENEWED // => 'License renewed successfully'
 * LICENSE_MESSAGES.success('CREATED') // => 'License created successfully'
 * LICENSE_MESSAGES.errorWithDetails('CREATE_FAILED', 'Database error') // => 'Failed to create License: Database error'
 */
export const createModuleMessages = <
  TCustomSuccess extends string = never,
  TCustomError extends string = never,
  TCustomOperation extends string = never,
  TCustomWarning extends string = never,
  TCustomInfo extends string = never,
>(
  config: ModuleMessagesConfig<
    TCustomSuccess,
    TCustomError,
    TCustomOperation,
    TCustomWarning,
    TCustomInfo
  >,
): ModuleMessages<
  TCustomSuccess,
  TCustomError,
  TCustomOperation,
  TCustomWarning,
  TCustomInfo
> => {
  const {
    entityName,
    entityNamePlural = `${entityName}s`,
    customSuccess = {} as Record<TCustomSuccess, string>,
    customError = {} as Record<TCustomError, string>,
    customOperation = {} as Record<TCustomOperation, string>,
    customWarning = {} as Record<TCustomWarning, string>,
    customInfo = {} as Record<TCustomInfo, string>,
  } = config;

  const basePlaceholders: PlaceholderValues = {
    entity: entityName,
    entities: entityNamePlural,
  };

  // Helper to replace placeholders in all messages of an object
  const processMessages = <T extends Record<string, string>>(
    messages: T,
  ): T => {
    const result = {} as T;

    for (const [key, msg] of Object.entries(messages)) {
      (result as Record<string, string>)[key] = replacePlaceholders(
        msg,
        basePlaceholders,
      );
    }

    return result;
  };

  // Process base messages
  const SUCCESS = {
    ...processMessages(BASE_SUCCESS_MESSAGES),
    ...processMessages(customSuccess),
  } as Record<BaseSuccessMessageKey | TCustomSuccess, string>;

  const ERROR = {
    ...processMessages(BASE_ERROR_MESSAGES),
    ...processMessages(customError),
  } as Record<BaseErrorMessageKey | TCustomError, string>;

  const OPERATION = {
    ...processMessages(BASE_OPERATION_MESSAGES),
    ...processMessages(customOperation),
  } as Record<BaseOperationMessageKey | TCustomOperation, string>;

  const WARNING = {
    ...processMessages(BASE_WARNING_MESSAGES),
    ...processMessages(customWarning),
  } as Record<BaseWarningMessageKey | TCustomWarning, string>;

  const INFO = {
    ...processMessages(BASE_INFO_MESSAGES),
    ...processMessages(customInfo),
  } as Record<BaseInfoMessageKey | TCustomInfo, string>;

  // Builder functions
  const success = (
    key: BaseSuccessMessageKey | TCustomSuccess,
    extra?: PlaceholderValues,
  ): string => {
    const message = SUCCESS[key];

    return extra ? replacePlaceholders(message, extra) : message;
  };

  const error = (
    key: BaseErrorMessageKey | TCustomError,
    extra?: PlaceholderValues,
  ): string => {
    const message = ERROR[key];

    return extra ? replacePlaceholders(message, extra) : message;
  };

  const operation = (
    key: BaseOperationMessageKey | TCustomOperation,
    extra?: PlaceholderValues,
  ): string => {
    const message = OPERATION[key];

    return extra ? replacePlaceholders(message, extra) : message;
  };

  const warning = (
    key: BaseWarningMessageKey | TCustomWarning,
    extra?: PlaceholderValues,
  ): string => {
    const message = WARNING[key];

    return extra ? replacePlaceholders(message, extra) : message;
  };

  const info = (
    key: BaseInfoMessageKey | TCustomInfo,
    extra?: PlaceholderValues,
  ): string => {
    const message = INFO[key];

    return extra ? replacePlaceholders(message, extra) : message;
  };

  // Extended builders
  const errorWithDetails = (
    key: BaseErrorMessageKey | TCustomError,
    details: string,
  ): string => `${ERROR[key]}: ${details}`;

  const notFoundWithId = (id: string): string =>
    `${entityName} not found with ID: ${id}`;

  const bulkSuccess = (
    op: 'created' | 'updated' | 'deleted',
    count: number,
  ): string => {
    const operationMap = {
      created: 'BULK_CREATED',
      updated: 'BULK_UPDATED',
      deleted: 'BULK_DELETED',
    } as const;

    return success(operationMap[op] as BaseSuccessMessageKey, { count });
  };

  const bulkError = (
    op: 'create' | 'update' | 'delete',
    errorMsg: string,
  ): string => {
    const operationMap = {
      create: 'BULK_CREATE_FAILED',
      update: 'BULK_UPDATE_FAILED',
      delete: 'BULK_DELETE_FAILED',
    } as const;

    return errorWithDetails(operationMap[op] as BaseErrorMessageKey, errorMsg);
  };

  return {
    SUCCESS,
    ERROR,
    OPERATION,
    WARNING,
    INFO,
    success,
    error,
    operation,
    warning,
    info,
    errorWithDetails,
    notFoundWithId,
    bulkSuccess,
    bulkError,
  };
};

// =============================================================================
// RESPONSE MESSAGE BUILDERS
// =============================================================================

/**
 * Tạo success response message
 */
export const createSuccessResponse = <TData = unknown>(
  message: string,
  data?: TData,
): ResponseMessage<TData> => ({
  message,
  category: MESSAGE_CATEGORY.SUCCESS,
  data,
  statusCode: 200,
  timestamp: new Date().toISOString(),
});

/**
 * Tạo error response message
 */
export const createErrorResponse = (
  message: string,
  statusCode = 400,
): ResponseMessage => ({
  message,
  category: MESSAGE_CATEGORY.ERROR,
  statusCode,
  timestamp: new Date().toISOString(),
});

/**
 * Tạo warning response message
 */
export const createWarningResponse = <TData = unknown>(
  message: string,
  data?: TData,
): ResponseMessage<TData> => ({
  message,
  category: MESSAGE_CATEGORY.WARNING,
  data,
  statusCode: 200,
  timestamp: new Date().toISOString(),
});

// =============================================================================
// VALIDATION MESSAGE BUILDERS
// =============================================================================

/**
 * Format validation errors thành message
 */
export const formatValidationErrors = (
  errors: ValidationErrorDetail[],
): string => {
  if (errors.length === 0) return 'Validation failed';
  if (errors.length === 1) return errors[0].message;

  return `Validation failed: ${errors.map((e) => e.message).join('; ')}`;
};

/**
 * Tạo validation error detail
 */
export const createValidationError = (
  field: string,
  message: string,
  value?: unknown,
): ValidationErrorDetail => ({
  field,
  message,
  value,
});

// =============================================================================
// BULK OPERATION MESSAGE BUILDERS
// =============================================================================

/**
 * Format bulk operation result thành message
 */
export const formatBulkOperationResult = (
  operation: string,
  result: BulkOperationResult,
): string => {
  const { total, successful, failed } = result;

  if (failed === 0) {
    return `Successfully ${operation} ${successful} items`;
  }

  if (successful === 0) {
    return `Failed to ${operation} all ${total} items`;
  }

  return `${operation}: ${successful} successful, ${failed} failed out of ${total} items`;
};

// =============================================================================
// MESSAGE CATEGORY HELPERS
// =============================================================================

export const isSuccessCategory = (category: MessageCategory): boolean =>
  category === MESSAGE_CATEGORY.SUCCESS;

export const isErrorCategory = (category: MessageCategory): boolean =>
  category === MESSAGE_CATEGORY.ERROR;

export const isWarningCategory = (category: MessageCategory): boolean =>
  category === MESSAGE_CATEGORY.WARNING;

export const isInfoCategory = (category: MessageCategory): boolean =>
  category === MESSAGE_CATEGORY.INFO;
