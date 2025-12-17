/**
 * Message Types - Types cho hệ thống message common
 * Có thể extend và tùy biến ở mỗi module
 */

// Base message category types
export const MESSAGE_CATEGORY = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
  OPERATION: 'OPERATION',
} as const;

export type MessageCategory =
  (typeof MESSAGE_CATEGORY)[keyof typeof MESSAGE_CATEGORY];

// Common CRUD operation types
export const CRUD_OPERATION = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LIST: 'LIST',
  BULK_CREATE: 'BULK_CREATE',
  BULK_UPDATE: 'BULK_UPDATE',
  BULK_DELETE: 'BULK_DELETE',
} as const;

export type CrudOperation =
  (typeof CRUD_OPERATION)[keyof typeof CRUD_OPERATION];

// HTTP status mapping for messages
export const HTTP_STATUS_MESSAGE = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;

export type HttpStatusMessage =
  (typeof HTTP_STATUS_MESSAGE)[keyof typeof HTTP_STATUS_MESSAGE];

// Base success message keys
export type BaseSuccessMessageKeys =
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED'
  | 'RETRIEVED'
  | 'LIST_RETRIEVED'
  | 'BULK_CREATED'
  | 'BULK_UPDATED'
  | 'BULK_DELETED'
  | 'ACTIVATED'
  | 'DEACTIVATED'
  | 'VALIDATED';

// Base error message keys
export type BaseErrorMessageKeys =
  | 'CREATE_FAILED'
  | 'UPDATE_FAILED'
  | 'DELETE_FAILED'
  | 'FETCH_FAILED'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'VALIDATION_FAILED'
  | 'BULK_CREATE_FAILED'
  | 'BULK_UPDATE_FAILED'
  | 'BULK_DELETE_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR';

// Base operation message keys (for logging)
export type BaseOperationMessageKeys =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'FETCH_BY_ID'
  | 'FETCH_ALL'
  | 'BULK_CREATE'
  | 'BULK_UPDATE'
  | 'BULK_DELETE'
  | 'VALIDATE'
  | 'ACTIVATE'
  | 'DEACTIVATE';

// Generic message config type
export type MessageConfig<
  TSuccessKeys extends string,
  TErrorKeys extends string,
> = {
  success: Record<TSuccessKeys, string>;
  error: Record<TErrorKeys, string>;
};

// Message builder function type
export type MessageBuilderFn<TArgs extends unknown[] = [string]> = (
  ...args: TArgs
) => string;

// Message builder record type
export type MessageBuilderRecord<TKeys extends string> = Record<
  TKeys,
  MessageBuilderFn
>;

// Extended message config với builders
export type ExtendedMessageConfig<
  TSuccessKeys extends string,
  TErrorKeys extends string,
  TOperationKeys extends string,
> = {
  success: Record<TSuccessKeys, string>;
  error: Record<TErrorKeys, string>;
  operation: Record<TOperationKeys, string>;
  successBuilder?: Partial<Record<TSuccessKeys, MessageBuilderFn>>;
  errorBuilder?: Partial<Record<TErrorKeys, MessageBuilderFn>>;
};

// Response message wrapper type
export type ResponseMessage<TData = unknown> = {
  message: string;
  category: MessageCategory;
  data?: TData;
  statusCode?: number;
  timestamp?: string;
};

// Validation error detail type
export type ValidationErrorDetail = {
  field: string;
  message: string;
  value?: unknown;
};

// Bulk operation result type
export type BulkOperationResult = {
  total: number;
  successful: number;
  failed: number;
  errors?: Array<{
    index: number;
    id?: string;
    error: string;
  }>;
};
