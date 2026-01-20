import { AsyncLocalStorage } from 'node:async_hooks';

import { QueryRunner } from 'typeorm';

// ============================================
// TYPES
// ============================================

/**
 * Transaction store data held in AsyncLocalStorage
 */
export type TransactionStore = {
  /** Workspace ID for the transaction */
  workspaceId: string;
  /** TypeORM QueryRunner with active transaction */
  queryRunner: QueryRunner;
  /** UUID for tracing/logging */
  txId: string;
  /** Timestamp when transaction started (for duration tracking) */
  startedAt: number;
};

// ============================================
// TRANSACTION CONTEXT STORE
// ============================================

/**
 * TransactionContextStore - AsyncLocalStorage-based transaction context
 *
 * Provides request-scoped transaction context that automatically propagates
 * through async call chains without explicit parameter passing.
 *
 * IMPORTANT: This class MUST be used as a singleton to work correctly.
 * The singleton instance is exported at the bottom of this file.
 *
 * @example
 * ```typescript
 * // Check if in transaction
 * if (transactionContextStore.isInTransaction()) {
 *   const store = transactionContextStore.get();
 *   // Use store.queryRunner for transaction-bound operations
 * }
 * ```
 */
export class TransactionContextStore {
  private readonly als = new AsyncLocalStorage<TransactionStore>();

  /**
   * Run a function within a transaction context
   *
   * @param store - Transaction store with workspaceId and queryRunner
   * @param fn - Function to execute within the context
   * @returns Result of the function
   */
  run<T>(store: TransactionStore, fn: () => Promise<T>): Promise<T> {
    return this.als.run(store, fn);
  }

  /**
   * Get the current transaction store
   *
   * @returns TransactionStore if in transaction context, undefined otherwise
   */
  get(): TransactionStore | undefined {
    return this.als.getStore();
  }

  /**
   * Check if currently inside an active transaction
   *
   * @returns true if in transaction with active queryRunner
   */
  isInTransaction(): boolean {
    const store = this.get();

    return !!store?.queryRunner?.isTransactionActive;
  }

  /**
   * Get the current transaction ID (for logging)
   *
   * @returns Transaction ID or undefined if not in transaction
   */
  getTxId(): string | undefined {
    return this.get()?.txId;
  }

  /**
   * Get the current workspace ID from transaction context
   *
   * @returns Workspace ID or undefined if not in transaction
   */
  getWorkspaceId(): string | undefined {
    return this.get()?.workspaceId;
  }

  /**
   * Get elapsed time since transaction started
   *
   * @returns Elapsed time in milliseconds, or 0 if not in transaction
   */
  getElapsedMs(): number {
    const store = this.get();

    if (!store?.startedAt) {
      return 0;
    }

    return Date.now() - store.startedAt;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

/**
 * Global singleton instance of TransactionContextStore
 *
 * IMPORTANT: Always use this exported instance, never create new instances.
 * AsyncLocalStorage only works correctly when using a single shared instance.
 */
export const transactionContextStore = new TransactionContextStore();
