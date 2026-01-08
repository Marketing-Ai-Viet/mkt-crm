# Order Commands Documentation

Thư mục này chứa các CLI commands và cron jobs liên quan đến module Order.

---

## 1. mkt-order-overdue.cron.job.ts

### Mục đích
Cron job tự động kiểm tra và cập nhật trạng thái các đơn hàng quá hạn thanh toán (`OVERDUE`).

### Cách hoạt động
1. Job được đăng ký vào `MessageQueue.cronQueue`
2. Chạy định kỳ theo pattern: `*/30 * * * *` (mỗi 30 phút)
3. Gọi `MktOrderOverdueService.updateOverdueOrders()` để xử lý

### Cấu hình
```typescript
// Cron pattern: mỗi 30 phút
MKT_ORDER_OVERDUE_CRON_PATTERN = '*/30 * * * *'
```

### Flow xử lý
```
┌─────────────────────────────────────────────────────────────┐
│  Cron Scheduler (every 30 minutes)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  MktOrderOverdueCronJob.handle()                            │
│  - Nhận workspaceId từ job data                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  MktOrderOverdueService.updateOverdueOrders()               │
│  - Tìm các order PENDING/CONFIRMED đã quá hạn               │
│  - Cập nhật status thành OVERDUE                            │
│  - Gửi notification/email (nếu có)                          │
└─────────────────────────────────────────────────────────────┘
```

### Monitoring
- Tích hợp với Sentry qua decorator `@SentryCronMonitor`
- Logs được ghi với prefix 🔥 để dễ filter

### Lưu ý
- Job cần được enqueue từ scheduler với `workspaceId`
- Nếu có lỗi, job sẽ throw error để retry mechanism xử lý

---

## Tổng kết

| File | Loại | Tần suất | Mục đích |
|------|------|----------|----------|
| `mkt-order-overdue.cron.job.ts` | Cron Job | Mỗi 30 phút | Tự động đánh dấu đơn hàng quá hạn |

---

## Liên quan

- `MktOrderOverdueService` - Service xử lý logic overdue
- `ORDER_STATUS` - Các trạng thái đơn hàng (PENDING, CONFIRMED, OVERDUE, BLOCKED, etc.)
- `mkt-order-overdue.constants.ts` - Cấu hình cron pattern
- `OrderItemService` - Xử lý optimistic locking cho order items (xem `OPTIMISTIC_LOCKING.md`)
