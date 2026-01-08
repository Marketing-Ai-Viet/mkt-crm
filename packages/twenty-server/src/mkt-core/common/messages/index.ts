/**
 * Common Messages Module
 *
 * Hệ thống message common có thể extend và tùy biến ở mỗi module.
 *
 * @example
 * // Tạo messages cho một module mới
 * import { createModuleMessages } from 'src/mkt-core/common/messages';
 *
 * export const ORDER_MESSAGES = createModuleMessages({
 *   entityName: 'Order',
 *   entityNamePlural: 'Orders',
 *   customSuccess: {
 *     CONFIRMED: 'Order confirmed successfully',
 *     SHIPPED: 'Order shipped successfully',
 *   },
 *   customError: {
 *     PAYMENT_FAILED: 'Order payment failed',
 *     OUT_OF_STOCK: 'Product is out of stock',
 *   },
 * });
 *
 * // Sử dụng
 * ORDER_MESSAGES.SUCCESS.CREATED // => 'Order created successfully'
 * ORDER_MESSAGES.SUCCESS.CONFIRMED // => 'Order confirmed successfully'
 * ORDER_MESSAGES.error('NOT_FOUND') // => 'Order not found'
 * ORDER_MESSAGES.errorWithDetails('CREATE_FAILED', 'DB error') // => 'Failed to create Order: DB error'
 */

// Types
export {
  BulkOperationResult,
  CRUD_OPERATION,
  CrudOperation,
  ExtendedMessageConfig,
  HTTP_STATUS_MESSAGE,
  HttpStatusMessage,
  MESSAGE_CATEGORY,
  MessageBuilderFn,
  MessageBuilderRecord,
  MessageCategory,
  MessageConfig,
  ResponseMessage,
  ValidationErrorDetail,
} from './message.types';

// Base messages
export {
  BASE_ERROR_MESSAGES,
  BASE_INFO_MESSAGES,
  BASE_MESSAGES,
  BASE_OPERATION_MESSAGES,
  BASE_SUCCESS_MESSAGES,
  BASE_WARNING_MESSAGES,
  BaseErrorMessageKey,
  BaseErrorMessageValue,
  BaseInfoMessageKey,
  BaseInfoMessageValue,
  BaseOperationMessageKey,
  BaseOperationMessageValue,
  BaseSuccessMessageKey,
  BaseSuccessMessageValue,
  BaseWarningMessageKey,
  BaseWarningMessageValue,
} from './base-messages.constant';

// Message builder utilities
export {
  createErrorResponse,
  createModuleMessages,
  createSuccessResponse,
  createValidationError,
  createWarningResponse,
  formatBulkOperationResult,
  formatValidationErrors,
  isErrorCategory,
  isInfoCategory,
  isSuccessCategory,
  isWarningCategory,
  ModuleMessages,
  ModuleMessagesConfig,
  replacePlaceholders,
} from './message-builder.util';
