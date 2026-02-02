# Basic Design: Hệ Thống Thanh Toán SePay (Parse Nội Dung)

## 1. Tổng Quan

### 1.1 Mục Tiêu
Thiết kế hệ thống xử lý thanh toán qua SePay webhook sử dụng phương pháp parse nội dung chuyển khoản, giải quyết các vấn đề:
- Khách chuyển sai số tiền
- Khách chuyển trùng lặp (duplicate)
- Đơn hàng quá hạn thanh toán (timeout)
- Độ chính xác nhận diện thanh toán

### 1.2 Phạm Vi
- Áp dụng cho hệ thống MKT Software Management
- Tích hợp với SePay webhook
- Sử dụng cơ sở hạ tầng hiện có: NestJS, PostgreSQL, Redis, BullMQ

### 1.3 Giới Hạn Phương Pháp Parse Nội Dung

| Vấn đề | Mức độ rủi ro | Giải pháp |
|--------|---------------|-----------|
| Khách ghi sai nội dung | Cao (20-30%) | Fuzzy matching + manual review |
| Khách chuyển sai tiền | Trung bình | Tolerance range + partial payment |
| Duplicate transaction | Cao | Idempotency key + dedup logic |
| Timeout | Thấp | Scheduled job + status management |

---

## 2. Database Schema

### 2.1 Bảng `orders` (Đơn hàng)

```
┌─────────────────────────────────────────────────────────────────┐
│                           orders                                 │
├─────────────────────────────────────────────────────────────────┤
│ id                    UUID          PK                          │
│ order_code            VARCHAR(50)   UNIQUE, NOT NULL            │
│ total_amount          DECIMAL(15,2) NOT NULL                    │
│ paid_amount           DECIMAL(15,2) DEFAULT 0                   │
│ payment_status        ENUM          DEFAULT 'pending'           │
│ payment_expires_at    TIMESTAMP     NULL                        │
│ customer_id           UUID          FK → customers              │
│ created_at            TIMESTAMP     DEFAULT NOW()               │
│ updated_at            TIMESTAMP     DEFAULT NOW()               │
├─────────────────────────────────────────────────────────────────┤
│ INDEX idx_orders_code ON (order_code)                           │
│ INDEX idx_orders_status_expires ON (payment_status, expires_at) │
└─────────────────────────────────────────────────────────────────┘

payment_status ENUM:
  - 'pending'      : Chờ thanh toán
  - 'partial'      : Thanh toán một phần
  - 'paid'         : Đã thanh toán đủ
  - 'overpaid'     : Thanh toán thừa
  - 'expired'      : Quá hạn
  - 'cancelled'    : Đã hủy
  - 'refunded'     : Đã hoàn tiền
```

### 2.2 Bảng `payment_transactions` (Giao dịch thanh toán)

```
┌─────────────────────────────────────────────────────────────────┐
│                    payment_transactions                          │
├─────────────────────────────────────────────────────────────────┤
│ id                    UUID          PK                          │
│ sepay_transaction_id  BIGINT        UNIQUE, NOT NULL            │
│ reference_code        VARCHAR(100)  NOT NULL                    │
│ order_id              UUID          FK → orders, NULL           │
│ amount                DECIMAL(15,2) NOT NULL                    │
│ bank_gateway          VARCHAR(50)   NOT NULL                    │
│ account_number        VARCHAR(50)   NOT NULL                    │
│ transfer_content      TEXT          NOT NULL                    │
│ transaction_date      TIMESTAMP     NOT NULL                    │
│ matched_code          VARCHAR(50)   NULL                        │
│ match_status          ENUM          DEFAULT 'pending'           │
│ match_confidence      DECIMAL(3,2)  NULL                        │
│ processed_at          TIMESTAMP     NULL                        │
│ created_at            TIMESTAMP     DEFAULT NOW()               │
├─────────────────────────────────────────────────────────────────┤
│ UNIQUE INDEX idx_sepay_txn ON (sepay_transaction_id)            │
│ UNIQUE INDEX idx_ref_code ON (reference_code, bank_gateway)     │
│ INDEX idx_match_status ON (match_status)                        │
│ INDEX idx_order_id ON (order_id)                                │
└─────────────────────────────────────────────────────────────────┘

match_status ENUM:
  - 'pending'           : Chờ xử lý
  - 'matched'           : Đã khớp với đơn hàng
  - 'partial_matched'   : Khớp nhưng số tiền chưa đủ
  - 'amount_mismatch'   : Khớp code nhưng sai số tiền
  - 'unmatched'         : Không tìm thấy đơn hàng
  - 'duplicate'         : Giao dịch trùng lặp
  - 'manual_review'     : Cần review thủ công
```

### 2.3 Bảng `payment_reconciliation` (Đối soát thủ công)

```
┌─────────────────────────────────────────────────────────────────┐
│                   payment_reconciliation                         │
├─────────────────────────────────────────────────────────────────┤
│ id                    UUID          PK                          │
│ transaction_id        UUID          FK → payment_transactions   │
│ order_id              UUID          FK → orders, NULL           │
│ issue_type            ENUM          NOT NULL                    │
│ original_amount       DECIMAL(15,2) NOT NULL                    │
│ expected_amount       DECIMAL(15,2) NULL                        │
│ resolution_status     ENUM          DEFAULT 'open'              │
│ resolution_action     ENUM          NULL                        │
│ resolved_by           UUID          FK → users, NULL            │
│ resolved_at           TIMESTAMP     NULL                        │
│ notes                 TEXT          NULL                        │
│ created_at            TIMESTAMP     DEFAULT NOW()               │
├─────────────────────────────────────────────────────────────────┤
│ INDEX idx_resolution_status ON (resolution_status)              │
│ INDEX idx_issue_type ON (issue_type)                            │
└─────────────────────────────────────────────────────────────────┘

issue_type ENUM:
  - 'underpaid'         : Chuyển thiếu tiền
  - 'overpaid'          : Chuyển thừa tiền
  - 'duplicate'         : Chuyển trùng
  - 'unmatched'         : Không khớp đơn hàng
  - 'expired_payment'   : Thanh toán sau khi hết hạn

resolution_status ENUM:
  - 'open'              : Chờ xử lý
  - 'in_progress'       : Đang xử lý
  - 'resolved'          : Đã giải quyết
  - 'rejected'          : Từ chối

resolution_action ENUM:
  - 'accept_partial'    : Chấp nhận thanh toán thiếu
  - 'request_topup'     : Yêu cầu chuyển thêm
  - 'refund_excess'     : Hoàn tiền thừa
  - 'refund_full'       : Hoàn toàn bộ
  - 'manual_match'      : Khớp thủ công
  - 'ignore'            : Bỏ qua
```

---

## 3. Luồng Xử Lý Chính

### 3.1 Sequence Diagram - Webhook Processing

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│ SePay  │     │  API   │     │ BullMQ │     │ Worker │     │   DB   │
└───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘
    │              │              │              │              │
    │ POST webhook │              │              │              │
    │─────────────>│              │              │              │
    │              │              │              │              │
    │              │ Validate     │              │              │
    │              │ signature    │              │              │
    │              │              │              │              │
    │              │ Check idempotency key       │              │
    │              │─────────────────────────────────────────────>│
    │              │              │              │              │
    │              │ [If exists]  │              │              │
    │              │<─────────────────────────────────────────────│
    │              │ Return success (skip)       │              │
    │<─────────────│              │              │              │
    │              │              │              │              │
    │              │ [If new]     │              │              │
    │              │ Add job      │              │              │
    │              │─────────────>│              │              │
    │              │              │              │              │
    │ 200 OK       │              │              │              │
    │<─────────────│              │              │              │
    │              │              │              │              │
    │              │              │ Process job  │              │
    │              │              │─────────────>│              │
    │              │              │              │              │
    │              │              │              │ Parse content│
    │              │              │              │ Extract code │
    │              │              │              │              │
    │              │              │              │ Find order   │
    │              │              │              │─────────────>│
    │              │              │              │              │
    │              │              │              │ Validate     │
    │              │              │              │ amount       │
    │              │              │              │              │
    │              │              │              │ Update order │
    │              │              │              │─────────────>│
    │              │              │              │              │
```

### 3.2 Flowchart - Payment Matching Logic

```
                              ┌─────────────────┐
                              │ Nhận Webhook    │
                              │ từ SePay        │
                              └────────┬────────┘
                                       │
                                       ▼
                        ┌──────────────────────────┐
                        │ Check sepay_transaction_id│
                        │ đã tồn tại trong DB?      │
                        └──────────────┬───────────┘
                                       │
                       ┌───────────────┴───────────────┐
                       │                               │
                      YES                              NO
                       │                               │
                       ▼                               ▼
              ┌────────────────┐            ┌────────────────────┐
              │ Return Success │            │ Insert transaction │
              │ (Idempotent)   │            │ status = 'pending' │
              └────────────────┘            └─────────┬──────────┘
                                                      │
                                                      ▼
                                          ┌───────────────────────┐
                                          │ Parse payment code    │
                                          │ từ transfer_content   │
                                          └───────────┬───────────┘
                                                      │
                                          ┌───────────┴───────────┐
                                          │                       │
                                    Tìm thấy code            Không tìm thấy
                                          │                       │
                                          ▼                       ▼
                              ┌───────────────────┐    ┌──────────────────┐
                              │ Query order by    │    │ Fuzzy match với  │
                              │ order_code        │    │ pending orders   │
                              └─────────┬─────────┘    └────────┬─────────┘
                                        │                       │
                              ┌─────────┴─────────┐    ┌────────┴─────────┐
                              │                   │    │                  │
                          Tìm thấy           Không     Match > 80%    Match ≤ 80%
                              │            tìm thấy        │              │
                              ▼                │           ▼              ▼
                    ┌─────────────────┐        │  ┌──────────────┐ ┌─────────────┐
                    │ Check order     │        │  │ Manual Review│ │ Unmatched   │
                    │ payment_status  │        │  │ Queue        │ │ Log & Alert │
                    └────────┬────────┘        │  └──────────────┘ └─────────────┘
                             │                 │
               ┌─────────────┼─────────────┐   │
               │             │             │   │
           'pending'    'expired'     'paid'   │
               │             │             │   │
               ▼             ▼             ▼   ▼
      ┌────────────┐ ┌────────────┐ ┌────────────────┐
      │ Validate   │ │ Create     │ │ Mark duplicate │
      │ Amount     │ │ Reconcile  │ │ Create refund  │
      └─────┬──────┘ │ Record     │ │ request        │
            │        └────────────┘ └────────────────┘
            │
    ┌───────┼───────┬───────────────┐
    │       │       │               │
  Exact   Under   Over          Tolerance
  Match   paid    paid          (±1%)
    │       │       │               │
    ▼       ▼       ▼               ▼
┌───────┐ ┌─────┐ ┌─────┐     ┌───────────┐
│ PAID  │ │PART │ │OVER │     │ PAID      │
│       │ │IAL  │ │PAID │     │ (rounded) │
└───────┘ └─────┘ └─────┘     └───────────┘
```

---

## 4. Xử Lý Các Vấn Đề Cụ Thể

### 4.1 Vấn Đề 1: Khách Chuyển Sai Số Tiền

#### 4.1.1 Phân Loại

| Loại | Điều kiện | Xử lý |
|------|-----------|-------|
| **Tolerance** | `|actual - expected| ≤ 1%` hoặc `≤ 1000 VNĐ` | Auto accept |
| **Underpaid** | `actual < expected - tolerance` | Partial payment |
| **Overpaid** | `actual > expected + tolerance` | Accept + refund queue |

#### 4.1.2 Logic Xử Lý

```
Amount Validation Logic:

INPUT:
  - actual_amount: Số tiền thực nhận
  - expected_amount: Số tiền đơn hàng
  - tolerance_percent: 1% (configurable)
  - tolerance_absolute: 1000 VNĐ (configurable)

PROCESS:
  1. Calculate tolerance:
     tolerance = MAX(
       expected_amount * tolerance_percent,
       tolerance_absolute
     )
  
  2. Calculate difference:
     diff = actual_amount - expected_amount
  
  3. Determine result:
     IF |diff| ≤ tolerance:
       → EXACT_MATCH (accept as full payment)
     
     ELSE IF diff < 0:
       → UNDERPAID
       → remaining = expected_amount - actual_amount
       → IF remaining ≤ tolerance:
           accept as full payment
         ELSE:
           mark as partial, create reconciliation
     
     ELSE IF diff > 0:
       → OVERPAID
       → excess = actual_amount - expected_amount
       → accept payment, queue refund for excess

OUTPUT:
  - match_result: EXACT | UNDERPAID | OVERPAID
  - accepted_amount: Số tiền được ghi nhận
  - remaining_amount: Số tiền còn thiếu (nếu underpaid)
  - excess_amount: Số tiền thừa (nếu overpaid)
```

#### 4.1.3 State Transitions

```
                    ┌─────────────────────────────────────┐
                    │           ORDER STATES              │
                    └─────────────────────────────────────┘

     ┌──────────┐                              ┌──────────┐
     │ pending  │────── exact/tolerance ──────>│   paid   │
     └────┬─────┘                              └──────────┘
          │                                          ▲
          │                                          │
          │ underpaid                                │
          ▼                                          │
     ┌──────────┐                                    │
     │ partial  │──── topup reaches total ───────────┘
     └────┬─────┘
          │
          │ overpaid (rare từ partial)
          ▼
     ┌──────────┐
     │ overpaid │───> Trigger refund process
     └──────────┘
```

### 4.2 Vấn Đề 2: Khách Chuyển Trùng (Duplicate)

#### 4.2.1 Các Tầng Chống Duplicate

```
┌─────────────────────────────────────────────────────────────────┐
│                    DUPLICATE PREVENTION LAYERS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: SePay Transaction ID (Primary)                        │
│  ─────────────────────────────────────────                      │
│  • sepay_transaction_id là UNIQUE trong payment_transactions    │
│  • Mỗi giao dịch từ SePay có ID duy nhất                        │
│  • Insert sẽ fail nếu đã tồn tại → return success (idempotent)  │
│                                                                  │
│  Layer 2: Reference Code + Gateway (Secondary)                  │
│  ─────────────────────────────────────────────                  │
│  • Composite unique: (reference_code, bank_gateway)             │
│  • Backup trong trường hợp SePay retry với ID khác              │
│  • referenceCode từ SMS ngân hàng là unique per bank            │
│                                                                  │
│  Layer 3: Business Logic Check (Tertiary)                       │
│  ─────────────────────────────────────────                      │
│  • Same order + same amount + within 5 minutes                  │
│  • Flag for manual review thay vì auto reject                   │
│  • Phòng trường hợp khách cố tình chuyển 2 lần cùng số tiền     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.2.2 Idempotency Flow

```
Idempotency Check Flow:

Step 1: Check sepay_transaction_id
  Query: SELECT id FROM payment_transactions 
         WHERE sepay_transaction_id = ?
  
  IF EXISTS:
    → Log: "Duplicate webhook received, skipping"
    → Return: { success: true } (200 OK)
    → STOP

Step 2: Check reference_code + gateway (trong transaction)
  BEGIN TRANSACTION
  
  Query: SELECT id FROM payment_transactions 
         WHERE reference_code = ? AND bank_gateway = ?
         FOR UPDATE
  
  IF EXISTS:
    → ROLLBACK
    → Log: "Duplicate by reference code"
    → Return: { success: true }
    → STOP

Step 3: Insert new transaction
  INSERT INTO payment_transactions (...)
  
  IF UNIQUE VIOLATION:
    → ROLLBACK (concurrent insert won)
    → Return: { success: true }
    → STOP
  
  COMMIT
  → Continue to process payment
```

#### 4.2.3 Xử Lý Khi Đơn Hàng Đã Paid

```
Scenario: Khách chuyển lần 2 cho đơn đã thanh toán

Detection:
  - Order status = 'paid' khi nhận payment mới
  - Same order_code trong transfer_content

Actions:
  1. Insert transaction với match_status = 'duplicate'
  
  2. Create reconciliation record:
     - issue_type = 'duplicate'
     - original_amount = số tiền chuyển lần 2
     - resolution_status = 'open'
  
  3. Notifications:
     - Alert to admin dashboard
     - Email to finance team
     - Optional: SMS to customer (thông báo đã nhận thừa)
  
  4. Auto-create refund request (optional):
     - Nếu có cấu hình auto-refund
     - Queue refund job với delay 24h (chờ confirm)
```

### 4.3 Vấn Đề 3: Timeout (Đơn Hàng Quá Hạn)

#### 4.3.1 Cơ Chế Expiration

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPIRATION MECHANISM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Option A: Scheduled Job (Recommended for simplicity)           │
│  ────────────────────────────────────────────────────           │
│  • Cron job chạy mỗi 1 phút                                     │
│  • Query: pending orders WHERE payment_expires_at < NOW()       │
│  • Batch update status = 'expired'                              │
│  • Pros: Simple, reliable                                       │
│  • Cons: Delay up to 1 minute                                   │
│                                                                  │
│  Option B: BullMQ Delayed Job (Recommended for precision)       │
│  ────────────────────────────────────────────────────           │
│  • Khi tạo order, add delayed job với delay = timeout           │
│  • Job execute đúng thời điểm hết hạn                           │
│  • Pros: Precise timing                                         │
│  • Cons: More complex, need job cleanup if paid early           │
│                                                                  │
│  Option C: Hybrid (Best for MKT scale)                          │
│  ─────────────────────────────────────                          │
│  • BullMQ delayed job cho real-time UX                          │
│  • Cron job mỗi 5 phút làm safety net                           │
│  • Đảm bảo không miss expired orders                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.3.2 Xử Lý Payment Sau Khi Expired

```
Scenario: Khách chuyển tiền sau khi đơn hàng đã hết hạn

Flow:
  ┌─────────────────┐
  │ Receive Payment │
  │ for Order X     │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────────┐
  │ Order X status =        │
  │ 'expired'?              │
  └────────┬────────────────┘
           │
          YES
           │
           ▼
  ┌─────────────────────────────────────────────────┐
  │ Check: Có thể reactivate không?                 │
  │                                                  │
  │ Conditions để auto-reactivate:                  │
  │ • expired_at < 24 hours ago                     │
  │ • Sản phẩm/dịch vụ vẫn available               │
  │ • Giá không thay đổi                            │
  │ • Amount match (within tolerance)               │
  └────────────────────┬────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
      All TRUE                Some FALSE
           │                       │
           ▼                       ▼
  ┌─────────────────┐    ┌─────────────────────┐
  │ Reactivate      │    │ Create reconcile    │
  │ Order           │    │ issue_type =        │
  │ status = 'paid' │    │ 'expired_payment'   │
  └─────────────────┘    └─────────────────────┘
```

#### 4.3.3 Configurable Timeout Values

```
Timeout Configuration by Order Type:

┌────────────────────┬─────────────┬──────────────────────────┐
│ Order Type         │ Timeout     │ Rationale                │
├────────────────────┼─────────────┼──────────────────────────┤
│ Quick checkout     │ 15 minutes  │ Impulse buy, keep urgency│
│ Standard order     │ 30 minutes  │ Default for most cases   │
│ High-value order   │ 2 hours     │ Customer needs time      │
│ B2B invoice        │ 7 days      │ Business payment cycle   │
│ Subscription       │ 24 hours    │ Recurring, less urgent   │
│ Pre-order          │ 48 hours    │ Not immediate delivery   │
└────────────────────┴─────────────┴──────────────────────────┘

Grace Period:
• Auto-reactivate window: 24 hours after expiry
• Manual reactivate: Up to 7 days
• After 7 days: Must create new order
```

### 4.4 Vấn Đề 4: Độ Chính Xác Nhận Diện

#### 4.4.1 Payment Code Extraction Strategy

```
Payment Code Extraction Pipeline:

┌─────────────────────────────────────────────────────────────────┐
│                    EXTRACTION PIPELINE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: "NGUYEN VAN A chuyen tien thanh toan don MKT123456"     │
│                                                                  │
│  Step 1: Normalize                                               │
│  ─────────────────                                               │
│  • Uppercase: "NGUYEN VAN A CHUYEN TIEN THANH TOAN DON MKT123456"│
│  • Remove diacritics: Already ASCII                              │
│  • Remove special chars: Keep alphanumeric + space               │
│                                                                  │
│  Step 2: Pattern Matching (Priority Order)                       │
│  ─────────────────────────────────────────                       │
│  Pattern 1: Exact prefix match                                   │
│    Regex: /MKT[A-Z0-9]{6,20}/                                   │
│    Match: "MKT123456" ✓                                         │
│                                                                  │
│  Pattern 2: Keyword + code                                       │
│    Regex: /(DON|DH|ORDER|MA)\s*:?\s*([A-Z0-9]{6,20})/           │
│    Match: "DON MKT123456" → "MKT123456"                         │
│                                                                  │
│  Pattern 3: Standalone code (fallback)                          │
│    Regex: /\b([A-Z]{2,5}[0-9]{4,15})\b/                         │
│    Match: Any alphanumeric that looks like order code           │
│                                                                  │
│  Step 3: Validation                                              │
│  ─────────────────                                               │
│  • Check extracted code exists in orders table                   │
│  • Check order is in valid state (pending/partial)               │
│  • Return confidence score based on pattern matched              │
│                                                                  │
│  Output:                                                         │
│  {                                                               │
│    code: "MKT123456",                                           │
│    confidence: 0.95,                                            │
│    pattern_matched: "exact_prefix"                              │
│  }                                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.4.2 Fuzzy Matching cho Unmatched Transactions

```
Fuzzy Matching Strategy:

Khi không extract được code hoặc code không tồn tại:

Step 1: Get candidate orders
  Query pending orders trong 7 ngày gần nhất
  với amount trong range ±50% của transaction amount

Step 2: Calculate similarity scores
  For each candidate order:
    
    a. Amount similarity (weight: 40%)
       score = 1 - |order_amount - txn_amount| / order_amount
       
    b. Content similarity (weight: 30%)
       Levenshtein distance giữa:
       - transfer_content và order_code
       - transfer_content và customer_name
       - transfer_content và customer_phone
       
    c. Time proximity (weight: 20%)
       score = 1 - (hours_since_order_created / 168)
       
    d. Customer match (weight: 10%)
       Nếu account_number khớp với previous payments của customer

Step 3: Rank and threshold
  • Sort by total_score DESC
  • If top_score ≥ 0.80 → Auto-match với flag cần review
  • If top_score ≥ 0.60 → Suggest match, require manual confirm
  • If top_score < 0.60 → Mark as unmatched

Step 4: Output
  {
    suggested_order_id: "uuid",
    confidence: 0.75,
    match_reasons: [
      "Amount within 5%",
      "Customer name partial match",
      "Order created 2 hours ago"
    ],
    requires_review: true
  }
```

#### 4.4.3 Confidence Score Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIDENCE SCORE MATRIX                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Score Range    │ Action                │ Review Required        │
│  ───────────────┼───────────────────────┼─────────────────────   │
│  0.95 - 1.00    │ Auto-match & process  │ No                     │
│  0.85 - 0.94    │ Auto-match & process  │ Async review (sampling)│
│  0.70 - 0.84    │ Auto-match            │ Yes (within 24h)       │
│  0.50 - 0.69    │ Suggest match         │ Yes (before process)   │
│  0.00 - 0.49    │ Unmatched             │ Manual investigation   │
│                                                                  │
│  Confidence Boosters:                                            │
│  • Exact code match: +0.30                                       │
│  • Exact amount match: +0.20                                     │
│  • Same customer previous payment: +0.15                         │
│  • Order created < 1 hour: +0.10                                 │
│  • Customer name in content: +0.10                               │
│                                                                  │
│  Confidence Reducers:                                            │
│  • Amount diff > 10%: -0.20                                      │
│  • Order > 24 hours old: -0.10                                   │
│  • Multiple matching candidates: -0.15                           │
│  • Content has multiple codes: -0.20                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Queue Design (BullMQ)

### 5.1 Queue Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      BULLMQ QUEUES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Queue: payment:webhook                                          │
│  ─────────────────────                                           │
│  Purpose: Process incoming SePay webhooks                        │
│  Concurrency: 5                                                  │
│  Retry: 3 times with exponential backoff                        │
│  Jobs:                                                           │
│    - process-webhook: Main webhook processing                    │
│                                                                  │
│  Queue: payment:matching                                         │
│  ────────────────────                                            │
│  Purpose: Match transactions to orders                           │
│  Concurrency: 3                                                  │
│  Jobs:                                                           │
│    - match-transaction: Run matching algorithm                   │
│    - fuzzy-match: Fuzzy matching for unmatched                  │
│                                                                  │
│  Queue: payment:expiration                                       │
│  ─────────────────────                                           │
│  Purpose: Handle order expiration                                │
│  Concurrency: 1                                                  │
│  Jobs:                                                           │
│    - expire-order: Delayed job per order                        │
│    - batch-expire: Fallback batch expiration                    │
│                                                                  │
│  Queue: payment:reconciliation                                   │
│  ──────────────────────────                                      │
│  Purpose: Handle payment issues                                  │
│  Concurrency: 2                                                  │
│  Jobs:                                                           │
│    - create-reconcile: Create reconciliation record             │
│    - process-refund: Process refund requests                    │
│    - notify-issue: Send notifications                           │
│                                                                  │
│  Queue: payment:notification                                     │
│  ─────────────────────────                                       │
│  Purpose: Send payment notifications                             │
│  Concurrency: 5                                                  │
│  Jobs:                                                           │
│    - notify-customer: Email/SMS to customer                     │
│    - notify-admin: Alert to admin                               │
│    - sync-crm: Sync with Twenty CRM                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Job Flow

```
                         ┌──────────────────┐
                         │  SePay Webhook   │
                         └────────┬─────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ payment:webhook         │
                    │ job: process-webhook    │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
    ┌─────────────────┐ ┌───────────────┐ ┌─────────────────┐
    │ Matched         │ │ Needs Review  │ │ Unmatched       │
    └────────┬────────┘ └───────┬───────┘ └────────┬────────┘
             │                  │                  │
             ▼                  ▼                  ▼
    ┌─────────────────┐ ┌───────────────────┐ ┌─────────────────┐
    │ payment:notif   │ │ payment:reconcile │ │ payment:matching│
    │ notify-customer │ │ create-reconcile  │ │ fuzzy-match     │
    └─────────────────┘ └───────────────────┘ └─────────────────┘
```

---

## 6. API Endpoints

### 6.1 Webhook Endpoint

```
POST /api/v1/webhooks/sepay

Headers:
  Content-Type: application/json
  Authorization: Apikey {SEPAY_API_KEY}

Request Body:
  {
    "id": 92704,
    "gateway": "Vietcombank",
    "transactionDate": "2023-03-25 14:02:37",
    "accountNumber": "0123499999",
    "code": null,
    "content": "NGUYEN VAN A thanh toan don MKT123456",
    "transferType": "in",
    "transferAmount": 2277000,
    "accumulated": 19077000,
    "subAccount": null,
    "referenceCode": "MBVCB.3278907687",
    "description": ""
  }

Response:
  200 OK
  { "success": true }
```

### 6.2 Manual Match Endpoint

```
POST /api/v1/payments/transactions/{transaction_id}/match

Headers:
  Authorization: Bearer {JWT_TOKEN}

Request Body:
  {
    "order_id": "uuid",
    "notes": "Manual match reason"
  }

Response:
  200 OK
  {
    "success": true,
    "data": {
      "transaction_id": "uuid",
      "order_id": "uuid",
      "match_status": "matched",
      "matched_by": "user_uuid"
    }
  }
```

### 6.3 Reconciliation Endpoints

```
GET /api/v1/payments/reconciliation
  Query: status, issue_type, date_from, date_to, page, limit

POST /api/v1/payments/reconciliation/{id}/resolve
  Body: { "action": "accept_partial", "notes": "..." }

GET /api/v1/payments/reconciliation/stats
  Response: { open: 5, in_progress: 2, resolved_today: 10 }
```

---

## 7. Monitoring & Alerting

### 7.1 Key Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                      MONITORING METRICS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Payment Processing:                                             │
│  • payment_webhook_received_total (counter)                     │
│  • payment_processing_duration_seconds (histogram)              │
│  • payment_match_success_rate (gauge)                           │
│  • payment_unmatched_total (counter)                            │
│                                                                  │
│  Queue Health:                                                   │
│  • bullmq_queue_size{queue="payment:*"} (gauge)                │
│  • bullmq_job_duration_seconds (histogram)                      │
│  • bullmq_job_failed_total (counter)                            │
│                                                                  │
│  Business Metrics:                                               │
│  • orders_expired_total (counter)                               │
│  • reconciliation_open_count (gauge)                            │
│  • refund_pending_amount (gauge)                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Alert Rules

```
┌─────────────────────────────────────────────────────────────────┐
│                        ALERT RULES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Critical (Page immediately):                                    │
│  • payment_webhook_error_rate > 5% for 5 minutes                │
│  • bullmq_queue_size > 1000 for 5 minutes                       │
│  • payment_processing_duration_p99 > 30 seconds                 │
│                                                                  │
│  Warning (Slack notification):                                   │
│  • payment_match_success_rate < 80% for 15 minutes              │
│  • reconciliation_open_count > 50                               │
│  • payment_unmatched_total increase > 10 in 1 hour              │
│                                                                  │
│  Info (Dashboard only):                                          │
│  • orders_expired_total increase > 100 in 1 hour                │
│  • New high-value unmatched transaction (> 10M VND)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Error Handling

### 8.1 Error Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                     ERROR HANDLING MATRIX                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Category: Network/Infrastructure                                │
│  ─────────────────────────────────                               │
│  • Database connection failed                                    │
│    → Retry with exponential backoff (3 times)                   │
│    → Return 500, SePay will retry                               │
│                                                                  │
│  • Redis unavailable                                             │
│    → Fallback to database for idempotency check                 │
│    → Log warning, continue processing                           │
│                                                                  │
│  Category: Data Validation                                       │
│  ───────────────────────────                                     │
│  • Invalid webhook payload                                       │
│    → Return 200 (don't retry invalid data)                      │
│    → Log error with full payload                                │
│                                                                  │
│  • Unknown bank gateway                                          │
│    → Process normally, flag for review                          │
│                                                                  │
│  Category: Business Logic                                        │
│  ────────────────────────                                        │
│  • Order not found                                               │
│    → Create unmatched transaction                               │
│    → Queue for fuzzy matching                                   │
│                                                                  │
│  • Order already paid                                            │
│    → Mark as duplicate                                          │
│    → Create reconciliation record                               │
│                                                                  │
│  • Amount mismatch                                               │
│    → Process according to tolerance rules                       │
│    → Create reconciliation if needed                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Idempotency Guarantee

```
Idempotency Contract:

1. ALWAYS return 200 OK với { "success": true } cho SePay
   - Kể cả khi đã xử lý rồi (duplicate webhook)
   - Kể cả khi có lỗi business logic
   - Chỉ return error khi infrastructure failure

2. NEVER process same transaction twice
   - Check sepay_transaction_id trước khi làm gì
   - Check reference_code + gateway nếu ID check pass
   - Insert với unique constraint để handle race condition

3. ALWAYS maintain consistent state
   - Use database transaction cho critical updates
   - Order status update phải atomic với transaction insert
   - Rollback toàn bộ nếu bất kỳ step nào fail
```

---

## 9. Security Considerations

### 9.1 Webhook Authentication

```
Authentication Methods (chọn 1):

Method 1: API Key Header
  Header: Authorization: Apikey {SEPAY_API_KEY}
  Validation: Compare với stored key

Method 2: IP Whitelist
  Whitelist SePay IP ranges
  Combine với API Key cho defense in depth

Method 3: Signature Verification (nếu SePay hỗ trợ)
  Verify HMAC signature của payload
```

### 9.2 Data Protection

```
Sensitive Data Handling:

• Account numbers: Mask khi log (****6789)
• Transaction amounts: Log bình thường (cần cho debug)
• Customer info: Không log PII trong transaction logs
• API keys: Store encrypted, never log
```

---

## 10. Appendix

### 10.1 Payment Code Format

```
Recommended Format: {PREFIX}{SEQUENCE}

Examples:
• MKT123456     - 3 letter prefix + 6 digit sequence
• MKT-A1B2C3    - With separator and alphanumeric
• DH20240125001 - With date embedded

Cấu hình trên SePay:
  Công ty → Cấu hình chung → Cấu trúc mã thanh toán
  Pattern: MKT[A-Z0-9]+
```

### 10.2 Timeout Configuration

```yaml
# config/payment.yaml
payment:
  timeout:
    default: 1800          # 30 minutes
    quick_checkout: 900    # 15 minutes
    high_value: 7200       # 2 hours
    b2b: 604800            # 7 days
  
  tolerance:
    percent: 0.01          # 1%
    absolute: 1000         # 1000 VND
  
  matching:
    fuzzy_threshold: 0.60
    auto_match_threshold: 0.85
    
  retry:
    max_attempts: 3
    backoff_multiplier: 2
    initial_delay: 1000    # ms
```

### 10.3 Sample Webhook Payloads

```json
// Successful payment
{
  "id": 92704,
  "gateway": "MBBank",
  "transactionDate": "2024-01-15 14:02:37",
  "accountNumber": "0123456789",
  "code": "MKT123456",
  "content": "NGUYEN VAN A thanh toan don hang MKT123456",
  "transferType": "in",
  "transferAmount": 500000,
  "accumulated": 15000000,
  "subAccount": null,
  "referenceCode": "MB.1234567890",
  "description": "NGUYEN VAN A chuyen tien"
}

// Payment without clear code
{
  "id": 92705,
  "gateway": "Vietcombank",
  "transactionDate": "2024-01-15 14:05:00",
  "accountNumber": "0123456789",
  "code": null,
  "content": "mua hang online",
  "transferType": "in",
  "transferAmount": 350000,
  "accumulated": 15350000,
  "subAccount": null,
  "referenceCode": "VCB.9876543210",
  "description": "mua hang online"
}
```

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | - | Initial design document |

---

*Document generated for MKT Software Management payment integration*
