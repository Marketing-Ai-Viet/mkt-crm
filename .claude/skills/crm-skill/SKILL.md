---
name: Twenty CRM Development
description: Skill for developing Twenty CRM with mkt-core module. Use when creating WorkspaceEntity, Query Hooks, Resolvers, Services, or working with mkt-core business logic (License, Order, Payment, Customer, Department).
---

# Twenty CRM Development Skill

> Progressive disclosure documentation - Load only what you need

---

## Metadata

**Skill Type**: Full-Stack CRM Development
**Framework**: NestJS (Backend) + React (Frontend)
**Architecture**: Twenty CRM + mkt-core Custom Module
**Monorepo**: Nx Workspace
**Version**: 1.3
**Last Updated**: 2026-02-04

---

## Project Overview

**Tech Stack**: NestJS, TypeScript, PostgreSQL, Redis, GraphQL, React, Recoil
**Architecture**: Twenty CRM Fork với mkt-core Business Module
**Focus**: Marketing, Licensing, Orders, Invoices, Department Management

**Core Features**:
- License & Order Management
- Payment Integration (SEPay, BIDV)
- Department Hierarchy (Tree Structure)
- Customer & Product Management
- RBAC Enterprise
- KPI System
- 2FA Authentication

**Complete Overview**: [`PROJECT-OVERVIEW.md`](./PROJECT-OVERVIEW.md)

---

## Documentation Structure

### **Quick Start** (Load these first)
- [`reference/typescript-rules.md`](./reference/typescript-rules.md) - TypeScript conventions
- [`reference/naming-conventions.md`](./reference/naming-conventions.md) - File/variable naming
- [`reference/architecture.md`](./reference/architecture.md) - System architecture overview

### **Code Patterns** (Load when coding)
- [`reference/code-patterns.md`](./reference/code-patterns.md) - WorkspaceEntity, Hook, Service patterns
- [`reference/module-structure.md`](./reference/module-structure.md) - **Module structure pattern (invoice as reference)**
- [`templates/`](./templates/) - Ready-to-use code templates

### **Database** (Load when working with DB)
- [`reference/database.md`](./reference/database.md) - TypeORM, migrations, Twenty patterns

### **Development Workflow**
- [`reference/development-workflow.md`](./reference/development-workflow.md) - Daily workflow, commands

---

## Common Tasks -> Required Files

### Task: Create a new WorkspaceEntity

**Load**:
1. `reference/architecture.md` - Understand mkt-core structure
2. `reference/code-patterns.md` - WorkspaceEntity pattern
3. `templates/workspace-entity.template.ts` - Copy template

---

### Task: Create a new mkt-core Module

**Load**:
1. `reference/module-structure.md` - Standard module structure (invoice as reference)
2. `reference/architecture.md` - Module dependencies

**Key Points**:
- Follow invoice module structure
- Use Hooks chỉ cho operations của chính module đó
- Use Resolvers cho cross-module operations
- Tạo index.ts export barrels cho repositories, services, types

---

### Task: Create a Query Hook (Pre/Post)

**Load**:
1. `reference/module-structure.md` - Khi nào dùng Hook vs Resolver
2. `reference/code-patterns.md` - Hook patterns
3. `templates/pre-query-hook.template.ts`
4. `templates/post-query-hook.template.ts`

**⚠️ Important**: Chỉ dùng Hook khi:
- Làm việc với entity của chính module đó
- Logic đơn giản, không cần cross-module calls
- Validate/transform data trước/sau save

---

### Task: Create GraphQL Resolver

**Load**:
1. `reference/code-patterns.md` - Resolver pattern
2. `templates/resolver.template.ts`

---

### Task: Database migration

**Load**:
1. `reference/database.md` - Migration guide
2. `reference/development-workflow.md` - Commands

---

### Task: Work with MKT Product Integration

**Load**:
1. `reference/architecture.md` - MKT Product Integration Module section
2. Read source files in `mkt-core/mkt-product-integration/`

**Key Services**:
- `MktProductProxyService` - Facade for product operations (cache, validation, snapshots)
- `MktProductSyncService` - Auto-sync products on OAuth2 token acquired
- `MktSnapshotService` - Create immutable snapshots for orders
- `MktValidationService` - Validate products/packages for orders

**GraphQL Queries**: `mktDigitalProduct`, `mktDigitalProducts`, `mktDigitalPackage`, `mktDigitalPackagesByProduct`

---

### Task: Work with Generic Combo (mkt-combo)

**Load**:
1. Read source files in `mkt-core/mkt-combo/`
2. `reference/code-patterns.md` - Service patterns

**Key Concepts**:
- **DIGITAL_EXTERNAL**: Bán theo package (externalPackageId BẮT BUỘC)
- Items từ `mkt-product-integration` module
- Giá lấy từ `package.price`

**Key Services**:
- `GenericComboService` - Main service for combo operations
- `GenericComboCalculationService` - Price calculation with MoneyUtils
- `GenericComboValidationService` - Validate items with MKT Server
- `GenericComboSnapshotService` - Create immutable snapshots for orders
- `GenericComboCacheService` - Redis caching

**GraphQL Operations**:
- `mktGenericCombo`, `mktGenericComboByCode` - Query combo
- `mktCalculateGenericComboPrice` - Calculate price
- `mktValidateGenericCombo` - Validate for order
- `mktCreateGenericCombo`, `mktUpdateGenericCombo`, `mktDeleteGenericCombo` - Mutations

---

### Task: Work with Excel Export

**Load**:
1. `reference/architecture.md` - Excel Export Module section
2. Read source files in `mkt-core/common/excel/`

**Key Concepts**:
- **Sync Export**: Trả về file trực tiếp (max 10K rows)
- **Async Export**: Background job cho dataset lớn (max 50K rows)
- **Audit Logging**: Tất cả export operations đều được log
- **PII Protection**: Các cột chứa PII cần permission riêng

**Key Services**:
- `MktExcelService` - Core service tạo Excel/CSV files
- `ExportAuditService` - Audit logging cho export operations
- `ExcelExportJob` - Background job processor (BullMQ)

**Key Constants** (`mkt-core/common/excel/constants/`):
- `EXCEL_CONSTANTS` - Limits, batch size, MIME types
- `EXPORT_AUDIT_ACTION` - Audit action types
- `PII_COLUMNS` - Columns requiring special permission
- `ASYNC_EXPORT_CONFIG` - Job configuration

**GraphQL Operations**:
```graphql
# Sync export (< 10K rows) - Returns Base64 file
mutation mktExportOrdersToFile($input: ExportOrdersInput): ExportFileOutput

# Async export (> 10K rows) - Returns job ID
mutation mktRequestAsyncOrderExport($input: ExportOrdersInput): AsyncExportOutput

# Check async job status
query mktGetOrderExportJobStatus($jobId: String!): AsyncExportOutput
```

**Usage Example**:
```typescript
import {
  MktExcelService,
  ExcelColumn,
  EXCEL_CONSTANTS,
} from 'src/mkt-core/common/excel';

// Define columns
const columns: ExcelColumn<MyRow>[] = [
  { header: 'Mã', key: 'code', width: 15 },
  { header: 'Tên', key: 'name', width: 30 },
];

// Export to Base64 (for GraphQL response)
const result = this.excelService.exportToBase64(data, {
  sheetName: 'Data',
  columns,
  filename: 'export',
  freezeHeader: true,
  autoFilter: true,
});

// Export to CSV
const csvResult = this.excelService.exportToCsv(data, {
  sheetName: 'Data',
  columns,
  filename: 'export',
});
```

---

### Task: Work with Order Payment Features

**Load**:
1. Read source files in `mkt-core/order/services/domain/`
2. Read `mkt-core/order/docs/` for API guides

**Payment Confirmation** - Xác nhận thanh toán từ Sale và Accounting:
```typescript
// Key Services
PaymentConfirmationService - Handle sale/accounting confirmation
  - confirmSalePayment()      // Sale xác nhận đã nhận tiền
  - confirmAccountingPayment() // Kế toán xác nhận
  - revokeConfirmation()      // Thu hồi xác nhận
  - getConfirmationStatus()   // Lấy trạng thái

// GraphQL Operations
mutation confirmSalePayment($input: ConfirmPaymentInput!): ConfirmationResult
mutation confirmAccountingPayment($input: ConfirmPaymentInput!): ConfirmationResult
mutation revokePaymentConfirmation($input: RevokeConfirmationInput!): ConfirmationResult
query getOrderConfirmationStatus($orderId: String!): OrderConfirmationStatus
```

**Payment Reminder** - Gửi nhắc nhở thanh toán:
```typescript
// Key Services
PaymentReminderService - Handle manual payment reminder emails
  - sendReminder()            // Gửi reminder cho 1 order
  - sendBulkReminders()       // Gửi cho nhiều orders
  - getOrdersNeedingReminder() // Lấy danh sách cần nhắc

// GraphQL Operations
mutation sendPaymentReminder($input: SendPaymentReminderInput!): PaymentReminderResult
mutation sendBulkPaymentReminders($input: SendBulkRemindersInput!): BulkReminderResult
query ordersNeedingPaymentReminder($input: PaymentReminderFilterInput): PaginatedOrdersNeedingReminder
```

**Key Constants**:
- `PAYMENT_REMINDER_CONFIG` - Max reminders, min interval
- `CONFIRMATION_RULES` - Confirmation business rules
- `IS_PROTECTED_FROM_AUTO_LOCK` - Protect orders with sale confirmation

---

### Task: Work with Customer Notes & Purchase History

**Load**:
1. Read source files in `mkt-core/customer/`
2. `reference/code-patterns.md` - WorkspaceEntity pattern

**Customer Note Entity** (`MktCustomerNoteWorkspaceEntity`):
- Note types: GENERAL, CALL, MEETING, ISSUE, FOLLOWUP
- Rich text content
- Linked to customer with cascade delete

```typescript
// GraphQL Operations
query mktCustomerNotes($customerId: String!): [MktCustomerNote]
mutation createMktCustomerNote($input: CreateCustomerNoteInput!): MktCustomerNote
mutation updateMktCustomerNote($id: String!, $input: UpdateCustomerNoteInput!): MktCustomerNote
mutation deleteMktCustomerNote($id: String!): Boolean
```

**Purchase History Service** (`MktCustomerPurchaseHistoryService`):
```typescript
// Key Methods
getPurchaseHistory(args, workspaceId)     // Get orders with pagination
getPurchasedProducts(args, workspaceId)   // Get unique products purchased

// GraphQL Operations
query customerPurchaseHistory($input: GetPurchaseHistoryArgs!): PurchaseHistoryOutput
query customerPurchasedProducts($input: GetPurchasedProductsArgs!): PurchasedProductsOutput
```

---

### Task: Work with Paginated Queries

**Load**: `mkt-core/common/dto/` và `mkt-core/order/dto/order-query.input.ts`

**Pagination Pattern**:
```typescript
import {
  PaginationInput,
  SortDirection,
  toPaginationOptions,
  calculatePageInfo,
} from 'src/mkt-core/common/dto';

// In resolver
@Query(() => OrderListOutput)
async getOrders(
  @Args('input', { nullable: true }) input?: GetOrdersInput,
): Promise<OrderListOutput> {
  const pagination = toPaginationOptions(input?.pagination);
  // { page: 1, limit: 20, skip: 0 }

  const [orders, total] = await this.orderRepository.findWithPagination(
    workspaceId,
    input?.filter,
    pagination,
  );

  return {
    data: orders,
    pageInfo: calculatePageInfo(total, pagination),
    totalCount: total,
  };
}
```

**Order Query Features**:
```graphql
query getOrders($input: GetOrdersInput) {
  getOrders(input: $input) {
    data { id orderCode status totalAmount }
    pageInfo { currentPage totalPages hasNextPage }
    totalCount
  }
}

# Input supports:
# - pagination: { page, limit }
# - filter: { status, paymentStatus, customerId, salesStaffId, search }
# - sort: { field, direction }
```

---

### Task: Money Calculations

**Load**: `mkt-core/utils/money.utils.ts`

**MoneyUtils** - Tính toán tiền tệ chính xác với Big.js (tránh floating-point errors)

**Common Operations**:
```typescript
import { MoneyUtils, MONEY_DECIMAL_PLACES } from 'src/mkt-core/utils/money.utils';

// Sum
MoneyUtils.sumBy(items, 'price').toNumber();

// Multiply
MoneyUtils.multiply(price, quantity).round(MONEY_DECIMAL_PLACES.CURRENCY).toNumber();

// Percentage
MoneyUtils.applyDiscount(price, 10); // 10% discount
MoneyUtils.percentageOf(part, total); // % of total

// Safe operations
MoneyUtils.divideSafe(value, divisor); // Returns 0 if divisor is 0
MoneyUtils.fromSafe(value); // Returns 0 if invalid
```

**Important**: LUÔN sử dụng MoneyUtils cho các phép tính tiền tệ thay vì JavaScript native math.

---

## Critical Rules Summary

> Load `reference/typescript-rules.md` for complete rules

**Top 5 Must-Follow**:

1. **Use `type` not `interface`**
   ```typescript
   type User = { name: string }; // OK
   interface User { name: string } // NO
   ```

2. **Never use `any`**
   ```typescript
   function process(data: UserData) {} // OK
   function process(data: any) {}      // NO
   ```

3. **No `forEach`, use `for...of`**
   ```typescript
   for (const user of users) {} // OK
   users.forEach(user => {})    // NO
   ```

4. **Use lodash `omitBy` for updates**
   ```typescript
   const updates = omitBy(dto, isUndefined); // OK
   if (dto.field) entity.field = dto.field;  // NO
   ```

5. **Early return pattern**
   ```typescript
   if (!data) return;  // OK - exit early
   if (data) { ... }   // NO - nested
   ```

---

## Tiêu chí Review Code

Khi review code, đánh giá theo:

1. **Tính đúng đắn (Correctness):** Logic đúng, xử lý edge cases
2. **Hiệu năng (Performance):** Không có bottleneck, N+1 queries
3. **Bảo mật (Security):** Validate input, không leak sensitive data
4. **Khả năng đọc (Readability):** Code clear, naming rõ ràng
5. **Best Practices:** Follow SOLID, NestJS conventions
6. **Khả năng bảo trì (Maintainability):** Low coupling, high cohesion
7. **Xử lý lỗi (Error Handling):** Xử lý đầy đủ với proper exceptions

**Additional Requirements:**
- Comment giải thích bằng tiếng Việt
- Không tự động commit code

---

## Key Commands

```bash
# Development
yarn start                              # Start all (frontend + backend + worker)
npx nx start twenty-server              # Start backend only
npx nx start twenty-front               # Start frontend only

# Testing
npx nx test twenty-server               # Backend tests
npx nx lint twenty-server               # Linting
npx nx typecheck twenty-server          # Type check

# Database
npx nx database:reset twenty-server     # Reset database
npx nx run twenty-server:command workspace:sync-metadata -f  # Sync metadata

# Data Seeding (mkt-core)
npx nx command twenty-server -- mkt-license-data-seed-dev-workspace
npx nx command twenty-server -- mkt-customer-tag-data-seed-dev-workspace
```

---

## File Loading Priority

### **Always Load First** (Core Rules):
1. `typescript-rules.md` - Coding standards

### **Load When Needed**:
2. `naming-conventions.md` - File/variable names
3. `architecture.md` - System structure
4. `code-patterns.md` - Implementation patterns
5. `database.md` - Database operations
6. `development-workflow.md` - Daily workflow

### **Load As Reference**:
7. `templates/*.ts` - Copy-paste templates
8. `PROJECT-OVERVIEW.md` - Full project overview

---

## Quick Help

### **I need to...**

- **Understand the project** -> Load: `PROJECT-OVERVIEW.md`
- **Create new mkt-core module** -> Load: `module-structure.md` (invoice as reference)
- **Create WorkspaceEntity** -> Load: `code-patterns.md` + `workspace-entity.template.ts`
- **Create Query Hook** -> Load: `module-structure.md` (Hooks vs Resolvers) + `code-patterns.md`
- **Create Resolver** -> Load: `code-patterns.md` + `resolver.template.ts`
- **Decide Hook vs Resolver** -> Load: `module-structure.md` (When to use section)
- **Fix TypeScript errors** -> Load: `typescript-rules.md`
- **Database migration** -> Load: `database.md`
- **Understand architecture** -> Load: `architecture.md`
- **Work with MKT Product Integration** -> Load: `architecture.md` (MKT Product Integration section)
- **Work with Generic Combo** -> Read: `mkt-core/mkt-combo/` source files
- **Work with Excel Export** -> Load: `architecture.md` (Excel Export section) + `mkt-core/common/excel/`
- **Work with Order Payments** -> Read: `mkt-core/order/services/domain/payment-*.service.ts`
- **Work with Customer Notes** -> Read: `mkt-core/customer/` source files
- **Work with Paginated Queries** -> Use: `mkt-core/common/dto/pagination.*`
- **Money calculations** -> Use: `MoneyUtils` from `mkt-core/utils/money.utils.ts`

---

## mkt-core Module Quick Reference

### Standard Module Structure (invoice as reference)

```
mkt-core/{module}/
├── {module}.module.ts       # Module definition
├── config/                  # Configuration (optional)
├── constants/               # Constants & Enums
│   └── index.ts
├── controllers/             # REST Controllers (optional)
├── dto/                     # GraphQL input/output
│   └── index.ts
├── hooks/                   # Query Hooks (Pre/Post) - CHỈ cho module's entity
├── integration/             # External integrations (optional)
├── jobs/                    # Background jobs (optional)
├── messages/                # Centralized LOG/WARN/ERROR messages
│   └── index.ts
├── objects/                 # WorkspaceEntity definitions
├── repositories/            # Data Access Layer
│   └── index.ts
├── resolvers/               # GraphQL Resolvers - cho cross-module operations
│   └── index.ts
├── services/                # Business Logic
│   └── index.ts
└── types/                   # TypeScript types
    └── index.ts
```

### Key Modules

```
packages/twenty-server/src/mkt-core/
├── invoice/                  # 📚 Reference module - follow this structure
├── order/                    # Order processing (Clean Architecture)
├── payment/                  # Payment integration (SEPay, BIDV)
├── customer/                 # Customer lifecycle & tier system
├── contract/                 # Contract management (RBAC protected)
├── mkt-combo/                # Product combo management
├── mkt-promotion/            # Promotions & coupons
├── mkt-department/           # Department hierarchy (tree structure)
├── mkt-organization-level/   # Organization levels
├── mkt-rbac-enterprise-grade/  # Enterprise RBAC (Casbin)
├── mkt-product-integration/  # MKT Server product integration
├── mkt-license-integration/  # MKT Server license integration
├── mkt-user-integration/     # MKT Server user integration
├── oauth2-client/            # OAuth2 HTTP client
├── mkt-auth-client/          # MKT Server auth (Better Auth)
├── mkt-email/                # Email templates
├── user-management/          # User & role management
├── workspace-member/         # Workspace member management
├── mkt-two-facetor-authentication/  # 2FA (OTP)
├── infrastructure/           # Redis, delayed jobs
├── common/                   # Shared infrastructure
│   ├── dto/                  # Pagination DTOs
│   ├── excel/                # Excel/CSV export utilities
│   ├── hooks/                # Reusable hook utilities
│   ├── idempotency/          # Duplicate request prevention
│   ├── messages/             # Centralized message system
│   ├── optimistic-locking/   # Concurrent edit protection
│   ├── repositories/         # Base repository pattern
│   └── transaction/          # Transaction scope service
├── utils/
│   ├── money.utils.ts        # MoneyUtils - precise decimal calculations
│   ├── date-time.utils.ts    # DateTimeUtils - date/time operations
│   ├── json.util.ts          # Safe JSON parse/stringify
│   └── array.utils.ts        # Array utilities
├── seeder/                   # Development data seeders
└── constants/
    ├── mkt-object-ids.ts     # Entity IDs (IMMUTABLE)
    └── mkt-field-ids.ts      # Field IDs (IMMUTABLE)
```

### Hooks vs Resolvers Decision

| Use Case | Hook | Resolver |
|----------|:----:|:--------:|
| Validate data before save | ✅ | |
| Set default values | ✅ | |
| Side effects (same module) | ✅ | |
| Cross-module operations | | ✅ |
| Complex business logic | | ✅ |
| External integrations | | ✅ |
| Custom queries/mutations | | ✅ |

---

## Success Criteria

You've mastered this skill when you can:
- [ ] Create WorkspaceEntity following Twenty patterns
- [ ] Write Pre/Post Query Hooks correctly
- [ ] Implement Resolvers with proper authentication
- [ ] Handle database migrations
- [ ] Pass all code quality checks
- [ ] Understand mkt-core module structure

**Estimated Time to Mastery**: 3-5 days of active development

---

**Remember**: Load files progressively. Don't read everything at once. Focus on your current task.
