# Hướng dẫn Test Optimistic Locking cho Order

## Mục đích

Test tính năng Optimistic Locking khi nhiều user cùng edit một Order.

## Chuẩn bị

### GraphQL Endpoint
```
POST http://localhost:3000/graphql
```

### Headers
```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY4OTY4Mzg1LCJleHAiOjE3NzY3NDQzODV9.7ESiPDzNFjsuwYgASfKIZjuEV36R3ylc2cXP7h9hUxY",
  "Content-Type": "application/json"
}
```

### Sample Order IDs (từ database)
| Order ID | Name | Current Version |
|----------|------|-----------------|
| `09f33908-d459-44c3-999e-97f42faf6d30` | Đơn hàng MKT Viral Package | 1 |
| `0200e865-6bb2-4645-904c-1ee9fc021c1e` | Đơn hàng MKT UID Package | 1 |
| `d4a05376-ec12-4f11-92d9-cd5722d70c0b` | Đơn hàng MKT Insta Package | 1 |

---

## Test Case 1: Update thành công (Single User)

**Mục đích**: Verify update hoạt động khi không có conflict.

### Request
```graphql
mutation UpdateOrderWithVersion {
  updateOrderWithVersion(input: {
    orderId: "09f33908-d459-44c3-999e-97f42faf6d30"
    expectedVersion: 1
    data: {
      name: "Đơn hàng đã cập nhật - User A"
      note: "Ghi chú mới từ User A"
    }
  }) {
    success
    newVersion
    error
    conflict {
      currentVersion
      modifiedAt
      conflicts {
        field
        yourValue
        currentValue
      }
    }
    currentData
  }
}
```

### Expected Response
```json
{
  "data": {
    "updateOrderWithVersion": {
      "success": true,
      "newVersion": 2,
      "error": null,
      "conflict": null,
      "currentData": null
    }
  }
}
```

### cURL
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY4OTY4Mzg1LCJleHAiOjE3NzY3NDQzODV9.7ESiPDzNFjsuwYgASfKIZjuEV36R3ylc2cXP7h9hUxY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { updateOrderWithVersion(input: { orderId: \"09f33908-d459-44c3-999e-97f42faf6d30\", expectedVersion: 1, data: { name: \"Đơn hàng đã cập nhật - User A\", note: \"Ghi chú mới\" } }) { success newVersion error } }"
  }'
```

---

## Test Case 2: Conflict Detection (Two Users)

**Mục đích**: Test khi 2 user cùng edit một Order và xảy ra conflict.

### Scenario
```
Timeline:
─────────────────────────────────────────────────────
T1: User A đọc Order (version = 1)
T2: User B đọc Order (version = 1)
T3: User A save thành công → version = 2
T4: User B save với version = 1 → CONFLICT!
─────────────────────────────────────────────────────
```

### Step 1: Reset version về 1 (nếu cần)
```sql
UPDATE "workspace_1wgvd1injqtife6y4rvfbu3h5"."mktOrder"
SET version = 1
WHERE id = '0200e865-6bb2-4645-904c-1ee9fc021c1e';
```

### Step 2: User A update thành công
```graphql
mutation UserA_Update {
  updateOrderWithVersion(input: {
    orderId: "0200e865-6bb2-4645-904c-1ee9fc021c1e"
    expectedVersion: 1
    data: {
      name: "User A - Tên mới"
      note: "User A - Ghi chú"
    }
  }) {
    success
    newVersion
    error
  }
}
```

**Expected**: `success: true, newVersion: 2`

### Step 3: User B update với version cũ (CONFLICT)
```graphql
mutation UserB_Update_Conflict {
  updateOrderWithVersion(input: {
    orderId: "0200e865-6bb2-4645-904c-1ee9fc021c1e"
    expectedVersion: 1
    data: {
      name: "User B - Tên khác"
      note: "User B - Ghi chú khác"
    }
  }) {
    success
    newVersion
    error
    conflict {
      currentVersion
      modifiedAt
      conflicts {
        field
        yourValue
        currentValue
      }
    }
    currentData
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "updateOrderWithVersion": {
      "success": false,
      "newVersion": null,
      "error": "Version conflict. Entity was modified by another user.",
      "conflict": {
        "currentVersion": 2,
        "modifiedAt": "2026-01-22T10:30:00.000Z",
        "conflicts": [
          {
            "field": "name",
            "yourValue": "User B - Tên khác",
            "currentValue": "User A - Tên mới"
          },
          {
            "field": "note",
            "yourValue": "User B - Ghi chú khác",
            "currentValue": "User A - Ghi chú"
          }
        ]
      },
      "currentData": {
        "id": "0200e865-6bb2-4645-904c-1ee9fc021c1e",
        "name": "User A - Tên mới",
        "note": "User A - Ghi chú",
        "version": 2,
        "updatedAt": "2026-01-22T10:30:00.000Z"
      }
    }
  }
}
```

---

## Test Case 3: Resolve Conflict (Force Update)

**Mục đích**: Test việc resolve conflict bằng cách force update với currentVersion từ conflict response.

### Sau khi nhận conflict, User B quyết định giữ changes của mình

```graphql
mutation UserB_ResolveConflict {
  resolveOrderConflict(input: {
    orderId: "0200e865-6bb2-4645-904c-1ee9fc021c1e"
    currentVersion: 2
    data: {
      name: "User B - Tên cuối cùng"
      note: "User B - Đã merge với User A"
    }
  }) {
    success
    newVersion
    error
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "resolveOrderConflict": {
      "success": true,
      "newVersion": 3,
      "error": null
    }
  }
}
```

---

## Test Case 4: Invalid Version

**Mục đích**: Test validation khi expectedVersion không hợp lệ.

### Request với expectedVersion = 0
```graphql
mutation InvalidVersion {
  updateOrderWithVersion(input: {
    orderId: "09f33908-d459-44c3-999e-97f42faf6d30"
    expectedVersion: 0
    data: {
      name: "Test"
    }
  }) {
    success
    error
  }
}
```

**Expected**: Validation error (expectedVersion phải >= 1)

---

## Test Case 5: Order Not Found

**Mục đích**: Test khi Order ID không tồn tại.

```graphql
mutation OrderNotFound {
  updateOrderWithVersion(input: {
    orderId: "00000000-0000-0000-0000-000000000000"
    expectedVersion: 1
    data: {
      name: "Test"
    }
  }) {
    success
    error
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "updateOrderWithVersion": {
      "success": false,
      "error": "Entity not found."
    }
  }
}
```

---

## Test Case 6: Concurrent Requests (Race Condition)

**Mục đích**: Test nhiều requests đồng thời với cùng version.

### Sử dụng script để gửi parallel requests

```bash
#!/bin/bash

ORDER_ID="d4a05376-ec12-4f11-92d9-cd5722d70c0b"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY4OTY4Mzg1LCJleHAiOjE3NzY3NDQzODV9.7ESiPDzNFjsuwYgASfKIZjuEV36R3ylc2cXP7h9hUxY"

# Function để gửi update request
send_update() {
  local user=$1
  curl -s -X POST http://localhost:3000/graphql \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"mutation { updateOrderWithVersion(input: { orderId: \\\"$ORDER_ID\\\", expectedVersion: 1, data: { name: \\\"Update từ $user\\\" } }) { success newVersion error } }\"
    }"
  echo ""
}

# Reset version
psql -U postgres -d default -c "UPDATE \"workspace_1wgvd1injqtife6y4rvfbu3h5\".\"mktOrder\" SET version = 1 WHERE id = '$ORDER_ID';"

# Gửi 5 requests đồng thời
for i in {1..5}; do
  send_update "User$i" &
done

wait
echo "Done!"
```

**Expected**: Chỉ 1 request success, 4 requests còn lại nhận conflict.

---

## Test bằng Postman

### Import Collection

1. Mở Postman
2. Import collection từ JSON:

```json
{
  "info": {
    "name": "Order Optimistic Locking Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "token",
      "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ1c2VySWQiOiIyMDIwMjAyMC05ZTNiLTQ2ZDQtYTU1Ni04OGI5ZGRjMmIwMzQiLCJ3b3Jrc3BhY2VJZCI6IjIwMjAyMDIwLTFjMjUtNGQwMi1iZjI1LTZhZWNjZjdlYTQxOSIsIndvcmtzcGFjZU1lbWJlcklkIjoiMjAyMDIwMjAtMDY4Ny00YzQxLWI3MDctZWQxYmZjYTk3MmE3IiwidXNlcldvcmtzcGFjZUlkIjoiMjAyMDIwMjAtOWUzYi00NmQ0LWE1NTYtODhiOWRkYzJiMDM1IiwidHlwZSI6IkFDQ0VTUyIsImF1dGhQcm92aWRlciI6InBhc3N3b3JkIiwiaWF0IjoxNzY4OTY4Mzg1LCJleHAiOjE3NzY3NDQzODV9.7ESiPDzNFjsuwYgASfKIZjuEV36R3ylc2cXP7h9hUxY"
    },
    {
      "key": "orderId",
      "value": "09f33908-d459-44c3-999e-97f42faf6d30"
    }
  ],
  "item": [
    {
      "name": "1. Update Order Success",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": "{{baseUrl}}/graphql",
        "body": {
          "mode": "graphql",
          "graphql": {
            "query": "mutation { updateOrderWithVersion(input: { orderId: \"{{orderId}}\", expectedVersion: 1, data: { name: \"Updated Name\" } }) { success newVersion error } }"
          }
        }
      }
    },
    {
      "name": "2. Update Order Conflict",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": "{{baseUrl}}/graphql",
        "body": {
          "mode": "graphql",
          "graphql": {
            "query": "mutation { updateOrderWithVersion(input: { orderId: \"{{orderId}}\", expectedVersion: 1, data: { name: \"Conflicting Name\" } }) { success newVersion error conflict { currentVersion conflicts { field yourValue currentValue } } currentData } }"
          }
        }
      }
    },
    {
      "name": "3. Resolve Conflict",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": "{{baseUrl}}/graphql",
        "body": {
          "mode": "graphql",
          "graphql": {
            "query": "mutation { resolveOrderConflict(input: { orderId: \"{{orderId}}\", currentVersion: 2, data: { name: \"Resolved Name\" } }) { success newVersion error } }"
          }
        }
      }
    }
  ]
}
```

---

## Editable Fields

Các fields có thể update qua optimistic locking:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Tên đơn hàng |
| `note` | string | Ghi chú |
| `currency` | string | Loại tiền tệ |
| `discount` | number | Số tiền giảm giá |
| `discountPercent` | number | % giảm giá |
| `requireContract` | boolean | Yêu cầu hợp đồng |
| `mktCustomerId` | string | ID khách hàng |
| `mktContractId` | string | ID hợp đồng |
| `couponCode` | string | Mã coupon |
| `paymentDeadline` | datetime | Hạn thanh toán |
| `paymentDeadlineSource` | string | Nguồn deadline |
| `metadata` | json | Metadata |

**Note**: Status changes KHÔNG đi qua optimistic locking, sử dụng mutation `updateOrderStatus` riêng.

---

## Verify trong Database

```sql
-- Check version của order
SELECT id, name, version, "updatedAt"
FROM "workspace_1wgvd1injqtife6y4rvfbu3h5"."mktOrder"
WHERE id = '09f33908-d459-44c3-999e-97f42faf6d30';

-- Reset version cho testing
UPDATE "workspace_1wgvd1injqtife6y4rvfbu3h5"."mktOrder"
SET version = 1
WHERE id = '09f33908-d459-44c3-999e-97f42faf6d30';
```

---

## Troubleshooting

### 1. Mutation không xuất hiện trong GraphQL schema
- Chạy `npx nx run twenty-server:command -- workspace:sync-metadata`
- Restart server

### 2. Version không tăng
- Check logs của `OrderConcurrency`
- Verify expectedVersion matches database version

### 3. Không nhận được conflict info
- Verify order tồn tại
- Check field names trong EDITABLE_ORDER_FIELDS

---

## Summary Checklist

- [ ] Test Case 1: Single user update success
- [ ] Test Case 2: Two users conflict detection
- [ ] Test Case 3: Resolve conflict với force update
- [ ] Test Case 4: Invalid version validation
- [ ] Test Case 5: Order not found
- [ ] Test Case 6: Race condition với parallel requests
