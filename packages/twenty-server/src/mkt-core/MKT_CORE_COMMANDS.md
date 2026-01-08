# MKT-Core Command Runners Documentation

Tài liệu này mô tả tất cả các Command Runners được khai báo trong module `mkt-core`. Các commands sử dụng thư viện `nest-commander` và có thể được chạy thông qua CLI.

## Cách sử dụng

Tất cả commands được chạy thông qua Nx với format:
```bash
npx nx command twenty-server -- <command-name> [options]
```

---

## 📋 Mục lục

1. [System Commands](#1-system-commands)
2. [Customer Commands](#2-customer-commands)
3. [Order Commands](#3-order-commands)
4. [Seeder Commands - Core](#4-seeder-commands---core)
5. [Seeder Commands - Invoice](#5-seeder-commands---invoice)
6. [Seeder Commands - Promotion](#6-seeder-commands---promotion)
7. [Seeder Commands - Other Modules](#7-seeder-commands---other-modules)

---

## 1. System Commands

### `cron:register:mkt`
**File:** `commands/mkt-cron-register.command.ts`

**Mô tả:** Đăng ký tất cả các background sync cron jobs cho hệ thống MKT.

**Chức năng:**
- Đăng ký `CronOrderOverdue` - Kiểm tra và cập nhật trạng thái đơn hàng quá hạn
- Đăng ký `CronPeopleSync` - Đồng bộ thông tin người dùng
- Đăng ký `CronCustomerTier` - Cập nhật hạng khách hàng tự động

**Cách chạy:**
```bash
npx nx command twenty-server -- cron:register:mkt
```

---

## 2. Customer Commands

### `mkt:customer:tier-update`
**File:** `customer/commands/mkt-customer-tier-update.command.ts`

**Mô tả:** Đưa một job vào message queue để cập nhật tier (hạng) của khách hàng.

**Options:**
- `-c, --customer-id <customer_id>` (required): ID của khách hàng cần cập nhật tier
- `-w, --workspace-id <workspace_id>` (required): ID của workspace

**Chức năng:**
- Enqueue job vào message queue (BullMQ)
- Job được xử lý bất đồng bộ bởi worker
- Cập nhật tier dựa trên lịch sử mua hàng và các tiêu chí khác

**Cách chạy:**
```bash
npx nx command twenty-server -- mkt:customer:tier-update -c <customer_id> -w <workspace_id>
```

---

## 3. Order Commands

### `workspace:order:opt-locking`
**File:** `order/commands/mkt-order-optimistic-locking.command.ts`

**Mô tả:** Tạo/thay thế database trigger để tự động cập nhật `mktOrder.updatedAt` khi `mktOrderItem` thay đổi.

**Options:**
- `-w, --workspace-id <workspace_id>` (required): ID của workspace cần apply trigger

**Chức năng:**
- Tạo PostgreSQL trigger function `trg_touch_mkt_order_updated_at()`
- Tạo trigger `trg_touch_mkt_order_on_item` trên bảng `mktOrderItem`
- Hỗ trợ optimistic locking cho Order entity
- Trigger kích hoạt khi INSERT, UPDATE hoặc DELETE trên OrderItem

**Cách chạy:**
```bash
npx nx command twenty-server -- workspace:order:opt-locking -w <workspace_id>
```

---

## 4. Seeder Commands - Core

Các commands dưới đây dùng để seed dữ liệu phát triển cho các module chính.

### `workspace:seed:customer-module`
**File:** `seeder/commands/mkt-customer-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed views và dữ liệu mẫu cho Customer module.

**Options:**
- `-w, --workspace-id [workspace_id]` (optional): Nếu không cung cấp, seed cho tất cả workspace đang active

**Chức năng:**
- Tạo view "All Customers" với các field được cấu hình
- Seed dữ liệu khách hàng mẫu
- Tạo Favorite record cho view

---

### `workspace:seed:order-module`
**File:** `seeder/commands/mkt-order-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed views và dữ liệu mẫu cho Order module.

**Options:**
- `-w, --workspace-id [workspace_id]`

**Chức năng:**
- Tạo view "All Orders"
- Seed dữ liệu đơn hàng mẫu
- Cấu hình view fields và filters

---

### `workspace:seed:order-item-module`
**File:** `seeder/commands/mkt-order-item-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu chi tiết đơn hàng (order items).

---

### `workspace:seed:order-history-module`
**File:** `seeder/commands/mkt-order-history-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed lịch sử thay đổi trạng thái đơn hàng.

---

### `workspace-seed-dev:mkt-payments`
**File:** `seeder/commands/mkt-payment-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu thanh toán mẫu.

**Cách chạy:**
```bash
npx nx command twenty-server -- workspace-seed-dev:mkt-payments <workspace_id>
```

---

### `workspace:seed:payment-history-module`
**File:** `seeder/commands/mkt-payment-history-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed lịch sử thanh toán.

---

### `workspace-seed-dev:mkt-payment-methods`
**File:** `seeder/commands/mkt-payment-method-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed các phương thức thanh toán (SEPay, BIDV, chuyển khoản, v.v.).

---

### `workspace:seed:department-module`
**File:** `seeder/commands/mkt-department-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu phòng ban/bộ phận.

---

### `workspace:seed:department-hierarchy-module`
**File:** `seeder/commands/mkt-department-hierarchy-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed cấu trúc phân cấp phòng ban (tree structure).

---

### `workspace:seed:organization-level-module`
**File:** `seeder/commands/mkt-organization-level-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed các cấp tổ chức trong doanh nghiệp.

---

### `workspace:seed:kpi-module`
**File:** `seeder/commands/mkt-kpi-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu KPI (Key Performance Indicators).

---

### `workspace:seed:kpi-template-module`
**File:** `seeder/commands/mkt-kpi-template-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed các template KPI mẫu.

---

### `workspace:seed:kpi-history-module`
**File:** `seeder/commands/mkt-kpi-history-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed lịch sử KPI.

---

### `workspace:seed:customer-tag-module`
**File:** `seeder/commands/mkt-customer-tag-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed tags cho phân loại khách hàng.

---

### `workspace:seed:tag-module`
**File:** `seeder/commands/mkt-tag-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu tags chung.

---

### `workspace:seed:contract-module`
**File:** `seeder/commands/mkt-contract-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu hợp đồng.

---

### `workspace:seed:template-module`
**File:** `seeder/commands/mkt-template-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed các templates (email, document, v.v.).

---

### `workspace:seed:i18n-module`
**File:** `seeder/commands/mkt-i18n-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu đa ngôn ngữ (internationalization).

---

### `workspace:seed:employment-status-module`
**File:** `seeder/commands/mkt-employment-status-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed các trạng thái công việc của nhân viên.

---

### `workspace:seed:staff-status-history-module`
**File:** `seeder/commands/mkt-staff-status-history-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed lịch sử thay đổi trạng thái nhân viên.

---

### `workspace:seed:permission-audit-module`
**File:** `seeder/commands/mkt-permission-audit-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu audit phân quyền.

---

### `workspace:seed:data-access-policy-module`
**File:** `seeder/commands/mkt-data-access-policy-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed các chính sách truy cập dữ liệu.

---

### `workspace:seed:temporary-permission-module`
**File:** `seeder/commands/mkt-temporary-permission-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed các quyền tạm thời.

---

### `workspace-seed-dev:mkt-generic-combos`
**File:** `seeder/commands/mkt-generic-combo-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed các generic combos (danh sách dropdown tùy chỉnh).

---

### `workspace-seed-dev:mkt-generic-combo-items`
**File:** `seeder/commands/mkt-generic-combo-item-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed các items cho generic combos.

---

## 5. Seeder Commands - Invoice

### `workspace:seed:invoice-module`
**File:** `seeder/invoice-seeder/mkt-invoice-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu hóa đơn.

---

### `workspace:seed:sinvoice-module`
**File:** `seeder/invoice-seeder/mkt-sinvoice-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu hóa đơn điện tử (S-Invoice).

---

### `workspace:seed:sinvoice-item-module`
**File:** `seeder/invoice-seeder/mkt-sinvoice-item-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed chi tiết items trong hóa đơn điện tử.

---

### `workspace:seed:sinvoice-auth-module`
**File:** `seeder/invoice-seeder/mkt-sinvoice-auth-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed thông tin xác thực hóa đơn điện tử.

---

### `workspace:seed:sinvoice-metadata-module`
**File:** `seeder/invoice-seeder/mkt-sinvoice-metadata-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed metadata hóa đơn điện tử.

---

### `workspace:seed:sinvoice-payment-module`
**File:** `seeder/invoice-seeder/mkt-sinvoice-payment-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed thông tin thanh toán hóa đơn điện tử.

---

### `workspace:seed:sinvoice-tax-breakdown-module`
**File:** `seeder/invoice-seeder/mkt-sinvoice-tax-breakdown-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed chi tiết thuế trong hóa đơn điện tử.

---

## 6. Seeder Commands - Promotion

### `workspace-seed-dev:mkt-promotions`
**File:** `seeder/promotion-seeder/mkt-promotion-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu chương trình khuyến mãi.

---

### `workspace-seed-dev:mkt-coupons`
**File:** `seeder/promotion-seeder/mkt-coupon-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed mã giảm giá (coupons).

---

### `workspace-seed-dev:mkt-promotion-rules`
**File:** `seeder/promotion-seeder/mkt-promotion-rule-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed các quy tắc áp dụng khuyến mãi.

---

### `workspace-seed-dev:mkt-promotion-usages`
**File:** `seeder/promotion-seeder/mkt-promotion-usage-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed lịch sử sử dụng khuyến mãi.

---

### `workspace-seed-dev:mkt-promotion-audits`
**File:** `seeder/promotion-seeder/mkt-promotion-audit-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed audit logs cho khuyến mãi.

---

## 7. Seeder Commands - Other Modules

### `workspace:seed:email-module`
**File:** `email/seeder/mkt-email-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu email module.

**Options:**
- `-w, --workspace-id [workspace_id]`

**Chức năng:**
- Tạo view "All Emails"
- Seed dữ liệu email mẫu
- Cấu hình view fields

---

### `workspace:seed:report-module`
**File:** `report/seeder/mkt-report-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu báo cáo.

**Options:**
- `-w, --workspace-id [workspace_id]`

**Chức năng:**
- Tạo view "All Reports"
- Seed dữ liệu báo cáo mẫu

---

### `workspace:seed:option-module`
**File:** `setting/seeder/mkt-option-data-seed-dev-workspace.command.ts`

**Mô tả:** Seed dữ liệu cài đặt/options.

---

## 📝 Lưu ý chung

1. **Workspace ID**: Hầu hết các seeder commands hỗ trợ option `-w, --workspace-id`. Nếu không cung cấp, command sẽ chạy cho tất cả workspace có trạng thái ACTIVE.

2. **Idempotent**: Các seeder commands được thiết kế idempotent - có thể chạy lại nhiều lần mà không gây duplicate data. Views cũ sẽ bị xóa và tạo lại.

3. **Transaction**: Các thao tác database được wrap trong transaction để đảm bảo tính toàn vẹn dữ liệu.

4. **Cache Flush**: Sau khi seed xong, workspace cache sẽ được flush để đảm bảo dữ liệu mới được phản ánh.

5. **Dependencies**: Một số commands phụ thuộc vào dữ liệu từ các commands khác. Ví dụ: `mkt-order-item` cần có `mkt-order` trước.

---

## 🚀 Ví dụ sử dụng phổ biến

### Seed toàn bộ dữ liệu cho một workspace mới:

```bash
# Seed core modules
npx nx command twenty-server -- workspace:seed:department-module -w <workspace_id>
npx nx command twenty-server -- workspace:seed:customer-module -w <workspace_id>
npx nx command twenty-server -- workspace:seed:order-module -w <workspace_id>
npx nx command twenty-server -- workspace-seed-dev:mkt-payments <workspace_id>

# Seed invoice modules
npx nx command twenty-server -- workspace:seed:invoice-module -w <workspace_id>
npx nx command twenty-server -- workspace:seed:sinvoice-module -w <workspace_id>

# Register cron jobs
npx nx command twenty-server -- cron:register:mkt
```

### Cập nhật tier khách hàng:

```bash
npx nx command twenty-server -- mkt:customer:tier-update -c <customer_id> -w <workspace_id>
```

### Apply optimistic locking cho orders:

```bash
npx nx command twenty-server -- workspace:order:opt-locking -w <workspace_id>
```
