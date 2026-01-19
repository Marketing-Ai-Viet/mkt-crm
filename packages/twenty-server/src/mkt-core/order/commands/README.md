# Order Commands Documentation

Thư mục này chứa các CLI commands và cron jobs liên quan đến module Order.

---

## Payment Flow Jobs

### 1. PaymentDeadlineProcessor (payment-deadline.processor.ts)

#### Mục đích
Xử lý các delayed jobs cho payment deadline:
- **DEADLINE_CHECK**: Kiểm tra và khóa đơn hàng quá hạn thanh toán
- **REMINDER**: Gửi nhắc nhở thanh toán

#### Cách hoạt động
1. Workers được đăng ký khi module khởi động (OnModuleInit)
2. Jobs được schedule bởi `SchedulePaymentRemindersStep` khi confirm order
3. Sử dụng BullMQ delayed jobs cho precise timing

#### Flow xử lý Deadline Check
```
┌─────────────────────────────────────────────────────────────┐
│  SchedulePaymentRemindersStep (khi confirm order)           │
│  - Schedule deadline check job với delay = paymentDeadline  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (sau paymentDeadline)
┌─────────────────────────────────────────────────────────────┐
│  PaymentDeadlineProcessor.handleDeadlineCheck()             │
│  - Kiểm tra order còn ở PROCESSING status                   │
│  - Kiểm tra đã quá deadline                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  OrderLockService.lockLicenses()                            │
│  - Lock licenses trên MKT Server                            │
│  - Update order status → LOCKED                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. PaymentOverdueScanJob + PaymentOverdueScanService

#### Architecture
- **PaymentOverdueScanJob** (`jobs/payment-overdue-scan.job.ts`): Thin layer cron processor
- **PaymentOverdueScanService** (`services/core/payment-overdue-scan.service.ts`): Business logic

#### Mục đích
Cron job backup để scan và lock các orders quá hạn thanh toán.
Chạy định kỳ để catch các cases mà delayed job bị miss.

#### Cách hoạt động
1. Job được đăng ký vào `MessageQueue.cronQueue`
2. Chạy định kỳ theo pattern: `*/5 * * * *` (mỗi 5 phút)
3. Delegate business logic cho `PaymentOverdueScanService`

#### Flow xử lý
```
┌─────────────────────────────────────────────────────────────┐
│  Cron Scheduler (every 5 minutes)                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PaymentOverdueScanJob.handle()                             │
│  - Nhận workspaceId từ job data                             │
│  - Delegate to PaymentOverdueScanService                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PaymentOverdueScanService.scanAndLockOverdueOrders()       │
│  - Tìm orders PROCESSING với paymentDeadline < now          │
│  - Lock licenses trên MKT Server                            │
│  - Update order status → LOCKED                             │
│  - Return scan result with counts                           │
└─────────────────────────────────────────────────────────────┘
```

#### Monitoring
- Tích hợp với Sentry qua decorator `@SentryCronMonitor`

---

## Tổng kết

| File | Loại | Tần suất/Trigger | Mục đích |
|------|------|------------------|----------|
| `payment-deadline.processor.ts` | Delayed Job Worker | Event-driven | Kiểm tra deadline và lock order |
| `payment-overdue-scan.service.ts` | Cron Job | Mỗi 5 phút | Backup scan cho overdue orders |

---

## Liên quan

- `PaymentDeadlineService` - Service tính toán payment deadline
- `OrderLockService` - Service lock/unlock licenses
- `ORDER_STATUS` - Các trạng thái đơn hàng (DRAFT, PROCESSING, COMPLETED, LOCKED, etc.)
- `payment-deadline.constants.ts` - Cấu hình deadline và reminders
- `OrderItemService` - Xử lý optimistic locking cho order items (xem `OPTIMISTIC_LOCKING.md`)
