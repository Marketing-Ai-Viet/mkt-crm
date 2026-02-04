# Payment Reminder API - Frontend Developer Guide

## Overview

API GraphQL cho phép gửi email nhắc nhở thanh toán đến customer có đơn hàng chưa thanh toán.

**Base URL:** `/graphql`
**Method:** `POST`
**Authentication:** Bearer Token (required)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

---

## Access Control

Tất cả operations yêu cầu `WorkspaceAuthGuard` và `UserAuthGuard`.

| Level | Role | Access Scope |
|-------|------|--------------|
| 8-11 | Staff (SALES) | Gửi reminder cho đơn do mình tạo |
| 7 | Manager (ACCOUNTING) | Gửi reminder cho đơn của cấp dưới |
| 4-6 | Upper Management | Gửi reminder trong reporting chain |
| 1-3 | Executive (ADMIN) | Gửi reminder cho tất cả đơn hàng |

---

## API Summary

| Operation | Type | Description |
|-----------|------|-------------|
| `sendPaymentReminder` | Mutation | Gửi reminder cho một order |
| `sendBulkPaymentReminders` | Mutation | Gửi reminder cho nhiều orders |
| `getOrdersNeedingReminder` | Query | Lấy danh sách orders cần nhắc nhở |

---

## Business Rules

### Validation Rules

| Rule | Description |
|------|-------------|
| Order Status | Chỉ orders có status = `PROCESSING` |
| Payment Status | Chỉ `PENDING` hoặc `PARTIAL` |
| Confirmation | `salePaymentConfirmed = false` AND `accountingConfirmed = false` |
| Customer Email | Customer phải có email |
| Max Reminders | Tối đa 3 reminder/order (bypass với `forceResend`) |
| Min Interval | Tối thiểu 4 giờ giữa các reminder (bypass với `forceResend`) |

### Rate Limits

| Limit | Value |
|-------|-------|
| `MAX_REMINDERS` | 3 |
| `MIN_INTERVAL_HOURS` | 4 |
| `BULK_LIMIT` | 50 orders/request |

---

## Mutations

### 1. sendPaymentReminder

Gửi email nhắc nhở thanh toán cho một order.

**Mutation:**
```graphql
mutation SendPaymentReminder($input: SendPaymentReminderInput!) {
  sendPaymentReminder(input: $input) {
    orderId
    orderCode
    customerEmail
    sentAt
    reminderCount
    previousReminderCount
  }
}
```

**Variables - Basic:**
```json
{
  "input": {
    "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea"
  }
}
```

**Variables - With custom note:**
```json
{
  "input": {
    "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea",
    "note": "Vui lòng thanh toán sớm để kích hoạt license.",
    "templateKey": "payment_reminder"
  }
}
```

**Variables - Force resend (bypass rate limits):**
```json
{
  "input": {
    "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea",
    "forceResend": true
  }
}
```

**Response Success:**
```json
{
  "data": {
    "sendPaymentReminder": {
      "orderId": "785502a8-282a-4577-96a7-c4e9b60c64ea",
      "orderCode": "DEV20260204001",
      "customerEmail": "nguyenvana@example.com",
      "sentAt": "2026-02-04T10:30:00.000Z",
      "reminderCount": 2,
      "previousReminderCount": 1
    }
  }
}
```

**Response Error - Max reminders reached:**
```json
{
  "errors": [{
    "message": "Đã gửi đủ số lần nhắc nhở tối đa cho đơn hàng này",
    "extensions": {
      "code": "PAYMENT_REMINDER_MAX_REMINDERS_REACHED",
      "orderId": "785502a8-...",
      "remindersSent": 3,
      "maxReminders": 3
    }
  }]
}
```

---

### 2. sendBulkPaymentReminders

Gửi email nhắc nhở cho nhiều orders cùng lúc.

**Mutation:**
```graphql
mutation SendBulkPaymentReminders($input: SendBulkPaymentRemindersInput!) {
  sendBulkPaymentReminders(input: $input) {
    totalProcessed
    totalSent
    totalSkipped
    totalFailed
    isDryRun
    results {
      orderId
      orderCode
      sent
      skipped
      skipReason
      sentAt
    }
  }
}
```

**Variables - By specific order IDs:**
```json
{
  "input": {
    "orderIds": [
      "785502a8-282a-4577-96a7-c4e9b60c64ea",
      "12345678-abcd-efgh-ijkl-mnopqrstuvwx"
    ]
  }
}
```

**Variables - By filter:**
```json
{
  "input": {
    "filter": {
      "status": "PROCESSING",
      "paymentStatus": "PENDING",
      "daysPastDeadline": 1,
      "maxRemindersSent": 2
    }
  }
}
```

**Variables - Dry run (preview mode):**
```json
{
  "input": {
    "filter": {
      "daysPastDeadline": 3
    },
    "dryRun": true
  }
}
```

**Response Success:**
```json
{
  "data": {
    "sendBulkPaymentReminders": {
      "totalProcessed": 5,
      "totalSent": 3,
      "totalSkipped": 2,
      "totalFailed": 0,
      "isDryRun": false,
      "results": [
        {
          "orderId": "order-1",
          "orderCode": "DEV20260204001",
          "sent": true,
          "skipped": false,
          "skipReason": null,
          "sentAt": "2026-02-04T10:30:00.000Z"
        },
        {
          "orderId": "order-2",
          "orderCode": "DEV20260203001",
          "sent": false,
          "skipped": true,
          "skipReason": "PAYMENT_REMINDER_MAX_REMINDERS_REACHED",
          "sentAt": null
        }
      ]
    }
  }
}
```

**Response - Dry run:**
```json
{
  "data": {
    "sendBulkPaymentReminders": {
      "totalProcessed": 10,
      "totalSent": 0,
      "totalSkipped": 10,
      "totalFailed": 0,
      "isDryRun": true,
      "results": [
        {
          "orderId": "order-1",
          "orderCode": "DEV20260204001",
          "sent": false,
          "skipped": true,
          "skipReason": "DRY_RUN",
          "sentAt": null
        }
      ]
    }
  }
}
```

---

## Queries

### 1. getOrdersNeedingReminder

Lấy danh sách orders cần nhắc nhở thanh toán (đã validate sẵn).

**Query:**
```graphql
query GetOrdersNeedingReminder($input: GetOrdersNeedingReminderInput) {
  getOrdersNeedingReminder(input: $input) {
    orders {
      id
      orderCode
      customerName
      customerEmail
      customerPhone
      totalAmount
      paidAmount
      remainingAmount
      paymentDeadline
      remindersSent
      lastReminderAt
      daysPastDeadline
      status
      paymentStatus
      canSendReminder
    }
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
```

**Variables - Basic pagination:**
```json
{
  "input": {
    "pagination": {
      "limit": 20,
      "offset": 0
    }
  }
}
```

**Variables - With filter:**
```json
{
  "input": {
    "filter": {
      "paymentStatus": "PENDING",
      "daysPastDeadline": 1,
      "maxRemindersSent": 2
    },
    "pagination": {
      "limit": 50
    }
  }
}
```

**Response Success:**
```json
{
  "data": {
    "getOrdersNeedingReminder": {
      "orders": [
        {
          "id": "785502a8-282a-4577-96a7-c4e9b60c64ea",
          "orderCode": "DEV20260204001",
          "customerName": "Nguyen Van A",
          "customerEmail": "nguyenvana@example.com",
          "customerPhone": "0901234567",
          "totalAmount": "149.000 ₫",
          "paidAmount": "0 ₫",
          "remainingAmount": "149.000 ₫",
          "paymentDeadline": "2026-02-11T03:00:00.000Z",
          "remindersSent": 1,
          "lastReminderAt": "2026-02-03T08:00:00.000Z",
          "daysPastDeadline": 0,
          "status": "PROCESSING",
          "paymentStatus": "PENDING",
          "canSendReminder": true
        }
      ],
      "totalCount": 15,
      "pageInfo": {
        "hasNextPage": false,
        "hasPreviousPage": false,
        "startCursor": "785502a8-282a-4577-96a7-c4e9b60c64ea",
        "endCursor": "785502a8-282a-4577-96a7-c4e9b60c64ea"
      }
    }
  }
}
```

---

## Input Types

### SendPaymentReminderInput

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `orderId` | ID | Yes | - | Order ID (UUID) |
| `idempotencyKey` | String | No | - | Key để tránh gửi trùng |
| `templateKey` | String | No | `payment_reminder` | Template key |
| `note` | String | No | - | Ghi chú (max 500 chars, sanitized) |
| `forceResend` | Boolean | No | `false` | Bypass rate limits |

### SendBulkPaymentRemindersInput

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderIds` | [ID] | No | Danh sách order IDs (max 50) |
| `filter` | PaymentReminderFilterInput | No | Filter để chọn orders |
| `templateKey` | String | No | Template key |
| `dryRun` | Boolean | No | Preview mode (default: false) |

**Note:** Phải có `orderIds` HOẶC `filter`, không được thiếu cả hai.

### PaymentReminderFilterInput

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | String | `PROCESSING` | Order status |
| `paymentStatus` | String | `PENDING, PARTIAL` | Payment status |
| `daysPastDeadline` | Int | - | Số ngày quá hạn tối thiểu |
| `maxRemindersSent` | Int | 2 | Số reminder đã gửi tối đa |

### PaymentReminderPaginationInput

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | Int | 20 | Items per page (max 100) |
| `offset` | Int | 0 | Offset |
| `cursor` | String | - | Cursor (optional) |

### GetOrdersNeedingReminderInput

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filter` | PaymentReminderFilterInput | No | Filter options |
| `pagination` | PaymentReminderPaginationInput | No | Pagination |

---

## Output Types

### SendPaymentReminderOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `orderId` | ID | No | Order ID |
| `orderCode` | String | Yes | Mã đơn hàng |
| `customerEmail` | String | Yes | Email đã gửi |
| `sentAt` | String | Yes | Thời gian gửi (ISO) |
| `reminderCount` | Int | No | Tổng reminder sau operation |
| `previousReminderCount` | Int | No | Reminder trước operation |

### BulkReminderResultItemOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `orderId` | ID | No | Order ID |
| `orderCode` | String | Yes | Mã đơn hàng |
| `sent` | Boolean | No | Đã gửi thành công? |
| `skipped` | Boolean | No | Bị skip? |
| `skipReason` | String | Yes | Lý do skip (error code) |
| `sentAt` | String | Yes | Thời gian gửi |

### SendBulkPaymentRemindersOutput

| Field | Type | Description |
|-------|------|-------------|
| `totalProcessed` | Int | Tổng orders đã xử lý |
| `totalSent` | Int | Số đã gửi thành công |
| `totalSkipped` | Int | Số bị skip |
| `totalFailed` | Int | Số lỗi email queue |
| `isDryRun` | Boolean | Có phải dry run? |
| `results` | [BulkReminderResultItemOutput] | Chi tiết từng order |

### OrderNeedingReminderOutput

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | ID | No | Order ID |
| `orderCode` | String | No | Mã đơn hàng |
| `customerName` | String | No | Tên khách hàng |
| `customerEmail` | String | Yes | Email |
| `customerPhone` | String | Yes | Số điện thoại |
| `totalAmount` | String | No | Tổng tiền (formatted) |
| `paidAmount` | String | No | Đã thanh toán (formatted) |
| `remainingAmount` | String | No | Còn lại (formatted) |
| `paymentDeadline` | String | Yes | Hạn thanh toán (ISO) |
| `remindersSent` | Int | No | Số reminder đã gửi |
| `lastReminderAt` | String | Yes | Thời gian gửi gần nhất |
| `daysPastDeadline` | Int | No | Số ngày quá hạn |
| `status` | String | No | Order status |
| `paymentStatus` | String | No | Payment status |
| `canSendReminder` | Boolean | No | Có thể gửi reminder? |

### PaymentReminderPageInfo

| Field | Type | Description |
|-------|------|-------------|
| `hasNextPage` | Boolean | Có trang sau? |
| `hasPreviousPage` | Boolean | Có trang trước? |
| `startCursor` | String | Cursor đầu |
| `endCursor` | String | Cursor cuối |

### GetOrdersNeedingReminderOutput

| Field | Type | Description |
|-------|------|-------------|
| `orders` | [OrderNeedingReminderOutput] | Danh sách orders |
| `totalCount` | Int | Tổng số matching |
| `pageInfo` | PaymentReminderPageInfo | Pagination info |

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `PAYMENT_REMINDER_ORDER_NOT_FOUND` | Order không tồn tại | Order ID không hợp lệ |
| `PAYMENT_REMINDER_INVALID_ORDER_STATUS` | Trạng thái đơn hàng không hợp lệ | Order không ở trạng thái PROCESSING |
| `PAYMENT_REMINDER_PAYMENT_ALREADY_COMPLETE` | Đơn hàng đã thanh toán đủ | Payment status = PAID |
| `PAYMENT_REMINDER_ORDER_ALREADY_CONFIRMED` | Đơn hàng đã được xác nhận | salePaymentConfirmed hoặc accountingConfirmed = true |
| `PAYMENT_REMINDER_NO_CUSTOMER_EMAIL` | Khách hàng không có email | Customer email is null |
| `PAYMENT_REMINDER_MAX_REMINDERS_REACHED` | Đã gửi đủ số lần nhắc nhở | remindersSent >= 3 |
| `PAYMENT_REMINDER_REMINDER_TOO_SOON` | Chưa đủ thời gian từ lần nhắc trước | < 4 hours since last |
| `PAYMENT_REMINDER_TEMPLATE_NOT_FOUND` | Không tìm thấy template | Invalid templateKey |
| `PAYMENT_REMINDER_EMAIL_QUEUE_FAILED` | Lỗi gửi email | Email service error |
| `PAYMENT_REMINDER_BULK_LIMIT_EXCEEDED` | Vượt quá giới hạn bulk | > 50 orders |
| `PAYMENT_REMINDER_NO_ORDERS_TO_PROCESS` | Không có order để xử lý | Empty orderIds and filter |

---

## Skip Reasons (Bulk)

| Reason | Description |
|--------|-------------|
| `DRY_RUN` | Dry run mode - không gửi thật |
| `VALIDATION_FAILED` | Order không pass validation |
| `UNKNOWN_ERROR` | Lỗi không xác định |
| `PAYMENT_REMINDER_*` | Các error codes ở trên |

---

## Error Handling

### Error Handling Code Example

```typescript
const handleSendReminder = async (orderId: string) => {
  try {
    const result = await sendPaymentReminder({
      variables: { input: { orderId } }
    });

    showSuccess(`Đã gửi reminder lần ${result.data.sendPaymentReminder.reminderCount}`);
    return result.data.sendPaymentReminder;

  } catch (error) {
    const graphQLError = error.graphQLErrors?.[0];
    const code = graphQLError?.extensions?.code;

    switch (code) {
      case 'PAYMENT_REMINDER_MAX_REMINDERS_REACHED':
        showWarning('Đã gửi đủ 3 lần nhắc nhở. Sử dụng forceResend nếu cần.');
        break;

      case 'PAYMENT_REMINDER_REMINDER_TOO_SOON':
        const nextAllowed = graphQLError.extensions.nextAllowedAt;
        showWarning(`Vui lòng đợi đến ${formatDate(nextAllowed)}`);
        break;

      case 'PAYMENT_REMINDER_NO_CUSTOMER_EMAIL':
        showError('Khách hàng không có email. Vui lòng cập nhật thông tin.');
        break;

      case 'PAYMENT_REMINDER_INVALID_ORDER_STATUS':
        showError('Đơn hàng không ở trạng thái có thể nhắc nhở.');
        break;

      default:
        showError('Có lỗi xảy ra khi gửi nhắc nhở.');
    }
  }
};
```

---

## Best Practices

### 1. Query Orders Before Bulk Send

```graphql
# Bước 1: Preview orders cần gửi
query PreviewOrders {
  getOrdersNeedingReminder(input: {
    filter: { daysPastDeadline: 3 }
    pagination: { limit: 50 }
  }) {
    orders {
      id
      orderCode
      customerEmail
      canSendReminder
    }
    totalCount
  }
}

# Bước 2: Dry run để xác nhận
mutation DryRunBulk {
  sendBulkPaymentReminders(input: {
    filter: { daysPastDeadline: 3 }
    dryRun: true
  }) {
    totalProcessed
    totalSkipped
    results { orderId skipReason }
  }
}

# Bước 3: Gửi thật
mutation SendBulk {
  sendBulkPaymentReminders(input: {
    filter: { daysPastDeadline: 3 }
    dryRun: false
  }) {
    totalSent
    totalFailed
  }
}
```

### 2. Reminder Dashboard Component

```typescript
const ReminderDashboard = () => {
  const { data, loading, refetch } = useQuery(GET_ORDERS_NEEDING_REMINDER, {
    variables: {
      input: {
        filter: { maxRemindersSent: 2 },
        pagination: { limit: 20 }
      }
    }
  });

  const [sendReminder] = useMutation(SEND_PAYMENT_REMINDER);

  const handleSend = async (orderId: string) => {
    await sendReminder({ variables: { input: { orderId } } });
    refetch();
  };

  return (
    <Table
      data={data?.getOrdersNeedingReminder.orders}
      columns={[
        { key: 'orderCode', label: 'Mã đơn' },
        { key: 'customerName', label: 'Khách hàng' },
        { key: 'remainingAmount', label: 'Còn lại' },
        { key: 'daysPastDeadline', label: 'Quá hạn (ngày)' },
        { key: 'remindersSent', label: 'Đã gửi' },
        {
          key: 'actions',
          render: (order) => (
            <Button
              onClick={() => handleSend(order.id)}
              disabled={!order.canSendReminder}
            >
              Gửi nhắc nhở
            </Button>
          )
        }
      ]}
    />
  );
};
```

### 3. Bulk Send with Progress

```typescript
const BulkSendModal = ({ orderIds }: { orderIds: string[] }) => {
  const [sendBulk, { loading }] = useMutation(SEND_BULK_PAYMENT_REMINDERS);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    const response = await sendBulk({
      variables: {
        input: { orderIds, dryRun: false }
      }
    });
    setResult(response.data.sendBulkPaymentReminders);
  };

  return (
    <Modal>
      <Button onClick={handleSend} loading={loading}>
        Gửi cho {orderIds.length} đơn hàng
      </Button>

      {result && (
        <Result
          status={result.totalFailed === 0 ? 'success' : 'warning'}
          title={`Đã gửi ${result.totalSent}/${result.totalProcessed}`}
          subTitle={`Skipped: ${result.totalSkipped}, Failed: ${result.totalFailed}`}
        />
      )}
    </Modal>
  );
};
```

### 4. Auto-refresh with Polling

```typescript
const { data } = useQuery(GET_ORDERS_NEEDING_REMINDER, {
  variables: {
    input: {
      filter: { daysPastDeadline: 0 },
      pagination: { limit: 100 }
    }
  },
  pollInterval: 60000 // Refresh mỗi phút
});
```

---

## Email Template Variables

Template `payment_reminder` hỗ trợ các variables sau:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{customer_name}}` | Tên khách hàng | Nguyễn Văn A |
| `{{order_code}}` | Mã đơn hàng | DEV20260204001 |
| `{{total_amount}}` | Tổng tiền (formatted) | 1.490.000 ₫ |
| `{{paid_amount}}` | Đã thanh toán | 500.000 ₫ |
| `{{remaining_amount}}` | Còn lại | 990.000 ₫ |
| `{{payment_deadline}}` | Hạn thanh toán | 04/02/2026 |
| `{{days_overdue}}` | Số ngày quá hạn | 3 |
| `{{reminder_count}}` | Lần nhắc thứ | 2 |
| `{{company_name}}` | Tên công ty | MKT Company |
| `{{support_email}}` | Email hỗ trợ | support@mkt.vn |
| `{{custom_note}}` | Ghi chú (nếu có) | - |

**Conditional blocks:**
- `{{#if payment_url}}...{{/if}}` - Hiển thị nếu có link thanh toán
- `{{#if qr_code_url}}...{{/if}}` - Hiển thị nếu có QR code
- `{{#if custom_note}}...{{/if}}` - Hiển thị nếu có ghi chú

---

## Related APIs

| API | Resolver | Purpose |
|-----|----------|---------|
| `getOrders` | order-query.resolver.ts | Query orders với filter |
| `getOrderById` | order-query.resolver.ts | Lấy chi tiết order |
| `confirmPaymentBySale` | payment-confirmation.resolver.ts | Sale xác nhận thanh toán |
| `confirmPaymentByAccounting` | payment-confirmation.resolver.ts | Kế toán xác nhận thanh toán |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-04 | Initial release |
