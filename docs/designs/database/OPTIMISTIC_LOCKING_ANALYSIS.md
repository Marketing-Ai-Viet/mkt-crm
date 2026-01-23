# Optimistic Locking Analysis Report

**Date**: 2026-01-23
**Author**: Claude Code
**Branch**: `fix/atomic-optimistic-locking`

---

## Executive Summary

Phân tích database CRM-MKT để xác định các entity cần implement optimistic locking nhằm ngăn chặn race condition và đảm bảo data integrity trong môi trường concurrent access.

### Key Findings

| Metric | Count |
|--------|-------|
| Tổng số bảng MKT | 47 |
| Bảng đã có version field | 5 |
| Bảng cần thêm optimistic locking | 6 |
| Bảng priority cao (CRITICAL) | 3 |

---

## 1. Current State Analysis

### 1.1. Tables Already Having Version Field

Các bảng đã implement optimistic locking:

| Table | Purpose | Status |
|-------|---------|--------|
| `mktOrder` | Order management | ✅ **Fixed** (atomic update) |
| `mktGenericCombo` | Generic combo configurations | ✅ Has version |
| `mktPermissionTemplate` | RBAC templates | ✅ Has version |
| `mktPolicyVersion` | Policy versioning | ✅ Has version |
| `mktTemplate` | General templates | ✅ Has version |

> **Note**: `mktOrder` đã được fix race condition bug bằng atomic conditional update trong commit gần đây.

### 1.2. Database Statistics

| Table | Record Count | Status Types |
|-------|-------------|--------------|
| mktOrder | 58 | DRAFT, PENDING, CONFIRMED, BLOCKED, OVERDUE |
| mktContract | 15 | Multiple statuses |
| mktCoupon | 10 | ACTIVE, INACTIVE, EXPIRED |
| mktKpi | 10 | Multiple statuses |
| mktPromotion | 8 | DRAFT, ACTIVE, INACTIVE, EXPIRED |
| mktSInvoice | 5 | Multiple statuses |
| mktCustomer | 5 | ACTIVE, INACTIVE |
| mktPayment | 0 | PENDING, COMPLETED, FAILED, REFUNDED |
| mktInvoice | 0 | DRAFT, SENT, PAID, CANCELLED |

---

## 2. Entities Requiring Optimistic Locking

### 2.1. CRITICAL Priority

#### 2.1.1. `mktPayment` - Payment Processing

**Risk Level**: 🔴 CRITICAL

**Rationale**:
- Financial data với `amount` field
- Status transitions (PENDING → COMPLETED/FAILED)
- SEPay webhook có thể trigger concurrent updates
- Double payment risk nếu không có locking

**Conflict Scenarios**:
```
User A: Webhook confirms payment → status = COMPLETED
User B: Admin manually updates → status = REFUNDED
Result: Data inconsistency, financial discrepancy
```

**Affected Fields**:
- `amount` (double precision)
- `status` (enum)
- `paymentDate` (timestamp)
- `sepayTransactionId` (text)

**Recommendation**:
```sql
ALTER TABLE "mktPayment" ADD COLUMN "version" integer NOT NULL DEFAULT 1;
```

---

#### 2.1.2. `mktCoupon` - Coupon Usage Tracking

**Risk Level**: 🔴 CRITICAL

**Rationale**:
- `currentUsageCount` increment during order creation
- Multiple orders can apply same coupon simultaneously
- `usageLimit` validation depends on accurate count

**Conflict Scenarios**:
```
Order A: Read count=9, limit=10 → valid, increment to 10
Order B: Read count=9, limit=10 → valid, increment to 10
Result: Count=10, but 2 usages recorded (should be 11, exceeded limit)
```

**Affected Fields**:
- `currentUsageCount` (double precision)
- `status` (enum: ACTIVE, INACTIVE, EXPIRED)
- `usageLimit` (double precision)

**Recommendation**:
```sql
ALTER TABLE "mktCoupon" ADD COLUMN "version" integer NOT NULL DEFAULT 1;
-- Or use atomic increment: UPDATE ... SET currentUsageCount = currentUsageCount + 1 WHERE currentUsageCount < usageLimit
```

---

#### 2.1.3. `mktPromotion` - Promotion Usage Tracking

**Risk Level**: 🔴 CRITICAL

**Rationale**:
- Same issue as mktCoupon với `currentUsageCount`
- Multiple customers applying promotion simultaneously
- Status transitions (DRAFT → ACTIVE → EXPIRED)

**Affected Fields**:
- `currentUsageCount` (double precision)
- `usageLimit` (double precision)
- `usageLimitPerCustomer` (double precision)
- `status` (enum)
- `discountValue` (double precision)

**Recommendation**:
```sql
ALTER TABLE "mktPromotion" ADD COLUMN "version" integer NOT NULL DEFAULT 1;
```

---

### 2.2. HIGH Priority

#### 2.2.1. `mktInvoice` - Invoice Management

**Risk Level**: 🟠 HIGH

**Rationale**:
- Financial amounts (`totalAmount`, `totalWithTax`, `totalWithoutTax`)
- Status transitions (DRAFT → SENT → PAID)
- Integration with external e-invoice systems
- sInvoiceCode uniqueness

**Conflict Scenarios**:
```
Process A: Generate S-Invoice → updates sInvoiceCode
Process B: Update amounts → recalculates totals
Result: Inconsistent invoice data
```

**Recommendation**:
```sql
ALTER TABLE "mktInvoice" ADD COLUMN "version" integer NOT NULL DEFAULT 1;
```

---

#### 2.2.2. `mktContract` - Contract Lifecycle

**Risk Level**: 🟠 HIGH

**Rationale**:
- Status transitions cần atomic
- Multiple users có thể edit cùng lúc
- Legal document - data integrity critical

**Affected Fields**:
- `status` (text)
- `startDate`, `endDate`, `signedDate`
- `filePath`, `fileName`

**Recommendation**:
```sql
ALTER TABLE "mktContract" ADD COLUMN "version" integer NOT NULL DEFAULT 1;
```

---

#### 2.2.3. `mktCustomer` - Customer Aggregated Data

**Risk Level**: 🟠 HIGH

**Rationale**:
- Aggregated fields được update từ nhiều sources:
  - `totalOrderValue` - updated khi order completed
  - `totalOrderCount` - incremented per order
  - `tier` - auto-upgrade based on spending
  - `customerLtv` - recalculated periodically

**Conflict Scenarios**:
```
Order A completes: totalOrderValue += 1M, totalOrderCount += 1
Order B completes: totalOrderValue += 2M, totalOrderCount += 1
If concurrent: One update may be lost
```

**Recommendation**:
```sql
ALTER TABLE "mktCustomer" ADD COLUMN "version" integer NOT NULL DEFAULT 1;
-- Consider using atomic increments for counter fields
```

---

### 2.3. MEDIUM Priority

#### 2.3.1. `mktKpi` - KPI Tracking

**Risk Level**: 🟡 MEDIUM

**Rationale**:
- Status field có state transitions
- Values có thể được update từ multiple sources
- Less critical than financial data

---

#### 2.3.2. `mktSInvoice` - S-Invoice (Electronic Invoice)

**Risk Level**: 🟡 MEDIUM

**Rationale**:
- Financial amounts
- Integration với MeinvoiceAPI
- Status transitions

---

### 2.4. LOW Priority (No Immediate Action Needed)

Các bảng sau KHÔNG cần optimistic locking:

| Table | Reason |
|-------|--------|
| `mktOrderHistory` | Append-only, immutable |
| `mktPaymentHistory` | Append-only, immutable |
| `mktKpiHistory` | Append-only, immutable |
| `mktPromotionAudit` | Audit log, immutable |
| `mktPermissionAudit` | Audit log, immutable |
| `mktCustomerTag` | Reference data, low conflict |
| `mktDepartment` | Hierarchical structure, admin-only |
| `mktOrganizationLevel` | Config data, admin-only |
| `mktEmploymentStatus` | Reference data |
| `mktTag` | Reference data |
| `mktOption` | Config data |

---

## 3. Implementation Guidelines

### 3.1. Adding Version Field

```typescript
// In WorkspaceEntity
@WorkspaceField({
  standardId: MKT_FIELD_IDS.version,
  type: FieldMetadataType.NUMBER,
  label: 'Version',
  description: 'Optimistic locking version',
  icon: 'IconGitCommit',
  defaultValue: 1,
})
version: number;
```

### 3.2. Atomic Update Pattern

```typescript
// CORRECT: Atomic conditional update
async updateWithOptimisticLock(
  id: string,
  expectedVersion: number,
  data: DeepPartial<Entity>,
): Promise<{ affected: number; newVersion: number }> {
  const result = await repository
    .createQueryBuilder()
    .update()
    .set({
      ...data,
      version: () => 'COALESCE(version, 0) + 1',
      updatedAt: DateTimeUtils.toDate(DateTimeUtils.now()),
    })
    .where('id = :id', { id })
    .andWhere('version = :expectedVersion', { expectedVersion })
    .execute();

  return {
    affected: result.affected ?? 0,
    newVersion: expectedVersion + 1,
  };
}
```

### 3.3. Service Layer Implementation

```typescript
async update(id: string, dto: UpdateDto): Promise<Entity> {
  // 1. Check version if optimistic locking enabled
  if (dto.expectedVersion !== undefined) {
    const { affected } = await this.repository.updateWithOptimisticLock(
      id,
      dto.expectedVersion,
      dto.data,
    );

    if (affected === 0) {
      const current = await this.repository.getCurrentVersion(id);
      throw new ConflictException({
        message: 'Entity was modified by another user',
        currentVersion: current,
      });
    }
  }

  // 2. Proceed with normal update
  return this.repository.update(id, dto.data);
}
```

### 3.4. GraphQL Input/Output

```typescript
// Input DTO
@InputType()
export class UpdateEntityInput {
  @Field(() => Int, { nullable: true })
  expectedVersion?: number;

  // ... other fields
}

// Output DTO
@ObjectType()
export class EntityOutput {
  @Field(() => Int)
  version: number;

  // ... other fields
}
```

---

## 4. Migration Strategy

### Phase 1: CRITICAL Entities (Week 1-2)
1. ✅ `mktOrder` - **DONE**
2. `mktPayment` - Add version, implement atomic update
3. `mktCoupon` - Add version OR atomic increment for usageCount
4. `mktPromotion` - Add version OR atomic increment

### Phase 2: HIGH Priority (Week 3-4)
5. `mktInvoice` - Add version
6. `mktContract` - Add version
7. `mktCustomer` - Add version, consider atomic increment for counters

### Phase 3: MEDIUM Priority (Week 5-6)
8. `mktKpi` - Add version
9. `mktSInvoice` - Add version

---

## 5. Testing Recommendations

### 5.1. Race Condition Test Script

```bash
#!/bin/bash
# Run N parallel requests to test optimistic locking

for i in {1..10}; do
  curl -X POST http://localhost:3000/graphql \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query":"mutation { updateEntity(id: \"...\", expectedVersion: 1) { success } }"}' \
    > /tmp/result_$i.json &
done
wait

# Count successes - should be exactly 1
grep -l '"success":true' /tmp/result_*.json | wc -l
```

### 5.2. Expected Results

| Test | Expected |
|------|----------|
| 10 concurrent updates with same version | 1 success, 9 conflicts |
| Sequential updates with correct versions | All success |
| Update without version (locking disabled) | All success (no check) |

---

## 6. Configuration

### Environment Variables

```env
# Enable/disable optimistic locking per module
ORDER_OPTIMISTIC_LOCKING_ENABLED=true
PAYMENT_OPTIMISTIC_LOCKING_ENABLED=true
COUPON_OPTIMISTIC_LOCKING_ENABLED=true
PROMOTION_OPTIMISTIC_LOCKING_ENABLED=true
```

---

## 7. Appendix

### A. Full Table List with Version Status

| Table | Has Version | Priority | Action |
|-------|-------------|----------|--------|
| mktOrder | ✅ Yes | DONE | Fixed atomic update |
| mktPayment | ❌ No | CRITICAL | Add version |
| mktCoupon | ❌ No | CRITICAL | Add version |
| mktPromotion | ❌ No | CRITICAL | Add version |
| mktInvoice | ❌ No | HIGH | Add version |
| mktContract | ❌ No | HIGH | Add version |
| mktCustomer | ❌ No | HIGH | Add version |
| mktKpi | ❌ No | MEDIUM | Add version |
| mktSInvoice | ❌ No | MEDIUM | Add version |
| mktGenericCombo | ✅ Yes | - | Already done |
| mktPermissionTemplate | ✅ Yes | - | Already done |
| mktPolicyVersion | ✅ Yes | - | Already done |
| mktTemplate | ✅ Yes | - | Already done |

### B. Related Files

- Order atomic update: `packages/twenty-server/src/mkt-core/order/repositories/mkt-order.repository.ts`
- Order orchestration: `packages/twenty-server/src/mkt-core/order/services/application/order-orchestration.service.ts`
- Order config: `packages/twenty-server/src/mkt-core/order/config/order-config.types.ts`

---

## 8. Conclusion

Optimistic locking là critical cho data integrity trong CRM system, đặc biệt với:
- **Financial data** (Payment, Invoice)
- **Counter/Usage tracking** (Coupon, Promotion)
- **Aggregated metrics** (Customer totals)

Bug đã được fix cho `mktOrder` module bằng atomic conditional update pattern. Cần apply tương tự cho các entities khác theo priority order.

**Next Steps**:
1. Review và approve report này
2. Tạo tasks cho từng entity theo priority
3. Implement và test từng module
4. Deploy với feature flags để rollout dần
