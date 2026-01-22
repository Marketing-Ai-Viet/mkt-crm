import { Injectable, Logger } from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';

import { TRANSACTION_CONFIG } from './transaction.config';
import {
  TransactionContextStore,
  TransactionStore,
} from './transaction-context.store';

// ============================================
// CANCELLATION TOKEN
// ============================================

/**
 * Token for signaling transaction cancellation
 * Used to stop long-running operations when timeout occurs
 */
export type CancellationToken = {
  /** Whether cancellation has been requested */
  readonly isCancelled: boolean;
  /** Reason for cancellation */
  readonly reason?: string;
};

/**
 * Mutable cancellation state (internal use)
 */
type MutableCancellationState = {
  isCancelled: boolean;
  reason?: string;
};

// ============================================
// TYPES
// ============================================

/**
 * PostgreSQL transaction isolation levels
 */
export type PostgresIsolationLevel =
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SERIALIZABLE';

/**
 * Transaction propagation behavior
 *
 * - REQUIRED: Reuse existing transaction or create new (default)
 * - REQUIRES_NEW: Always create new transaction (not yet supported)
 * - NESTED: Use savepoint inside existing transaction
 */
export type TransactionPropagation = 'REQUIRED' | 'REQUIRES_NEW' | 'NESTED';

/**
 * Options for transaction execution
 */
export type TransactionOptions = {
  /** PostgreSQL isolation level */
  isolationLevel?: PostgresIsolationLevel;
  /** Transaction propagation behavior (default: REQUIRED) */
  propagation?: TransactionPropagation;
  /** Transaction timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Run transaction in read-only mode */
  readOnly?: boolean;
  /**
   * Callback to receive cancellation token
   * Use this to check `token.isCancelled` in long-running loops
   * @example
   * await transactionScopeService.runInTransaction(
   *   workspaceId,
   *   async (qr) => {
   *     for (const item of items) {
   *       if (cancellationToken?.isCancelled) break;
   *       await processItem(item);
   *     }
   *   },
   *   { onCancellationToken: (token) => { cancellationToken = token; } }
   * );
   */
  onCancellationToken?: (token: CancellationToken) => void;
};

// ============================================
// ERRORS
// ============================================

/**
 * Error thrown when transaction exceeds timeout
 */
export class TransactionTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Transaction timed out after ${timeoutMs}ms`);
    this.name = 'TransactionTimeoutError';
  }
}

/**
 * Error thrown when trying to nest transactions across workspaces
 */
export class CrossWorkspaceTransactionError extends Error {
  constructor(currentWs: string, requestedWs: string) {
    super(
      `Cannot nest transaction for workspace ${requestedWs} inside transaction for workspace ${currentWs}`,
    );
    this.name = 'CrossWorkspaceTransactionError';
  }
}

/**
 * Error thrown when using unsupported propagation mode
 */
export class UnsupportedPropagationError extends Error {
  constructor(propagation: string) {
    super(
      `${propagation} propagation is not yet supported. Use REQUIRED or NESTED.`,
    );
    this.name = 'UnsupportedPropagationError';
  }
}

// ============================================
// SERVICE
// ============================================

/**
 * TransactionScopeService - Manages database transactions with ALS binding
 *
 * This service provides a single API for running code within database transactions.
 * All repository operations inside the transaction callback will automatically
 * use the same database connection/transaction via AsyncLocalStorage.
 *
 * Features:
 * - Automatic transaction binding via ALS
 * - Support for nested transactions (savepoints)
 * - Configurable isolation levels
 * - Transaction timeout protection
 * - Read-only transaction support
 * - Structured logging for observability
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await transactionScopeService.runInTransaction(
 *   workspaceId,
 *   async (queryRunner) => {
 *     await orderRepository.create(orderData);
 *     await orderItemRepository.createMany(items);
 *     return order;
 *   }
 * );
 *
 * // With options
 * await transactionScopeService.runInTransaction(
 *   workspaceId,
 *   async (qr) => { ... },
 *   {
 *     isolationLevel: 'SERIALIZABLE',
 *     propagation: 'NESTED',
 *     timeoutMs: 60000,
 *   }
 * );
 * ```
 */
@Injectable()
export class TransactionScopeService {
  private readonly logger = new Logger(TransactionScopeService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly txStore: TransactionContextStore,
  ) {}

  /**
   * Run a function within a database transaction.
   *
   * All repository operations inside `fn` will automatically use the same
   * transaction via AsyncLocalStorage binding.
   *
   * @param workspaceId - Workspace ID for the transaction
   * @param fn - Function to execute within transaction
   * @param options - Transaction options (isolation, propagation, timeout)
   * @returns Result of the function
   * @throws TransactionTimeoutError if transaction exceeds timeout
   * @throws CrossWorkspaceTransactionError if nesting across workspaces
   */
  async runInTransaction<T>(
    workspaceId: string,
    fn: (queryRunner: QueryRunner) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const propagation = options?.propagation ?? 'REQUIRED';
    const alsEnabled = TRANSACTION_CONFIG.ALS_ENABLED;

    // Only check existing transaction when ALS is enabled
    // When ALS is disabled, txStore.get() will always return undefined
    if (alsEnabled) {
      const existingStore = this.txStore.get();

      // Handle propagation modes when already in transaction
      if (existingStore?.queryRunner?.isTransactionActive) {
        if (existingStore.workspaceId !== workspaceId) {
          throw new CrossWorkspaceTransactionError(
            existingStore.workspaceId,
            workspaceId,
          );
        }

        switch (propagation) {
          case 'REQUIRED':
            // Reuse existing transaction - just execute fn
            this.logger.debug({
              message: 'Reusing existing transaction',
              txId: existingStore.txId,
              workspaceId,
            });

            return fn(existingStore.queryRunner);

          case 'NESTED':
            // Use savepoint for nested transaction
            return this.runWithSavepoint(existingStore, fn);

          case 'REQUIRES_NEW':
            throw new UnsupportedPropagationError('REQUIRES_NEW');

          default:
            throw new UnsupportedPropagationError(propagation);
        }
      }
    }

    // Create new transaction
    return this.createNewTransaction(workspaceId, fn, options);
  }

  /**
   * Run a read-only transaction (optimized for reads).
   *
   * @param workspaceId - Workspace ID for the transaction
   * @param fn - Function to execute within read-only transaction
   * @param options - Transaction options (excluding readOnly)
   * @returns Result of the function
   */
  async runReadOnly<T>(
    workspaceId: string,
    fn: (queryRunner: QueryRunner) => Promise<T>,
    options?: Omit<TransactionOptions, 'readOnly'>,
  ): Promise<T> {
    return this.runInTransaction(workspaceId, fn, {
      ...options,
      readOnly: true,
    });
  }

  /**
   * Check if currently inside an active transaction
   *
   * Note: When ALS is disabled, this always returns false even if
   * code is running inside runInTransaction callback.
   */
  isInTransaction(): boolean {
    if (!TRANSACTION_CONFIG.ALS_ENABLED) {
      return false;
    }

    return this.txStore.isInTransaction();
  }

  /**
   * Get current transaction ID (for logging/correlation)
   *
   * Note: When ALS is disabled, this always returns undefined.
   */
  getCurrentTxId(): string | undefined {
    if (!TRANSACTION_CONFIG.ALS_ENABLED) {
      return undefined;
    }

    return this.txStore.getTxId();
  }

  /**
   * Check if ALS-based transaction binding is enabled
   */
  isAlsEnabled(): boolean {
    return TRANSACTION_CONFIG.ALS_ENABLED;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async createNewTransaction<T>(
    workspaceId: string,
    fn: (queryRunner: QueryRunner) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const txId = randomUUID();
    const timeoutMs =
      options?.timeoutMs ?? TRANSACTION_CONFIG.DEFAULT_TIMEOUT_MS;
    const startedAt = Date.now();
    const alsEnabled = TRANSACTION_CONFIG.ALS_ENABLED;

    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace({
        workspaceId,
      });
    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();

    this.logger.debug({
      message: 'Transaction started',
      txId,
      workspaceId,
      isolationLevel: options?.isolationLevel ?? 'READ COMMITTED',
      readOnly: options?.readOnly ?? false,
      timeoutMs,
      alsEnabled,
    });

    // Cancellation state for timeout handling
    const cancellationState: MutableCancellationState = {
      isCancelled: false,
    };

    // Provide cancellation token to caller if callback provided
    if (options?.onCancellationToken) {
      options.onCancellationToken(cancellationState as CancellationToken);
    }

    // Timer reference for cleanup
    let timeoutTimer: NodeJS.Timeout | undefined;

    try {
      // Start transaction with isolation level
      if (options?.isolationLevel) {
        await queryRunner.startTransaction(options.isolationLevel);
      } else {
        await queryRunner.startTransaction();
      }

      // IMPORTANT: PostgreSQL requires certain SET commands to be executed
      // in specific order after BEGIN. We use SET LOCAL variants which can
      // be set at any point within the transaction.

      // Set read-only mode FIRST if requested (using SET LOCAL variant)
      // PostgreSQL: SET TRANSACTION READ ONLY must be first after BEGIN,
      // but SET LOCAL transaction_read_only can be set anytime
      if (options?.readOnly) {
        await queryRunner.query('SET LOCAL transaction_read_only = on');
      }

      // Set statement timeout for this transaction
      await queryRunner.query(`SET LOCAL statement_timeout = ${timeoutMs}`);

      // Build transaction store for ALS binding
      const store: TransactionStore = {
        workspaceId,
        queryRunner,
        txId,
        startedAt,
      };

      // Execute function - with or without ALS binding based on config
      const executeWithTimeout = async (): Promise<T> => {
        // Create timeout promise with proper cleanup
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutTimer = setTimeout(() => {
            // Mark as cancelled so long-running operations can check
            cancellationState.isCancelled = true;
            cancellationState.reason = `Transaction timed out after ${timeoutMs}ms`;

            reject(new TransactionTimeoutError(timeoutMs));
          }, timeoutMs);

          // Ensure timer doesn't prevent process from exiting
          if (timeoutTimer.unref) {
            timeoutTimer.unref();
          }
        });

        // Execute based on ALS config
        const resultPromise = alsEnabled
          ? this.txStore.run(store, () => fn(queryRunner))
          : fn(queryRunner);

        return Promise.race([resultPromise, timeoutPromise]);
      };

      const result = await executeWithTimeout();

      // Clear timeout timer on success (prevents timer from firing after completion)
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }

      await queryRunner.commitTransaction();

      const durationMs = Date.now() - startedAt;

      this.logger.debug({
        message: 'Transaction committed',
        txId,
        workspaceId,
        durationMs,
      });

      return result;
    } catch (e) {
      // Clear timeout timer on error (cleanup)
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }

      const durationMs = Date.now() - startedAt;

      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      this.logger.error({
        message: 'Transaction rolled back',
        txId,
        workspaceId,
        error: e instanceof Error ? e.message : String(e),
        errorName: e instanceof Error ? e.name : 'Unknown',
        durationMs,
        wasCancelled: cancellationState.isCancelled,
      });

      throw e;
    } finally {
      // Ensure timer is always cleaned up
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }

      await queryRunner.release();
    }
  }

  private async runWithSavepoint<T>(
    existingStore: TransactionStore,
    fn: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const savepointName = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { queryRunner, txId, workspaceId } = existingStore;

    this.logger.debug({
      message: 'Creating savepoint',
      txId,
      workspaceId,
      savepointName,
    });

    await queryRunner.query(`SAVEPOINT "${savepointName}"`);

    try {
      const result = await fn(queryRunner);

      await queryRunner.query(`RELEASE SAVEPOINT "${savepointName}"`);

      this.logger.debug({
        message: 'Savepoint released',
        txId,
        workspaceId,
        savepointName,
      });

      return result;
    } catch (e) {
      await queryRunner.query(`ROLLBACK TO SAVEPOINT "${savepointName}"`);

      this.logger.warn({
        message: 'Savepoint rolled back',
        txId,
        workspaceId,
        savepointName,
        error: e instanceof Error ? e.message : String(e),
      });

      throw e;
    }
  }
}
