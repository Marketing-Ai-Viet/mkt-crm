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
   */
  isInTransaction(): boolean {
    return this.txStore.isInTransaction();
  }

  /**
   * Get current transaction ID (for logging/correlation)
   */
  getCurrentTxId(): string | undefined {
    return this.txStore.getTxId();
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
    });

    try {
      // Start transaction with isolation level
      if (options?.isolationLevel) {
        await queryRunner.startTransaction(options.isolationLevel);
      } else {
        await queryRunner.startTransaction();
      }

      // Set statement timeout for this connection
      await queryRunner.query(`SET LOCAL statement_timeout = ${timeoutMs}`);

      // Set read-only mode if requested
      if (options?.readOnly) {
        await queryRunner.query('SET TRANSACTION READ ONLY');
      }

      // Execute with timeout race
      const store: TransactionStore = {
        workspaceId,
        queryRunner,
        txId,
        startedAt,
      };

      const resultPromise = this.txStore.run(store, () => fn(queryRunner));

      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(
          () => reject(new TransactionTimeoutError(timeoutMs)),
          timeoutMs,
        );

        // Ensure timer doesn't prevent process from exiting
        if (timer.unref) {
          timer.unref();
        }
      });

      const result = await Promise.race([resultPromise, timeoutPromise]);

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
      });

      throw e;
    } finally {
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
