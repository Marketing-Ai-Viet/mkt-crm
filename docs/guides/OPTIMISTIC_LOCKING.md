# Optimistic Locking - Xử lý xung đột khi nhiều người cùng sửa

## Tổng quan

**Optimistic Locking** là cơ chế cho phép nhiều người cùng đọc và sửa dữ liệu, nhưng phát hiện xung đột khi lưu bằng cách so sánh phiên bản dữ liệu.

Trong hệ thống MKT CRM, chúng ta sử dụng **code-based optimistic locking** thay vì database triggers để đảm bảo tính portable và dễ test.

---

## Cơ chế hoạt động

### Nguyên tắc
1. Mỗi record có field `updatedAt` (timestamp)
2. Khi client fetch data, lưu lại `updatedAt`
3. Khi client submit update, gửi kèm `updatedAt` đã lưu
4. Server so sánh `updatedAt` từ client với giá trị hiện tại trong DB
5. Nếu khác nhau → có người khác đã sửa → reject và yêu cầu refresh

### Sequence Diagram

```
┌─────────┐          ┌─────────┐          ┌──────────┐
│ User A  │          │ Server  │          │ User B   │
└────┬────┘          └────┬────┘          └────┬─────┘
     │                    │                    │
     │  GET order         │                    │
     │ ─────────────────> │                    │
     │  {id, updatedAt:T1}│                    │
     │ <───────────────── │                    │
     │                    │                    │
     │                    │   GET order        │
     │                    │ <───────────────── │
     │                    │   {id, updatedAt:T1}
     │                    │ ─────────────────> │
     │                    │                    │
     │                    │  UPDATE (T1)       │
     │                    │ <───────────────── │
     │                    │  ✅ Success        │
     │                    │  updatedAt → T2    │
     │                    │ ─────────────────> │
     │                    │                    │
     │  UPDATE (T1)       │                    │
     │ ─────────────────> │                    │
     │  ❌ Conflict!      │                    │
     │  "Order modified"  │                    │
     │ <───────────────── │                    │
     │                    │                    │
     │  REFRESH & RETRY   │                    │
     │ ─────────────────> │                    │
```

---

## Implementation

### 1. Cấu hình

```typescript
// Environment variable
ORDER_OPTIMISTIC_LOCKING_ENABLED=true  // default: true
```

### 2. Service Layer (OrderItemService)

```typescript
// File: src/mkt-core/order/services/domain/order-item.service.ts

@Injectable()
export class OrderItemService {
  private readonly optimisticLockingEnabled: boolean;

  constructor(private readonly orderItemRepository: MktOrderItemRepository) {
    this.optimisticLockingEnabled =
      process.env.ORDER_OPTIMISTIC_LOCKING_ENABLED !== 'false';
  }

  async validateForUpdate(
    orderItemId: string,
    workspaceId: string,
    input: UpdateOrderItemInput,
  ): Promise<OrderItemValidationResult> {
    const orderItem = await this.orderItemRepository.findByIdWithRelations(
      workspaceId,
      orderItemId,
    );

    // Validate optimistic locking
    if (this.optimisticLockingEnabled && input.updatedAt) {
      const orderUpdatedAt = orderItem.mktOrder.updatedAt;
      
      if (!this.validateUpdatedAt(orderUpdatedAt, input.updatedAt)) {
        return {
          valid: false,
          error: 'Order has been modified. Please refresh and try again.',
        };
      }
    }

    return { valid: true, orderItem };
  }

  private validateUpdatedAt(
    orderUpdatedAt: string,
    inputUpdatedAt: string,
  ): boolean {
    const orderDate = DateTimeUtils.fromISO(orderUpdatedAt);
    const inputDate = DateTimeUtils.fromISO(inputUpdatedAt);
    
    return DateTimeUtils.toMillis(orderDate) === DateTimeUtils.toMillis(inputDate);
  }
}
```

### 3. GraphQL Input

```typescript
// File: src/mkt-core/order/types/order-item.types.ts

export interface UpdateOrderItemInput {
  quantity?: number;
  unitPrice?: number;
  updatedAt?: string;  // ISO timestamp from client
}
```

### 4. Frontend Integration

```typescript
// React component example
const updateOrderItem = async (itemId: string, data: UpdateData) => {
  try {
    await mutation({
      variables: {
        id: itemId,
        data: {
          ...data,
          updatedAt: order.updatedAt, // Pass current updatedAt
        },
      },
    });
  } catch (error) {
    if (error.message.includes('Order has been modified')) {
      // Show conflict dialog
      showConflictDialog({
        onRefresh: () => refetchOrder(),
        onOverwrite: () => updateOrderItem(itemId, { ...data, force: true }),
      });
    }
  }
};
```

---

## Các trường hợp xung đột

### Case 1: Hai người sửa cùng Order Item

| Thời điểm | User A | User B | Database |
|-----------|--------|--------|----------|
| T0 | Fetch order (updatedAt=T0) | Fetch order (updatedAt=T0) | updatedAt=T0 |
| T1 | - | Update item → Success | updatedAt=T1 |
| T2 | Update item → **Conflict** | - | updatedAt=T1 |

**Giải pháp:** User A refresh data và thử lại.

### Case 2: Một người sửa Order, một người sửa Item

| Thời điểm | User A (sửa Order) | User B (sửa Item) | Database |
|-----------|--------------------|--------------------|----------|
| T0 | Fetch order | Fetch order | order.updatedAt=T0 |
| T1 | Update order.note → Success | - | order.updatedAt=T1 |
| T2 | - | Update item.qty → **Conflict** | order.updatedAt=T1 |

**Giải pháp:** Khi Order được update, `updatedAt` thay đổi → Item update sẽ bị reject.

### Case 3: Hai người cùng sửa Order (cùng entity)

```
┌─────────┐          ┌─────────┐          ┌──────────┐
│ User A  │          │ Database│          │ User B   │
└────┬────┘          └────┬────┘          └────┬─────┘
     │                    │                    │
     │  GET order         │   GET order        │
     │ ─────────────────> │ <───────────────── │
     │  updatedAt=T0      │   updatedAt=T0     │
     │ <───────────────── │ ─────────────────> │
     │                    │                    │
     │  [Editing...]      │   [Editing...]     │
     │                    │                    │
     │                    │  UPDATE order      │
     │                    │  (note="B's note") │
     │                    │  updatedAt=T0      │
     │                    │ <───────────────── │
     │                    │  ✅ Success        │
     │                    │  updatedAt → T1    │
     │                    │ ─────────────────> │
     │                    │                    │
     │  UPDATE order      │                    │
     │  (note="A's note") │                    │
     │  updatedAt=T0      │                    │
     │ ─────────────────> │                    │
     │  ❌ CONFLICT!      │                    │
     │  "Order modified"  │                    │
     │ <───────────────── │                    │
     │                    │                    │
     │  [Show dialog]     │                    │
     │  ┌─────────────────────────────────┐   │
     │  │ ⚠️ Dữ liệu đã thay đổi          │   │
     │  │                                 │   │
     │  │ User B vừa cập nhật đơn hàng   │   │
     │  │ này. Bạn muốn:                  │   │
     │  │                                 │   │
     │  │ [Xem thay đổi] [Ghi đè] [Hủy]  │   │
     │  └─────────────────────────────────┘   │
```

| Thời điểm | User A | User B | Database |
|-----------|--------|--------|----------|
| T0 | Fetch order (updatedAt=T0) | Fetch order (updatedAt=T0) | order.updatedAt=T0 |
| T1 | Đang sửa note... | Đang sửa note... | - |
| T2 | - | Update note="B's note" → Success | order.updatedAt=T1 |
| T3 | Update note="A's note" → **Conflict** | - | order.updatedAt=T1 |
| T4 | Refresh → thấy note="B's note" | - | - |
| T5 | Quyết định: merge hoặc ghi đè | - | - |

**Giải pháp cho User A:**

1. **Xem thay đổi mới:** Refresh data, xem User B đã sửa gì
2. **Merge thủ công:** Kết hợp thay đổi của cả 2 người
3. **Ghi đè (Force):** Nếu có quyền admin, ghi đè thay đổi của User B
4. **Hủy:** Bỏ thay đổi của mình

**Code xử lý:**

```typescript
// OrderService - validateForUpdate
async validateOrderUpdate(
  orderId: string,
  workspaceId: string,
  input: UpdateOrderInput,
): Promise<ValidationResult> {
  const order = await this.orderRepository.findById(workspaceId, orderId);
  
  if (!order) {
    return { valid: false, error: 'Order not found' };
  }

  // Optimistic locking check
  if (this.optimisticLockingEnabled && input.updatedAt) {
    const dbUpdatedAt = DateTimeUtils.toMillis(
      DateTimeUtils.fromISO(order.updatedAt as string)
    );
    const inputUpdatedAt = DateTimeUtils.toMillis(
      DateTimeUtils.fromISO(input.updatedAt)
    );

    if (dbUpdatedAt !== inputUpdatedAt) {
      return {
        valid: false,
        error: 'Order has been modified by another user. Please refresh and try again.',
        conflictInfo: {
          currentUpdatedAt: order.updatedAt,
          yourUpdatedAt: input.updatedAt,
          lastModifiedBy: order.updatedBy, // Nếu có track user
        },
      };
    }
  }

  return { valid: true, order };
}
```

**Frontend handling:**

```typescript
// React hook for conflict resolution
const useOptimisticUpdate = () => {
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  const updateOrder = async (orderId: string, data: UpdateOrderData) => {
    try {
      const result = await updateOrderMutation({
        variables: {
          id: orderId,
          data: {
            ...data,
            updatedAt: data.updatedAt, // Current version
          },
        },
      });
      return { success: true, data: result };
    } catch (error) {
      if (isConflictError(error)) {
        // Fetch latest data để show conflict
        const latestOrder = await refetchOrder(orderId);
        
        setConflict({
          yourChanges: data,
          serverData: latestOrder,
          onMerge: (mergedData) => {
            // Retry với merged data và new updatedAt
            updateOrder(orderId, {
              ...mergedData,
              updatedAt: latestOrder.updatedAt,
            });
          },
          onOverwrite: () => {
            // Force update (admin only)
            updateOrder(orderId, { ...data, force: true });
          },
          onCancel: () => setConflict(null),
        });
        
        return { success: false, conflict: true };
      }
      throw error;
    }
  };

  return { updateOrder, conflict, clearConflict: () => setConflict(null) };
};
```

### Case 4: Force Update (bypass locking)

```typescript
// Cho phép admin override
if (input.force && userHasAdminRole) {
  // Skip optimistic locking validation
  return { valid: true, orderItem };
}
```

---

## API Response Codes

| HTTP Code | Message | Nguyên nhân | Hành động |
|-----------|---------|-------------|-----------|
| 200 | Success | Update thành công | - |
| 409 | `Order has been modified. Please refresh and try again.` | Xung đột version | Refresh & retry |
| 400 | `Order item cannot be updated - order status: COMPLETED` | Order đã hoàn thành | Không cho sửa |

---

## Best Practices

### ✅ Nên làm

1. **Luôn gửi `updatedAt` khi update**
   ```typescript
   mutation UpdateOrderItem($id: ID!, $data: UpdateOrderItemInput!) {
     updateOrderItem(id: $id, data: $data) {
       id
       updatedAt  # Fetch new updatedAt after update
     }
   }
   ```

2. **Hiển thị dialog xung đột thân thiện**
   ```
   ┌─────────────────────────────────────────┐
   │  ⚠️ Dữ liệu đã thay đổi                 │
   │                                         │
   │  Đơn hàng này đã được người khác cập    │
   │  nhật. Bạn muốn:                        │
   │                                         │
   │  [Xem thay đổi mới]  [Ghi đè]  [Hủy]   │
   └─────────────────────────────────────────┘
   ```

3. **Refresh data sau mỗi thao tác**
   - Sau khi update thành công, fetch lại data mới nhất
   - Sử dụng WebSocket/polling cho real-time sync

### ❌ Không nên

1. **Bypass locking mà không có lý do**
   - Chỉ admin được force update
   - Log tất cả force updates

2. **Cache data quá lâu**
   - Set reasonable cache TTL
   - Implement cache invalidation

3. **Ignore error messages**
   - Luôn xử lý conflict errors
   - Thông báo user rõ ràng

---

## Monitoring & Debugging

### Log format

```
[OrderItemService] Order item validation passed. Order status: DRAFT
[OrderItemService] Validation error: Order has been modified. Please refresh and try again.
```

### Metrics to track

- Số lần conflict xảy ra
- Thời gian trung bình giữa các conflict
- Users hay gặp conflict nhất

---

## Tắt Optimistic Locking

Trong một số trường hợp development/testing, có thể tắt:

```bash
# .env
ORDER_OPTIMISTIC_LOCKING_ENABLED=false
```

**⚠️ Warning:** Chỉ tắt trong môi trường development. Production phải luôn bật.

---

## Liên quan

- `OrderItemService` - Service xử lý validation
- `DateTimeUtils` - Utility so sánh timestamps
- `UpdateOrderItemInput` - Input type với field `updatedAt`
