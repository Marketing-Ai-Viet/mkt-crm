import { QueryRunner } from 'typeorm';

// ============================================
// SAGA RESULT TYPES
// ============================================

/**
 * Kết quả của một Saga step
 */
export type SagaStepResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: Error;
};

/**
 * Kết quả của toàn bộ Saga execution
 */
export type SagaExecutionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  failedStep?: string;
  executedSteps?: string[];
};

// ============================================
// SAGA CONTEXT
// ============================================

/**
 * Context được truyền qua các steps trong Saga
 * Lưu trữ data cần thiết cho các steps và rollback
 */
export type SagaContext = {
  // Workspace info
  workspaceId: string;
  workspaceMemberId?: string;

  // Order data
  orderId?: string;
  orderCode?: string;
  orderItemIds?: string[];

  // License data
  licenseIds?: string[];

  // Payment data
  paymentId?: string;
  paymentQrCode?: string;

  // Contract data
  contractId?: string;

  // Invoice data
  invoiceId?: string;

  // History data
  orderHistoryId?: string;
  paymentHistoryId?: string;

  // External integration
  firebaseAuthData?: unknown;

  // Rollback data - lưu trữ data để compensate
  rollbackData: Map<string, unknown>;

  // Metadata - additional data for steps
  metadata: Map<string, unknown>;
};

// ============================================
// SAGA STEP ABSTRACT CLASS
// ============================================

/**
 * Abstract class cho Saga Step
 * Mỗi step phải implement execute và compensate
 */
export abstract class SagaStep<TInput = unknown, TOutput = unknown> {
  /**
   * Tên của step (unique identifier)
   */
  abstract readonly name: string;

  /**
   * Mô tả ngắn về step
   */
  abstract readonly description: string;

  /**
   * Thực thi step
   *
   * @param context - Saga context chứa data từ các steps trước
   * @param input - Input data cho step này
   * @param queryRunner - QueryRunner để thực hiện DB operations trong transaction
   * @returns Promise<SagaStepResult<TOutput>>
   */
  abstract execute(
    context: SagaContext,
    input: TInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult<TOutput>>;

  /**
   * Compensate (rollback) step khi step sau fail
   *
   * @param context - Saga context chứa rollback data
   * @param queryRunner - QueryRunner để thực hiện rollback
   */
  abstract compensate(
    context: SagaContext,
    queryRunner: QueryRunner,
  ): Promise<void>;

  /**
   * Kiểm tra step có thể skip được không
   * (override nếu step có điều kiện skip)
   */
  shouldSkip(_context: SagaContext, _input: TInput): boolean {
    return false;
  }
}

// ============================================
// SAGA EXECUTOR INTERFACE
// ============================================

/**
 * Interface cho Saga executor
 */
export type SagaExecutor<TInput, TOutput> = {
  /**
   * Thực thi saga với input
   */
  execute(
    workspaceId: string,
    input: TInput,
    workspaceMemberId?: string,
  ): Promise<SagaExecutionResult<TOutput>>;
};

// ============================================
// SAGA STEP REGISTRY
// ============================================

/**
 * Registry để quản lý các steps
 */
export type SagaStepRegistry = Map<string, SagaStep>;

// ============================================
// SAGA CONFIGURATION
// ============================================

export const SAGA_CONFIG = {
  /**
   * Timeout cho mỗi step (ms)
   */
  STEP_TIMEOUT_MS: 30000,

  /**
   * Max retry cho compensate
   */
  MAX_COMPENSATE_RETRIES: 3,

  /**
   * Delay giữa các retries (ms)
   */
  COMPENSATE_RETRY_DELAY_MS: 1000,
} as const;
