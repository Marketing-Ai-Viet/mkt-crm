# MKT-Core Module — Báo cáo kiểm tra tổng thể

> **Ngày kiểm tra:** 2026-02-07
> **Module:** `packages/twenty-server/src/mkt-core/`
> **Trạng thái tổng thể:** ~78% hoàn thiện

---

## 1. Tổng quan

| Metric | Giá trị |
|--------|---------|
| Tổng files | 1,515 |
| TypeScript files | 1,462 |
| Workspace Entities | 65 |
| Modules | 30 |
| Services | 147 |
| Repositories | 57 |
| Resolvers | 41 |
| Background Jobs | 23 |
| Hooks (Pre/Post Query) | 15 |
| Event Listeners | 9 |
| Guards | 5 |
| Interceptors | 1 |
| DTOs | 107 |
| Seeder Commands | 57 |
| Documentation Files | 53 |
| Test Files | 4 (0.27%) |

---

## 2. Kiến trúc tổng thể

### 2.1 Sơ đồ Module

```
mkt-core.module.ts
    │
    ├── MktCustomerModule          ✅ Registered
    ├── MktOrderModule             ✅ Registered
    ├── MktPaymentModule           ✅ Registered
    ├── MktComboModule             ✅ Registered
    ├── MktPromotionModule         ✅ Registered
    ├── MktDepartmentModule        ✅ Registered
    ├── MktOrganizationLevelModule ✅ Registered
    ├── MktDashboardModule         ✅ Registered
    ├── MktEmailModule             ✅ Registered
    ├── MktAuthClientModule        ✅ Registered
    ├── MktUserIntegrationModule   ✅ Registered
    ├── OAuth2ClientModule         ✅ Registered
    ├── MktProductIntegrationModule✅ Registered
    ├── MktLicenseIntegrationModule✅ Registered
    ├── UserManagementModule       ✅ Registered
    │
    ├── MktInvoiceModule           ❌ CHƯA ĐĂNG KÝ
    ├── MktContractModule          ❌ CHƯA ĐĂNG KÝ
    ├── MktTwoFacetorAuthModule    ❌ CHƯA ĐĂNG KÝ
    │
    └── MktRbacEnterpriseGradeModule  ⚠️ @Global() — tự đăng ký
```

### 2.2 Sơ đồ phụ thuộc giữa các module

```
                    ┌──────────────┐
                    │   Customer   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Order   │ │ License  │ │ Contract │
        └────┬─────┘ └──────────┘ └──────────┘
             │
        ┌────┼────────────┐
        ▼    ▼            ▼
   ┌─────────┐  ┌──────────┐  ┌───────────┐
   │ Payment │  │ Invoice  │  │ Promotion │
   └─────────┘  └──────────┘  └───────────┘
        │
        ▼
   ┌──────────────────┐
   │ Product Integr.  │ ← MKT Server (OAuth2)
   └──────────────────┘

   ┌──────────────┐    ┌───────────────┐
   │  Department  │───▶│  RBAC Guards  │
   └──────────────┘    └───────────────┘
         │
         ▼
   ┌──────────────────┐
   │ Organization Lvl │
   └──────────────────┘
```

---

## 3. Độ hoàn thiện từng Module

### 3.1 Ma trận tổng hợp

| Module | Entities | Services | Resolvers | Jobs | Seeder | Tests | Maturity |
|--------|:--------:|:--------:|:---------:|:----:|:------:|:-----:|:--------:|
| **Customer** | 5 ✅ | 17 ✅ | 7 ✅ | 3 ✅ | ✅ | ❌ | **95%** |
| **MktDashboard** | 3 ✅ | 14 ✅ | 2 ✅ | 3 ✅ | ⚠️ | ✅ | **95%** |
| **Order** | 4 ✅ | 22 ✅ | 7 ✅ | 2 ✅ | ✅ | ❌ | **92%** |
| **MktProductIntegration** | — | 6 ✅ | 1 ✅ | 1 ✅ | — | ❌ | **90%** |
| **MktRbacEnterpriseGrade** | 17 ✅ | 19 ⚠️ | — | 2 ✅ | ✅ | ❌ | **88%** |
| **Payment** | 4 ✅ | 12 ⚠️ | 3 ✅ | 2 ✅ | ✅ | ❌ | **85%** |
| **MktPromotion** | 5 ✅ | 8 ⚠️ | 3 ✅ | 4 ✅ | ✅ | ❌ | **85%** |
| **MktLicenseIntegration** | — | 3 ✅ | 1 ✅ | 4 ✅ | ✅ | ❌ | **85%** |
| **MktDepartment** | 4 ✅ | 6 ⚠️ | 4 ✅ | — | ✅ | ❌ | **80%** |
| **MktOrganizationLevel** | 1 ✅ | 3 ✅ | 3 ✅ | — | ✅ | ❌ | **75%** |
| **MktCombo** | 2 ✅ | 5 ✅ | 1 ✅ | — | ✅ | ❌ | **75%** |
| **UserManagement** | 2 ✅ | 4 ✅ | 1 ✅ | — | — | ❌ | **70%** |
| **Contract** | 1 ✅ | 2 ⚠️ | 2 ✅ | — | ✅ | ❌ | **65%** |
| **Invoice** | 8 ✅ | 1 ⚠️ | — | 1 ✅ | ✅ | ❌ | **60%** |
| **MktEmail** | 2 ✅ | 1 ✅ | — | — | ✅ | ❌ | **50%** |
| **MktTwoFactorAuth** | — | 3 ⚠️ | 1 ✅ | — | — | ❌ | **50%** |
| **PaymentMethod** | 1 ✅ | — | — | — | ✅ | ❌ | **40%** |
| **Setting** | 1 ✅ | — | — | — | ✅ | ❌ | **40%** |
| **MktKpi** | 3 ✅ | — | — | — | ✅ | ❌ | **35%** |
| **Report** | 1 ✅ | — | — | — | ✅ | ❌ | **30%** |

**Chú thích:** ✅ Hoàn thiện | ⚠️ Có items chưa implement | ❌ Không có

---

## 4. Vấn đề NGHIÊM TRỌNG (HIGH PRIORITY)

### 4.1 Ba module chưa đăng ký trong `mkt-core.module.ts`

| ID | Module | File cần sửa | Hậu quả |
|----|--------|-------------|---------|
| CORE-001 | **MktInvoiceModule** | `mkt-core.module.ts` | Toàn bộ tính năng hóa đơn không khả dụng |
| CORE-002 | **MktContractModule** | `mkt-core.module.ts` | Quản lý hợp đồng không khả dụng |
| CORE-003 | **MktTwoFacetorAuthenticationModule** | `mkt-core.module.ts` | Xác thực 2 lớp không khả dụng |

**Fix:** Thêm 3 dòng import vào `mkt-core.module.ts` (~10 LOC).

---

### 4.2 Idempotency bị tắt ở luồng quan trọng

| ID | File | Vị trí | Rủi ro |
|----|------|--------|--------|
| CORE-004 | `order/services/application/order-orchestration.service.ts` | Idempotency disabled | Duplicate orders |
| CORE-005 | `order/services/domain/payment-confirmation.service.ts` | Idempotency cache issue | Duplicate payment confirmations |
| CORE-006 | `order/services/domain/payment-reminder.service.ts` | Idempotency disabled | Duplicate reminders |

**Rủi ro:** Trong môi trường production với concurrent requests, có thể tạo ra duplicate orders hoặc xác nhận thanh toán nhiều lần.

---

### 4.3 Lỗ hổng bảo mật RBAC

| ID | File | Vấn đề |
|----|------|--------|
| CORE-007 | `mkt-rbac-enterprise-grade/services/bases/temporary-permission.service.ts` | `canGrantPermissions()` luôn return `true` — ai cũng grant được quyền |
| CORE-008 | `mkt-rbac-enterprise-grade/guards/department-authorization.guard.ts` | User Permission Override chưa implement |

> Chi tiết: xem [RBAC_Enterprise_Grade_Report.md](./RBAC_Enterprise_Grade_Report.md)

---

## 5. Vấn đề TRUNG BÌNH (MEDIUM PRIORITY)

### 5.1 Module chỉ có Entity — thiếu Service & Resolver

| ID | Module | Entities | Cần thêm |
|----|--------|----------|----------|
| CORE-009 | **MktKpi** | 3 (kpi, kpi-template, kpi-history) | Service layer + CRUD resolver |
| CORE-010 | **Report** | 1 (mkt-report) | Service layer + query resolver |
| CORE-011 | **PaymentMethod** | 1 (mkt-payment-method) | Service layer (có repository rồi) |
| CORE-012 | **Setting** | 1 (mkt-option) | Service layer (có repository rồi) |

---

### 5.2 TODO / Stub chưa implement (~86 TODOs)

#### Payment Module

| ID | File | Vấn đề | LOC ước tính |
|----|------|--------|-------------|
| CORE-013 | `payment/listeners/payment-notification.listener.ts` | 8 phương thức notification là **stub rỗng** | ~80-120 |
| CORE-014 | `payment/guards/ip-whitelist.guard.ts` | IPv6 CIDR support chưa có | ~20-30 |

#### Order Module

| ID | File | Vấn đề | LOC ước tính |
|----|------|--------|-------------|
| CORE-015 | `order/services/domain/order-metadata.service.ts` | Refund logic chưa implement | ~40-60 |
| CORE-016 | `order/resolvers/order-export.resolver.ts` | BullMQ integration chưa hoàn thiện | ~30-50 |

#### Promotion Module

| ID | File | Vấn đề | LOC ước tính |
|----|------|--------|-------------|
| CORE-017 | `mkt-promotion/services/promotion-notification.service.ts` | 5 notification methods là stub | ~50-80 |
| CORE-018 | `mkt-promotion/jobs/promotion-cache-warmup.job.ts` | Cache storage logic chưa implement | ~20-30 |
| CORE-019 | `mkt-promotion/resolvers/coupon.resolver.ts` | Promotion mapping chưa hoàn thiện | ~15-25 |

#### Department Module

| ID | File | Vấn đề | LOC ước tính |
|----|------|--------|-------------|
| CORE-020 | `mkt-department/services/department.service.ts` | Circular reference detection chưa có | ~30-40 |

#### Contract Module

| ID | File | Vấn đề | LOC ước tính |
|----|------|--------|-------------|
| CORE-021 | `contract/services/mkt-contract.service.ts` | Performance optimization cần thiết | ~20-30 |

#### Excel Export

| ID | File | Vấn đề | LOC ước tính |
|----|------|--------|-------------|
| CORE-022 | `common/excel/excel-export.job.ts` | File storage integration chưa hoàn thiện | ~30-40 |
| CORE-023 | `common/excel/export-audit.service.ts` | Audit persistence chưa implement | ~20-30 |

#### RBAC Module (7 items)

> Chi tiết: xem [RBAC_Enterprise_Grade_Report.md](./RBAC_Enterprise_Grade_Report.md) — mục RBAC-001 → RBAC-007

---

### 5.3 Entities thiếu Seeder (9 entities)

| ID | Entity | Ghi chú |
|----|--------|---------|
| CORE-024 | mkt-dashboard-layout | Có seeder trong dev-seeder/ nhưng chưa có command |
| CORE-025 | mkt-dashboard-snapshot | Tương tự |
| CORE-026 | mkt-employment-status-history | Chưa có seeder |
| CORE-027 | mkt-payment-deadline-config | Chưa có seeder |
| CORE-028 | mkt-permission-priority-config | Chưa có seeder |
| CORE-029 | mkt-sinvoice-file | Chưa có seeder |
| CORE-030 | mkt-template-access-limitation | Chưa có seeder |
| CORE-031 | mkt-user-permission-override | Chưa có seeder |

---

## 6. Chi tiết từng Module

### 6.1 Customer Module — 95%

**Trạng thái:** Production-ready (thiếu tests)

**Entities (5):**
- `mkt-customer` — Thông tin khách hàng
- `mkt-customer-note` — Ghi chú
- `mkt-customer-tier-history` — Lịch sử tier
- `mkt-tag` — Tags
- `mkt-customer-tag` — Mapping customer ↔ tag

**Services (17):**
- Core: MktCustomerService, CodeGeneration, PurchaseHistory
- Tier: TierService, TierCalculation, TierHistory, TierRegistration, DowngradePolicy, QueueService
- Account: CustomerAccountService
- Note: CustomerNoteService
- License: CustomerLicenseService
- Export: CustomerExportService
- Validation: CustomerValidationService
- Lifecycle: AutoAssign, Categorization

**Resolvers (7):** Customer, Note, Tier, TierHistory, License, LinkedAccount, Export

**Jobs (3):** Tier cron, Categorization cron, Tier update job

**Vấn đề:** Không có.

---

### 6.2 Order Module — 92%

**Trạng thái:** Production-ready (idempotency cần bật lại)

**Entities (4):**
- `mkt-order` — Đơn hàng
- `mkt-order-item` — Chi tiết đơn hàng
- `mkt-order-history` — Lịch sử thay đổi
- `mkt-contract` — Hợp đồng (thuộc Contract module)

**Services (22):**
- Application: OrderOrchestrationService
- Core: OrderService, OrderConfirmUtils, OrderMetadata, OrderItemCalculation
- Domain: PaymentConfirmation, PaymentReminder, OrderStatus, OrderExport
- Integration: LicenseIntegration, PromotionIntegration
- Public: OrderPublicService
- States: 5+ state handlers (PENDING, CONFIRMED, BLOCKED, OVERDUE...)

**Resolvers (7):** Đầy đủ CRUD + workflow

**Vấn đề:**
- CORE-004, 005, 006: Idempotency bị tắt
- CORE-015: Refund logic chưa implement
- CORE-016: Export BullMQ chưa hoàn thiện

---

### 6.3 Payment Module — 85%

**Trạng thái:** Hoạt động cơ bản, notification chưa có

**Entities (4):**
- `mkt-payment` — Thanh toán
- `mkt-payment-method` — Phương thức thanh toán
- `mkt-payment-history` — Lịch sử
- `mkt-payment-deadline-config` — Cấu hình deadline

**Services (12):** Core payment processing, SEPay webhook, BIDV QR

**Resolvers (3):** Payment CRUD + webhook

**Vấn đề:**
- CORE-013: 8 notification handlers là stub
- CORE-014: IPv6 CIDR chưa support

---

### 6.4 Invoice Module — 60%

**Trạng thái:** Entity đầy đủ, service layer mỏng, **chưa đăng ký module**

**Entities (8):**
- `mkt-invoice` — Hóa đơn nội bộ
- `mkt-sinvoice` — Hóa đơn điện tử
- `mkt-sinvoice-auth` — Xác thực hóa đơn
- `mkt-sinvoice-item` — Chi tiết hóa đơn
- `mkt-sinvoice-payment` — Thanh toán hóa đơn
- `mkt-sinvoice-tax-breakdown` — Chi tiết thuế
- `mkt-sinvoice-metadata` — Metadata
- `mkt-sinvoice-file` — File đính kèm

**Services (1):** Chỉ có service cơ bản

**Hooks (4):** Pre/Post query hooks cho SInvoice create, file create/update

**Vấn đề:**
- CORE-001: **Module chưa đăng ký** — toàn bộ tính năng không khả dụng
- Service layer cần mở rộng cho invoice workflow

---

### 6.5 MktProductIntegration Module — 90%

**Trạng thái:** Production-ready

**Architecture:** Repository-Service pattern với Facade

**Services (6):**
| Service | Chức năng |
|---------|-----------|
| `MktProductProxyService` | Facade — orchestrates cache, repos, validation |
| `MktProductCacheService` | Redis distributed caching (24h TTL) |
| `MktProductSyncService` | Event-driven sync on OAuth2 token acquired |
| `MktSnapshotService` | Immutable snapshots với SHA-256 checksum |
| `MktValidationService` | Validate products/packages cho orders |

**GraphQL Queries:**
- `mktDigitalProduct(productId)` — Get single product
- `mktDigitalProductByCode(code)` — Get by code
- `mktDigitalProducts(input)` — Paginated list
- `mktDigitalPackage(input)` — Get package
- `mktDigitalPackagesByProduct(input)` — Packages by product

**Vấn đề:** Enum types hardcoded as strings (minor).

---

### 6.6 MktPromotion Module — 85%

**Trạng thái:** Core logic hoạt động, notification chưa có

**Entities (5):**
- `mkt-promotion` — Chương trình KM
- `mkt-promotion-rule` — Điều kiện áp dụng
- `mkt-coupon` — Mã giảm giá
- `mkt-promotion-usage` — Lịch sử sử dụng
- `mkt-promotion-audit` — Audit

**Services (8):** Core promotion, rule evaluation, coupon management, usage tracking

**Jobs (4):** Cache warmup, expiration (promotion + coupon), stats

**Vấn đề:**
- CORE-017: 5 notification methods là stub
- CORE-018: Cache warmup logic chưa implement
- CORE-019: Coupon ↔ Promotion mapping chưa hoàn thiện

---

### 6.7 MktDepartment Module — 80%

**Trạng thái:** Ổn định, thiếu validation

**Entities (4):**
- `mkt-department` — Phòng ban
- `mkt-department-hierarchy` — Quan hệ cha-con
- `mkt-department-ancestry` — Tổ tiên (tree path)
- `mkt-department-sub-manager` — Phó quản lý

**Services (6):** CRUD, tree queries (ancestors/descendants), hierarchy management

**Resolvers (4):** Department, Hierarchy, Ancestry, SubManager

**Vấn đề:**
- CORE-020: Circular reference detection chưa implement (tạo department A → B → A sẽ lỗi)

---

### 6.8 MktDashboard Module — 95%

**Trạng thái:** Production-ready, module duy nhất có unit tests

**Entities (3):**
- `mkt-dashboard-widget` — Widget cấu hình
- `mkt-dashboard-snapshot` — Snapshot dữ liệu
- `mkt-dashboard-layout` — Bố cục dashboard

**Services (14):**
- Application: DashboardOrchestrator
- Core: Cache, DateRange, Widget, Snapshot, CronRegistration
- Domain: Revenue, Order, Customer, Payment, KPI, Contract, Alerts, StaffLeaderboard

**Tests (4):**
- `dashboard-date-range.service.spec.ts`
- `statistics.utils.spec.ts`
- `dashboard-data.transformer.spec.ts`
- `dashboard-config.schema.spec.ts`

**Jobs (3):** Daily snapshot, cache warmup, snapshot cleanup

---

### 6.9 MktRbacEnterpriseGrade Module — 88%

**Trạng thái:** Core engine hoạt động, guards chưa hoàn thiện

**Entities (17):** Hệ thống phân quyền đầy đủ (template, resource, action, policy, casbin, audit...)

**Services (19):** Enforcer, Cache, Context, Audit, Filter, DataAccessPolicy, Hierarchical evaluator...

**Guards (2):** CasbinAuthzGuard ✅, DepartmentAuthorizationGuard ⚠️

**Interceptors (1):** DataScopeInterceptor (row-level security) ✅

**Vấn đề:** 7 items — xem [RBAC_Enterprise_Grade_Report.md](./RBAC_Enterprise_Grade_Report.md)

---

### 6.10 Các module còn lại

| Module | Trạng thái | Ghi chú |
|--------|-----------|---------|
| **MktLicenseIntegration** (85%) | Queue-based license processing | 3 services, 4 jobs, 1 resolver |
| **MktOrganizationLevel** (75%) | Ổn định | 1 entity, 3 services, 3 resolvers |
| **MktCombo** (75%) | Ổn định | 2 entities, 5 services, 1 resolver |
| **UserManagement** (70%) | Cơ bản | 2 entities, 4 services, 1 resolver |
| **Contract** (65%) | **Chưa đăng ký module** | 1 entity, 2 services, 2 resolvers |
| **MktEmail** (50%) | Chỉ entity + 1 service | Chưa có resolver, chưa có sending logic |
| **MktTwoFactorAuth** (50%) | **Chưa đăng ký module** | OTP-based, 3 services |
| **MktKpi** (35%) | **Chỉ có entity** | 3 entities, 0 services, 0 resolvers |
| **PaymentMethod** (40%) | **Chỉ có entity** | 1 entity, chỉ có repository |
| **Setting** (40%) | **Chỉ có entity** | 1 entity, chỉ có repository |
| **Report** (30%) | **Chỉ có entity** | 1 entity, 0 services |

---

## 7. Workspace Entities — Danh sách đầy đủ (65)

### Customer Domain (5)

| Entity | Fields | Relations | Seeder |
|--------|--------|-----------|--------|
| mkt-customer | ✅ | ✅ | ✅ |
| mkt-customer-note | ✅ | ✅ | ✅ |
| mkt-customer-tier-history | ✅ | ✅ | ✅ |
| mkt-tag | ✅ | ✅ | ✅ |
| mkt-customer-tag | ✅ | ✅ | ✅ |

### Order Domain (4)

| Entity | Fields | Relations | Seeder |
|--------|--------|-----------|--------|
| mkt-order | ✅ | ✅ | ✅ |
| mkt-order-item | ✅ | ✅ | ✅ |
| mkt-order-history | ✅ | ✅ | ✅ |
| mkt-contract | ✅ | ✅ | ✅ |

### Payment Domain (4)

| Entity | Fields | Relations | Seeder |
|--------|--------|-----------|--------|
| mkt-payment | ✅ | ✅ | ✅ |
| mkt-payment-method | ✅ | ✅ | ✅ |
| mkt-payment-history | ✅ | ✅ | ✅ |
| mkt-payment-deadline-config | ✅ | ✅ | ❌ |

### Invoice Domain (8)

| Entity | Fields | Relations | Seeder |
|--------|--------|-----------|--------|
| mkt-invoice | ✅ | ✅ | ✅ |
| mkt-sinvoice | ✅ | ✅ | ✅ |
| mkt-sinvoice-auth | ✅ | ✅ | ✅ |
| mkt-sinvoice-item | ✅ | ✅ | ✅ |
| mkt-sinvoice-payment | ✅ | ✅ | ✅ |
| mkt-sinvoice-tax-breakdown | ✅ | ✅ | ✅ |
| mkt-sinvoice-metadata | ✅ | ✅ | ✅ |
| mkt-sinvoice-file | ✅ | ✅ | ❌ |

### Department / Organization (7)

| Entity | Fields | Relations | Seeder |
|--------|--------|-----------|--------|
| mkt-department | ✅ | ✅ | ✅ |
| mkt-department-hierarchy | ✅ | ✅ | ✅ |
| mkt-department-ancestry | ✅ | ✅ | ✅ |
| mkt-department-sub-manager | ✅ | ✅ | ✅ |
| mkt-organization-level | ✅ | ✅ | ✅ |
| mkt-employment-status | ✅ | ✅ | ✅ |
| mkt-employment-status-history | ✅ | ✅ | ❌ |

### RBAC Enterprise (17)

| Entity | Fields | Relations | Seeder |
|--------|--------|-----------|--------|
| mkt-permission-template | ✅ | ✅ | ✅ |
| mkt-permission-resource | ✅ | ✅ | ✅ |
| mkt-permission-action | ✅ | ✅ | ✅ |
| mkt-template-resource-permission | ✅ | ✅ | ✅ |
| mkt-template-system-action | ✅ | ✅ | ✅ |
| mkt-template-access-limitation | ✅ | ✅ | ❌ |
| mkt-user-permission-template | ✅ | ✅ | ✅ |
| mkt-user-permission-override | ✅ | ✅ | ❌ |
| mkt-permission-context | ✅ | ✅ | ✅ |
| mkt-permission-priority-config | ✅ | ✅ | ❌ |
| mkt-data-access-policy | ✅ | ✅ | ✅ |
| mkt-permission-audit | ✅ | ✅ | ✅ |
| mkt-casbin-rule | ✅ | ✅ | ✅ |
| mkt-policy-version | ✅ | ✅ | ✅ |
| mkt-policy-change-request | ✅ | ✅ | ✅ |
| mkt-policy-approval | ✅ | ✅ | ✅ |
| mkt-temporary-permission | ✅ | ✅ | ✅ |

### Promotion Domain (5)

| Entity | Fields | Relations | Seeder |
|--------|--------|-----------|--------|
| mkt-promotion | ✅ | ✅ | ✅ |
| mkt-promotion-rule | ✅ | ✅ | ✅ |
| mkt-coupon | ✅ | ✅ | ✅ |
| mkt-promotion-usage | ✅ | ✅ | ✅ |
| mkt-promotion-audit | ✅ | ✅ | ✅ |

### Combo (2)

| Entity | Fields | Relations | Seeder |
|--------|--------|-----------|--------|
| mkt-generic-combo | ✅ | ✅ | ✅ |
| mkt-generic-combo-item | ✅ | ✅ | ✅ |

### Dashboard (3)

| Entity | Fields | Relations | Seeder |
|--------|--------|-----------|--------|
| mkt-dashboard-widget | ✅ | ✅ | ⚠️ |
| mkt-dashboard-snapshot | ✅ | ✅ | ❌ |
| mkt-dashboard-layout | ✅ | ✅ | ❌ |

### KPI System (3)

| Entity | Fields | Relations | Seeder |
|--------|--------|-----------|--------|
| mkt-kpi | ✅ | ✅ | ✅ |
| mkt-kpi-template | ✅ | ✅ | ✅ |
| mkt-kpi-history | ✅ | ✅ | ✅ |

### Email / Communication (2)

| Entity | Fields | Relations | Seeder |
|--------|--------|-----------|--------|
| mkt-email | ✅ | ✅ | ✅ |
| mkt-template | ✅ | ✅ | ✅ |

### Others (5)

| Entity | Fields | Relations | Seeder |
|--------|--------|-----------|--------|
| mkt-i18n | ✅ | ✅ | ✅ |
| mkt-option | ✅ | ✅ | ✅ |
| mkt-report | ✅ | ✅ | ✅ |
| mkt-webhook-log | ✅ | ✅ | ✅ |
| mkt-virtual-account | ✅ | ✅ | ✅ |

---

## 8. Background Jobs & Cron

### 8.1 Jobs đã implement (23)

| Module | Job | Loại | Trạng thái |
|--------|-----|------|-----------|
| **Customer** | customer-tier.cron.job | Cron | ✅ |
| | customer-categorization.cron.job | Cron | ✅ |
| | customer-tier-update.job | Queue | ✅ |
| **Order** | payment-deadline.processor | Queue | ✅ |
| | order-auto-overdue.cron.job | Cron | ✅ |
| **Payment** | payment-status-check.job | Queue | ✅ |
| | payment-notification.job | Queue | ✅ |
| **Invoice** | s-invoice-integration.job | Queue | ✅ |
| **LicenseIntegration** | license-sync.job | Queue | ✅ |
| | license-renewal.job | Queue | ✅ |
| | license-expiration.job | Cron | ✅ |
| | license-activation.job | Queue | ✅ |
| **ProductIntegration** | product-scheduled-sync.job | Cron (30m) | ✅ |
| **Promotion** | promotion-cache-warmup.job | Startup | ⚠️ Logic chưa implement |
| | promotion-expiration.job | Cron | ✅ |
| | coupon-expiration.job | Cron | ✅ |
| | promotion-stats.job | Cron | ✅ |
| **Dashboard** | dashboard-snapshot-daily.job | Cron | ✅ |
| | dashboard-cache-warmup.job | Startup | ✅ |
| | dashboard-snapshot-cleanup.job | Cron | ✅ |
| **RBAC** | policy-sync.job | Queue | ✅ |
| | cache-warmup.job | Startup | ✅ |

### 8.2 Modules không có Jobs

- MktCombo
- MktDepartment
- MktOrganizationLevel
- MktEmail
- Contract
- UserManagement
- MktKpi
- Report

---

## 9. Hooks & Event Listeners

### 9.1 Pre/Post Query Hooks (15)

| Module | Hook | Loại |
|--------|------|------|
| **Invoice** | MktSInvoiceCreateOnePreQueryHook | Pre-Create |
| | MktSInvoiceCreateOnePostQueryHook | Post-Create |
| | MktSInvoiceFileCreateOnePreQueryHook | Pre-Create |
| | MktSInvoiceFileUpdateOnePreQueryHook | Pre-Update |
| **Customer** | customer-block.pre-query.hook | Block |
| **Contract** | Contract block hooks (×8) | Block auto-CRUD |
| **Dashboard** | Dashboard block hooks | Block |

### 9.2 Event Listeners (9)

| Listener | Trigger |
|----------|---------|
| DashboardCacheInvalidationListener | Entity changes → invalidate dashboard cache |
| MktCustomerEventListener | Customer lifecycle events |
| PaymentNotificationListener | Payment status changes (⚠️ 8 stub methods) |
| PromotionUsageListener | Coupon/promotion usage tracking |
| + 5 listeners khác | Various domain events |

---

## 10. Advanced Patterns đã implement

| Pattern | Trạng thái | Sử dụng ở |
|---------|-----------|-----------|
| Repository Pattern | ✅ 57 repos | Toàn bộ modules |
| Service Layer Architecture | ✅ 147 services | Toàn bộ modules |
| Event-Driven | ✅ 9 listeners | Customer, Payment, Dashboard, Promotion |
| Background Jobs (BullMQ) | ✅ 23 jobs | Customer, Order, Payment, License, Dashboard |
| Redis Caching | ✅ | ProductIntegration, RBAC, Dashboard |
| Circuit Breaker | ✅ | ProductIntegration |
| Rate Limiting | ✅ | Infrastructure |
| Optimistic Locking | ✅ | BaseOptimisticLockingService |
| Idempotency | ⚠️ Disabled | Order (cần bật lại) |
| Saga Pattern | ✅ | Order orchestration |
| Pre/Post Query Hooks | ✅ 15 hooks | Invoice, Contract, Dashboard |
| RBAC + Casbin | ✅ | RbacEnterpriseGrade |
| Row-level Security | ✅ | DataScopeInterceptor |
| OAuth2 Integration | ✅ | ProductIntegration, AuthClient |
| Immutable Snapshots | ✅ SHA-256 | ProductIntegration |

---

## 11. Tổng hợp tất cả Issues

### 11.1 Theo Severity

| Severity | Số lượng | IDs |
|----------|----------|-----|
| **CRITICAL** | 4 | CORE-001, 002, 003, 007 |
| **HIGH** | 4 | CORE-004, 005, 006, 008 |
| **MEDIUM** | 17 | CORE-009 → 023, RBAC-003 → 005 |
| **LOW** | 6 | CORE-024 → 031, RBAC-006, 007 |
| **Tổng** | **31** | |

### 11.2 Theo loại

| Loại | Số lượng |
|------|----------|
| Module chưa đăng ký | 3 |
| Idempotency bị tắt | 3 |
| Security vulnerability | 2 |
| Entity-only (thiếu service) | 4 |
| TODO / Stub chưa implement | 11 |
| Thiếu seeder | 8 |
| **Tổng** | **31** |

---

## 12. Thứ tự implement đề xuất

### Phase 1 — Blocker (bắt buộc trước production)

| # | Task | LOC | IDs |
|---|------|-----|-----|
| 1 | Đăng ký 3 module vào mkt-core.module.ts | ~10 | CORE-001, 002, 003 |
| 2 | Bật lại idempotency (3 services) | ~20-30 | CORE-004, 005, 006 |
| 3 | Fix canGrantPermissions() security hole | ~30-50 | CORE-007 |
| 4 | Implement User Permission Override | ~50-80 | CORE-008 |

### Phase 2 — Tính năng thiếu

| # | Task | LOC | IDs |
|---|------|-----|-----|
| 5 | MktKpi service + resolver | ~150-200 | CORE-009 |
| 6 | Report service + resolver | ~80-120 | CORE-010 |
| 7 | Payment notification handlers (8 methods) | ~80-120 | CORE-013 |
| 8 | Promotion notification (5 methods) | ~50-80 | CORE-017 |
| 9 | Order refund logic | ~40-60 | CORE-015 |
| 10 | RBAC peer manager + context caching | ~80-100 | RBAC-003, 004, 005 |

### Phase 3 — Polish

| # | Task | LOC | IDs |
|---|------|-----|-----|
| 11 | Department circular ref detection | ~30-40 | CORE-020 |
| 12 | Excel export file storage | ~30-40 | CORE-022 |
| 13 | PaymentMethod + Setting service | ~60-80 | CORE-011, 012 |
| 14 | Missing seeders (8 entities) | ~100-150 | CORE-024 → 031 |
| 15 | RBAC template cloning + manager ID | ~30-50 | RBAC-006, 007 |

---

## 13. Điểm mạnh của dự án

- **65 workspace entities** được thiết kế đầy đủ với fields, relations, indexes
- **147 services** phân lớp rõ ràng theo domain (Repository → Service → Resolver)
- **23 background jobs** tự động hóa workflow (tier, expiration, sync, snapshot)
- **RBAC enterprise-grade** với Casbin engine, row-level security, audit trail
- **Product Integration** hoàn chỉnh (OAuth2, Redis cache 24h, scheduled sync 30m)
- **53 documentation files** giúp onboarding nhanh
- **86% entities** có seed data cho development
- **Advanced patterns**: Circuit Breaker, Saga, Event-Driven, Optimistic Locking, Immutable Snapshots

---

## 14. Tài liệu liên quan

- [RBAC Enterprise Grade Report](./RBAC_Enterprise_Grade_Report.md) — Chi tiết 7 items chưa hoàn thiện trong RBAC
- [CRM Strategy Proposal](./CRM_Strategy_Proposal_2025.md)
- [Twenty CRM Research Report](./Twenty_CRM_Research_Report.md)
- [Software Strategy Report](./Software_Strategy_Horizontal_vs_Vertical.md)
