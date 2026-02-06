# Public Order Payment API - Frontend Developer Guide

## Overview

API GraphQL public (không cần đăng nhập) để lấy thông tin thanh toán đơn hàng, phục vụ render trang thanh toán cho khách hàng.

**Base URL:** `/graphql`
**Method:** `POST`
**Authentication:** Không yêu cầu Bearer Token (public endpoint)

**Headers:**
```
Content-Type: application/json
```

---

## Security Features

| Feature | Mô tả |
|---------|--------|
| **PII Sanitization** | Email và SĐT khách hàng được mask tự động |
| **Anti-enumeration** | Delay ngẫu nhiên 50-150ms khi order không tồn tại |
| **Status validation** | Chỉ trả dữ liệu cho đơn hàng ở trạng thái cho phép thanh toán |
| **Uniform error** | Order không tồn tại và format sai đều trả cùng response |

### PII Masking Rules

| Field | Rule | Ví dụ |
|-------|------|-------|
| `email` | Hiện 2 ký tự đầu + mask + domain | `ph***@gmail.com` |
| `phone` | Mask tất cả + hiện 4 số cuối | `******6789` |

---

## API Summary

| Query | Description |
|-------|-------------|
| `mktPublicOrderPayment` | Lấy thông tin thanh toán công khai theo mã đơn hàng |

---

## Query

### mktPublicOrderPayment

Lấy thông tin thanh toán đơn hàng để render trang thanh toán (QR code, chi tiết đơn).

**Query:**
```graphql
query MktPublicOrderPayment($orderCode: String!) {
  mktPublicOrderPayment(orderCode: $orderCode) {
    success
    data {
      order {
        orderCode
        status
        paymentStatus
        totalAmount
        paidAmount
        remainingAmount
        currency
        paymentDeadline
        createdAt
      }
      customer {
        name
        email
        phone
      }
      items {
        name
        quantity
        unitPrice
        totalPrice
        productName
        packageName
      }
      payment {
        qrCodeUrl
        amount
        currency
      }
    }
    error {
      code
      message
    }
  }
}
```

**Variables:**
```json
{
  "orderCode": "DEV20260204001"
}
```

---

## Responses

### Success - Đơn hàng hợp lệ, sẵn sàng thanh toán

```json
{
  "data": {
    "mktPublicOrderPayment": {
      "success": true,
      "data": {
        "order": {
          "orderCode": "DEV20260204001",
          "status": "CONFIRMED",
          "paymentStatus": "PENDING",
          "totalAmount": 149000,
          "paidAmount": 0,
          "remainingAmount": 149000,
          "currency": "VND",
          "paymentDeadline": "2026-02-11T03:00:00.000Z",
          "createdAt": "2026-02-04T03:00:00.000Z"
        },
        "customer": {
          "name": "Nguyen Van A",
          "email": "ng***@example.com",
          "phone": "******4567"
        },
        "items": [
          {
            "name": "MKT Tool Pro - 1 Month",
            "quantity": 1,
            "unitPrice": 149000,
            "totalPrice": 149000,
            "productName": "MKT Tool Pro",
            "packageName": "1 Month License"
          }
        ],
        "payment": {
          "qrCodeUrl": "https://qr.sepay.vn/img?acc=...&bank=BIDV&amount=149000",
          "amount": 149000,
          "currency": "VND"
        }
      },
      "error": null
    }
  }
}
```

### Success - Thanh toán một phần

```json
{
  "data": {
    "mktPublicOrderPayment": {
      "success": true,
      "data": {
        "order": {
          "orderCode": "DEV20260204002",
          "status": "CONFIRMED",
          "paymentStatus": "PARTIAL",
          "totalAmount": 500000,
          "paidAmount": 200000,
          "remainingAmount": 300000,
          "currency": "VND",
          "paymentDeadline": "2026-02-15T03:00:00.000Z",
          "createdAt": "2026-02-04T03:00:00.000Z"
        },
        "customer": {
          "name": "Tran Thi B",
          "email": "tr***@gmail.com",
          "phone": "******8901"
        },
        "items": [
          {
            "name": "MKT Tool Enterprise - 12 Months",
            "quantity": 1,
            "unitPrice": 500000,
            "totalPrice": 500000,
            "productName": "MKT Tool Enterprise",
            "packageName": "12 Month License"
          }
        ],
        "payment": {
          "qrCodeUrl": "https://qr.sepay.vn/img?acc=...&bank=BIDV&amount=300000",
          "amount": 300000,
          "currency": "VND"
        }
      },
      "error": null
    }
  }
}
```

### Error - Không tìm thấy đơn hàng

```json
{
  "data": {
    "mktPublicOrderPayment": {
      "success": false,
      "data": null,
      "error": {
        "code": "ORDER_NOT_FOUND",
        "message": "Không tìm thấy thông tin thanh toán"
      }
    }
  }
}
```

### Error - Đơn hàng không ở trạng thái cho phép thanh toán

```json
{
  "data": {
    "mktPublicOrderPayment": {
      "success": false,
      "data": null,
      "error": {
        "code": "ORDER_NOT_PAYABLE",
        "message": "Đơn hàng chưa sẵn sàng để thanh toán"
      }
    }
  }
}
```

### Error - Đơn hàng đã thanh toán đủ

```json
{
  "data": {
    "mktPublicOrderPayment": {
      "success": false,
      "data": null,
      "error": {
        "code": "ORDER_ALREADY_PAID",
        "message": "Đơn hàng đã được thanh toán"
      }
    }
  }
}
```

### Error - Không có payment transaction khả dụng

```json
{
  "data": {
    "mktPublicOrderPayment": {
      "success": false,
      "data": null,
      "error": {
        "code": "NO_ACTIVE_PAYMENT",
        "message": "Không có thông tin thanh toán khả dụng"
      }
    }
  }
}
```

---

## Validation Rules

### Order Status - Cho phép thanh toán

| Order Status | Cho phép | Error Code |
|--------------|----------|------------|
| `CONFIRMED` | Yes | - |
| `PENDING_PAYMENT` | Yes | - |
| `DRAFT` | No | `ORDER_NOT_PAYABLE` |
| `PROCESSING` | No | `ORDER_NOT_PAYABLE` |
| `CANCELED` | No | `ORDER_CANCELLED` |
| `COMPLETED` | No | `ORDER_ALREADY_COMPLETED` |
| Khác | No | `ORDER_NOT_PAYABLE` |

### Payment Status - Cho phép thanh toán

| Payment Status | Cho phép | Error Code |
|----------------|----------|------------|
| `PENDING` | Yes | - |
| `PARTIAL` | Yes | - |
| `PAID` | No | `ORDER_ALREADY_PAID` |
| `OVERPAID` | No | `ORDER_ALREADY_PAID` |

### Active Payment Selection

Hệ thống chọn payment transaction **active mới nhất** (theo `createdAt` giảm dần) từ danh sách payments của đơn hàng. Chỉ các transaction có status `PENDING` hoặc `PROCESSING` được coi là active.

---

## Error Codes

| Error Code | Message | Mô tả |
|------------|---------|-------|
| `ORDER_NOT_FOUND` | Không tìm thấy thông tin thanh toán | Order code không tồn tại hoặc format sai |
| `ORDER_NOT_PAYABLE` | Đơn hàng chưa sẵn sàng để thanh toán | Order ở trạng thái DRAFT, PROCESSING, hoặc trạng thái không hợp lệ |
| `ORDER_CANCELLED` | Đơn hàng đã bị hủy | Order đã bị hủy |
| `ORDER_ALREADY_COMPLETED` | Đơn hàng đã hoàn tất | Order đã hoàn thành |
| `ORDER_ALREADY_PAID` | Đơn hàng đã được thanh toán | Payment status là PAID hoặc OVERPAID |
| `ORDER_PAYMENT_VOIDED` | Thanh toán cho đơn hàng đã bị hủy | Payment đã bị void |
| `ORDER_PAYMENT_REFUNDED` | Đơn hàng đã được hoàn tiền | Đơn hàng đã refund |
| `NO_ACTIVE_PAYMENT` | Không có thông tin thanh toán khả dụng | Không có payment transaction ở trạng thái PENDING/PROCESSING |

---

## Output Types

### MktPublicOrderPaymentResponseDto (top-level)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `success` | Boolean | No | Kết quả truy vấn |
| `data` | MktPublicOrderPaymentDataDto | Yes | Dữ liệu (null khi error) |
| `error` | MktPublicOrderPaymentErrorDto | Yes | Lỗi (null khi success) |

### MktPublicOrderPaymentDataDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `order` | MktPublicOrderInfoDto | No | Thông tin đơn hàng |
| `customer` | MktPublicCustomerInfoDto | No | Thông tin khách hàng (đã mask PII) |
| `items` | [MktPublicOrderItemDto] | No | Danh sách sản phẩm |
| `payment` | MktPublicPaymentInfoDto | No | Thông tin thanh toán (QR code) |

### MktPublicOrderInfoDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `orderCode` | String | No | Mã đơn hàng |
| `status` | String | No | Trạng thái đơn (CONFIRMED, PENDING_PAYMENT) |
| `paymentStatus` | String | No | Trạng thái thanh toán (PENDING, PARTIAL) |
| `totalAmount` | Int | No | Tổng tiền (đơn vị nhỏ nhất, VND = đồng) |
| `paidAmount` | Int | No | Số tiền đã thanh toán |
| `remainingAmount` | Int | No | Số tiền còn lại |
| `currency` | String | No | Đơn vị tiền tệ (default: VND) |
| `paymentDeadline` | String | Yes | Hạn thanh toán (ISO 8601) |
| `createdAt` | String | No | Ngày tạo đơn |

**Note:** Amounts sử dụng kiểu `Int` (không phải `Float`) để tránh floating-point precision loss. Giá trị tính bằng đơn vị nhỏ nhất của currency (VND = đồng).

### MktPublicCustomerInfoDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `name` | String | No | Tên khách hàng (default: "Khách hàng") |
| `email` | String | Yes | Email đã mask (`ph***@gmail.com`) |
| `phone` | String | Yes | SĐT đã mask (`******6789`) |

### MktPublicOrderItemDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `name` | String | No | Tên item |
| `quantity` | Int | No | Số lượng (default: 1) |
| `unitPrice` | Int | No | Đơn giá |
| `totalPrice` | Int | No | Thành tiền |
| `productName` | String | Yes | Tên sản phẩm (từ snapshot) |
| `packageName` | String | Yes | Tên gói (từ snapshot) |

### MktPublicPaymentInfoDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `qrCodeUrl` | String | No | Link QR từ SePay (lifecycle do SePay quản lý) |
| `amount` | Int | No | Số tiền cần thanh toán |
| `currency` | String | No | Đơn vị tiền tệ |

### MktPublicOrderPaymentErrorDto

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `code` | String | No | Mã lỗi (xem bảng Error Codes) |
| `message` | String | No | Thông báo lỗi |

---

## Error Handling Code Example

```typescript
const handlePublicOrderPayment = async (orderCode: string) => {
  const { data } = await client.query({
    query: MKT_PUBLIC_ORDER_PAYMENT,
    variables: { orderCode },
  });

  const result = data?.mktPublicOrderPayment;

  if (!result?.success || !result.data) {
    const errorCode = result?.error?.code;

    switch (errorCode) {
      case 'ORDER_NOT_FOUND':
        showError('Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn.');
        break;
      case 'ORDER_CANCELLED':
        showError('Đơn hàng đã bị hủy.');
        break;
      case 'ORDER_ALREADY_PAID':
      case 'ORDER_ALREADY_COMPLETED':
        showSuccess('Đơn hàng đã được thanh toán thành công!');
        break;
      case 'NO_ACTIVE_PAYMENT':
        showError('Chưa có thông tin thanh toán. Vui lòng liên hệ hỗ trợ.');
        break;
      default:
        showError(result?.error?.message ?? 'Có lỗi xảy ra');
    }

    return null;
  }

  return result.data;
};
```

---

## Best Practices

### 1. Payment Page Rendering

```typescript
const PaymentPage = ({ orderCode }: { orderCode: string }) => {
  const { data, loading, error } = useQuery(MKT_PUBLIC_ORDER_PAYMENT, {
    variables: { orderCode },
  });

  if (loading) return <Spinner />;

  const result = data?.mktPublicOrderPayment;

  if (!result?.success || !result.data) {
    return <ErrorState code={result?.error?.code} message={result?.error?.message} />;
  }

  const { order, customer, items, payment } = result.data;

  return (
    <div>
      <OrderSummary
        orderCode={order.orderCode}
        totalAmount={order.totalAmount}
        paidAmount={order.paidAmount}
        remainingAmount={order.remainingAmount}
        currency={order.currency}
        paymentDeadline={order.paymentDeadline}
      />
      <CustomerInfo name={customer.name} email={customer.email} phone={customer.phone} />
      <ItemList items={items} />
      <QRPayment qrCodeUrl={payment.qrCodeUrl} amount={payment.amount} currency={payment.currency} />
    </div>
  );
};
```

### 2. Format Amount (Int → Display)

```typescript
const formatAmount = (amount: number, currency: string): string => {
  return amount.toLocaleString('vi-VN') + ' ' + currency;
};

// 149000 → "149.000 VND"
// 1500000 → "1.500.000 VND"
```

### 3. Polling cho cập nhật thanh toán

```typescript
const { data } = useQuery(MKT_PUBLIC_ORDER_PAYMENT, {
  variables: { orderCode },
  pollInterval: 10_000, // Poll mỗi 10 giây
});

// Dừng poll khi đã thanh toán đủ
useEffect(() => {
  const paymentStatus = data?.mktPublicOrderPayment?.data?.order?.paymentStatus;

  if (paymentStatus === 'PAID') {
    stopPolling();
    showSuccess('Thanh toán thành công!');
  }
}, [data]);
```

### 4. Countdown hạn thanh toán

```typescript
const PaymentDeadline = ({ deadline }: { deadline: string | null }) => {
  if (!deadline) return null;

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return <Badge color="red">Đã quá hạn</Badge>;
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return <Badge color="orange">{days} ngày {hours} giờ còn lại</Badge>;
};
```

---

## Related APIs

| API | Resolver | Purpose |
|-----|----------|---------|
| `getOrderById` | order-query.resolver.ts | Lấy chi tiết đơn hàng (yêu cầu auth) |
| `getOrderByCode` | order-query.resolver.ts | Lấy đơn hàng theo mã (yêu cầu auth) |
| `getOrderPaymentSummary` | order-query.resolver.ts | Lấy tổng hợp thanh toán (yêu cầu auth) |
| `confirmPaymentBySale` | payment-confirmation.resolver.ts | Sale xác nhận thanh toán |
| `confirmPaymentByAccounting` | payment-confirmation.resolver.ts | Kế toán xác nhận thanh toán |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-05 | Initial release - Public order payment endpoint |