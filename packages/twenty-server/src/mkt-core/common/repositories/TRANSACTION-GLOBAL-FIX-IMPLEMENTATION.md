# Global Transaction Binding for Workspace Repositories (Fix once for all)

> **Status**: Proposed
> **Priority**: P0
> **Owner**: Backend
> **Date**: 2026-01-20
> **Last Updated**: 2026-01-20

## 0) TL;DR

Hiện tại Saga/Webhook mở `QueryRunner.startTransaction()` nhưng các repository trong `mkt-core` (đa phần extend `BaseWorkspaceRepository`) lại gọi `getRepository()` theo workspace context → lấy repository trên connection khác → transaction/savepoint **không bao bọc được write**.

**Global fix**: dùng **AsyncLocalStorage (ALS)** để lưu `QueryRunner` đang active cho "transaction scope", và sửa `BaseWorkspaceRepository.getRepository()` để:

- Nếu đang trong ALS scope và `queryRunner.isTransactionActive === true` và `workspaceId` khớp → trả về repository từ `queryRunner.manager.getRepository(...)` (WorkspaceEntityManager) **bound đúng transaction**.
- Nếu không → fallback hành vi cũ: `TwentyORMGlobalManager.getRepositoryForWorkspace(...)`.

Kết quả: **không cần** thêm `*Tx` methods, không cần đổi signature hàng loạt; chỉ cần wrap các "entry points" (Saga/Webhook/Job) chạy trong transaction scope.

---

## 1) Problem

### 1.1 Symptom
- `CreateOrderSaga` / `BaseSaga` tạo `queryRunner` và `SAVEPOINT`.
- Steps gọi `MktOrderRepository`, `MktOrderItemRepository`, …
- Các repo methods hiện tại thường làm:
  ```ts
  const repository = await this.getRepository();
  return repository.save(entity);
  ```
  `getRepository()` gọi `TwentyORMGlobalManager.getRepositoryForWorkspace(...)` → repo dùng connection khác.

### 1.2 Impact
- **Atomicity broken**: rollback/savepoint không rollback được data đã ghi bằng connection khác.
- **False safety**: code nhìn "đúng transaction" nhưng thực tế transaction "ảo".

---

## 2) Goals / Non-goals

### Goals
1. Fix "1 lần cho tất cả": bất kỳ code path nào đang chạy trong transaction scope sẽ tự động sử dụng repository bound với `QueryRunner`.
2. Không thay đổi signature hàng loạt trong repositories.
3. Tương thích với Twenty ORM: `WorkspaceDataSource.createQueryRunner()` đã gắn `WorkspaceEntityManager` vào `queryRunner.manager`.
4. Có guard chống leak sang workspace khác.

### Non-goals
- Không tự động bọc transaction cho mọi request (chỉ áp dụng cho các flows cần transaction: saga/webhook/cron job).
- Không thay đổi logic business của steps/services.

---

## 3) Proposed Architecture

### 3.1 Components

1) **TransactionContextStore (AsyncLocalStorage)**
- Lưu `{ workspaceId, queryRunner, txId }` cho async call chain hiện tại.
- **MUST be global singleton** để ALS hoạt động đúng across entire application.

2) **TransactionScopeService**
- API duy nhất để chạy code trong transaction:
  - tạo `queryRunner` từ workspace datasource
  - startTransaction (option isolation, propagation, timeout)
  - `als.run(store, async () => fn(queryRunner))`
  - commit/rollback
  - release

3) **BaseWorkspaceRepository.getRepository() enhancement**
- Ưu tiên lấy repo từ ALS nếu có queryRunner active.

### 3.2 Data flow

```
Entry point (Saga/Webhook/Job)
  -> TransactionScopeService.runInTransaction(workspaceId, fn)
      -> ALS store: { workspaceId, queryRunner, txId }
      -> fn executes business logic
          -> repositories call BaseWorkspaceRepository.getRepository()
              -> sees ALS queryRunner => queryRunner.manager.getRepository(...)
              -> SAME connection/transaction
```

---

## 4) Detailed Design

## 4.1 TransactionContextStore

**File**: `packages/twenty-server/src/mkt-core/common/transaction/transaction-context.store.ts`

```ts
import { AsyncLocalStorage } from 'node:async_hooks';
import { QueryRunner } from 'typeorm';

export type TransactionStore = {
  workspaceId: string;
  queryRunner: QueryRunner;
  txId: string;  // UUID for tracing/logging
  startedAt: number;  // timestamp for duration tracking
};

export class TransactionContextStore {
  private readonly als = new AsyncLocalStorage<TransactionStore>();

  run<T>(store: TransactionStore, fn: () => Promise<T>): Promise<T> {
    return this.als.run(store, fn);
  }

  get(): TransactionStore | undefined {
    return this.als.getStore();
  }

  isInTransaction(): boolean {
    const store = this.get();
    return !!store?.queryRunner?.isTransactionActive;
  }
}

// IMPORTANT: Export singleton instance for global access
export const transactionContextStore = new TransactionContextStore();
```

**Module Registration** (singleton pattern):

```ts
// packages/twenty-server/src/mkt-core/common/transaction/transaction.module.ts
import { Global, Module } from '@nestjs/common';
import { TransactionContextStore, transactionContextStore } from './transaction-context.store';
import { TransactionScopeService } from './transaction-scope.service';

@Global()
@Module({
  providers: [
    {
      provide: TransactionContextStore,
      useValue: transactionContextStore,  // Use singleton instance
    },
    TransactionScopeService,
  ],
  exports: [TransactionContextStore, TransactionScopeService],
})
export class TransactionModule {}
```

**Notes**
- ALS là built-in Node, không thêm dependency.
- Store chỉ sống trong async chain của request/saga execution.
- **MUST use singleton** - nếu dùng request-scoped sẽ không work vì mỗi injection tạo instance mới.

## 4.2 TransactionScopeService

**File**: `packages/twenty-server/src/mkt-core/common/transaction/transaction-scope.service.ts`

```ts
import { Injectable, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { randomUUID } from 'node:crypto';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { TransactionContextStore } from './transaction-context.store';

export type PostgresIsolationLevel = 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';

export type TransactionPropagation =
  | 'REQUIRED'      // Reuse existing transaction or create new
  | 'REQUIRES_NEW'  // Always create new transaction (suspend current - advanced)
  | 'NESTED';       // Use savepoint inside existing transaction

export type TransactionOptions = {
  isolationLevel?: PostgresIsolationLevel;
  propagation?: TransactionPropagation;
  timeoutMs?: number;  // default: 30000ms
  readOnly?: boolean;
};

const DEFAULT_TIMEOUT_MS = 30000;

export class TransactionTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Transaction timed out after ${timeoutMs}ms`);
    this.name = 'TransactionTimeoutError';
  }
}

@Injectable()
export class TransactionScopeService {
  private readonly logger = new Logger(TransactionScopeService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly txStore: TransactionContextStore,
  ) {}

  /**
   * Run a function within a database transaction.
   * All repository operations inside `fn` will automatically use the same transaction.
   */
  async runInTransaction<T>(
    workspaceId: string,
    fn: (queryRunner: QueryRunner) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const propagation = options?.propagation ?? 'REQUIRED';
    const existingStore = this.txStore.get();

    // Handle propagation modes
    if (existingStore?.queryRunner?.isTransactionActive) {
      if (existingStore.workspaceId !== workspaceId) {
        throw new Error(
          `Cannot nest transaction for workspace ${workspaceId} inside transaction for workspace ${existingStore.workspaceId}`
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
          // This is advanced - would need to suspend current transaction
          // For now, throw error to prevent misuse
          throw new Error(
            'REQUIRES_NEW propagation is not yet supported. Use REQUIRED or NESTED.'
          );
      }
    }

    // Create new transaction
    return this.createNewTransaction(workspaceId, fn, options);
  }

  /**
   * Run a read-only transaction (optimized for reads).
   */
  async runReadOnly<T>(
    workspaceId: string,
    fn: (queryRunner: QueryRunner) => Promise<T>,
    options?: Omit<TransactionOptions, 'readOnly'>,
  ): Promise<T> {
    return this.runInTransaction(workspaceId, fn, { ...options, readOnly: true });
  }

  private async createNewTransaction<T>(
    workspaceId: string,
    fn: (queryRunner: QueryRunner) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const txId = randomUUID();
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const startedAt = Date.now();

    const dataSource = await this.twentyORMGlobalManager.getDataSourceForWorkspace({ workspaceId });
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
      const store: import('./transaction-context.store').TransactionStore = {
        workspaceId,
        queryRunner,
        txId,
        startedAt,
      };

      const resultPromise = this.txStore.run(store, () => fn(queryRunner));

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new TransactionTimeoutError(timeoutMs)), timeoutMs);
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
    existingStore: import('./transaction-context.store').TransactionStore,
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

    await queryRunner.query(`SAVEPOINT ${savepointName}`);

    try {
      const result = await fn(queryRunner);
      await queryRunner.query(`RELEASE SAVEPOINT ${savepointName}`);

      this.logger.debug({
        message: 'Savepoint released',
        txId,
        workspaceId,
        savepointName,
      });

      return result;
    } catch (e) {
      await queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);

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
```

**Notes**
- Saga vẫn có thể dùng savepoint: `fn` nhận `queryRunner` để gọi `SAVEPOINT`/`ROLLBACK TO SAVEPOINT`.
- Propagation modes cho phép nested transactions an toàn.
- Timeout đảm bảo không có long-running transactions blocking connections.

## 4.3 BaseWorkspaceRepository enhancement (global wiring)

**File to modify**: `packages/twenty-server/src/mkt-core/common/repositories/base-workspace.repository.ts`

### Change summary
- Inject thêm `TransactionContextStore` (optional) hoặc import singleton.
- `getRepository(workspaceId?)` sẽ:
  1) Nếu có txStore và txStore.get() trả về `{ workspaceId: wsFromStore, queryRunner }`:
     - Nếu `queryRunner.isTransactionActive` và (workspaceId param is undefined OR workspaceId param === wsFromStore)
     - Return `queryRunner.manager.getRepository(this.entityClass, { shouldBypassPermissionChecks: true })`
  2) Else fallback hành vi cũ.

### Implementation

```ts
import { transactionContextStore } from '../transaction/transaction-context.store';
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/workspace-entity-manager';

async getRepository(workspaceId?: string): Promise<WorkspaceRepository<T>> {
  const store = transactionContextStore.get();

  if (store?.queryRunner?.isTransactionActive) {
    const requestedWs = workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    // Guard: không "mượn" transaction của workspace khác
    if (requestedWs && requestedWs === store.workspaceId) {
      const manager = store.queryRunner.manager;

      // Type guard: ensure it's WorkspaceEntityManager
      if (this.isWorkspaceEntityManager(manager)) {
        this.logger.debug({
          message: 'Using transaction-bound repository',
          txId: store.txId,
          workspaceId: store.workspaceId,
          entity: this.entityClass.name,
        });

        return manager.getRepository(
          this.entityClass,
          { shouldBypassPermissionChecks: true },
        ) as WorkspaceRepository<T>;
      }

      this.logger.warn({
        message: 'QueryRunner manager is not WorkspaceEntityManager, falling back to default',
        txId: store.txId,
        workspaceId: store.workspaceId,
      });
    }
  }

  // existing behavior - get repository from TwentyORMGlobalManager
  const resolvedWorkspaceId = workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

  return this.twentyORMGlobalManager.getRepositoryForWorkspace(
    resolvedWorkspaceId,
    this.entityClass,
    { shouldBypassPermissionChecks: true },
  );
}

private isWorkspaceEntityManager(manager: unknown): manager is WorkspaceEntityManager {
  return (
    manager !== null &&
    typeof manager === 'object' &&
    'getRepository' in manager &&
    typeof (manager as any).getRepository === 'function' &&
    // Additional check for WorkspaceEntityManager specific property
    'workspaceId' in manager
  );
}
```

**Why this works in this codebase**
- `WorkspaceDataSource.createQueryRunner()` assigns `WorkspaceEntityManager` to `queryRunner.manager`.
- `WorkspaceEntityManager.getRepository()` returns `WorkspaceRepository` with permission bypass support.

## 4.4 Transactional Decorator (Optional - Clean Syntax)

**File**: `packages/twenty-server/src/mkt-core/common/transaction/transactional.decorator.ts`

```ts
import { TransactionOptions, TransactionScopeService } from './transaction-scope.service';

const TRANSACTION_SERVICE_KEY = Symbol('transactionScopeService');
const WORKSPACE_ID_GETTER_KEY = Symbol('workspaceIdGetter');

/**
 * Decorator to automatically wrap method in transaction.
 *
 * Usage:
 * ```ts
 * @Transactional({ propagation: 'REQUIRED' })
 * async createOrder(input: CreateOrderInput): Promise<Order> {
 *   // This method runs inside a transaction
 * }
 * ```
 *
 * Requirements:
 * - Class must have `transactionScopeService: TransactionScopeService` injected
 * - Class must have `getWorkspaceId(): string` method
 */
export const Transactional = (options?: TransactionOptions) => {
  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const txService: TransactionScopeService = (this as any).transactionScopeService;

      if (!txService) {
        throw new Error(
          `@Transactional requires 'transactionScopeService' to be injected in ${target.constructor.name}`
        );
      }

      const getWorkspaceId = (this as any).getWorkspaceId;

      if (typeof getWorkspaceId !== 'function') {
        throw new Error(
          `@Transactional requires 'getWorkspaceId()' method in ${target.constructor.name}`
        );
      }

      const workspaceId = getWorkspaceId.call(this);

      return txService.runInTransaction(
        workspaceId,
        () => originalMethod.apply(this, args),
        options,
      );
    };

    return descriptor;
  };
};
```

**Usage Example**:

```ts
@Injectable()
export class CreateOrderSaga {
  constructor(
    private readonly transactionScopeService: TransactionScopeService,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private getWorkspaceId(): string {
    return this.scopedWorkspaceContextFactory.create().workspaceId;
  }

  @Transactional({ propagation: 'REQUIRED', timeoutMs: 60000 })
  async execute(input: CreateOrderSagaInput): Promise<Order> {
    // All repository operations automatically use the transaction
    const order = await this.orderRepository.create(input);
    await this.orderItemRepository.createMany(input.items);
    return order;
  }
}
```

---

## 5) Migration Plan (safe rollout)

### Phase 0 — Add infrastructure (no behavior change)

1. Add `TransactionContextStore` + `TransactionScopeService` (new files, new provider registration).
2. Update module wiring:
   - Add `TransactionModule` to `MktCoreModule` imports.
3. Add feature flag for gradual rollout:
   ```ts
   // .env
   TRANSACTION_ALS_ENABLED=false  // Start disabled
   ```

### Phase 1 — Update BaseWorkspaceRepository

1. Modify `BaseWorkspaceRepository.getRepository()` to prefer ALS transaction (behind feature flag).
2. Unit tests:
   - Without ALS store: should call `twentyORMGlobalManager.getRepositoryForWorkspace`.
   - With ALS store + active tx + workspace match: should call `queryRunner.manager.getRepository`.
   - With ALS store but workspace mismatch: must fallback.
   - Type guard tests for WorkspaceEntityManager.

### Phase 2 — Wrap transaction entry points

Update các "entry points" đang tự tạo queryRunner:

1) **Order Sagas**
- `BaseSaga.execute(...)` và/hoặc `CreateOrderSaga.execute(...)`:
  - Thay vì tự `createQueryRunner/startTransaction/commit/rollback`, gọi:
    ```ts
    return this.transactionScopeService.runInTransaction(workspaceId, async (queryRunner) => {
      // giữ nguyên logic hiện tại, bao gồm SAVEPOINT
      // steps gọi repositories -> tự động dùng queryRunner
    });
    ```

2) **Payment webhook handlers** (`SepayWebhookHandler.processWebhook`)
- Wrap toàn bộ processing trong `runInTransaction`.

3) **Cron/Worker flows** (nếu có queryRunner pattern tương tự)

### Phase 3 — Enable feature flag & monitor

#### 3.1 Environment Variables

Add to `.env` (đã có trong `.env.example`):
```bash
# Feature flag - enable ALS transaction binding
TRANSACTION_ALS_ENABLED=true

# Transaction timeout (default: 30s)
TRANSACTION_DEFAULT_TIMEOUT_MS=30000
```

#### 3.2 Staging Deployment Checklist

- [ ] Deploy code changes to staging
- [ ] Set `TRANSACTION_ALS_ENABLED=true` in staging environment
- [ ] Restart twenty-server service
- [ ] Verify logs show: `TransactionModule initialized with ALS_ENABLED=true`

#### 3.3 Monitoring Checklist

**Success indicators (grep logs):**
```bash
# Transaction bound repositories being used
grep "Using transaction-bound repository" logs/twenty-server.log

# Transaction lifecycle
grep "Transaction started\|Transaction committed\|Transaction rolled back" logs/twenty-server.log

# Saga completion
grep "Saga completed successfully" logs/twenty-server.log
```

**Warning indicators (cần điều tra):**
```bash
# Workspace mismatch - có thể là bug
grep "Workspace mismatch in transaction context" logs/twenty-server.log

# Manager type mismatch
grep "not WorkspaceEntityManager" logs/twenty-server.log

# Transaction timeout
grep "TransactionTimeoutError" logs/twenty-server.log
```

**Error indicators (cần fix ngay):**
```bash
# Transaction rollback
grep "Transaction rolled back" logs/twenty-server.log

# Saga failures
grep "Saga execution error\|Step.*failed" logs/twenty-server.log

# Compensation failures
grep "CRITICAL.*compensation" logs/twenty-server.log
```

#### 3.4 Test Scenarios

| Scenario | Expected Behavior | How to Test |
|----------|-------------------|-------------|
| Create order success | All steps committed, event emitted | Create order via GraphQL |
| Create order failure | All changes rolled back | Create order with invalid data |
| Concurrent orders | Each uses separate transaction | Create 2 orders simultaneously |
| Nested transaction | Uses SAVEPOINT | Confirm order (uses savepoints per step) |
| Transaction timeout | Rollback after timeout | Set timeout to 1ms (test only) |

#### 3.5 Production Rollout

- [ ] Staging validation passed (≥3 days)
- [ ] No transaction-related errors in staging logs
- [ ] Performance metrics acceptable (transaction duration < 5s avg)
- [ ] Enable `TRANSACTION_ALS_ENABLED=true` in production
- [ ] Monitor first 24 hours closely
- [ ] Document any issues in ADR

#### 3.6 Rollback Plan

If issues occur in production:
```bash
# 1. Disable feature flag immediately
TRANSACTION_ALS_ENABLED=false

# 2. Restart service
systemctl restart twenty-server

# 3. Verify rollback
grep "ALS_ENABLED=false" logs/twenty-server.log
```

Khi `TRANSACTION_ALS_ENABLED=false`:
- `BaseWorkspaceRepository.getRepository()` sẽ skip ALS check
- Repositories sử dụng connection mặc định (behavior cũ)
- Không có data loss, chỉ có thể có race conditions như trước

### Phase 4 — Audit & enforce

- Grep các nơi có `createQueryRunner()` và ensure sử dụng `TransactionScopeService`.
- Add lightweight checklist trong PR template hoặc code review rule: "Nếu mở transaction, phải chạy trong tx scope".
- Remove feature flag after stable rollout.

---

## 6) Testing Strategy

### Unit tests

```ts
describe('TransactionContextStore', () => {
  it('should store and retrieve transaction context', () => {
    const store = new TransactionContextStore();
    const mockQueryRunner = { isTransactionActive: true } as QueryRunner;

    await store.run(
      { workspaceId: 'ws-1', queryRunner: mockQueryRunner, txId: 'tx-1', startedAt: Date.now() },
      async () => {
        const ctx = store.get();
        expect(ctx?.workspaceId).toBe('ws-1');
        expect(ctx?.queryRunner).toBe(mockQueryRunner);
      }
    );
  });

  it('should isolate contexts across concurrent async operations', async () => {
    const store = new TransactionContextStore();
    const qr1 = { id: 'qr1', isTransactionActive: true } as any;
    const qr2 = { id: 'qr2', isTransactionActive: true } as any;

    const results = await Promise.all([
      store.run({ workspaceId: 'ws-1', queryRunner: qr1, txId: 'tx-1', startedAt: Date.now() }, async () => {
        await delay(50);  // Simulate async work
        return store.get()?.queryRunner === qr1;
      }),
      store.run({ workspaceId: 'ws-2', queryRunner: qr2, txId: 'tx-2', startedAt: Date.now() }, async () => {
        return store.get()?.queryRunner === qr2;
      }),
    ]);

    expect(results).toEqual([true, true]);
  });

  it('should return undefined outside of transaction scope', () => {
    const store = new TransactionContextStore();
    expect(store.get()).toBeUndefined();
  });
});
```

### TransactionScopeService tests

```ts
describe('TransactionScopeService', () => {
  describe('runInTransaction', () => {
    it('should commit on success', async () => {
      const result = await service.runInTransaction('ws-1', async (qr) => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      await expect(
        service.runInTransaction('ws-1', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should timeout long-running transactions', async () => {
      await expect(
        service.runInTransaction('ws-1', async () => {
          await delay(5000);  // Longer than timeout
        }, { timeoutMs: 100 })
      ).rejects.toThrow(TransactionTimeoutError);
    });

    it('should reuse existing transaction with REQUIRED propagation', async () => {
      await service.runInTransaction('ws-1', async (outerQr) => {
        await service.runInTransaction('ws-1', async (innerQr) => {
          expect(innerQr).toBe(outerQr);  // Same queryRunner
        }, { propagation: 'REQUIRED' });
      });
    });

    it('should use savepoint with NESTED propagation', async () => {
      await service.runInTransaction('ws-1', async (qr) => {
        await service.runInTransaction('ws-1', async () => {
          // Should have created savepoint
        }, { propagation: 'NESTED' });
      });

      expect(mockQueryRunner.query).toHaveBeenCalledWith(expect.stringContaining('SAVEPOINT'));
    });

    it('should reject cross-workspace nested transactions', async () => {
      await service.runInTransaction('ws-1', async () => {
        await expect(
          service.runInTransaction('ws-2', async () => {})
        ).rejects.toThrow(/Cannot nest transaction/);
      });
    });
  });
});
```

### BaseWorkspaceRepository tests

```ts
describe('BaseWorkspaceRepository.getRepository', () => {
  it('should use transaction-bound repository when in transaction scope', async () => {
    const mockTxRepo = {} as WorkspaceRepository<any>;
    mockQueryRunner.manager.getRepository.mockReturnValue(mockTxRepo);

    transactionContextStore.run(
      { workspaceId: 'ws-1', queryRunner: mockQueryRunner, txId: 'tx-1', startedAt: Date.now() },
      async () => {
        const repo = await repository.getRepository('ws-1');
        expect(repo).toBe(mockTxRepo);
        expect(mockTwentyORMGlobalManager.getRepositoryForWorkspace).not.toHaveBeenCalled();
      }
    );
  });

  it('should fallback when workspace mismatch', async () => {
    transactionContextStore.run(
      { workspaceId: 'ws-1', queryRunner: mockQueryRunner, txId: 'tx-1', startedAt: Date.now() },
      async () => {
        await repository.getRepository('ws-2');  // Different workspace
        expect(mockTwentyORMGlobalManager.getRepositoryForWorkspace).toHaveBeenCalled();
      }
    );
  });

  it('should fallback when not in transaction', async () => {
    await repository.getRepository('ws-1');
    expect(mockTwentyORMGlobalManager.getRepositoryForWorkspace).toHaveBeenCalled();
  });
});
```

### Integration tests (high value)

```ts
describe('Transaction Integration', () => {
  describe('Saga rollback', () => {
    it('should rollback all changes when step fails', async () => {
      const orderCountBefore = await countOrders();

      await expect(
        transactionScopeService.runInTransaction('ws-1', async () => {
          await orderRepository.create({ ... });
          await orderItemRepository.create({ ... });
          throw new Error('Simulated failure');
        })
      ).rejects.toThrow();

      const orderCountAfter = await countOrders();
      expect(orderCountAfter).toBe(orderCountBefore);  // No orders persisted
    });
  });

  describe('Savepoint behavior', () => {
    it('should rollback to savepoint on nested failure', async () => {
      await transactionScopeService.runInTransaction('ws-1', async () => {
        await orderRepository.create({ id: 'order-1' });

        try {
          await transactionScopeService.runInTransaction('ws-1', async () => {
            await orderItemRepository.create({ orderId: 'order-1' });
            throw new Error('Item creation failed');
          }, { propagation: 'NESTED' });
        } catch {
          // Ignore - savepoint should have rolled back
        }

        // Order should still exist, items should not
        const order = await orderRepository.findById('order-1');
        const items = await orderItemRepository.findByOrderId('order-1');

        expect(order).toBeDefined();
        expect(items).toHaveLength(0);
      });
    });
  });

  describe('Webhook rollback', () => {
    it('should rollback payment update on processing failure', async () => {
      const paymentBefore = await paymentRepository.findById('payment-1');

      await expect(
        webhookHandler.processWebhook({
          paymentId: 'payment-1',
          status: 'completed',
        })
      ).rejects.toThrow();

      const paymentAfter = await paymentRepository.findById('payment-1');
      expect(paymentAfter.status).toBe(paymentBefore.status);  // Unchanged
    });
  });

  describe('Connection pool', () => {
    it('should handle concurrent transactions without exhausting pool', async () => {
      const concurrency = 20;

      const promises = Array.from({ length: concurrency }, (_, i) =>
        transactionScopeService.runInTransaction('ws-1', async () => {
          await delay(100);
          return i;
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(concurrency);
    });
  });
});
```

---

## 7) Risks & mitigations

### 7.1 Context leak (code chạy async sau khi transaction đã commit/release)

**Risk**: Background async tasks scheduled inside transaction scope may try to use released queryRunner.

**Mitigation**:
- Không schedule background async tasks inside transaction scope mà vẫn dùng repositories.
- Nếu cần, schedule sau commit (event emission after commit như hiện tại).
- Add warning log if repository access attempted with released queryRunner.

### 7.2 Workspace mismatch

**Risk**: Code accidentally uses transaction from different workspace.

**Mitigation**:
- Guard workspaceId phải match store.workspaceId.
- Throw explicit error for cross-workspace nested transactions.

### 7.3 Nested transactions

**Decision**: Support via propagation modes:
- `REQUIRED` (default): Reuse existing transaction
- `NESTED`: Use savepoint for partial rollback capability
- `REQUIRES_NEW`: Not supported initially (complex, rarely needed)

### 7.4 Long-running transactions

**Risk**: Transactions holding connections for too long can exhaust connection pool.

**Mitigation**:
- Default timeout of 30 seconds
- `SET LOCAL statement_timeout` ensures DB-level timeout
- Logging tracks transaction duration for monitoring

### 7.5 Feature flag rollback

**Risk**: Need ability to quickly disable if issues found.

**Mitigation**:
- `TRANSACTION_ALS_ENABLED` feature flag
- Fallback behavior is well-tested existing code

---

## 8) Operational / Observability

### Logging

All transaction operations should log with consistent fields:

```ts
{
  message: 'Transaction started|committed|rolled back',
  txId: string,           // UUID for correlation
  workspaceId: string,
  isolationLevel?: string,
  durationMs?: number,
  error?: string,
  savepointName?: string,  // For nested transactions
}
```

### Metrics (recommended)

```ts
// Prometheus metrics
const transactionCounter = new Counter({
  name: 'mkt_transactions_total',
  help: 'Total number of transactions',
  labelNames: ['workspace_id', 'status'],  // status: committed, rolled_back, timeout
});

const transactionDuration = new Histogram({
  name: 'mkt_transaction_duration_seconds',
  help: 'Transaction duration in seconds',
  labelNames: ['workspace_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});
```

### Alerts (recommended)

- High rollback rate (> 5% of transactions)
- Long transaction duration (p99 > 10s)
- Transaction timeout rate increasing

---

## 9) Rollback Plan

### Immediate rollback (feature flag)

```bash
# Disable ALS-based transaction binding
TRANSACTION_ALS_ENABLED=false
```

### Code rollback

1. Revert `BaseWorkspaceRepository.getRepository()` change (ALS check).
2. Keep TransactionScopeService/store (no side effects if unused).
3. Entry points can return to explicit `queryRunner.manager.getRepository` if needed.

### Data cleanup

- No data migration needed - this is purely runtime behavior change.
- Existing data is not affected by rollback.

---

## 10) Future Enhancements

### 10.1 Distributed Tracing Integration

```ts
// Integrate with OpenTelemetry
const span = tracer.startSpan('transaction', {
  attributes: {
    'db.transaction.id': txId,
    'db.workspace.id': workspaceId,
  },
});
```

### 10.2 Read Replica Support

```ts
async runReadOnly<T>(workspaceId: string, fn: () => Promise<T>): Promise<T> {
  // Route to read replica if available
  const dataSource = await this.getReadReplicaDataSource(workspaceId);
  // ...
}
```

### 10.3 Transaction Hooks

```ts
// Before/after commit hooks for side effects
await transactionScopeService.runInTransaction(workspaceId, async () => {
  // ...
}, {
  afterCommit: async () => {
    // Send notifications, emit events
  },
});
```

---

## Appendix A: File Structure

```
packages/twenty-server/src/mkt-core/common/transaction/
├── transaction.module.ts
├── transaction-context.store.ts
├── transaction-scope.service.ts
├── transactional.decorator.ts
├── index.ts
└── __tests__/
    ├── transaction-context.store.spec.ts
    ├── transaction-scope.service.spec.ts
    └── transaction-integration.spec.ts
```

## Appendix B: Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSACTION_ALS_ENABLED` | `true` | Enable ALS-based transaction binding |
| `TRANSACTION_DEFAULT_TIMEOUT_MS` | `30000` | Default transaction timeout |

## Appendix C: Quick Reference

```ts
// Basic usage
await transactionScopeService.runInTransaction(workspaceId, async (qr) => {
  // All repository operations use same transaction
  await orderRepo.create(order);
  await itemRepo.createMany(items);
});

// With options
await transactionScopeService.runInTransaction(workspaceId, async (qr) => {
  // ...
}, {
  isolationLevel: 'SERIALIZABLE',
  propagation: 'NESTED',
  timeoutMs: 60000,
});

// Read-only
await transactionScopeService.runReadOnly(workspaceId, async (qr) => {
  return orderRepo.findMany();
});

// Using decorator
@Transactional({ propagation: 'REQUIRED' })
async createOrder(input: CreateOrderInput): Promise<Order> {
  // Automatically wrapped in transaction
}
```
