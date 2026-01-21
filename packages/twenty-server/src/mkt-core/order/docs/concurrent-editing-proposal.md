# Concurrent Editing Solutions for Order Module

## Document Information

| Item | Value |
|------|-------|
| **Document Date** | 2026-01-21 |
| **Module** | mkt-core/order |
| **Author** | Technical Analysis |
| **Status** | Proposal |

---

## 1. Executive Summary

Tài liệu này phân tích vấn đề nhiều người dùng cùng chỉnh sửa một bản ghi Order và đề xuất các giải pháp để xử lý concurrent editing trong module Order.

### Current State Analysis

| Aspect | Current Implementation |
|--------|----------------------|
| **Entity** | `MktOrderWorkspaceEntity` - Không có version field |
| **Locking** | `lockedAt`, `lockedReason` - Chỉ dùng cho payment overdue, không phải concurrent editing |
| **Repository** | Basic TypeORM `update()` - Không có concurrency control |
| **Update Method** | `updateOrderWhere()` tồn tại nhưng chưa được sử dụng cho versioned updates |

**Kết luận**: Hiện tại **không có cơ chế nào** để xử lý concurrent editing.

---

## 2. Problem Statement

### 2.1. Scenario

```
User A: Mở Order #123 để chỉnh sửa (totalAmount = 1,000,000 VND)
User B: Mở Order #123 để chỉnh sửa (totalAmount = 1,000,000 VND)

User A: Sửa totalAmount thành 1,200,000 VND → Save thành công
User B: Sửa discount thành 50,000 VND → Save (overwrites User A's changes!)

Result: totalAmount = 1,000,000 (User A's change is LOST)
```

### 2.2. Impact Assessment

| Risk | Severity | Description |
|------|----------|-------------|
| **Data Loss** | HIGH | Thay đổi của user trước bị ghi đè |
| **Financial Errors** | CRITICAL | Sai lệch số tiền trong order |
| **Audit Trail Issues** | MEDIUM | Khó track ai đã thay đổi gì |
| **Customer Complaints** | HIGH | Order sai dẫn đến khiếu nại |

---

## 3. Proposed Solutions

### 3.1. Solution 1: Optimistic Locking (Recommended)

**Concept**: Mỗi record có một version number. Khi update, kiểm tra version có khớp không.

#### 3.1.1. Entity Changes

```typescript
// mkt-order.workspace-entity.ts
@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.version,
  type: FieldMetadataType.NUMBER,
  label: msg`Version`,
  description: msg`Record version for optimistic locking`,
  icon: 'IconHistory',
  defaultValue: 1,
})
version: number;
```

#### 3.1.2. Repository Implementation

```typescript
// mkt-order.repository.ts

/**
 * Optimistic update - only succeeds if version matches
 * @throws OptimisticLockException if version mismatch
 */
async updateWithVersion(
  orderId: string,
  data: DeepPartial<MktOrderWorkspaceEntity>,
  expectedVersion: number,
): Promise<{ success: boolean; currentVersion?: number }> {
  const repository = await this.getRepository();

  // Atomic update with version check
  const result = await repository
    .createQueryBuilder()
    .update(MktOrderWorkspaceEntity)
    .set({
      ...data,
      version: () => 'version + 1', // Increment version
      updatedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    })
    .where('id = :id', { id: orderId })
    .andWhere('version = :expectedVersion', { expectedVersion })
    .execute();

  if (result.affected === 0) {
    // Version mismatch - someone else updated
    const currentOrder = await this.findById(orderId);
    return {
      success: false,
      currentVersion: currentOrder?.version,
    };
  }

  return { success: true };
}
```

#### 3.1.3. Service Implementation

```typescript
// order-crud.service.ts

async updateOrderOptimistic(
  orderId: string,
  data: Partial<MktOrderWorkspaceEntity>,
  version: number,
): Promise<UpdateOrderResult> {
  const result = await this.orderRepository.updateWithVersion(
    orderId,
    data,
    version,
  );

  if (!result.success) {
    return {
      success: false,
      error: 'CONCURRENT_MODIFICATION',
      message: `Order was modified by another user. Your version: ${version}, Current version: ${result.currentVersion}`,
      currentVersion: result.currentVersion,
    };
  }

  return { success: true };
}
```

#### 3.1.4. GraphQL Input/Output

```typescript
// dto/update-order.input.ts
@InputType()
export class UpdateOrderInput {
  @Field(() => ID)
  orderId: string;

  @Field(() => Int, { description: 'Expected version for optimistic locking' })
  version: number;

  @Field(() => String, { nullable: true })
  note?: string;

  // ... other fields
}

// dto/update-order.output.ts
@ObjectType()
export class UpdateOrderOutput {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => Int, { nullable: true, description: 'Current version if conflict' })
  currentVersion?: number;

  @Field(() => MktOrderOutput, { nullable: true })
  order?: MktOrderOutput;
}
```

#### 3.1.5. Pros & Cons

| Pros | Cons |
|------|------|
| Không block users khác | Cần handle conflict ở frontend |
| Performance tốt (no locks) | User phải refresh và merge changes |
| Dễ implement | Không thích hợp cho high-contention data |
| Standard pattern | Cần thêm field version |

---

### 3.2. Solution 2: Pessimistic Locking (SELECT FOR UPDATE)

**Concept**: Khi một user bắt đầu edit, lock record tại database level.

#### 3.2.1. Repository Implementation

```typescript
// mkt-order.repository.ts

/**
 * Find order with exclusive lock for update
 * Must be used within a transaction
 */
async findByIdForUpdate(
  orderId: string,
  queryRunner: QueryRunner,
): Promise<MktOrderWorkspaceEntity | null> {
  const repository = await this.getRepository();

  return repository
    .createQueryBuilder('order', queryRunner)
    .setLock('pessimistic_write')
    .where('order.id = :id', { id: orderId })
    .getOne();
}

/**
 * Lock order for editing with timeout
 */
async lockOrderForEdit(
  orderId: string,
  userId: string,
  lockDurationMinutes: number = 15,
): Promise<{ success: boolean; lockedBy?: string; expiresAt?: Date }> {
  const repository = await this.getRepository();
  const now = DateTimeUtils.now();
  const expiresAt = DateTimeUtils.add(now, { minutes: lockDurationMinutes });

  // Try to acquire lock
  const result = await repository
    .createQueryBuilder()
    .update(MktOrderWorkspaceEntity)
    .set({
      editLockedBy: userId,
      editLockedAt: DateTimeUtils.toDate(now),
      editLockExpiresAt: DateTimeUtils.toDate(expiresAt),
    })
    .where('id = :id', { id: orderId })
    .andWhere('(editLockedBy IS NULL OR editLockExpiresAt < :now)', {
      now: DateTimeUtils.toDate(now),
    })
    .execute();

  if (result.affected === 0) {
    // Already locked by someone else
    const order = await this.findById(orderId);
    return {
      success: false,
      lockedBy: order?.editLockedBy,
      expiresAt: order?.editLockExpiresAt,
    };
  }

  return { success: true, expiresAt: DateTimeUtils.toDate(expiresAt) };
}

/**
 * Release edit lock
 */
async releaseEditLock(orderId: string, userId: string): Promise<boolean> {
  const repository = await this.getRepository();

  const result = await repository
    .createQueryBuilder()
    .update(MktOrderWorkspaceEntity)
    .set({
      editLockedBy: null,
      editLockedAt: null,
      editLockExpiresAt: null,
    })
    .where('id = :id', { id: orderId })
    .andWhere('editLockedBy = :userId', { userId })
    .execute();

  return (result.affected ?? 0) > 0;
}
```

#### 3.2.2. Required Entity Fields

```typescript
// Thêm vào mkt-order.workspace-entity.ts
@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.editLockedBy,
  type: FieldMetadataType.TEXT,
  label: msg`Edit Locked By`,
  description: msg`User ID who has edit lock`,
  icon: 'IconLock',
})
@WorkspaceIsNullable()
editLockedBy?: string | null;

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.editLockedAt,
  type: FieldMetadataType.DATE_TIME,
  label: msg`Edit Locked At`,
  description: msg`Timestamp when edit lock was acquired`,
  icon: 'IconClock',
})
@WorkspaceIsNullable()
editLockedAt?: Date | null;

@WorkspaceField({
  standardId: MKT_ORDER_FIELD_IDS.editLockExpiresAt,
  type: FieldMetadataType.DATE_TIME,
  label: msg`Edit Lock Expires At`,
  description: msg`Timestamp when edit lock expires`,
  icon: 'IconClockStop',
})
@WorkspaceIsNullable()
editLockExpiresAt?: Date | null;
```

#### 3.2.3. Pros & Cons

| Pros | Cons |
|------|------|
| Guarantee no conflicts | Block other users |
| Simple mental model | Lock có thể bị "stuck" |
| Immediate feedback | Cần cleanup job cho expired locks |
| Suitable for critical data | Performance impact |

---

### 3.3. Solution 3: Hybrid Approach (Recommended for Production)

**Concept**: Kết hợp Optimistic Locking + Soft Edit Lock + Real-time Notifications

#### 3.3.1. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. User opens Order → Call acquireEditLock()                   │
│  2. If locked → Show "User X is editing" + Read-only mode       │
│  3. If available → Acquire soft lock + Start heartbeat          │
│  4. On save → Submit with version number                        │
│  5. On conflict → Show diff + Allow merge                       │
│  6. On close/timeout → Release lock                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend                                   │
├─────────────────────────────────────────────────────────────────┤
│  Soft Lock Layer (Advisory):                                     │
│  - editLockedBy, editLockedAt, editLockExpiresAt                │
│  - Auto-expire after 15 minutes                                  │
│  - Heartbeat extends lock                                        │
│                                                                  │
│  Hard Lock Layer (Optimistic):                                   │
│  - version field                                                 │
│  - Atomic update with version check                              │
│  - Return current data on conflict                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Real-time Notifications                        │
├─────────────────────────────────────────────────────────────────┤
│  Redis PubSub / WebSocket:                                       │
│  - order:123:editing → { userId, userName, startedAt }          │
│  - order:123:updated → { version, updatedBy, changes }          │
│  - order:123:released → { previousEditor }                       │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.3.2. GraphQL Mutations

```typescript
// Mutations for hybrid approach
@Mutation(() => AcquireEditLockOutput)
async acquireOrderEditLock(
  @Args('orderId') orderId: string,
  @AuthWorkspaceMemberId() userId: string,
): Promise<AcquireEditLockOutput>

@Mutation(() => ReleaseEditLockOutput)
async releaseOrderEditLock(
  @Args('orderId') orderId: string,
  @AuthWorkspaceMemberId() userId: string,
): Promise<ReleaseEditLockOutput>

@Mutation(() => ExtendEditLockOutput)
async extendOrderEditLock(
  @Args('orderId') orderId: string,
  @AuthWorkspaceMemberId() userId: string,
): Promise<ExtendEditLockOutput>

@Mutation(() => UpdateOrderOutput)
async updateOrderWithVersion(
  @Args('input') input: UpdateOrderWithVersionInput,
  @AuthWorkspaceMemberId() userId: string,
): Promise<UpdateOrderOutput>
```

#### 3.3.3. Conflict Resolution UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              Conflict Detected Dialog                            │
├─────────────────────────────────────────────────────────────────┤
│  ⚠️ This order was modified by another user                      │
│                                                                  │
│  ┌───────────────┬───────────────┬───────────────┐              │
│  │ Field         │ Your Value    │ Current Value │              │
│  ├───────────────┼───────────────┼───────────────┤              │
│  │ Total Amount  │ 1,200,000    │ 1,100,000    │              │
│  │ Discount      │ (unchanged)   │ 50,000       │              │
│  │ Note          │ "Updated"     │ "Reviewed"    │              │
│  └───────────────┴───────────────┴───────────────┘              │
│                                                                  │
│  Modified by: Nguyen Van A at 10:32:15                          │
│                                                                  │
│  [Keep Mine] [Keep Theirs] [Merge] [Cancel]                     │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3.4. Solution 4: Event Sourcing (Advanced)

**Concept**: Lưu tất cả changes như events, không overwrite data.

#### 3.4.1. Event Structure

```typescript
interface OrderEvent {
  id: string;
  orderId: string;
  eventType: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'ITEM_ADDED' | 'ITEM_REMOVED';
  payload: Record<string, unknown>;
  userId: string;
  timestamp: Date;
  version: number;
}

// Example events
const events = [
  { eventType: 'CREATED', payload: { name: 'Order #123', totalAmount: 1000000 }, version: 1 },
  { eventType: 'UPDATED', payload: { totalAmount: 1200000 }, version: 2 },
  { eventType: 'UPDATED', payload: { discount: 50000 }, version: 3 },
  { eventType: 'STATUS_CHANGED', payload: { from: 'DRAFT', to: 'CONFIRMED' }, version: 4 },
];
```

#### 3.4.2. Benefits for Auditing

- Complete history of all changes
- Can replay to any point in time
- Natural conflict resolution (merge events)
- Perfect audit trail

#### 3.4.3. Pros & Cons

| Pros | Cons |
|------|------|
| Complete audit trail | Complex to implement |
| Can merge concurrent changes | Increased storage |
| Time travel debugging | Need event replay logic |
| No data loss ever | Learning curve for team |

---

## 4. Recommendation Matrix

| Solution | Complexity | Performance | User Experience | Audit Trail | Recommendation |
|----------|------------|-------------|-----------------|-------------|----------------|
| **Optimistic Locking** | Low | High | Medium | Basic | ✅ Short-term |
| **Pessimistic Locking** | Medium | Medium | Low | Basic | ⚠️ Critical fields only |
| **Hybrid Approach** | Medium-High | High | High | Good | ✅ Long-term |
| **Event Sourcing** | High | Medium | High | Excellent | 🔮 Future consideration |

### Recommended Implementation Path

```
Phase 1 (Immediate): Optimistic Locking
├── Add version field to entity
├── Implement updateWithVersion() in repository
├── Update GraphQL mutations to require version
└── Frontend: Handle conflict response

Phase 2 (Short-term): Add Soft Lock Layer
├── Add editLockedBy, editLockedAt, editLockExpiresAt fields
├── Implement acquireEditLock/releaseEditLock mutations
├── Add heartbeat mechanism
└── Frontend: Show "User X is editing" indicator

Phase 3 (Medium-term): Real-time Notifications
├── Integrate Redis PubSub
├── Implement WebSocket notifications
├── Live collaboration indicators
└── Conflict resolution UI
```

---

## 5. Implementation Checklist

### 5.1. Database Changes

- [ ] Add `version` field to `mktOrder` table (default: 1)
- [ ] Add `editLockedBy` field (nullable)
- [ ] Add `editLockedAt` field (nullable)
- [ ] Add `editLockExpiresAt` field (nullable)
- [ ] Create migration script
- [ ] Update existing records with version = 1

### 5.2. Backend Changes

- [ ] Update `MktOrderWorkspaceEntity` with new fields
- [ ] Add field IDs to `mkt-field-ids.ts`
- [ ] Implement `updateWithVersion()` in repository
- [ ] Implement `lockOrderForEdit()` in repository
- [ ] Create `OrderConcurrencyService`
- [ ] Add new GraphQL mutations
- [ ] Update existing update mutations to use version
- [ ] Add cleanup job for expired locks

### 5.3. Frontend Changes

- [ ] Update Order edit form to track version
- [ ] Implement lock acquisition on edit start
- [ ] Add heartbeat for lock extension
- [ ] Implement conflict resolution dialog
- [ ] Show "User X is editing" indicator
- [ ] Handle version mismatch errors

### 5.4. Testing

- [ ] Unit tests for optimistic locking
- [ ] Unit tests for soft lock mechanism
- [ ] Integration tests for concurrent updates
- [ ] E2E tests for conflict resolution flow
- [ ] Load testing with multiple concurrent editors

---

## 6. API Specification

### 6.1. AcquireEditLock

```graphql
mutation AcquireOrderEditLock($orderId: ID!) {
  acquireOrderEditLock(orderId: $orderId) {
    success
    lockedBy {
      id
      name
    }
    expiresAt
    error
  }
}
```

### 6.2. UpdateOrderWithVersion

```graphql
mutation UpdateOrder($input: UpdateOrderInput!) {
  updateOrder(input: $input) {
    success
    order {
      id
      version
      # ... other fields
    }
    conflict {
      currentVersion
      currentData {
        # ... conflicting fields
      }
      modifiedBy {
        id
        name
      }
      modifiedAt
    }
    error
  }
}

input UpdateOrderInput {
  orderId: ID!
  version: Int!  # Required for optimistic locking
  note: String
  discount: Float
  # ... other editable fields
}
```

### 6.3. ReleaseEditLock

```graphql
mutation ReleaseOrderEditLock($orderId: ID!) {
  releaseOrderEditLock(orderId: $orderId) {
    success
  }
}
```

---

## 7. Error Codes

| Code | Message | HTTP Status | Action |
|------|---------|-------------|--------|
| `CONCURRENT_MODIFICATION` | Order was modified by another user | 409 Conflict | Show diff, allow merge |
| `ORDER_LOCKED` | Order is being edited by another user | 423 Locked | Show who is editing |
| `LOCK_EXPIRED` | Your edit session has expired | 410 Gone | Re-acquire lock |
| `VERSION_MISMATCH` | Version mismatch | 409 Conflict | Refresh and retry |

---

## 8. Monitoring & Alerts

### 8.1. Metrics to Track

- `order.concurrent_edit_attempts` - Counter
- `order.lock_acquisition_time` - Histogram
- `order.version_conflicts` - Counter
- `order.lock_timeouts` - Counter
- `order.successful_merges` - Counter

### 8.2. Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| High conflict rate | > 5% of updates | Investigate user workflows |
| Lock stuck | > 30 minutes | Auto-release + notify |
| Version skips | version > expected + 1 | Check for race conditions |

---

## 9. Appendix

### 9.1. Current Locking Fields (Payment Overdue - NOT for Edit)

Current fields trong entity được dùng cho business logic (payment overdue), **không phải** cho concurrent editing:

```typescript
// EXISTING - For payment overdue locking (business logic)
lockedAt?: Date | null;      // When order was locked due to overdue
lockedReason?: string | null; // "PAYMENT_OVERDUE"

// PROPOSED - For edit locking (concurrent editing)
editLockedBy?: string | null;      // User ID who has edit lock
editLockedAt?: Date | null;        // When edit lock was acquired
editLockExpiresAt?: Date | null;   // When edit lock expires
version: number;                    // For optimistic locking
```

### 9.2. Related Files

| File | Purpose |
|------|---------|
| `mkt-order.workspace-entity.ts` | Entity definition |
| `mkt-order.repository.ts` | Data access layer |
| `order-crud.service.ts` | Domain service |
| `order-mutation.resolver.ts` | GraphQL mutations |
| `order-lock.service.ts` | Payment overdue locking (not edit locking) |

### 9.3. References

- [TypeORM Optimistic Locking](https://typeorm.io/decorator-reference#versioncolumn)
- [PostgreSQL SELECT FOR UPDATE](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
- [Martin Fowler - Optimistic Offline Lock](https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-21 | Technical Analysis | Initial proposal |
