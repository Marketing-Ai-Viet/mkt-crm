# Test Documentation: Order Item Mutation Resolver

> **File**: `packages/twenty-server/src/mkt-core/order/resolvers/order-item-mutation.resolver.ts`
> **Ngày tạo**: 2026-01-19
> **Mục đích**: Test tất cả mutations trong OrderItemMutationResolver

---

## 1. Thông tin kết nối

### 1.1. Endpoint

```
URL: http://localhost:3000/graphql
Method: POST
Content-Type: application/json
```

### 1.2. Authorization Header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4
```

---

## 2. Test Data

### 2.1. Orders có Order Items

> **Lưu ý**: Cần query database để lấy orderItemId thực từ các orders đang có trong hệ thống

**SQL Query để lấy Order Items:**

```sql
SELECT
  oi.id as "orderItemId",
  oi."orderId",
  oi."productName",
  oi.quantity,
  oi."unitPrice",
  oi."totalPrice",
  oi."updatedAt"
FROM "mktOrderItem" oi
INNER JOIN "mktOrder" o ON oi."orderId" = o.id
WHERE o.status IN ('DRAFT', 'PROCESSING')
LIMIT 10;
```

### 2.2. Sample Order Items (sẽ lấy từ database)

| orderItemId | orderId | productName | quantity | unitPrice | totalPrice |
|-------------|---------|-------------|----------|-----------|------------|
| {item_id_1} | {order_id} | Product A | 1 | 299000 | 299000 |
| {item_id_2} | {order_id} | Product B | 2 | 149000 | 298000 |

---

## 3. Mutations

### 3.1. updateOrderItem

> Cập nhật order item với optimistic locking qua `updatedAt` field

**Input DTO: UpdateOrderItemInputDto**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderItemId | String (UUID) | Yes | ID của order item |
| variantId | String (UUID) | No | Variant ID mới |
| quantity | Int | No | Số lượng mới (min: 1) |
| unitPrice | Number | No | Đơn giá mới (min: 0) |
| note | String | No | Ghi chú |
| updatedAt | String | No | Timestamp để optimistic locking |

**Response: UpdateOrderItemResponseDto**

| Field | Type | Description |
|-------|------|-------------|
| success | Boolean | Thành công hay không |
| orderItemId | String | ID order item |
| orderId | String | ID order |
| error | String | Thông báo lỗi (nếu có) |

**GraphQL:**

```graphql
mutation UpdateOrderItem {
  updateOrderItem(input: {
    orderItemId: "{ORDER_ITEM_ID}"
    quantity: 2
    unitPrice: 250000
    note: "Updated quantity"
    updatedAt: "2026-01-19T10:00:00.000Z"
  }) {
    success
    orderItemId
    orderId
    error
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{"query":"mutation UpdateOrderItem { updateOrderItem(input: { orderItemId: \"{ORDER_ITEM_ID}\", quantity: 2, unitPrice: 250000, note: \"Updated quantity\", updatedAt: \"2026-01-19T10:00:00.000Z\" }) { success orderItemId orderId error } }"}'
```

**Expected Response:**

```json
{
  "data": {
    "updateOrderItem": {
      "success": true,
      "orderItemId": "{ORDER_ITEM_ID}",
      "orderId": "{ORDER_ID}",
      "error": null
    }
  }
}
```

---

### 3.2. recalculateOrderItems

> Tính lại tất cả order items cho một order (khi giá variant thay đổi)

**Arguments:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | String | Yes | ID đơn hàng |

**Response: RecalculateOrderItemsResponseDto**

| Field | Type | Description |
|-------|------|-------------|
| success | Boolean | Thành công hay không |
| updatedCount | Int | Số items đã cập nhật |
| error | String | Thông báo lỗi (nếu có) |

**GraphQL:**

```graphql
mutation RecalculateOrderItems {
  recalculateOrderItems(orderId: "{ORDER_ID}") {
    success
    updatedCount
    error
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY3NjgyODQwLCJleHAiOjE3NzU0NTg4NDB9.Lo_D16iYFStdiKn2FMR-DJ3bHXXBJGkM7PBx5aF3nF4" \
  -d '{"query":"mutation RecalculateOrderItems { recalculateOrderItems(orderId: \"{ORDER_ID}\") { success updatedCount error } }"}'
```

**Expected Response:**

```json
{
  "data": {
    "recalculateOrderItems": {
      "success": true,
      "updatedCount": 3,
      "error": null
    }
  }
}
```

---

## 4. Test Scenarios

### 4.1. Update Quantity

**Scenario**: Cập nhật số lượng của order item

```graphql
mutation {
  updateOrderItem(input: {
    orderItemId: "{ORDER_ITEM_ID}"
    quantity: 3
  }) {
    success
    orderItemId
    error
  }
}
```

**Verification:**
- [ ] `success` = `true`
- [ ] Order total được recalculate
- [ ] Order item quantity được cập nhật

---

### 4.2. Update Unit Price (Custom Price)

**Scenario**: Cập nhật đơn giá custom cho order item

```graphql
mutation {
  updateOrderItem(input: {
    orderItemId: "{ORDER_ITEM_ID}"
    unitPrice: 199000
    note: "Special discount for VIP customer"
  }) {
    success
    orderItemId
    error
  }
}
```

**Verification:**
- [ ] `success` = `true`
- [ ] Order total được recalculate với giá mới
- [ ] Note được lưu

---

### 4.3. Optimistic Locking - Conflict

**Scenario**: Update với `updatedAt` cũ (conflict)

```graphql
mutation {
  updateOrderItem(input: {
    orderItemId: "{ORDER_ITEM_ID}"
    quantity: 5
    updatedAt: "2020-01-01T00:00:00.000Z"  # Old timestamp
  }) {
    success
    orderItemId
    error
  }
}
```

**Expected:**
- [ ] `success` = `false`
- [ ] `error` contains "Optimistic locking conflict" or similar

---

### 4.4. Recalculate After Price Change

**Scenario**: Tính lại tất cả items sau khi giá variant thay đổi

**Precondition:**
1. Tạo order với items
2. Giá variant trên MKT Server thay đổi
3. Gọi recalculateOrderItems

```graphql
mutation {
  recalculateOrderItems(orderId: "{ORDER_ID}") {
    success
    updatedCount
    error
  }
}
```

**Verification:**
- [ ] `success` = `true`
- [ ] `updatedCount` > 0
- [ ] Tất cả order items có giá mới
- [ ] Order total được cập nhật

---

## 5. Error Cases

| Scenario | Expected Response |
|----------|-------------------|
| Order item không tồn tại | `{ success: false, error: "Order item not found" }` |
| Order không tồn tại | `{ success: false, error: "Order not found" }` |
| Invalid UUID format | GraphQL validation error |
| Quantity <= 0 | GraphQL validation error (Min: 1) |
| UnitPrice < 0 | GraphQL validation error (Min: 0) |
| Optimistic locking conflict | `{ success: false, error: "Record was modified by another user" }` |
| Order đã COMPLETED | `{ success: false, error: "Cannot modify completed order" }` |

---

## 6. Authorization Notes

> Resolver sử dụng `JwtAuthGuard` và `WorkspaceAuthGuard`

**Guards:**
- `JwtAuthGuard`: Kiểm tra JWT token hợp lệ
- `WorkspaceAuthGuard`: Kiểm tra workspace access

**Không có `@RequireDepartment` decorator** - mutations có thể được gọi bởi bất kỳ authenticated user nào có workspace access.

---

## 7. Database Verification Queries

### Verify Order Item Updated

```sql
SELECT
  id,
  "orderId",
  "productName",
  quantity,
  "unitPrice",
  "totalPrice",
  note,
  "updatedAt"
FROM "mktOrderItem"
WHERE id = '{ORDER_ITEM_ID}';
```

### Verify Order Total Recalculated

```sql
SELECT
  id,
  "orderCode",
  subtotal,
  "totalAmount",
  "updatedAt"
FROM "mktOrder"
WHERE id = '{ORDER_ID}';
```

---

*Tài liệu được tạo tự động bởi Claude Code vào 2026-01-19*
