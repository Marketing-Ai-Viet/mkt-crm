/**
 * Transaction Module - Global transaction binding for workspace repositories
 *
 * This module provides infrastructure for automatic transaction binding
 * using AsyncLocalStorage (ALS). When code runs within a transaction scope,
 * all repository operations automatically use the same database connection.
 *
 * Key exports:
 * - TransactionModule: NestJS module to import
 * - TransactionScopeService: Service for running code in transactions
 * - TransactionContextStore: Low-level ALS store (usually not needed directly)
 * - transactionContextStore: Singleton instance of TransactionContextStore
 *
 * Configuration (environment variables):
 * - TRANSACTION_ALS_ENABLED: Enable ALS binding (default: true)
 * - TRANSACTION_DEFAULT_TIMEOUT_MS: Default timeout (default: 30000)
 *
 * @example
 * ```typescript
 * import {
 *   TransactionModule,
 *   TransactionScopeService,
 * } from 'src/mkt-core/common/transaction';
 *
 * // In module
 * @Module({
 *   imports: [TransactionModule],
 * })
 * export class MyModule {}
 *
 * // In service
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     private readonly transactionScopeService: TransactionScopeService,
 *   ) {}
 *
 *   async doWork(workspaceId: string) {
 *     return this.transactionScopeService.runInTransaction(
 *       workspaceId,
 *       async (qr) => {
 *         // All repo operations use the same transaction
 *       }
 *     );
 *   }
 * }
 * ```
 */

// Module
export { TransactionModule } from './transaction.module';

// Service
export {
  TransactionScopeService,
  TransactionTimeoutError,
  CrossWorkspaceTransactionError,
  UnsupportedPropagationError,
} from './transaction-scope.service';

// Types
export type {
  PostgresIsolationLevel,
  TransactionPropagation,
  TransactionOptions,
} from './transaction-scope.service';

// Store (low-level, usually not needed directly)
export {
  TransactionContextStore,
  transactionContextStore,
} from './transaction-context.store';

export type { TransactionStore } from './transaction-context.store';

// Config
export { TRANSACTION_CONFIG } from './transaction.config';

export type { TransactionConfigType } from './transaction.config';
