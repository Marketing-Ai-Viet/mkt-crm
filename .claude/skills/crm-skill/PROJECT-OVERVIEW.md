# Project Overview - Twenty CRM with mkt-core

> Complete overview of the CRM project

---

## Project Description

**Twenty CRM Fork** - Dự án CRM được fork từ [Twenty CRM](https://twenty.com) và tùy biến với module **mkt-core** để phục vụ quản lý marketing, licensing, orders, invoices và tổ chức doanh nghiệp.

### Primary Goals

1. **License Management** - Quản lý license với trạng thái, lịch sử, gia hạn tự động
2. **Order Processing** - Workflow đơn hàng từ tạo đến xác nhận
3. **Payment Integration** - Tích hợp SEPay, BIDV QR code
4. **Organization Management** - Phân cấp phòng ban, roles, permissions
5. **Customer Management** - Quản lý khách hàng với tags, KPI

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **NestJS** | v10+ | Backend framework |
| **TypeScript** | v5+ | Type-safe development |
| **TypeORM** | v0.3+ | ORM with workspace entities |
| **PostgreSQL** | v14+ | Primary database |
| **Redis** | v7+ | Caching, sessions |
| **GraphQL Yoga** | - | GraphQL server |
| **BullMQ** | - | Background job processing |

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **Recoil** | State management |
| **Emotion** | CSS-in-JS styling |
| **Apollo Client** | GraphQL client |
| **Vite** | Build tool |

### Monorepo

| Tool | Purpose |
|------|---------|
| **Nx** | Workspace management |
| **Yarn 4** | Package manager |

---

## Package Structure

```
packages/
├── twenty-front/              # React frontend application
├── twenty-server/             # NestJS backend API
│   └── src/
│       ├── mkt-core/          # Custom marketing module (380+ files)
│       ├── modules/           # Twenty core modules
│       ├── engine/            # Core engine (ORM, API, middleware)
│       └── database/          # TypeORM migrations
├── twenty-ui/                 # Shared UI components
├── twenty-shared/             # Common types and utilities
├── twenty-emails/             # Email templates
├── twenty-chrome-extension/   # Chrome extension
├── twenty-website/            # Next.js documentation
├── twenty-zapier/             # Zapier integration
└── twenty-e2e-testing/        # Playwright E2E tests
```

---

## mkt-core Module

**Location**: `packages/twenty-server/src/mkt-core/`

### Core Modules

| Module | Description |
|--------|-------------|
| `MktOrderModule` | Order management and processing |
| `MktInvoiceModule` | Invoice creation and management |
| `MktLicenseModule` | License management with auto-renewal |
| `MktPaymentModule` | Payment processing (SEPay, BIDV) |
| `MktDepartmentModule` | Department hierarchy (tree structure) |
| `MktCustomerModule` | Customer management with tags |
| `MktProductModule` | Product and variant management |
| `UserManagementModule` | User and role management |

### Key Features

**License Management**:
- States: ACTIVE, INACTIVE, TRIAL, EXPIRED, RENEWING
- License history tracking
- Auto-renewal system

**Order Processing**:
- Workflow: DRAFT -> PENDING -> CONFIRMED -> BLOCKED -> OVERDUE
- Order items with variants
- Payment method selection

**Payment Integration**:
- SEPay webhook integration
- BIDV QR code generation
- Payment history tracking

**Department Hierarchy**:
- Tree structure with ancestors/descendants
- Organization levels
- Role-based access per department

**RBAC Enterprise**:
- Role-based access control
- Permission templates
- User-role mapping

**KPI System**:
- KPI templates
- KPI history tracking
- Performance metrics

### Module Structure

```
mkt-core/
├── mkt-core.module.ts                    # Main module definition
├── constants/
│   ├── mkt-object-ids.ts                 # Entity IDs (IMMUTABLE)
│   └── mkt-field-ids.ts                  # Field IDs (IMMUTABLE)
├── license/                              # License management
│   ├── mkt-license.workspace-entity.ts
│   ├── resolvers/
│   ├── services/
│   └── hooks/
├── order/                                # Order processing
│   ├── objects/
│   │   └── mkt-order.workspace-entity.ts
│   ├── services/
│   ├── hooks/
│   └── constants/
├── invoice/                              # Invoice system
├── payment/                              # Payment integration
├── customer/                             # Customer management
├── product/                              # Product & variants
├── mkt-department/                       # Department hierarchy
├── mkt-organization-level/               # Organization levels
├── mkt-rbac-enterprise-grade/            # RBAC utilities
├── mkt-kpi/                              # KPI tracking
├── mkt-reseller/                         # Reseller management
├── mkt-two-facetor-authentication/       # 2FA
└── dev-seeder/                           # Development data seeding
```

---

## Architecture

### Twenty CRM Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GraphQL API Layer                             │
│                    (GraphQL Yoga)                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Workspace Query Runner                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Pre-Query Hooks -> Query Execution -> Post-Query Hooks │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Twenty ORM (Workspace Entities)                 │
│  - WorkspaceEntity decorators                                    │
│  - Dynamic schema generation                                     │
│  - Multi-tenant support                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL + Redis                           │
└─────────────────────────────────────────────────────────────────┘
```

### Key Concepts

**WorkspaceEntity**:
- Custom decorator for dynamic entity creation
- Multi-tenant support per workspace
- Automatic GraphQL schema generation

**Query Hooks**:
- Pre-Query: Validate/modify data before execution
- Post-Query: Side effects after query completion
- Registered via `@WorkspaceQueryHook` decorator

**Resolvers**:
- Custom business logic endpoints
- Use `@Resolver()` with `@UseGuards(WorkspaceAuthGuard)`
- Access `AuthContext` for workspace/user info

---

## Key Files

### Constants (IMMUTABLE)

```typescript
// packages/twenty-server/src/mkt-core/constants/mkt-object-ids.ts
export const MKT_OBJECT_IDS = {
  mktLicense: 'mkt-license-standard-id',
  mktOrder: 'mkt-order-standard-id',
  // ... more
};

// packages/twenty-server/src/mkt-core/constants/mkt-field-ids.ts
export const MKT_FIELD_IDS = {
  mktLicense: {
    name: 'mkt-license-name-field-id',
    status: 'mkt-license-status-field-id',
    // ... more
  },
};
```

### Engine Files

```
packages/twenty-server/src/engine/
├── api/graphql/
│   └── workspace-query-runner/
│       └── workspace-query-hook/         # Hook system
├── twenty-orm/
│   └── decorators/                       # WorkspaceEntity decorators
└── core-modules/
    └── auth/                             # Authentication
```

---

## Development Commands

### Start Development

```bash
# Full stack (recommended)
yarn start

# Individual packages
npx nx start twenty-front          # Frontend
npx nx start twenty-server         # Backend
npx nx run twenty-server:worker    # Background worker
```

### Testing

```bash
npx nx test twenty-front           # Frontend unit tests
npx nx test twenty-server          # Backend unit tests
npx nx run twenty-server:test:integration:with-db-reset  # Integration tests
```

### Code Quality

```bash
npx nx lint twenty-front           # Frontend linting
npx nx lint twenty-server          # Backend linting
npx nx lint twenty-server --fix    # Auto-fix
npx nx typecheck twenty-front      # Type check frontend
npx nx typecheck twenty-server     # Type check backend
```

### Database

```bash
npx nx database:reset twenty-server                      # Reset DB
npx nx run twenty-server:database:migrate:prod           # Run migrations
npx nx run twenty-server:command workspace:sync-metadata -f  # Sync metadata
```

### Data Seeding (mkt-core)

```bash
npx nx command twenty-server -- mkt-license-data-seed-dev-workspace
npx nx command twenty-server -- mkt-customer-tag-data-seed-dev-workspace
npx nx command twenty-server -- mkt-department-data-seed-dev-workspace
npx nx command twenty-server -- mkt-payment-data-seed-dev-workspace
npx nx command twenty-server -- mkt-invoice-data-seed-dev-workspace
```

---

## Git Workflow

- **Main branch**: `main`
- **Development branch**: `develop`
- **Feature branches**: `feature/[name]`, `task/[name]`

---

## Coding Conventions

### MUST Follow

- Use `type` not `interface`
- Never use `any`
- No `forEach` - use `for...of` or map/filter/reduce
- No hard-coded values - use const or enum
- Early return pattern
- Prefer lodash for array/object operations
- Named exports only (no default exports)

### Twenty-Specific

- Extend `BaseWorkspaceEntity` for all workspace entities
- Use `@WorkspaceField` for entity fields
- Use `@WorkspaceRelation` for relationships
- Register hooks in module providers
- Use `AuthContext` for authentication context

---

## Related Documentation

- [SKILL.md](./SKILL.md) - Main skill entry point
- [reference/architecture.md](./reference/architecture.md) - Architecture details
- [reference/code-patterns.md](./reference/code-patterns.md) - Code patterns
- [reference/typescript-rules.md](./reference/typescript-rules.md) - TypeScript rules

---

**Version**: 1.0
**Last Updated**: 2025-12-13
