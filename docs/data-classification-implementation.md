# Tài liệu Triển khai: Phân loại Dữ liệu cho Toàn Công ty (Data Classification)

> **Ngày tạo**: 2026-02-07
> **Trạng thái**: Chờ phê duyệt
> **Ảnh hưởng**: Module `mkt-rbac-enterprise-grade`, Seeder, Pipeline phân quyền

---

## 1. Bối cảnh & Vấn đề

### Hiện trạng

Hệ thống RBAC hiện tại hoạt động theo nguyên tắc **"Mặc định TỪ CHỐI"** (Default DENY). Người dùng phải được gán template cụ thể mới có quyền truy cập bất kỳ tài nguyên nào.

**Vấn đề**: Không có cơ chế đánh dấu dữ liệu nào là **công khai cho toàn công ty**. Ví dụ:
- Danh mục sản phẩm (PRODUCTS) - ai cũng nên xem được
- Bảng điều khiển chung (DASHBOARD) - ai cũng nên xem được
- Nhưng hiện tại nếu user không có template → không xem được gì

### Mục tiêu

Bổ sung hệ thống **Phân loại Dữ liệu (Data Classification)** với 5 cấp độ, cho phép đánh dấu tài nguyên nào toàn công ty có thể truy cập mà không cần template riêng.

---

## 2. Thiết kế Giải pháp

### 2.1 Năm cấp độ Phân loại Dữ liệu

| Cấp độ | Mô tả | Ai truy cập được | Ví dụ |
|--------|-------|-------------------|-------|
| `PUBLIC` | Công khai toàn công ty | Tất cả nhân viên (có tài khoản) | Danh mục sản phẩm, thông báo chung |
| `INTERNAL` | Nội bộ toàn công ty | Tất cả nhân viên (READ only) | Dashboard tổng quan, báo cáo công khai |
| `CONFIDENTIAL` | Bảo mật theo phòng ban | Chỉ người có template phù hợp | Đơn hàng, khách hàng, hợp đồng |
| `RESTRICTED` | Hạn chế cao | Cần template + phê duyệt | Dữ liệu tài chính, lương, đánh giá |
| `TOP_SECRET` | Tối mật | Chỉ CEO/VP + override cụ thể | Chiến lược kinh doanh, M&A |

### 2.2 Quy tắc Truy cập theo Phân loại

```
┌─────────────────────────────────────────────────────────────────────┐
│  PUBLIC                                                             │
│  → Tất cả user có tài khoản active → READ                          │
│  → Các quyền khác (CUD) vẫn theo template                         │
├─────────────────────────────────────────────────────────────────────┤
│  INTERNAL                                                           │
│  → Tất cả user có tài khoản active → READ                          │
│  → EXPORT cần template có quyền EXPORT                             │
│  → Các quyền khác (CUD) vẫn theo template                         │
├─────────────────────────────────────────────────────────────────────┤
│  CONFIDENTIAL (mặc định hiện tại)                                  │
│  → Hoàn toàn theo template + data access policy                    │
│  → Không thay đổi gì so với hiện tại                               │
├─────────────────────────────────────────────────────────────────────┤
│  RESTRICTED                                                         │
│  → Theo template + bắt buộc audit log                              │
│  → Action rủi ro HIGH/CRITICAL cần phê duyệt                      │
├─────────────────────────────────────────────────────────────────────┤
│  TOP_SECRET                                                         │
│  → Chỉ template CEO/VP (priority >= 900) hoặc override            │
│  → Bắt buộc audit log + MFA                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Phân loại Mặc định cho 12 Resources hiện tại

| Resource | Phân loại hiện tại (đề xuất) | Lý do |
|----------|------------------------------|-------|
| `PRODUCTS` | **PUBLIC** | Danh mục sản phẩm ai cũng cần xem |
| `DASHBOARD` | **INTERNAL** | Bảng điều khiển tổng quan (7 endpoints, xem chi tiết mục 2.4) |
| `REPORTS` | **INTERNAL** | Báo cáo công khai (báo cáo nhạy cảm sẽ dùng policy riêng) |
| `DEPARTMENTS` | **INTERNAL** | Sơ đồ tổ chức ai cũng nên biết |
| `CUSTOMERS` | **CONFIDENTIAL** | Dữ liệu khách hàng cần phân quyền theo ownership |
| `ORDERS` | **CONFIDENTIAL** | Đơn hàng cần phân quyền theo phòng ban/cá nhân |
| `CONTRACTS` | **CONFIDENTIAL** | Hợp đồng cần bảo mật |
| `LICENSES` | **CONFIDENTIAL** | Giấy phép cần phân quyền |
| `INVOICES` | **RESTRICTED** | Dữ liệu tài chính nhạy cảm |
| `PAYMENTS` | **RESTRICTED** | Dữ liệu thanh toán nhạy cảm |
| `USERS` | **RESTRICTED** | Thông tin nhân sự (lương, đánh giá) |
| `SETTINGS` | **TOP_SECRET** | Cấu hình hệ thống, chỉ admin |

### 2.4 Chi tiết Resource `DASHBOARD` - 7 Endpoints

Tất cả endpoints dùng `@DataScope({ resource: 'DASHBOARD', mode: 'AUTO' })` với `auditLevel` khác nhau.

| # | Query | Audit Level | Input Parameters | Mô tả |
|---|-------|-------------|------------------|-------|
| 1 | `dashboardSummary` | `low` | `period`*, `departmentId`, `filters`, `startDate`, `endDate` | Tổng hợp tất cả metrics (revenue, order, customer, KPI, leaderboard, alerts) |
| 2 | `revenueStats` | `medium` | `period`*, `departmentId`, `staffId`, `startDate`, `endDate`, `limit` | Doanh thu theo kỳ, nhân viên, phòng ban. Hỗ trợ so sánh kỳ trước & dự kiến |
| 3 | `orderStats` | `medium` | `period`*, `departmentId`, `startDate`, `endDate`, `topProductsLimit` | Đơn hàng theo trạng thái, xu hướng, top sản phẩm, doanh thu sản phẩm theo kỳ |
| 4 | `customerStats` | `medium` | `period`*, `departmentId`, `startDate`, `endDate`, `topCustomersLimit` | Khách hàng theo tier, tăng trưởng, LTV, churn rate, top khách hàng |
| 5 | `kpiScorecard` | `medium` | `period`*, `departmentId`, `year`, `category` | KPI theo danh mục, chi tiết, xu hướng |
| 6 | `staffLeaderboard` | `medium` | `period`*, `departmentId`, `staffId`, `startDate`, `endDate`, `limit`, `offset` | Bảng xếp hạng nhân viên theo doanh thu, đơn hàng, khách hàng |
| 7 | `dashboardAlerts` | `low` | _(không có input)_ | Cảnh báo: license sắp hết hạn, thanh toán quá hạn, KPI kém |

_(*) `period` là bắt buộc, enum: `TODAY`, `THIS_WEEK`, `THIS_MONTH`, `THIS_QUARTER`, `THIS_YEAR`, `CUSTOM`_

**Khả năng lọc dữ liệu:**

- **`departmentId`**: Lọc theo phòng ban + tất cả team con (tự động resolve hierarchy). Có mặt ở 6/7 endpoints.
- **`staffId`**: Lọc theo nhân viên cụ thể. Chỉ có ở `revenueStats` và `staffLeaderboard`.
- **`period`**: Quyết định khoảng thời gian VÀ độ chi tiết DATE_TRUNC:

| Period | DATE_TRUNC Interval |
|--------|-------------------|
| `TODAY` | `hour` |
| `THIS_WEEK` | `day` |
| `THIS_MONTH` | `week` |
| `THIS_QUARTER` | `month` |
| `THIS_YEAR` | `month` |
| `CUSTOM` | `month` |

**Lưu ý bảo mật**: Dù DASHBOARD được phân loại `INTERNAL` (toàn công ty READ), nhưng khi lọc theo `departmentId` hoặc `staffId`, dữ liệu trả về chỉ thuộc phạm vi được chỉ định. Cần cân nhắc liệu có nên hạn chế `staffId` chỉ cho manager trở lên không.

---

## 3. Chi tiết Triển khai

### 3.1 Thêm trường `dataClassification` vào Entity `MktPermissionResource`

**File cần sửa**: `mkt-core/constants/mkt-field-ids.ts`

Thêm field ID mới vào `MKT_PERMISSION_RESOURCE_FIELD_IDS`:

```typescript
export const MKT_PERMISSION_RESOURCE_FIELD_IDS = {
  // ... các field hiện tại ...

  // data classification (MỚI)
  dataClassification: '<uuid-mới>',
  classificationNote: '<uuid-mới>',
};
```

**File cần sửa**: `mkt-rbac-enterprise-grade/workspace-entities/permission/mkt-permission-resource.workspace-entity.ts`

Thêm 2 trường mới:

```typescript
@WorkspaceField({
  standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.dataClassification,
  type: FieldMetadataType.SELECT,
  label: msg`Data Classification`,
  description: msg`Cấp độ phân loại dữ liệu (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, TOP_SECRET)`,
  icon: 'IconShield',
  options: DATA_CLASSIFICATION_OPTIONS,
  defaultValue: "'CONFIDENTIAL'",
})
dataClassification: string;

@WorkspaceField({
  standardId: MKT_PERMISSION_RESOURCE_FIELD_IDS.classificationNote,
  type: FieldMetadataType.TEXT,
  label: msg`Classification Note`,
  description: msg`Ghi chú về lý do phân loại`,
  icon: 'IconNote',
})
@WorkspaceIsNullable()
classificationNote?: string;
```

### 3.2 Thêm enum & options cho Data Classification

**File cần sửa**: `mkt-rbac-enterprise-grade/constants/permission-template/options.constants.ts`

```typescript
export enum DATA_CLASSIFICATION {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  TOP_SECRET = 'TOP_SECRET',
}

export const DATA_CLASSIFICATION_OPTIONS = [
  {
    value: DATA_CLASSIFICATION.PUBLIC,
    label: 'Công khai',
    color: 'green' as TagColor,
    position: 0,
  },
  {
    value: DATA_CLASSIFICATION.INTERNAL,
    label: 'Nội bộ',
    color: 'blue' as TagColor,
    position: 1,
  },
  {
    value: DATA_CLASSIFICATION.CONFIDENTIAL,
    label: 'Bảo mật',
    color: 'yellow' as TagColor,
    position: 2,
  },
  {
    value: DATA_CLASSIFICATION.RESTRICTED,
    label: 'Hạn chế',
    color: 'orange' as TagColor,
    position: 3,
  },
  {
    value: DATA_CLASSIFICATION.TOP_SECRET,
    label: 'Tối mật',
    color: 'red' as TagColor,
    position: 4,
  },
];
```

### 3.3 Seed context `INTERNAL_RECORDS` vào database

**File cần sửa**: `seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-context/mkt-permission-context-data-seeds.constants.ts`

Thêm 1 context mới:

```typescript
{
  name: 'Internal Company Records',
  description: 'Tất cả nhân viên có tài khoản active đều truy cập được (READ only)',
  contextType: CONTEXT_TYPE.ALL_RECORDS,
  contextKey: 'internal_company',
  filterExpression: {
    // Không lọc - tất cả records
    // Nhưng chỉ cho phép READ
  },
  priority: 50,
  isActive: true,
  isSystemDefault: true,
  validationRules: {
    description: 'Company-wide read access for PUBLIC and INTERNAL classified resources',
    requiresActiveAccount: true,
    allowedActions: ['READ'],
  },
},
```

### 3.4 Cập nhật seed data cho Resource với dataClassification

**File cần sửa**: `seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-resource/mkt-permission-resource-data-seeds.constants.ts`

Cập nhật 12 resources hiện tại thêm trường `dataClassification`:

```typescript
{
  // ... các field hiện tại ...
  resourceKey: 'PRODUCTS',
  dataClassification: 'PUBLIC',
  classificationNote: 'Danh mục sản phẩm công khai cho toàn công ty',
},
{
  resourceKey: 'DASHBOARD',
  dataClassification: 'INTERNAL',
  classificationNote: 'Bảng điều khiển tổng quan nội bộ',
},
// ... tương tự cho các resource khác ...
```

### 3.5 Cập nhật Pipeline kiểm tra quyền (RbacEnforcerService)

**File cần sửa**: `mkt-rbac-enterprise-grade/services/rbac-enforcer.service.ts`

Thêm bước kiểm tra Data Classification **TRƯỚC** bước Casbin check:

```
Flow hiện tại:
  [1] Resolve User Context
  [2] Check Casbin Permission    ← Nếu không có template → DENY
  [3] Build Data Filter
  [4] Return Result

Flow mới:
  [1]   Resolve User Context
  [1.5] Check Data Classification    ← MỚI
        → Nếu resource là PUBLIC/INTERNAL + action là READ
        → Bypass Casbin, cho phép READ trực tiếp
        → Nếu RESTRICTED/TOP_SECRET → thêm audit log
  [2]   Check Casbin Permission (cho các action khác)
  [3]   Build Data Filter
  [4]   Return Result
```

Cụ thể, thêm method mới trong `RbacEnforcerService`:

```typescript
/**
 * Kiểm tra Data Classification trước khi vào Casbin
 * Nếu resource là PUBLIC/INTERNAL và action là READ → cho phép ngay
 */
private async checkDataClassification(
  workspaceId: string,
  resource: string,
  action: string,
): Promise<ClassificationCheckResult> {
  // 1. Lấy thông tin resource
  const resourceEntity = await this.permissionResourceService
    .getByResourceKey(workspaceId, resource);

  if (!resourceEntity?.dataClassification) {
    return { bypass: false }; // Không có classification → đi tiếp pipeline bình thường
  }

  const classification = resourceEntity.dataClassification;

  // 2. PUBLIC: cho phép READ cho tất cả user active
  if (classification === 'PUBLIC' && action === 'READ') {
    return {
      bypass: true,
      allowed: true,
      reason: 'Resource classified as PUBLIC - READ allowed for all active users',
      dataFilter: null, // Không lọc dữ liệu
    };
  }

  // 3. INTERNAL: cho phép READ cho tất cả user active
  if (classification === 'INTERNAL' && action === 'READ') {
    return {
      bypass: true,
      allowed: true,
      reason: 'Resource classified as INTERNAL - READ allowed for all active users',
      dataFilter: null,
    };
  }

  // 4. RESTRICTED: thêm audit requirement
  if (classification === 'RESTRICTED') {
    return {
      bypass: false,
      requireAudit: true,
    };
  }

  // 5. TOP_SECRET: kiểm tra minimum template priority
  if (classification === 'TOP_SECRET') {
    return {
      bypass: false,
      requireAudit: true,
      minimumTemplatePriority: 900, // Chỉ CEO (1000) / VP (900)
    };
  }

  // CONFIDENTIAL hoặc khác: đi tiếp pipeline bình thường
  return { bypass: false };
}
```

### 3.6 Tạo Type cho Classification Check

**File mới**: `mkt-rbac-enterprise-grade/types/data-classification.types.ts`

```typescript
export type ClassificationCheckResult = {
  bypass: boolean;
  allowed?: boolean;
  reason?: string;
  dataFilter?: FilterCondition | null;
  requireAudit?: boolean;
  minimumTemplatePriority?: number;
};

export type DataClassificationLevel =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED'
  | 'TOP_SECRET';
```

---

## 4. Danh sách Files cần Thay đổi

### 4.1 Files cần SỬA (7 files)

| # | File | Thay đổi |
|---|------|----------|
| 1 | `constants/mkt-field-ids.ts` | Thêm 2 field IDs mới vào `MKT_PERMISSION_RESOURCE_FIELD_IDS` |
| 2 | `mkt-rbac-enterprise-grade/constants/permission-template/options.constants.ts` | Thêm enum `DATA_CLASSIFICATION` + options |
| 3 | `mkt-rbac-enterprise-grade/workspace-entities/permission/mkt-permission-resource.workspace-entity.ts` | Thêm 2 trường: `dataClassification`, `classificationNote` |
| 4 | `mkt-rbac-enterprise-grade/services/rbac-enforcer.service.ts` | Thêm bước check classification trong `checkPermission()` |
| 5 | `seeder/.../mkt-permission-resource/mkt-permission-resource-data-seeds.constants.ts` | Cập nhật seed data thêm `dataClassification` |
| 6 | `seeder/.../mkt-permission-resource/prefill-mkt-permission-resources.ts` | Cập nhật prefill thêm trường mới |
| 7 | `seeder/.../mkt-permission-context/mkt-permission-context-data-seeds.constants.ts` | Thêm context `internal_company` |

### 4.2 Files cần TẠO MỚI (1 file)

| # | File | Nội dung |
|---|------|----------|
| 1 | `mkt-rbac-enterprise-grade/types/data-classification.types.ts` | Types cho classification check |

---

## 5. Thứ tự Triển khai

```
Bước 1: Thêm constants & types
  ├── 1.1 Thêm field IDs vào mkt-field-ids.ts
  ├── 1.2 Thêm enum DATA_CLASSIFICATION vào options.constants.ts
  └── 1.3 Tạo file data-classification.types.ts

Bước 2: Cập nhật Entity
  └── 2.1 Thêm 2 trường vào MktPermissionResourceWorkspaceEntity

Bước 3: Cập nhật Seeder
  ├── 3.1 Cập nhật resource seed data (thêm dataClassification)
  ├── 3.2 Cập nhật prefill function
  └── 3.3 Thêm context mới vào context seeds

Bước 4: Cập nhật Pipeline
  └── 4.1 Thêm checkDataClassification() vào RbacEnforcerService

Bước 5: Sync & Test
  ├── 5.1 npx nx run twenty-server:command workspace:sync-metadata -f
  ├── 5.2 Re-seed resources: workspace-seed-dev:mkt-permission-resources
  ├── 5.3 Re-seed contexts: workspace:seed:permission-context-module
  └── 5.4 Kiểm tra pipeline hoạt động đúng
```

---

## 6. Tác động & Rủi ro

### 6.1 Tác động

| Hạng mục | Tác động |
|----------|----------|
| **Backward Compatibility** | Không ảnh hưởng - `dataClassification` có default = `CONFIDENTIAL` (giữ nguyên hành vi hiện tại) |
| **Hiệu năng** | Tăng nhẹ - thêm 1 query lấy resource metadata trước Casbin check (có thể cache Redis) |
| **Security** | An toàn - chỉ bypass Casbin cho action READ trên resource PUBLIC/INTERNAL |
| **Database** | Thêm 2 cột vào bảng `mktPermissionResource`, thêm 1 row vào `mktPermissionContext` |

### 6.2 Rủi ro & Biện pháp

| Rủi ro | Mức độ | Biện pháp |
|--------|--------|-----------|
| Admin vô tình đổi resource nhạy cảm thành PUBLIC | MEDIUM | Chỉ cho phép CEO/VP thay đổi classification. Thêm audit log khi thay đổi. |
| Resource PUBLIC vẫn bị lọc bởi Data Access Policy | LOW | Classification bypass chỉ áp dụng cho Casbin check. Data Access Policy vẫn hoạt động bình thường nếu có. |
| Cache resource metadata bị stale | LOW | Invalidate cache khi cập nhật classification. TTL tối đa 5 phút. |

---

## 7. Kế hoạch Kiểm thử

### 7.1 Test Cases

| # | Kịch bản | Kết quả mong đợi |
|---|----------|-------------------|
| 1 | User JUNIOR (không có resource template) READ PRODUCTS (PUBLIC) | **PASS** - Cho phép đọc |
| 2 | User JUNIOR READ CUSTOMERS (CONFIDENTIAL) | **FAIL** - Từ chối (không có template) |
| 3 | User JUNIOR CREATE PRODUCTS (PUBLIC) | **FAIL** - Từ chối (PUBLIC chỉ bypass READ) |
| 4 | User SALES_STAFF READ DASHBOARD (INTERNAL) - dashboardSummary, revenueStats, etc. | **PASS** - Cho phép đọc tất cả 7 endpoints |
| 5 | User SALES_STAFF EXPORT DASHBOARD (INTERNAL) | **FAIL** - Từ chối (INTERNAL chỉ bypass READ) |
| 5b | User SALES_STAFF READ revenueStats với staffId của người khác | **Cần cân nhắc** - Hiện tại cho phép (INTERNAL) |
| 6 | User SALES_STAFF READ PAYMENTS (RESTRICTED) | Theo template - cần có quyền + ghi audit |
| 7 | User MANAGER READ SETTINGS (TOP_SECRET) | **FAIL** - Từ chối (priority 700 < 900) |
| 8 | User CEO READ SETTINGS (TOP_SECRET) | **PASS** - Cho phép (priority 1000 >= 900) |
| 9 | Resource không có dataClassification | Giữ nguyên pipeline hiện tại (CONFIDENTIAL mặc định) |
| 10 | Thay đổi PRODUCTS từ PUBLIC → CONFIDENTIAL | JUNIOR không đọc được PRODUCTS nữa |

### 7.2 Regression Test

- Tất cả permission check hiện tại phải hoạt động giống hệt trước khi thay đổi (vì default = CONFIDENTIAL = không bypass)
- Các Data Access Policy hiện tại không bị ảnh hưởng

---

## 8. Tóm tắt

| Hạng mục | Chi tiết |
|----------|----------|
| **Files sửa** | 7 |
| **Files tạo mới** | 1 |
| **Bảng DB ảnh hưởng** | 2 (`mktPermissionResource` + `mktPermissionContext`) |
| **Backward compatible** | Có (default = CONFIDENTIAL) |
| **Cần migration** | Không (workspace entity sync tự tạo cột) |
| **Cần re-seed** | Có (resources + contexts) |
