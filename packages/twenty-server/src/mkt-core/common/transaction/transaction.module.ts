import { Global, Module } from '@nestjs/common';

import {
  TransactionContextStore,
  transactionContextStore,
} from './transaction-context.store';
import { TransactionScopeService } from './transaction-scope.service';

/**
 * TransactionModule - Global module for transaction management
 *
 * Provides:
 * - TransactionContextStore: AsyncLocalStorage-based transaction context (singleton)
 * - TransactionScopeService: API for running code within transactions
 *
 * This module is marked as @Global() so its providers are available
 * throughout the application without explicit imports.
 *
 * Usage:
 * 1. Import TransactionModule in your root module (MktCoreModule)
 * 2. Inject TransactionScopeService where needed
 * 3. Use runInTransaction() to execute code within a transaction
 *
 * @example
 * ```typescript
 * // In your service
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     private readonly transactionScopeService: TransactionScopeService,
 *   ) {}
 *
 *   async createOrder(workspaceId: string, data: OrderData) {
 *     return this.transactionScopeService.runInTransaction(
 *       workspaceId,
 *       async (queryRunner) => {
 *         // All repository operations use the same transaction
 *         await this.orderRepository.create(data);
 *         await this.itemRepository.createMany(data.items);
 *       }
 *     );
 *   }
 * }
 * ```
 */
@Global()
@Module({
  providers: [
    // Use singleton instance for TransactionContextStore
    // CRITICAL: AsyncLocalStorage only works with a single shared instance
    {
      provide: TransactionContextStore,
      useValue: transactionContextStore,
    },
    TransactionScopeService,
  ],
  exports: [TransactionContextStore, TransactionScopeService],
})
export class TransactionModule {}
