# Kế hoạch triển khai phân quyền Order Mutation

## 1. Tổng quan

### Mục tiêu
Triển khai phân quyền cho các mutations trong `order-mutation.resolver.ts`:
- **createOrderWithItems & publishDraftOrder**: Chỉ cho phép nhân viên **SALES** và **MANAGER** (bất kỳ phòng ban nào)
- **confirmOrder**: Chỉ cho phép nhân viên phòng **ACCOUNTING** (kế toán)
- **updateOrderStatus**: Cho phép **SALES** và **ACCOUNTING** cùng với **MANAGER**
- **refundOrder**: Chỉ cho phép nhân viên phòng **ACCOUNTING** (liên quan tài chính)

### Yêu cầu nghiệp vụ
| Mutation | Phòng ban được phép | Cấp bậc được phép | Ghi chú |
|----------|---------------------|-------------------|---------|
| `createOrderWithItems` | SALES | Tất cả levels + Manager (≤7) | Tạo đơn hàng mới |
| `publishDraftOrder` | SALES | Tất cả levels + Manager (≤7) | Publish draft → pending |
| `confirmOrder` | ACCOUNTING | Tất cả levels trong ACCOUNTING | Xác nhận thanh toán thành công |
| `updateOrderStatus` | SALES, ACCOUNTING | Tất cả levels + Manager (≤7) | Cập nhật trạng thái đơn hàng |
| `refundOrder` | ACCOUNTING | Tất cả levels trong ACCOUNTING | Hoàn tiền (nghiệp vụ tài chính) |

---

## 2. Phân tích hiện trạng

### 2.1. Cấu trúc phòng ban (mkt-department.constant.ts)
```typescript
// Level 1 Departments
DEPARTMENT = {
  SALES: 'SALES',           // Nhân viên kinh doanh
  SUPPORT: 'SUPPORT',       // Bộ phận hỗ trợ
  ACCOUNTING: 'ACCOUNTING', // Phòng kế toán
  HR: 'HR',                 // Phòng nhân sự
  TECH: 'TECH',             // Phòng công nghệ
}

// Level 2 Teams (thuộc SALES)
TEAM = {
  SALES_DOMESTIC,
  SALES_INTERNATIONAL,
  SALES_PARTNER,
  SALES_ONLINE,
}

// Level 2 Teams (thuộc ACCOUNTING)
TEAM = {
  ACCOUNTING_PAYABLE,
  ACCOUNTING_RECEIVABLE,
  ACCOUNTING_AUDIT,
  ACCOUNTING_TAX,
}
```

### 2.2. Cấp bậc (HierarchyLevel)
```typescript
enum HierarchyLevel {
  CEO = 1,
  C_LEVEL = 2,
  VP = 3,
  SENIOR_DIRECTOR = 4,
  DIRECTOR = 5,
  SENIOR_MANAGER = 6,
  MANAGER = 7,          // <= 7 có thể quản lý team
  SENIOR_SPECIALIST = 8,
  SPECIALIST = 9,
  JUNIOR_SPECIALIST = 10,
  INTERN = 11,
}
```

### 2.3. RbacContextService
Service này đã cung cấp thông tin user context bao gồm:
- `departmentCode`: Mã phòng ban (SALES, ACCOUNTING, etc.)
- `hierarchyLevel`: Cấp bậc trong tổ chức
- `isManager`: User có phải manager không
- `departmentAncestorIds`: Danh sách ID phòng ban cha

---

## 3. Thiết kế giải pháp

### 3.1. Tạo Guard mới: DepartmentAuthorizationGuard

Tạo guard cho phép kiểm tra phân quyền dựa trên department và hierarchy level.

**File:** `mkt-core/mkt-rbac-enterprise-grade/guards/department-authorization.guard.ts`

```typescript
// Metadata key
const DEPARTMENT_AUTH_KEY = 'department_authorization';

// Metadata type
type DepartmentAuthMetadata = {
  // Cho phép các phòng ban này (kiểm tra trực tiếp và qua ancestors)
  allowedDepartments?: string[];
  // Cho phép managers (hierarchyLevel <= 7) từ bất kỳ phòng ban
  allowManagers?: boolean;
  // Cho phép C-Level và executives (hierarchyLevel <= 3)
  allowExecutives?: boolean;
  // Custom message khi bị từ chối
  deniedMessage?: string;
};
```

### 3.2. Tạo Decorator: @RequireDepartment

**File:** `mkt-core/mkt-rbac-enterprise-grade/decorators/require-department.decorator.ts`

```typescript
@RequireDepartment({
  allowedDepartments: ['SALES'],
  allowManagers: true,
})
// hoặc
@RequireDepartment({
  allowedDepartments: ['ACCOUNTING']
})
```

### 3.3. Logic kiểm tra

```
User Request
     │
     ▼
┌─────────────────────────────────────────┐
│ DepartmentAuthorizationGuard            │
├─────────────────────────────────────────┤
│ 1. Lấy user context từ RbacContextService│
│ 2. Kiểm tra:                            │
│    a. allowExecutives? (level <= 3)     │
│    b. allowManagers? (level <= 7)       │
│    c. allowedDepartments?               │
│       - departmentCode IN allowed       │
│       - OR ancestors chứa allowed dept  │
│ 3. Nếu pass → cho phép                  │
│    Nếu fail → ForbiddenException        │
└─────────────────────────────────────────┘
```

---

## 4. Các bước triển khai

### Bước 1: Tạo constants cho Order Authorization
**File:** `mkt-core/order/constants/order-authorization.constants.ts`

```typescript
export const ORDER_AUTHORIZATION = {
  // Tạo đơn hàng: SALES + Manager + Executives
  CREATE_ORDER: {
    allowedDepartments: ['SALES'],
    allowManagers: true,
    allowExecutives: true,
  },
  // Publish draft: SALES + Manager + Executives
  PUBLISH_DRAFT: {
    allowedDepartments: ['SALES'],
    allowManagers: true,
    allowExecutives: true,
  },
  // Xác nhận thanh toán: Chỉ ACCOUNTING + Executives
  CONFIRM_ORDER: {
    allowedDepartments: ['ACCOUNTING'],
    allowExecutives: true,
  },
  // Cập nhật trạng thái: SALES + ACCOUNTING + Manager + Executives
  UPDATE_STATUS: {
    allowedDepartments: ['SALES', 'ACCOUNTING'],
    allowManagers: true,
    allowExecutives: true,
  },
  // Hoàn tiền: Chỉ ACCOUNTING + Executives (nghiệp vụ tài chính)
  REFUND_ORDER: {
    allowedDepartments: ['ACCOUNTING'],
    allowExecutives: true,
  },
} as const;
```

### Bước 2: Tạo Department Authorization Guard
**File:** `mkt-core/mkt-rbac-enterprise-grade/guards/department-authorization.guard.ts`

Logic:
1. Extract userId và workspaceId từ request context
2. Gọi `RbacContextService.resolveContext()` để lấy user context
3. Kiểm tra authorization theo metadata
4. Throw ForbiddenException nếu không đủ quyền

### Bước 3: Tạo Decorator @RequireDepartment
**File:** `mkt-core/mkt-rbac-enterprise-grade/decorators/require-department.decorator.ts`

```typescript
export const RequireDepartment = (
  options: DepartmentAuthOptions
): MethodDecorator => {
  return applyDecorators(
    SetMetadata(DEPARTMENT_AUTH_KEY, options),
    UseGuards(DepartmentAuthorizationGuard),
  );
};
```

### Bước 4: Áp dụng vào Order Mutation Resolver
**File:** `mkt-core/order/resolvers/order-mutation.resolver.ts`

```typescript
// createOrderWithItems
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
@RequireDepartment({
  allowedDepartments: [DEPARTMENT.SALES],
  allowManagers: true,
  allowExecutives: true,
})
@Mutation(() => CreateOrderResponseDto)
async createOrderWithItems(...) {}

// publishDraftOrder
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
@RequireDepartment({
  allowedDepartments: [DEPARTMENT.SALES],
  allowManagers: true,
  allowExecutives: true,
})
@Mutation(() => PublishDraftOrderResponseDto)
async publishDraftOrder(...) {}

// confirmOrder
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
@RequireDepartment({
  allowedDepartments: [DEPARTMENT.ACCOUNTING],
  allowExecutives: true,
})
@Mutation(() => ConfirmOrderResponseDto)
async confirmOrder(...) {}

// updateOrderStatus
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
@RequireDepartment({
  allowedDepartments: [DEPARTMENT.SALES, DEPARTMENT.ACCOUNTING],
  allowManagers: true,
  allowExecutives: true,
})
@Mutation(() => UpdateOrderStatusResponseDto)
async updateOrderStatus(...) {}

// refundOrder
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
@RequireDepartment({
  allowedDepartments: [DEPARTMENT.ACCOUNTING],
  allowExecutives: true,
})
@Mutation(() => RefundOrderResponseDto)
async refundOrder(...) {}
```

### Bước 5: Register Guard và Dependencies
**File:** `mkt-core/mkt-rbac-enterprise-grade/mkt-rbac-enterprise-grade.module.ts`

Thêm `DepartmentAuthorizationGuard` vào providers.

### Bước 6: Export từ Module
Cập nhật barrel exports.

---

## 5. File cần tạo/sửa

### Files mới:
| File | Mô tả |
|------|-------|
| `mkt-rbac-enterprise-grade/guards/department-authorization.guard.ts` | Guard kiểm tra department |
| `mkt-rbac-enterprise-grade/decorators/require-department.decorator.ts` | Decorator @RequireDepartment |
| `mkt-rbac-enterprise-grade/types/department-authorization.types.ts` | Types cho department auth |
| `order/constants/order-authorization.constants.ts` | Constants cho order authorization |

### Files cần sửa:
| File | Thay đổi |
|------|----------|
| `order/resolvers/order-mutation.resolver.ts` | Thêm @RequireDepartment decorators |
| `mkt-rbac-enterprise-grade/mkt-rbac-enterprise-grade.module.ts` | Register guard |
| `mkt-rbac-enterprise-grade/decorators/index.ts` | Export decorator |
| `mkt-rbac-enterprise-grade/guards/index.ts` | Export guard |

---

## 6. Testing

### 6.1. Unit Tests
- Test DepartmentAuthorizationGuard với các cases:

**createOrderWithItems / publishDraftOrder:**
  - User SALES có thể tạo order ✓
  - User ACCOUNTING không thể tạo order ✗
  - Manager (TECH) có thể tạo order ✓
  - CEO/VP có thể tạo order ✓

**confirmOrder:**
  - User ACCOUNTING có thể confirm order ✓
  - User SALES không thể confirm order ✗
  - Manager (TECH) không thể confirm order ✗
  - CEO/VP có thể confirm order ✓

**updateOrderStatus:**
  - User SALES có thể update status ✓
  - User ACCOUNTING có thể update status ✓
  - User HR không thể update status ✗
  - Manager (TECH) có thể update status ✓
  - CEO/VP có thể update status ✓

**refundOrder:**
  - User ACCOUNTING có thể refund ✓
  - User SALES không thể refund ✗
  - Manager (TECH) không thể refund ✗
  - CEO/VP có thể refund ✓

### 6.2. Integration Tests
- Test qua GraphQL mutations thực tế

---

## 7. Rủi ro và giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|------------|
| User không có department | Fallback: chỉ cho phép nếu là executive |
| Circular dependency | Sử dụng forwardRef nếu cần |
| Performance (query DB mỗi request) | Đã có caching trong RbacContextService |

---

## 8. Rollback Plan

Nếu cần rollback:
1. Remove `@RequireDepartment` decorators từ resolver
2. Giữ lại guard/decorator files (không ảnh hưởng)
3. Hệ thống trở về trạng thái chỉ check authentication

---

## 9. Timeline ước tính

| Bước | Thời gian |
|------|-----------|
| Bước 1-3: Tạo guard, decorator, types | 30 phút |
| Bước 4: Áp dụng vào resolver | 15 phút |
| Bước 5-6: Module integration | 15 phút |
| Testing & Debug | 30 phút |
| **Tổng** | **~1.5 giờ** |

---

## 10. Kết luận

Phương án sử dụng custom decorator `@RequireDepartment` với `DepartmentAuthorizationGuard` cho phép:
- Tái sử dụng cho các resolver khác
- Dễ maintain và extend
- Tích hợp với hệ thống RBAC hiện có
- Không ảnh hưởng đến các authorization khác đang hoạt động
