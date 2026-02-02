# Phân Tích Triển Khai: Hệ Thống Thanh Toán SePay

**Ngày phân tích:** 2026-02-02
**Tài liệu thiết kế:** `sepay-payment-basic-design.md`
**Thư mục triển khai:** `packages/twenty-server/src/mkt-core/payment/`

---

## 1. Tổng Quan

### 1.1 Thống Kê Module

| Metric | Giá trị |
|--------|---------|
| Tổng số file TypeScript | 89 |
| Số thư mục con | 16 |
| Workspace Entities | 3 (Payment, PaymentHistory, WebhookLog) |
| Services | 12+ |
| Resolvers | 2 |
| Repositories | 3 |

### 1.2 Đánh Giá Tổng Thể

| Tiêu chí | Hoàn thành | Ghi chú |
|----------|:----------:|---------|
| **Core Webhook Processing** | ✅ 90% | Hoàn thiện, có transaction support |
| **Duplicate Prevention** | ⚠️ 70% | Layer 1 OK, Layer 2-3 chưa hoàn thiện |
| **Amount Handling** | ⚠️ 80% | Có partial payment, thiếu tolerance |
| **Order Expiration** | ❌ 10% | Chưa có scheduled jobs |
| **Reconciliation System** | ❌ 0% | Chưa triển khai |
| **Fuzzy Matching** | ❌ 0% | Chưa triển khai |
| **Queue System (BullMQ)** | ❌ 0% | Processing đồng bộ |
| **Monitoring & Alerting** | ❌ 0% | Chưa triển khai |

---

## 2. Đã Triển Khai ✅

### 2.1 Database Schema

#### MktPaymentWorkspaceEntity
```
✅ Đã có các fields:
- id, name, amount, currency, status
- sepayTransactionId (indexed) - cho idempotency check
- providerTransactionId, providerType, providerResponse
- qrCodeUrl, paymentPageUrl, expiredAt
- confirmedAt, confirmedBy, confirmedById
- rejectedAt, rejectedBy, rejectedById, rejectionReason
- refundedAmount
- metadata, providerMetadata
- Relations: mktOrder, mktPaymentMethod, mktPaymentHistories
```

#### MktPaymentHistoryWorkspaceEntity
```
✅ Đã có các fields:
- name, paymentType, amount, note
- action, previousStatus, newStatus
- performedAt, performedBy, historyMetadata
- Relations: mktOrder, mktPayment, accountOwner
```

#### MktWebhookLogWorkspaceEntity
```
✅ Đã có các fields:
- sepayTransactionId, gateway
- requestBody, responseStatus, responseBody
- processingTimeMs, ipAddress
- status (RECEIVED, PROCESSING, SUCCESS, FAILED)
- errorMessage, matchedOrderCode
```

### 2.2 Webhook Processing Flow

```
File: services/webhook/mkt-payment-webhook.service.ts

✅ Full transaction support với rollback
✅ Step 1: Create webhook log
✅ Step 2: Idempotency check by sepayTransactionId
✅ Step 3: Extract order code (với fallback parse content)
✅ Step 4: Find order by orderCode
✅ Step 5: Find payments for order
✅ Step 6: Amount analysis (partial payment support)
✅ Step 7: Determine payment status
✅ Step 8: Update payment with actor metadata
✅ Step 9: Update order status
✅ Step 10: Update webhook log
✅ Step 11: Emit payment events
```

### 2.3 Order Code Extraction

```
File: utils/order-code-extractor.ts

✅ Hỗ trợ patterns:
- ORD\d{8,14} (priority 1)
- DH\d{6,14} (priority 2)
- MKT\d{6,14} (priority 3)
- INV\d{6,14} (priority 4)

✅ Configurable patterns qua constructor
✅ Content normalization (uppercase, trim)
```

### 2.4 Payment Amount Analysis

```
File: utils/payment-amount-analyzer.ts

✅ Phân tích: EXACT, UNDERPAID, OVERPAID
✅ Tính toán: remainingAmount, overpaidAmount, percentagePaid
✅ Support multiple payments (accumulate previouslyPaidAmount)
✅ determinePaymentStatus(), determineOrderStatus()
✅ shouldAutoConfirm() với threshold
```

### 2.5 Partial Payment Configuration

```
File: config/partial-payment.config.ts

✅ Environment variables:
- PARTIAL_PAYMENT_ENABLED (default: true)
- PARTIAL_PAYMENT_THRESHOLD (default: 100%)
- PARTIAL_PAYMENT_AUTO_REFUND (default: false)
- PARTIAL_PAYMENT_MINIMUM_AMOUNT (default: 1000 VND)

✅ Zod validation schema
```

### 2.6 Event System

```
File: services/events/payment-event.service.ts

✅ Events implemented:
- payment.received
- payment.completed
- payment.partial
- payment.overpaid
- payment.failed
- order.confirmed

✅ Event listener: PaymentNotificationListener
```

### 2.7 GraphQL Mutations

```
Files: resolvers/payment-mutation.resolver.ts, payment-confirmation.resolver.ts

✅ createPayment - Tạo payment mới
✅ updatePayment - Cập nhật payment
✅ confirmPayment - Xác nhận thủ công
✅ rejectPayment - Từ chối với lý do
✅ refundPayment - Hoàn tiền (full/partial)
```

### 2.8 Security

```
✅ API Key validation (SepayAuthService)
✅ IP Whitelist Guard (guards/ip-whitelist.guard.ts)
✅ JWT authentication cho internal mutations
✅ WorkspaceAuthGuard cho GraphQL
```

### 2.9 Multi-Provider Architecture

```
✅ PaymentProviderFactory - Registry pattern
✅ Base provider interface (IPaymentProvider)
✅ SepayProvider, BidvProvider implementations
✅ Provider capabilities definition
```

---

## 3. Chưa Triển Khai ❌

### 3.1 Payment Reconciliation System

**Theo design document, cần:**

| Entity/Feature | Trạng thái | Mô tả |
|----------------|:----------:|-------|
| `payment_reconciliation` table | ❌ | Entity cho manual review |
| issue_type enum | ❌ | underpaid, overpaid, duplicate, unmatched, expired_payment |
| resolution_status enum | ❌ | open, in_progress, resolved, rejected |
| resolution_action enum | ❌ | accept_partial, request_topup, refund_excess, manual_match |
| ReconciliationService | ❌ | Service xử lý reconciliation |
| GraphQL endpoints | ❌ | GET/POST reconciliation APIs |

**Cần tạo:**
```
objects/mkt-payment-reconciliation.workspace-entity.ts
services/core/payment-reconciliation.service.ts
resolvers/payment-reconciliation.resolver.ts
repositories/mkt-payment-reconciliation.repository.ts
```

### 3.2 Amount Tolerance Logic

**Theo design, tolerance = MAX(expected * 1%, 1000 VND)**

```typescript
// CHƯA CÓ trong payment-amount-analyzer.ts:
- tolerancePercent: 0.01 (1%)
- toleranceAbsolute: 1000 (VND)
- isWithinTolerance() method
- Auto-accept nếu |diff| <= tolerance
```

**Cần thêm vào:**
- `config/tolerance.config.ts`
- Update `PaymentAmountAnalyzer.analyze()` để support tolerance
- Update webhook service để apply tolerance logic

### 3.3 Duplicate Prevention - Layer 2 & 3

**Layer 2: reference_code + bank_gateway unique**
```
❌ Chưa có composite unique index
❌ Chưa check referenceCode trong webhook processing
```

**Layer 3: Business Logic Check**
```
❌ Chưa detect: same order + same amount + within 5 minutes
❌ Chưa có flag for manual review thay vì auto-reject
```

### 3.4 Order Expiration System

**Cần triển khai:**

| Component | Trạng thái | Mô tả |
|-----------|:----------:|-------|
| payment:expiration queue | ❌ | BullMQ queue |
| ExpireOrderJob | ❌ | Delayed job per order |
| BatchExpireJob | ❌ | Cron safety net |
| ExpirationService | ❌ | Service logic |
| Reactivate logic | ❌ | Xử lý payment sau khi expired |

**Cần tạo:**
```
jobs/expire-order.job.ts
jobs/batch-expire.job.ts
services/core/payment-expiration.service.ts
```

**Config cần thêm:**
```yaml
# config/expiration.config.ts
payment:
  timeout:
    default: 1800          # 30 minutes
    quick_checkout: 900    # 15 minutes
    high_value: 7200       # 2 hours
    b2b: 604800            # 7 days
  grace_period:
    auto_reactivate: 86400 # 24 hours
    manual_reactivate: 604800 # 7 days
```

### 3.5 Fuzzy Matching System

**Theo design, cần khi không extract được order code:**

```
❌ FuzzyMatchService
❌ Candidate order selection (pending orders in 7 days, amount ±50%)
❌ Similarity scoring:
   - Amount similarity (40% weight)
   - Content similarity - Levenshtein (30% weight)
   - Time proximity (20% weight)
   - Customer match (10% weight)
❌ Confidence thresholds:
   - >= 0.80: Auto-match with review flag
   - >= 0.60: Suggest match, require confirm
   - < 0.60: Mark as unmatched
```

**Cần tạo:**
```
services/matching/fuzzy-match.service.ts
services/matching/similarity-calculator.ts
utils/levenshtein.utils.ts
```

### 3.6 BullMQ Queue System

**Theo design document:**

| Queue | Mục đích | Concurrency |
|-------|----------|:-----------:|
| payment:webhook | Process webhooks | 5 |
| payment:matching | Match transactions | 3 |
| payment:expiration | Handle expiration | 1 |
| payment:reconciliation | Handle issues | 2 |
| payment:notification | Send notifications | 5 |

**Hiện tại:** Processing đồng bộ trong webhook controller
**Cần:** Background job processing với retry, backoff

### 3.7 Manual Match API

**Theo design:**
```
POST /api/v1/payments/transactions/{transaction_id}/match

Request: { order_id: string, notes: string }
Response: { transaction_id, order_id, match_status, matched_by }
```

**Cần tạo:**
- `resolvers/payment-matching.resolver.ts`
- `services/matching/manual-match.service.ts`
- GraphQL mutation `manualMatchPayment`

### 3.8 Monitoring & Metrics

**Cần triển khai:**

```
❌ payment_webhook_received_total (counter)
❌ payment_processing_duration_seconds (histogram)
❌ payment_match_success_rate (gauge)
❌ payment_unmatched_total (counter)
❌ bullmq_queue_size{queue="payment:*"} (gauge)
❌ reconciliation_open_count (gauge)
```

**Alert rules:**
```
❌ Critical: webhook_error_rate > 5% for 5min
❌ Critical: queue_size > 1000 for 5min
❌ Warning: match_success_rate < 80% for 15min
❌ Warning: reconciliation_open_count > 50
```

---

## 4. Danh Sách Công Việc Cần Làm

### 4.1 Priority 1 - Critical (Cần làm ngay)

| # | Task | File cần tạo/sửa | Effort |
|---|------|------------------|:------:|
| 1 | Thêm tolerance logic vào amount analyzer | `utils/payment-amount-analyzer.ts`, `config/tolerance.config.ts` | 2h |
| 2 | Tạo PaymentReconciliation entity | `objects/mkt-payment-reconciliation.workspace-entity.ts` | 3h |
| 3 | Tạo ReconciliationService | `services/core/payment-reconciliation.service.ts` | 4h |
| 4 | Thêm referenceCode check (Layer 2) | `services/webhook/mkt-payment-webhook.service.ts` | 2h |

### 4.2 Priority 2 - High (Cần làm sớm)

| # | Task | File cần tạo/sửa | Effort |
|---|------|------------------|:------:|
| 5 | Tạo order expiration jobs | `jobs/expire-order.job.ts`, `jobs/batch-expire.job.ts` | 6h |
| 6 | Tạo ExpirationService | `services/core/payment-expiration.service.ts` | 4h |
| 7 | Tạo expiration config | `config/expiration.config.ts` | 1h |
| 8 | Thêm reactivate logic cho expired orders | Update expiration service | 3h |

### 4.3 Priority 3 - Medium

| # | Task | File cần tạo/sửa | Effort |
|---|------|------------------|:------:|
| 9 | Implement FuzzyMatchService | `services/matching/fuzzy-match.service.ts` | 8h |
| 10 | Implement Levenshtein utils | `utils/levenshtein.utils.ts` | 2h |
| 11 | Tạo ManualMatchService | `services/matching/manual-match.service.ts` | 4h |
| 12 | Tạo matching resolver | `resolvers/payment-matching.resolver.ts` | 2h |

### 4.4 Priority 4 - Low

| # | Task | File cần tạo/sửa | Effort |
|---|------|------------------|:------:|
| 13 | Migrate to BullMQ queues | `jobs/*.ts`, update services | 16h |
| 14 | Implement metrics collection | `services/monitoring/payment-metrics.service.ts` | 8h |
| 15 | Add Prometheus/Grafana integration | Config files | 4h |
| 16 | Business logic duplicate check (Layer 3) | Update webhook service | 3h |

---

## 5. Sơ Đồ Kiến Trúc Hiện Tại

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MktPaymentModule                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐         │
│  │   Controller    │────▶│  WebhookService │────▶│   Repositories  │         │
│  │ SepayPayment    │     │ (Transaction)   │     │ Payment, Order  │         │
│  └─────────────────┘     └────────┬────────┘     │ WebhookLog      │         │
│                                   │               └─────────────────┘         │
│                                   ▼                                           │
│                          ┌─────────────────┐                                  │
│                          │  EventService   │                                  │
│                          │ (EventEmitter2) │                                  │
│                          └────────┬────────┘                                  │
│                                   │                                           │
│                                   ▼                                           │
│                          ┌─────────────────┐                                  │
│                          │    Listeners    │                                  │
│                          │  Notification   │                                  │
│                          └─────────────────┘                                  │
│                                                                               │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐         │
│  │   Resolvers     │────▶│   Core Services │────▶│    Providers    │         │
│  │ Mutation,       │     │ Payment, Confirm│     │ Sepay, BIDV     │         │
│  │ Confirmation    │     │ Refund, History │     │                 │         │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘         │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                              Utilities                                   │ │
│  │  OrderCodeExtractor  │  PaymentAmountAnalyzer  │  SepayUtils             │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

Legend:
  ✅ Implemented
  ❌ Not Implemented: BullMQ Queues, Fuzzy Matching, Reconciliation, Expiration Jobs
```

---

## 6. Đề Xuất Cải Tiến

### 6.1 Ngắn hạn (1-2 tuần)
1. **Thêm tolerance logic** - Cho phép chênh lệch nhỏ tự động accept
2. **Tạo Reconciliation entity** - Để track các payment cần review
3. **Thêm referenceCode dedup** - Tăng cường duplicate prevention

### 6.2 Trung hạn (1 tháng)
1. **Implement order expiration** - Với BullMQ delayed jobs
2. **Migrate webhook processing** - Sang async queue-based
3. **Thêm fuzzy matching** - Cho unmatched transactions

### 6.3 Dài hạn (2-3 tháng)
1. **Full metrics & monitoring** - Prometheus + Grafana
2. **Alert system** - PagerDuty/Slack integration
3. **Admin dashboard** - Reconciliation UI

---

## 7. Kết Luận

Module payment hiện tại đã có **nền tảng solid** với:
- Webhook processing flow hoàn chỉnh với transaction support
- Partial payment support với configurable threshold
- Event-driven architecture
- Multi-provider architecture

Tuy nhiên, còn **thiếu các tính năng quan trọng** theo design document:
- Reconciliation system (0%)
- Order expiration (0%)
- Fuzzy matching (0%)
- BullMQ async processing (0%)
- Monitoring & Alerting (0%)

**Ưu tiên cao nhất**: Tolerance logic và Reconciliation entity để xử lý các payment có vấn đề.

---

*Tài liệu được tạo tự động từ phân tích mã nguồn.*
