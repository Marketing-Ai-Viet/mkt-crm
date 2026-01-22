# Review module `mkt-core/order`

> Scope: `packages/twenty-server/src/mkt-core/order/**`

## 1) Tổng quan kiến trúc
Module `order` được tổ chức khá rõ theo layer:

- **GraphQL Resolvers** (ví dụ `resolvers/order-mutation.resolver.ts`): authz + map DTO → domain input, không chứa business logic.
- **Application/Facade**: `services/application/order-orchestration.service.ts` điều phối validation + gọi saga phù hợp.
- **Saga/Steps**:
  - Create flow: `orchestration/saga/create-order.saga.ts` + các steps (`create-order`, `create-snapshots`, `create-order-items`, `calculate-promotion`, `create-licenses`, `create-payment`, `finalize-order`).
  - Confirm flow: `orchestration/saga/confirm-order.saga.ts` dùng `BaseSaga` (savepoint + timeout + compensate retry) + steps chuyên biệt (validate, transition, deadline, status, create licenses, schedule reminders, complete).
  - Update/Refund: `update-order.saga.ts`, `refund-order.saga.ts` (logic “saga nhẹ” – không dùng `BaseSaga`).
- **Core services**: tính toán/validate/state (`order-calculation`, `order-validation`, `order-status`, `payment-deadline`, `order-lock`, ...).
- **Repositories**: `MktOrderRepository`, `MktOrderItemRepository`, `MktOrderHistoryRepository` dựa trên `BaseWorkspaceRepository`.
- **Integration services**: bridge sang modules khác (promotion/product/license/combo).

Nhìn chung module có định hướng tốt: orchestration tách khỏi domain services; các steps làm việc tương đối “1 nhiệm vụ/step”.

## 2) Luồng chính (high-level)

### 2.1 Create order (createOrderWithItems)
Entry:
- `OrderMutationResolver.createOrderWithItems` → `OrderOrchestrationService.createOrderWithItems` → `CreateOrderSaga.execute`

Steps (theo comment trong `create-order.saga.ts`):
1. CreateOrderStep
2. CreateSnapshotsStep
3. CreateOrderItemsStep
4. CalculatePromotionStep
5. CreateLicensesStep
6. CreatePaymentStep
7. FinalizeOrderStep

### 2.2 Publish draft order (publishDraftOrder)
Entry:
- `OrderMutationResolver.publishDraftOrder` → `OrderOrchestrationService.publishDraftOrder`

Đây là flow “không đi qua saga create-order”; thực hiện tạo payment/QR, update status, schedule overdue check (tùy config).

### 2.3 Confirm / New Payment Flow
Entry:
- `OrderMutationResolver.confirmOrder` → `OrderOrchestrationService.confirmOrder` → `ConfirmOrderSaga.execute`
- Ngoài ra có nhóm mutation cho “new payment flow”: `confirmOrderWithLicense`, `confirmOrderPayment`, `unlockOrder`, ...

Doc liên quan:
- `order/docs/payment-flow-refactor-implementation.md` (mô tả DRAFT → CONFIRMED → PROCESSING → COMPLETED/LOCKED, deadline & reminders).

### 2.4 Update / Refund
- `updateOrderStatus` và `refundOrder` đi qua `UpdateOrderSaga` / `RefundOrderSaga`.

## 3) Điểm tốt (giữ lại)

1) **Layering và naming** tương đối rõ ràng (resolver → orchestration → saga → step → service/repo).
2) `ConfirmOrderSaga` dùng `BaseSaga` có:
   - savepoint per-step
   - timeout per-step
   - compensate retry (exponential backoff)
   → đây là pattern tốt và nên được chuẩn hoá cho các saga khác.
3) Dùng utility chuẩn hoá (`MoneyUtils`, `DateTimeUtils`, `safeJsonStringify`) khá nhất quán.
4) Module wiring trong `mkt-order.module.ts` tương đối đầy đủ (jobs/listeners/config/integrations).

## 4) Findings / vấn đề (ưu tiên theo rủi ro)

### P0 — Promotion calculation có nguy cơ luôn nhận `orderItems=[]`

- `CalculatePromotionStep.buildOrderItemsForPromotion()` đọc `context.metadata.get('orderItems')` và return `[]` nếu không có.
- Nhưng `CreateOrderItemsStep` **không set** `context.metadata.set('orderItems', ...)` (hiện chỉ set `totalAmount`, `comboDiscount`, `appliedCombos`, ...).

Hệ quả:
- Promotions theo product/quantity gần như không chạy đúng (vì evaluation context thiếu items).
- Dễ dẫn tới “tưởng promotion không hoạt động” hoặc discount sai.

File refs:
- `order/orchestration/steps/calculate-promotion.step.ts` (đọc `metadata.orderItems`, `metadata.totalAmount`)
- `order/orchestration/steps/create-order-items.step.ts` (hiện set `metadata.totalAmount` nhưng không set `orderItems`)

### P0 — Mismatch về ý nghĩa `subtotal` vs `totalAmount` vs “orderSubtotal”

- `CalculatePromotionStep` đặt biến `orderSubtotal` nhưng lấy từ `metadata.get('totalAmount')`.
- `CreateOrderItemsStep` update DB fields `subtotal`, `tax`, `discount`, `totalAmount` rồi set `metadata.totalAmount`.

Rủi ro:
- Nhầm lẫn thuật ngữ làm “tính discount trên base nào” khó đảm bảo đúng (đặc biệt khi có comboDiscount/tax/discount khác).
- Sau bước promotion, `totalAmount` bị giảm bởi promotionDiscount, nhưng downstream steps có thể hiểu `totalAmount` là “pre-promotion total”.

### P0 — Saga mở transaction nhưng repository operations không gắn `QueryRunner`

- `CreateOrderSaga` (và `BaseSaga`) tạo `queryRunner`, `startTransaction`, `SAVEPOINT/ROLLBACK TO SAVEPOINT`.
- Tuy nhiên trong steps có nhiều đoạn comment kiểu: `Use repository for update - queryRunner.manager doesn't have workspace entity metadata` và thực tế gọi `orderRepository.updateOrder(...)`, `orderItemRepository.createManyOrderItems(...)`.
- Các repositories hiện dùng `getRepository()` (workspace repository) và **không nhận `queryRunner`**.

Hệ quả:
- Transaction trong saga có thể **không bao bọc** các thao tác DB quan trọng → atomicity không như kỳ vọng.
- Savepoints “có vẻ” rollback nhưng thực tế không rollback được các update/insert đã chạy ngoài transaction.

Điểm cần làm rõ: nếu chủ trương là “compensate là cơ chế rollback chính”, thì transaction ở saga chỉ tạo cảm giác an toàn giả.

### P1 — `CreateOrderSaga` chưa dùng `BaseSaga` (framework không thống nhất)

- `ConfirmOrderSaga` dùng `BaseSaga` (có timeout + compensate retry + response chuẩn).
- `CreateOrderSaga` tự implement gần giống nhưng không có timeout wrapper, không có compensate retry, kết quả response khác shape.

Hệ quả:
- Khó bảo trì, khó đồng bộ behaviour/error handling.
- Sẽ phát sinh bug “saga A có retry, saga B không có”.

### P1 — Idempotency cho create order đang bị disable bằng comment

Trong `OrderOrchestrationService.createOrderWithItems` có TODO/comment “Re-enable idempotency after testing” và đang chạy direct.

Rủi ro:
- User double-click / retry network có thể tạo đơn trùng.
- Nhất là khi create flow có side-effect (license/payment/promotions usage).

### P1 — Promotion usage rollback đang là placeholder

- `OrderPromotionIntegrationService.rollbackUsage()` chỉ log warning và trả success (chưa implement).

Rủi ro:
- Nếu đã record usage mà sau đó order bị cancel/refund, hệ thống có thể thiếu cơ chế reconcile usage.

### P2 — Metadata Map (string → unknown) gây “ẩn coupling” giữa steps

- `SagaContext.metadata: Map<string, unknown>` đang chứa rất nhiều key string rời rạc.
- Confirm flow đã có hướng tốt hơn: `ConfirmOrderSagaContext` typed.

Rủi ro:
- Step A đổi key, step B fail silent (nhận undefined rồi rẽ nhánh sai).
- Khó search/trace luồng dữ liệu.

## 5) Đề xuất cải thiện (nhỏ trước, rủi ro thấp)

### (A) Fix P0: đảm bảo promotion có `orderItems`
2 cách, ưu tiên A1 vì thay đổi nhỏ:

**A1 (quick win): set metadata `orderItems` ngay sau khi tạo items**
- Trong `CreateOrderItemsStep` (sau `savedOrderItems`), set:
  - `context.metadata.set('orderItems', savedOrderItems)` hoặc map ra shape nhẹ chỉ giữ fields cần cho promotion (productId/packageId/qty/unitPrice/totalPrice).

**A2 (robust): CalculatePromotionStep fallback load từ DB**
- Nếu `metadata.orderItems` không có → `orderItemRepository.findByOrderId(context.orderId)` để build items.
- Ưu điểm: giảm coupling step-to-step và resilient với future refactor.

### (B) Fix P0: chuẩn hoá khái niệm amount keys
- Đổi tên `orderSubtotal` trong `CalculatePromotionStep` nếu thực chất đang dùng `totalAmount` (post-tax/post-combo).
- Lưu cả 2 giá trị vào metadata (và dùng const keys):
  - `subtotal` (pre-tax)
  - `tax`
  - `totalBeforePromotion` (post-tax/post-combo, pre-promotion)
  - `totalAfterPromotion`

Tối thiểu: đổi comment/variable naming để tránh hiểu sai.

### (C) Fix P0: làm rõ chiến lược transaction
Chọn 1 trong 2 hướng (cần quyết định team vì impact lớn):

**C1 — Thực sự dùng transaction**
- Cần cơ chế lấy workspace repository “bound” vào `queryRunner.manager`.
- Ví dụ (ý tưởng): `BaseWorkspaceRepository.getRepository({ queryRunner })` hoặc `getRepositoryFromManager(manager)`.
- Sau đó, tất cả create/update/delete trong steps phải đi qua repository dùng chung queryRunner.

**C2 — Thừa nhận không transaction, rely on compensate**
- Nếu workspace repo không thể bind queryRunner, cân nhắc:
  - bỏ `startTransaction/savepoint` để tránh false sense of safety
  - hoặc giữ nhưng document rõ ràng “transaction only for non-workspace tables” (nếu có).

### (D) Chuẩn hoá saga framework
- Refactor `CreateOrderSaga` sang extend `BaseSaga` để có:
  - timeout per-step
  - compensate retry
  - response shape chuẩn
- Đồng thời tạo `CreateOrderSagaContext` typed (tương tự confirm).

### (E) Re-enable idempotency cho create-order
- Bật lại `IdempotencyService.executeWithIdempotency` (đang comment).
- Ensure request key đủ phân biệt: workspaceId + customerId + action + items + couponCode + payment methods…

### (F) Promotion usage rollback / reconciliation
- Nếu promotion module chưa support rollback:
  - add “reconcile job” / manual admin endpoint
  - hoặc record usage only khi order đạt trạng thái chắc chắn (vd COMPLETED) thay vì ngay khi create.

## 6) Testing checklist (đề xuất)

### Unit tests (nhanh)
- `OrderCalculationService`: totals + combo discount + promotion discount interaction.
- `OrderStateMachine`: transition matrix cho các trạng thái (PROCESSING/LOCKED/COMPLETED, refund states).

### Integration tests (quan trọng)
- Create order có coupon/promotion theo productId/qty → verify discount applied (đặc biệt case trước đây `orderItems=[]`).
- Create order fail ở step N → verify DB state không “bán phần” (nếu chọn C1) hoặc compensate chạy đầy đủ (nếu chọn C2).
- Confirm order (new payment flow): deadline, reminder job scheduling, overdue lock/unlock.

## 7) Kết luận
Module `order` có nền tảng tốt (layering + saga/steps), nhưng hiện có 2 rủi ro lớn cần ưu tiên:
1) promotion evaluation thiếu `orderItems` (logic discount có thể sai);
2) transaction trong saga có khả năng không bao bọc workspace repository operations (atomicity không như kỳ vọng).

Nếu cần, mình có thể triển khai PR nhỏ theo thứ tự: (A1) → (B) → (D) → (E), và thảo luận team để chốt hướng (C1/C2).
