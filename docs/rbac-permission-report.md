# Báo cáo Hệ thống Phân quyền RBAC Enterprise

> **Ngày tạo báo cáo**: 2026-02-07
> **Nguồn dữ liệu**: Code module `mkt-rbac-enterprise-grade` + Database workspace

---

## Mục lục

1. [Tổng quan Kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Permission Templates (Mẫu quyền)](#2-permission-templates-mẫu-quyền)
3. [Permission Resources (Tài nguyên)](#3-permission-resources-tài-nguyên)
4. [Permission Actions (Hành động)](#4-permission-actions-hành-động)
5. [Ma trận Quyền theo Template x Resource](#5-ma-trận-quyền-theo-template-x-resource)
6. [System Actions theo Template](#6-system-actions-theo-template)
7. [Cấp độ Phân quyền Dữ liệu (Data Access Scope)](#7-cấp-độ-phân-quyền-dữ-liệu-data-access-scope)
8. [Permission Contexts (Ngữ cảnh quyền)](#8-permission-contexts-ngữ-cảnh-quyền)
9. [Data Access Policies (Chính sách Truy cập Dữ liệu)](#9-data-access-policies-chính-sách-truy-cập-dữ-liệu)
10. [Cơ chế Đặc biệt](#10-cơ-chế-đặc-biệt)
11. [Pipeline Kiểm tra Quyền](#11-pipeline-kiểm-tra-quyền)
12. [Thống kê Tổng hợp](#12-thống-kê-tổng-hợp)

---

## 1. Tổng quan Kiến trúc

Hệ thống RBAC Enterprise sử dụng **Casbin** làm engine phân quyền, kết hợp với:
- **Template-based RBAC**: Gán quyền qua mẫu (template) theo cấp bậc tổ chức
- **Hierarchy-based Access**: Tự động xác định phạm vi truy cập theo level trong tổ chức
- **Department-based Authorization**: Phân quyền theo phòng ban
- **Data Access Policies**: Lọc dữ liệu ở mức Row/Field/Column
- **Redis Caching**: Cache quyền để tối ưu hiệu năng
- **PostgreSQL NOTIFY**: Đồng bộ chính sách thời gian thực

### Bảng Dữ liệu (16 tables)

| Bảng | Mô tả |
|------|-------|
| `mktPermissionTemplate` | Mẫu quyền (template) |
| `mktTemplateResourcePermission` | Quyền tài nguyên theo template |
| `mktTemplateSystemAction` | Quyền system action theo template |
| `mktTemplateAccessLimitation` | Giới hạn truy cập theo template |
| `mktUserPermissionTemplate` | Gán template cho người dùng |
| `mktPermissionResource` | Định nghĩa tài nguyên |
| `mktPermissionAction` | Định nghĩa hành động |
| `mktPermissionContext` | Định nghĩa ngữ cảnh quyền |
| `mktPermissionPriorityConfig` | Cấu hình ưu tiên quyền |
| `mktDataAccessPolicy` | Chính sách truy cập dữ liệu |
| `mktPolicyVersion` | Lịch sử phiên bản policy |
| `mktPolicyChangeRequest` | Yêu cầu thay đổi policy |
| `mktPolicyApproval` | Phê duyệt thay đổi policy |
| `mktTemporaryPermission` | Quyền tạm thời |
| `mktUserPermissionOverride` | Ghi đè quyền người dùng |
| `mktPermissionAudit` | Nhật ký kiểm tra quyền |

---

## 2. Permission Templates (Mẫu quyền)

Hiện tại hệ thống có **13 permission templates** được seed sẵn (system templates):

### 2.1 Templates theo Cấp bậc (HIERARCHY_BASED)

| # | Template Key | Tên | Level | Priority | Áp dụng cho Levels | Chiến lược |
|---|-------------|-----|-------|----------|---------------------|------------|
| 1 | `CEO` | Tổng Giám đốc | 1 | 1000 | [1] | PRIORITY_BASED |
| 2 | `VP` | Phó Tổng Giám đốc | 2 | 900 | [2] | PRIORITY_BASED |
| 3 | `DIRECTOR` | Giám đốc | 3 | 800 | [3] | PRIORITY_BASED |
| 4 | `MANAGER` | Trưởng phòng | 4 | 700 | [4] | PRIORITY_BASED |
| 5 | `TEAM_LEAD` | Trưởng nhóm | 5 | 600 | [5] | PRIORITY_BASED |

### 2.2 Templates theo Phòng ban (DEPARTMENT_BASED)

| # | Template Key | Tên | Level | Priority | Áp dụng cho Levels | Chiến lược |
|---|-------------|-----|-------|----------|---------------------|------------|
| 6 | `SALES_DIRECTOR` | Giám đốc kinh doanh | 5 | 800 | [5] | PRIORITY_BASED |
| 7 | `FINANCE_ANALYST` | Chuyên viên tài chính | 6 | 550 | [5, 6, 7] | MOST_RESTRICTIVE |
| 8 | `SALES_MANAGER` | Trưởng phòng kinh doanh | 7 | 700 | [6, 7] | PRIORITY_BASED |
| 9 | `SUPPORT_STAFF` | Nhân viên hỗ trợ | 8 | 500 | [7, 8, 9, 10] | PRIORITY_BASED |
| 10 | `ACCOUNTANT_STAFF` | Nhân viên kế toán | 8 | 550 | [7, 8, 9, 10] | PRIORITY_BASED |
| 11 | `SALES_STAFF` | Nhân viên kinh doanh | 9 | 500 | [8, 9, 10] | PRIORITY_BASED |

### 2.3 Templates theo Vai trò (ROLE_BASED)

| # | Template Key | Tên | Level | Priority | Áp dụng cho Levels | Chiến lược |
|---|-------------|-----|-------|----------|---------------------|------------|
| 12 | `SENIOR` | Nhân viên cao cấp | 6 | 500 | [6] | PRIORITY_BASED |
| 13 | `JUNIOR` | Nhân viên | 7 | 400 | [7] | PRIORITY_BASED |

> **Ghi chú**: Priority cao hơn = ưu tiên hơn khi xung đột quyền. CEO (1000) > VP (900) > DIRECTOR (800) > ...

---

## 3. Permission Resources (Tài nguyên)

Hệ thống định nghĩa **12 tài nguyên** được bảo vệ:

| # | Resource Key | Tên | Phân loại | Mô tả |
|---|-------------|-----|-----------|-------|
| 1 | `CUSTOMERS` | Khách hàng | BUSINESS_DATA | Dữ liệu và hồ sơ khách hàng |
| 2 | `CONTRACTS` | Hợp đồng | BUSINESS_DATA | Hợp đồng và thỏa thuận khách hàng |
| 3 | `ORDERS` | Đơn hàng | BUSINESS_DATA | Đơn hàng bán và giao dịch |
| 4 | `PRODUCTS` | Sản phẩm | BUSINESS_DATA | Danh mục sản phẩm và tồn kho |
| 5 | `LICENSES` | Giấy phép | BUSINESS_DATA | Giấy phép phần mềm và gói đăng ký |
| 6 | `INVOICES` | Hóa đơn | FINANCIAL | Hóa đơn và thanh toán khách hàng |
| 7 | `PAYMENTS` | Thanh toán | FINANCIAL | Giao dịch và hồ sơ thanh toán |
| 8 | `DEPARTMENTS` | Phòng ban | SYSTEM_CONFIG | Phòng ban tổ chức và phân cấp |
| 9 | `USERS` | Người dùng | SYSTEM_CONFIG | Tài khoản người dùng và quyền hạn |
| 10 | `SETTINGS` | Cài đặt | SYSTEM_CONFIG | Cấu hình và cài đặt hệ thống |
| 11 | `REPORTS` | Báo cáo | REPORTING | Báo cáo kinh doanh và phân tích |
| 12 | `DASHBOARD` | Bảng điều khiển | REPORTING | Bảng điều khiển quản lý và KPI |

### Phân loại Tài nguyên

```
BUSINESS_DATA (5): CUSTOMERS, CONTRACTS, ORDERS, PRODUCTS, LICENSES
FINANCIAL     (2): INVOICES, PAYMENTS
SYSTEM_CONFIG (3): DEPARTMENTS, USERS, SETTINGS
REPORTING     (2): REPORTS, DASHBOARD
```

---

## 4. Permission Actions (Hành động)

Hệ thống định nghĩa **12 hành động** với các mức độ rủi ro khác nhau:

| # | Action Key | Tên | Phân loại | Mức rủi ro | Cần phê duyệt |
|---|-----------|-----|-----------|-----------|----------------|
| 1 | `READ` | Đọc | BASIC_CRUD | LOW | Không |
| 2 | `CREATE` | Tạo mới | BASIC_CRUD | LOW | Không |
| 3 | `UPDATE` | Cập nhật | BASIC_CRUD | MEDIUM | Không |
| 4 | `DELETE` | Xóa | BASIC_CRUD | HIGH | **Có** |
| 5 | `ARCHIVE` | Lưu trữ | BASIC_CRUD | MEDIUM | Không |
| 6 | `RESTORE` | Khôi phục | BASIC_CRUD | HIGH | **Có** |
| 7 | `IMPORT` | Nhập liệu | BASIC_CRUD | HIGH | **Có** |
| 8 | `EXPORT` | Xuất dữ liệu | REPORTING | MEDIUM | Không |
| 9 | `APPROVE` | Phê duyệt | SYSTEM | MEDIUM | Không |
| 10 | `REJECT` | Từ chối | SYSTEM | MEDIUM | Không |
| 11 | `ASSIGN` | Phân công | CONFIGURATION | MEDIUM | Không |
| 12 | `MANAGE` | Quản lý | CONFIGURATION | HIGH | Không |

### Phân loại theo Mức rủi ro

```
LOW    (2): READ, CREATE
MEDIUM (5): UPDATE, ARCHIVE, EXPORT, APPROVE, REJECT, ASSIGN
HIGH   (4): DELETE*, RESTORE*, IMPORT*, MANAGE
           (* = cần phê duyệt trước khi thực hiện)
```

---

## 5. Ma trận Quyền theo Template x Resource

### Chú thích ký hiệu

| Ký hiệu | Ý nghĩa |
|----------|---------|
| R | READ |
| C | CREATE |
| U | UPDATE |
| D | DELETE |
| E | EXPORT |
| I | IMPORT |
| M | MANAGE |
| Ap | APPROVE |
| Rj | REJECT |
| Ar | ARCHIVE |
| Rs | RESTORE |
| As | ASSIGN |
| **x** | Bị cấm (denied) |
| - | Không có quyền |
| (scope) | Điều kiện áp dụng |

### 5.1 CEO - Tổng Giám đốc (Level 1, Priority 1000)

**Phạm vi**: TOÀN BỘ hệ thống, không giới hạn

| Tài nguyên | R | C | U | D | E | I | M | Ap | Rj | Ar | Rs | As |
|------------|---|---|---|---|---|---|---|----|----|----|----|-----|
| CUSTOMERS | v | v | v | v | v | v | v | v | v | v | v | v |
| ORDERS | v | v | v | v | v | v | v | v | v | v | v | v |
| PRODUCTS | v | v | v | v | v | v | v | v | v | v | v | v |
| LICENSES | v | v | v | v | v | v | v | v | v | v | v | v |
| INVOICES | v | v | v | v | v | v | v | v | v | v | v | v |
| PAYMENTS | v | v | v | v | v | v | v | v | v | v | v | v |
| DEPARTMENTS | v | v | v | v | v | v | v | v | v | v | v | v |
| USERS | v | v | v | v | v | v | v | v | v | v | v | v |
| SETTINGS | v | v | v | v | v | v | v | v | v | v | v | v |
| REPORTS | v | v | v | v | v | v | v | v | v | v | v | v |

> **Tổng kết**: Toàn quyền trên tất cả 12 actions x 10 resources = **120 quyền**

### 5.2 VP - Phó Tổng Giám đốc (Level 2, Priority 900)

| Tài nguyên | R | C | U | D | E | I | M | Ap | Rj | Ar | Rs | As |
|------------|---|---|---|---|---|---|---|----|----|----|----|-----|
| CUSTOMERS | v | v | v | v | - | - | - | - | - | - | - | - |
| ORDERS | v | v | v | v | - | - | - | - | - | - | - | - |
| PRODUCTS | v | v | v | v | - | - | - | - | - | - | - | - |
| LICENSES | v | v | v | v | - | - | - | - | - | - | - | - |
| REPORTS | v | - | - | - | v | - | - | - | - | - | - | - |

> **Tổng kết**: CRUD 4 tài nguyên chính + Đọc/Xuất báo cáo = **18 quyền**

### 5.3 DIRECTOR - Giám đốc (Level 3, Priority 800)

| Tài nguyên | R | C | U | D | E | Điều kiện |
|------------|---|---|---|---|---|-----------|
| CUSTOMERS | v | v | v | **x** | v | Cấm: DELETE |
| ORDERS | v | v | v | **x** | v | Cấm: DELETE |
| PRODUCTS | v | - | - | - | v | Chỉ xem và xuất |
| LICENSES | v | - | - | - | v | Chỉ xem và xuất |

> **Tổng kết**: Đọc/Tạo/Cập nhật + Xuất, nhưng **không được XÓA** = **10 quyền**

### 5.4 MANAGER - Trưởng phòng (Level 4, Priority 700)

| Tài nguyên | R | C | U | D | E | Điều kiện |
|------------|---|---|---|---|---|-----------|
| CUSTOMERS | v | v | v | **x** | v | `ownRecordsOnly: false` (xem cả phòng) |
| ORDERS | v | v | v | **x** | v | `ownRecordsOnly: false` |
| PRODUCTS | v | - | - | - | v | Chỉ xem và xuất |

> **Tổng kết**: Quản lý KH và ĐH trong phòng ban, **không được XÓA** = **8 quyền**

### 5.5 SALES_DIRECTOR - Giám đốc Kinh doanh (Level 5, Priority 800)

| Tài nguyên | R | C | U | D | E | Ap | As | Điều kiện |
|------------|---|---|---|---|---|----|----|-----------|
| CUSTOMERS | v | v | v | v | v | - | v | `scope: DEPARTMENT` |
| ORDERS | v | v | v | v | - | v | - | `scope: DEPARTMENT` |
| PRODUCTS | v | - | - | - | v | - | - | Không giới hạn |
| LICENSES | v | - | - | **x** | - | - | - | `scope: DEPARTMENT`, cấm CUD |
| INVOICES | v | - | - | **x** | v | - | - | `scope: TEAM`, cấm CUD |
| PAYMENTS | v | - | - | **x** | - | - | - | `scope: TEAM`, chỉ xem trạng thái |

> **Đặc biệt**: Có quyền ASSIGN khách hàng, APPROVE đơn hàng trong phạm vi phòng kinh doanh

### 5.6 SALES_MANAGER - Trưởng phòng Kinh doanh (Level 7, Priority 700)

| Tài nguyên | R | C | U | D | E | Ap | As | Điều kiện |
|------------|---|---|---|---|---|----|----|-----------|
| CUSTOMERS | v | v | v | **x** | v | - | v | `scope: TEAM` |
| ORDERS | v | v | v | **x** | - | v | - | `scope: TEAM` |
| PRODUCTS | v | - | - | - | v | - | - | Không giới hạn |
| LICENSES | v | - | v | **x** | - | - | - | `scope: TEAM` |
| INVOICES | v | - | - | **x** | - | - | - | `scope: TEAM`, chỉ xem |
| PAYMENTS | v | - | - | **x** | - | - | - | `scope: TEAM`, chỉ xem trạng thái |

### 5.7 SUPPORT_STAFF - Nhân viên Hỗ trợ (Level 8, Priority 500)

| Tài nguyên | R | C | U | D | Điều kiện |
|------------|---|---|---|---|-----------|
| CUSTOMERS | v | - | v | **x** | Chỉ cập nhật: `notes, supportNotes, tags` |
| ORDERS | v | - | v | **x** | Chỉ cập nhật: `supportStatus, supportNotes, priority` |
| PRODUCTS | v | - | - | - | Chỉ xem |
| LICENSES | v | - | - | **x** | Chỉ xem |
| INVOICES | v | - | - | **x** | Chỉ xem trạng thái (`viewStatusOnly`) |
| PAYMENTS | v | - | - | **x** | Chỉ xem trạng thái (`viewStatusOnly`) |

> **Đặc biệt**: Quyền UPDATE bị giới hạn chỉ áp dụng cho các trường cụ thể

### 5.8 ACCOUNTANT_STAFF - Nhân viên Kế toán (Level 8, Priority 550)

| Tài nguyên | R | C | U | D | E | Ap | Điều kiện |
|------------|---|---|---|---|---|----|----|
| CUSTOMERS | v | - | - | **x** | - | - | Chỉ xem |
| ORDERS | v | - | - | **x** | v | - | Chỉ xem và xuất |
| PRODUCTS | v | - | - | - | - | - | Chỉ xem |
| LICENSES | v | - | - | **x** | - | - | Chỉ xem |
| INVOICES | v | v | v | **x** | v | v | Đầy đủ CRUD (trừ DELETE), có APPROVE |
| PAYMENTS | v | v | v | **x** | v | v | Đầy đủ CRUD (trừ DELETE), có APPROVE |
| REPORTS | v | - | - | - | v | - | Chỉ báo cáo: FINANCIAL, INVOICE, PAYMENT |

> **Đặc biệt**: Toàn quyền trên INVOICES và PAYMENTS (trừ DELETE), chỉ xem các tài nguyên khác

### 5.9 SALES_STAFF - Nhân viên Kinh doanh (Level 9, Priority 500)

| Tài nguyên | R | C | U | D | E | Điều kiện |
|------------|---|---|---|---|---|-----------|
| CUSTOMERS | v | v | v | **x** | **x** | `scope: OWN`, lọc theo: `accountOwnerId` |
| ORDERS | v | v | v | **x** | - | `scope: OWN`, lọc theo: `createdById`, cấm APPROVE |
| PRODUCTS | v | - | - | - | - | Chỉ xem danh mục |
| LICENSES | v | - | - | **x** | - | `scope: OWN`, chỉ xem license của mình |
| INVOICES | v | - | - | **x** | **x** | `scope: OWN_ORDERS`, chỉ xem hóa đơn của ĐH mình |

> **Đặc biệt**: Chỉ truy cập dữ liệu của **chính mình** (OWN scope), không xuất được

---

## 6. System Actions theo Template

Hệ thống định nghĩa **16 system actions** và phân quyền như sau:

| System Action | CEO | VP | DIRECTOR | MANAGER | TEAM_LEAD | FIN_ANALYST | SENIOR | JUNIOR |
|---------------|-----|-----|----------|---------|-----------|-------------|--------|--------|
| `manage_users` | v | v | - | - | - | - | - | - |
| `invite_users` | v | v | v | v | v | - | - | - |
| `remove_users` | v | v | - | - | - | - | - | - |
| `assign_roles` | v | v | v | - | - | - | - | - |
| `manage_settings` | v | v | - | - | - | - | - | - |
| `manage_integrations` | v | v | - | - | - | - | - | - |
| `manage_billing` | v | - | - | - | - | - | - | - |
| `bulk_export` | v | v | v | v | v | v | v | - |
| `bulk_import` | v | v | v | v | - | - | - | - |
| `bulk_delete` | v | - | - | - | - | - | - | - |
| `api_access` | v | v | v | v | v | v | v | v |
| `webhook_management` | v | - | - | - | - | - | - | - |
| `view_audit_logs` | v | v | v | - | - | v | - | - |
| `manage_compliance` | v | - | - | - | - | - | - | - |
| `impersonate_user` | v | - | - | - | - | - | - | - |
| `administration` | v | - | - | - | - | - | - | - |

### Phân tích System Actions

| Cấp bậc | Số System Actions | Đặc quyền riêng |
|----------|------------------|------------------|
| CEO (1) | **16/16** | `bulk_delete`, `manage_billing`, `webhook_management`, `manage_compliance`, `impersonate_user`, `administration` |
| VP (2) | **10/16** | `manage_users`, `remove_users`, `manage_settings`, `manage_integrations` |
| DIRECTOR (3) | **6/16** | `assign_roles` |
| MANAGER (4) | **4/16** | `bulk_import` |
| TEAM_LEAD (5) | **3/16** | - |
| FINANCE_ANALYST (6) | **3/16** | `view_audit_logs` (đặc biệt cho tài chính) |
| SENIOR (6) | **2/16** | - |
| JUNIOR (7) | **1/16** | Chỉ có `api_access` |

---

## 7. Cấp độ Phân quyền Dữ liệu (Data Access Scope)

Hệ thống định nghĩa **4 cấp độ phân quyền dữ liệu** dựa trên hierarchy level:

```
+-------------------------------------------------------------------+
|  Level 1-3: CEO, VP, DIRECTOR                                     |
|  --> ALL_DEPARTMENTS: Truy cập toàn bộ dữ liệu mọi phòng ban     |
+-------------------------------------------------------------------+
|  Level 4-6: MANAGER, TEAM_LEAD, SENIOR                            |
|  --> OWN_AND_CHILD_DEPARTMENTS: Phòng mình + phòng con            |
+-------------------------------------------------------------------+
|  Level 7: TEAM_LEAD / MANAGER cấp nhỏ                             |
|  --> OWN_DEPARTMENT_AND_TEAM: Phòng mình + team trực tiếp         |
+-------------------------------------------------------------------+
|  Level 8-11: STAFF, JUNIOR, INTERN                                |
|  --> OWN_RECORDS: Chỉ dữ liệu của chính mình                     |
+-------------------------------------------------------------------+
```

### Ngưỡng Phân cấp (Hierarchy Thresholds)

| Ngưỡng | Giá trị | Mô tả |
|--------|---------|-------|
| `FULL_ACCESS_MAX_LEVEL` | 3 | Level 1-3 có toàn quyền truy cập |
| `CHILD_DEPARTMENTS_MAX_LEVEL` | 6 | Level 1-6 xem được phòng con |
| `TEAM_ACCESS_LEVEL` | 7 | Level 7 xem được team |
| `MANAGE_TEAM_MAX_LEVEL` | 7 | Level 1-7 quản lý team |
| `VIEW_SUBORDINATES_MAX_LEVEL` | 7 | Level 1-7 xem cấp dưới |

### Phạm vi Truy cập Phân cấp (Hierarchical Access Scopes)

| Phạm vi | Mô tả | Áp dụng cho |
|---------|-------|-------------|
| `SELF` | Chỉ dữ liệu của chính mình | Level 8-11 |
| `DIRECT_SUBORDINATES` | Dữ liệu cấp dưới trực tiếp | Level 7 (Manager) |
| `REPORTING_CHAIN` | Toàn bộ chuỗi báo cáo | Level 1-6 |
| `DEPARTMENT` | Toàn bộ phòng ban | Level 4-6 |
| `ALL` | Toàn bộ hệ thống | Level 1-3 |

### Hạn chế Ngang hàng (Peer Restriction)

Hệ thống hỗ trợ chặn truy cập giữa các quản lý ngang hàng:

| Kiểu | Mô tả |
|------|-------|
| `SAME_HIERARCHY_LEVEL_SAME_PARENT` | Cùng level + cùng quản lý = ngang hàng |
| `SAME_HIERARCHY_LEVEL` | Cùng level = ngang hàng |
| `SAME_DEPARTMENT_DIFFERENT_MANAGER` | Cùng phòng khác quản lý = ngang hàng |

---

## 8. Permission Contexts (Ngữ cảnh quyền)

Hệ thống có **6 ngữ cảnh quyền** (system defaults) trong database:

| # | Context Key | Loại | Tên | Mô tả | Ưu tiên |
|---|-------------|------|-----|-------|---------|
| 1 | `own` | OWN_RECORDS | Chỉ bản ghi của mình | Người dùng chỉ truy cập bản ghi do mình tạo hoặc được gán | 0 |
| 2 | `own_and_supporting` | OWN_RECORDS | Bản ghi mình và hỗ trợ | Bản ghi của mình + của người hỗ trợ | 5 |
| 3 | `team` | TEAM_RECORDS | Bản ghi Team | Bản ghi của các thành viên trong team | 10 |
| 4 | `hierarchical` | TEAM_RECORDS | Bản ghi Phân cấp | Bản ghi của cấp dưới trong chuỗi báo cáo | 15 |
| 5 | `department` | DEPARTMENT_RECORDS | Bản ghi Phòng ban | Bản ghi từ phòng ban của mình và phòng con | 20 |
| 6 | `all` | ALL_RECORDS | Tất cả Bản ghi | Truy cập toàn bộ bản ghi, không giới hạn | 100 |

### Các loại Context nâng cao hỗ trợ trong code (40+ loại)

Ngoài 6 loại trên, code hỗ trợ thêm các context type nâng cao:

**Phân cấp nâng cao**: REGION_RECORDS, DIVISION_RECORDS, BUSINESS_UNIT_RECORDS, SUBSIDIARY_RECORDS, BRANCH_RECORDS

**Phân loại dữ liệu**: CONFIDENTIAL_ONLY, PUBLIC_RECORDS, RESTRICTED_DATA, FINANCIAL_SENSITIVE, PII_PROTECTED

**Tuân thủ**: GDPR_COMPLIANT, SOX_CONTROLLED, HIPAA_PROTECTED, AUDIT_TRACKED, RETENTION_POLICY

**Bảo mật**: DEVICE_LIMITED, IP_WHITELIST, VPN_REQUIRED, MFA_PROTECTED, CERTIFICATE_BASED

**Động**: VALUE_BASED, RISK_BASED, APPROVAL_CHAIN, WORKFLOW_STATE, DELEGATION_CHAIN

**Multi-Tenant**: TENANT_ISOLATED, CROSS_TENANT, PARTNER_SHARED, VENDOR_ACCESS, CLIENT_PORTAL

---

## 9. Data Access Policies (Chính sách Truy cập Dữ liệu)

Hệ thống có **8 chính sách** được cấu hình trong database:

### 9.1 Sales Customer Ownership Policy
- **Đối tượng**: `mktCustomer` | **Loại**: ROW_LEVEL | **Ưu tiên**: 10
- **Mô tả**: Nhân viên KD chỉ xem khách hàng được gán cho mình
- **Điều kiện**:
  - Trạng thái cho phép: `active`, `prospect`, `lead`
  - Trạng thái cấm: `archived`, `blocked`
  - Quyền sở hữu: lọc theo `accountOwnerId`, không chia sẻ (`allowShared: false`)

### 9.2 Sales Order Hierarchy Access Policy
- **Đối tượng**: `mktOrder` | **Loại**: ROW_LEVEL | **Ưu tiên**: 8
- **Mô tả**: Phân quyền đơn hàng theo cấp bậc tổ chức
- **Điều kiện**:
  - Trạng thái cấm: `deleted`, `void`
  - Phòng ban cho phép: SALES, SALES_DOMESTIC, SALES_INTERNATIONAL, SALES_ONLINE, SALES_PARTNER
  - Không cho truy cập chéo phòng (`crossDepartmentAccess: false`)
  - **Quy tắc phân cấp**:

| Quy tắc | Level | Phạm vi | Mô tả |
|---------|-------|---------|-------|
| STAFF_SELF_ONLY | 8-11 | SELF | Nhân viên chỉ xem đơn hàng do mình tạo |
| MANAGER_SUBORDINATES | 7 | DIRECT_SUBORDINATES | Quản lý xem ĐH của cấp dưới trực tiếp |
| UPPER_MANAGEMENT_CHAIN | 1-6 | REPORTING_CHAIN | Cấp trên xem toàn bộ chuỗi báo cáo |

  - **Hạn chế ngang hàng**: Quản lý ngang hàng không xem được ĐH của nhau (`blockPeerAccess: true`)

### 9.3 Support Recent Access Policy
- **Đối tượng**: `mktCustomer` | **Loại**: ROW_LEVEL | **Ưu tiên**: 7
- **Mô tả**: Nhân viên hỗ trợ chỉ xem khách hàng hoạt động gần đây
- **Điều kiện**:
  - Trạng thái cho phép: `active`, `pending_support` | Cấm: `archived`
  - Khoảng thời gian: Chỉ 90 ngày gần nhất (`daysBack: 90`)
  - Cấp hỗ trợ tối đa: `tier2`

### 9.4 Accounting Invoice Access Policy
- **Đối tượng**: `mktInvoice` | **Loại**: ROW_LEVEL | **Ưu tiên**: 9
- **Mô tả**: Nhân viên kế toán truy cập hóa đơn
- **Điều kiện**:
  - Trạng thái cho phép: `draft`, `sent`, `paid`, `overdue` | Cấm: `void`
  - Giá trị: 0 - 1.000.000
  - Dữ liệu mật: Không bật (`confidential: false`)

### 9.5 Team Manager View Policy
- **Đối tượng**: `mktProduct` | **Loại**: ROW_LEVEL | **Ưu tiên**: 11
- **Mô tả**: Quản lý xem sản phẩm của team
- **Điều kiện**:
  - Truy cập team: lọc `accountOwnerId`, bao gồm thành viên team
  - Bao gồm số liệu, không bao gồm ghi chú cá nhân
  - Phân cấp: tối đa 2 cấp

### 9.6 Tech System Administration Policy
- **Đối tượng**: `mktKpi` | **Loại**: ROW_LEVEL | **Ưu tiên**: 12
- **Mô tả**: Quản trị hệ thống truy cập KPI
- **Điều kiện**:
  - Danh mục cho phép: `performance`, `system`, `usage`
  - Danh mục cấm: `financial`, `personal`
  - Thao tác cho phép: `read`, `update` | Cấm: `delete`
  - Bắt buộc kiểm toán (`auditRequired: true`)

### 9.7 HR Confidential Data Policy
- **Đối tượng**: `workspaceMember` | **Loại**: ROW_LEVEL | **Ưu tiên**: 15
- **Mô tả**: Bảo vệ dữ liệu nhân sự bảo mật
- **Điều kiện**:
  - Trường cho phép: `name`, `email`, `department`, `role`, `startDate`
  - Trường bị hạn chế: `salary`, `personalInfo`, `evaluations`
  - Dữ liệu mật: bật, cần phê duyệt (`requiresApproval: true`)
  - Trạng thái cho phép: `active`, `on_leave` | Cấm: `terminated`

### 9.8 Department Head Override Policy
- **Đối tượng**: `mktContract` | **Loại**: ROW_LEVEL | **Ưu tiên**: 20
- **Mô tả**: Trưởng phòng ghi đè quyền hợp đồng
- **Điều kiện**:
  - Khoảng thời gian: 3 năm gần nhất (`daysBack: 1095`)
  - Bảo mật: bật, có nhật ký kiểm toán
  - Giới hạn giá trị: tối đa 500.000, cần phê duyệt kép (`requiresDualApproval: true`)
  - Phạm vi: phòng ban (`scope: department`)

---

## 10. Cơ chế Đặc biệt

### 10.1 Temporary Permission (Quyền tạm thời)

Cho phép cấp quyền tạm thời với thời hạn, hỗ trợ các mục đích:

| Mục đích | Mô tả |
|----------|-------|
| `EMERGENCY_ACCESS` | Truy cập khẩn cấp |
| `CROSS_DEPARTMENT_COLLABORATION` | Hợp tác liên phòng |
| `PROJECT_ASSIGNMENT` | Phân công dự án |
| `TEMPORARY_COVERAGE` | Thay thế tạm thời |
| `TRAINING_ACCESS` | Truy cập đào tạo |
| `AUDIT_REVIEW` | Kiểm toán |

**Lý do thu hồi**: EXPIRED, TASK_COMPLETED, SECURITY_CONCERN, ROLE_CHANGED, MANUAL_REVOCATION, POLICY_VIOLATION

### 10.2 User Permission Override (Ghi đè quyền)

Cho phép ngoại lệ quyền cho người dùng cụ thể, với các lý do:

| Lý do | Mô tả |
|-------|-------|
| `TEMPORARY_ESCALATION` | Nâng cấp tạm thời |
| `BUSINESS_EXCEPTION` | Ngoại lệ kinh doanh |
| `EMERGENCY_ACCESS` | Truy cập khẩn cấp |
| `SPECIAL_PROJECT` | Dự án đặc biệt |
| `AUDIT_REQUIREMENT` | Yêu cầu kiểm toán |
| `SYSTEM_MAINTENANCE` | Bảo trì hệ thống |
| `COMPLIANCE_REQUIREMENT` | Yêu cầu tuân thủ |

### 10.3 Thứ tự Ưu tiên Kiểm tra Quyền

Thứ tự ưu tiên khi kiểm tra quyền (cao -> thấp):

```
1. User Override          --> Ưu tiên cao nhất
2. Assigned Templates     --> Theo priority của template
3. Executive Level (1-3)  --> CEO, VP, Director
4. Manager Level (<=7)    --> Manager+
5. Department Membership  --> Theo phòng ban
6. Default DENY           --> Mặc định từ chối
```

### 10.4 Chiến lược Giải quyết Xung đột

| Chiến lược | Mô tả | Sử dụng bởi |
|-----------|-------|-------------|
| `PRIORITY_BASED` | Template priority cao thắng | Hầu hết templates |
| `MOST_RESTRICTIVE` | Quyền hạn chế nhất thắng | FINANCE_ANALYST |
| `MOST_PERMISSIVE` | Quyền rộng nhất thắng | Trường hợp đặc biệt |
| `DENY_WINS` | Từ chối thắng khi xung đột | Các data access policies |
| `ALLOW_WINS` | Cho phép thắng khi xung đột | Trường hợp đặc biệt |
| `HIGHEST_PRIORITY` | Priority cao nhất thắng | Cấu hình tùy chỉnh |

---

## 11. Pipeline Kiểm tra Quyền

Mỗi yêu cầu truy cập đi qua **15 bước** kiểm tra:

```
 1.  PRE_VALIDATION              --> Kiểm tra đầu vào
 2.  USER_CONTEXT_RESOLUTION     --> Xác định ngữ cảnh người dùng
 3.  RESOURCE_IDENTIFICATION     --> Xác định tài nguyên
 4.  PERMISSION_TEMPLATE_CHECK   --> Kiểm tra template
 5.  ACTION_PERMISSION_VALIDATION --> Kiểm tra quyền hành động
 6.  RESOURCE_PERMISSION_CHECK   --> Kiểm tra quyền tài nguyên
 7.  HIERARCHY_VALIDATION        --> Kiểm tra phân cấp
 8.  DATA_ACCESS_POLICY_CHECK    --> Kiểm tra chính sách dữ liệu
 9.  SPECIAL_PERMISSIONS         --> Kiểm tra quyền đặc biệt
10.  SENSITIVE_DATA_CHECKS       --> Kiểm tra dữ liệu nhạy cảm
11.  DEPARTMENT_RESTRICTIONS     --> Kiểm tra giới hạn phòng ban
12.  DYNAMIC_CONDITIONS          --> Kiểm tra điều kiện động
13.  CACHE_PERFORMANCE           --> Tối ưu cache
14.  AUDIT_LOGGING               --> Ghi nhật ký
15.  FINAL_DECISION              --> Quyết định cuối cùng
```

### Kết quả Kiểm tra

| Kết quả | Mô tả |
|---------|-------|
| `PASS` | Cho phép truy cập |
| `FAIL` | Từ chối truy cập |
| `SKIP` | Bỏ qua bước kiểm tra |
| `WARNING` | Cho phép nhưng cảnh báo |
| `ERROR` | Lỗi hệ thống |

---

## 12. Thống kê Tổng hợp

| Chỉ tiêu | Giá trị |
|----------|---------|
| Tổng số Permission Templates | **13** |
| - Hierarchy-based | 5 |
| - Department-based | 6 |
| - Role-based | 2 |
| Tổng số Resources | **12** |
| Tổng số Actions | **12** |
| Tổng số System Actions | **16** |
| Tổng số Permission Contexts (DB) | **6** |
| Tổng số Context Types (Code) | **40+** |
| Tổng số Data Access Policies | **8** |
| Tổng số Hierarchy Levels | **11** (CEO -> Intern) |
| Tổng số bước Validation Pipeline | **15** |
| Tổng số database tables | **16** |
| Chiến lược giải quyết xung đột | **6** |
| Mức độ rủi ro | **4** (LOW, MEDIUM, HIGH, CRITICAL) |

### So sánh quyền giữa các cấp

```
CEO          ████████████████████████████████████  120 quyền tài nguyên + 16 sys actions
VP           ██████████████                         18 quyền tài nguyên + 10 sys actions
DIRECTOR     ████████                               10 quyền tài nguyên +  6 sys actions
MANAGER      ███████                                 8 quyền tài nguyên +  4 sys actions
SALES_DIR    ████████████                          ~14 quyền tài nguyên +  3 sys actions (phạm vi: PHÒNG BAN)
SALES_MGR    ██████████                            ~12 quyền tài nguyên +  0 sys actions (phạm vi: TEAM)
ACCT_STAFF   ████████████                          ~12 quyền tài nguyên +  0 sys actions (tập trung tài chính)
SUPPORT      ████████                              ~10 quyền tài nguyên +  0 sys actions (chủ yếu đọc)
SALES_STAFF  ██████                                 ~8 quyền tài nguyên +  0 sys actions (phạm vi: CÁ NHÂN)
SENIOR       ██                                      0 quyền tài nguyên +  2 sys actions (nền tảng)
JUNIOR       █                                       0 quyền tài nguyên +  1 sys action  (nền tảng)
```

---

> **Lưu ý**: Báo cáo này được tạo từ dữ liệu thực trong database và source code. Các template SENIOR, JUNIOR, TEAM_LEAD và FINANCE_ANALYST chưa có resource permissions cụ thể trong DB (chỉ có system actions), quyền tài nguyên sẽ được xác định bởi hierarchy level và data access scope.
