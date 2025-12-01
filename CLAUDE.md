# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dự án CRM được fork từ [Twenty CRM](https://twenty.com) và tùy biến với module **mkt-core** để phục vụ quản lý marketing, licensing, orders, invoices và tổ chức doanh nghiệp. Codebase được tổ chức theo Nx monorepo.

## Key Commands

### Development
```bash
# Start development environment (frontend + backend + worker)
yarn start

# Individual package development
npx nx start twenty-front     # Start frontend dev server
npx nx start twenty-server    # Start backend server
npx nx run twenty-server:worker  # Start background worker
```

### Testing
```bash
# Run tests
npx nx test twenty-front      # Frontend unit tests
npx nx test twenty-server     # Backend unit tests
npx nx run twenty-server:test:integration:with-db-reset  # Integration tests with DB reset

# Storybook
npx nx storybook:build twenty-front         # Build Storybook
npx nx storybook:serve-and-test:static     # Run Storybook tests
```

### Code Quality
```bash
# Linting
npx nx lint twenty-front      # Frontend linting
npx nx lint twenty-server     # Backend linting
npx nx lint twenty-front --fix  # Auto-fix linting issues

# Type checking
npx nx typecheck twenty-front
npx nx typecheck twenty-server

# Format code
npx nx fmt twenty-front
npx nx fmt twenty-server
```

### Build
```bash
# Build packages
npx nx build twenty-front
npx nx build twenty-server
```

### Database Operations
```bash
# Database management
npx nx database:reset twenty-server         # Reset database
npx nx run twenty-server:database:init:prod # Initialize database
npx nx run twenty-server:database:migrate:prod # Run migrations

# Generate migration
npx nx run twenty-server:typeorm migration:generate src/database/typeorm/core/migrations/[name] -d src/database/typeorm/core/core.datasource.ts

# Sync metadata
npx nx run twenty-server:command workspace:sync-metadata -f
```

### Data Seeding (mkt-core)
```bash
# Seed development data
npx nx command twenty-server -- mkt-license-data-seed-dev-workspace
npx nx command twenty-server -- mkt-customer-tag-data-seed-dev-workspace
npx nx command twenty-server -- mkt-department-data-seed-dev-workspace
npx nx command twenty-server -- mkt-payment-data-seed-dev-workspace
npx nx command twenty-server -- mkt-invoice-data-seed-dev-workspace
```

### GraphQL
```bash
# Generate GraphQL types
npx nx run twenty-front:graphql:generate
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18, TypeScript, Recoil (state management), Emotion (styling), Vite
- **Backend**: NestJS, TypeORM, PostgreSQL, Redis, GraphQL (with GraphQL Yoga)
- **Monorepo**: Nx workspace managed with Yarn 4

### Package Structure
```
packages/
├── twenty-front/          # React frontend application
├── twenty-server/         # NestJS backend API
│   └── src/
│       ├── mkt-core/      # Custom marketing/business module (380+ files)
│       ├── modules/       # Twenty core modules
│       ├── engine/        # Core engine (ORM, API, middleware)
│       └── database/      # TypeORM migrations
├── twenty-ui/             # Shared UI components library
├── twenty-shared/         # Common types and utilities
├── twenty-emails/         # Email templates with React Email
├── twenty-chrome-extension/  # Chrome extension
├── twenty-website/        # Next.js documentation website
├── twenty-zapier/         # Zapier integration
└── twenty-e2e-testing/    # Playwright E2E tests
```

## mkt-core Module

Module tùy biến chính nằm tại `packages/twenty-server/src/mkt-core/` với các tính năng:

### Core Modules
| Module | Mô tả |
|--------|-------|
| `MktOrderModule` | Quản lý đơn hàng và xử lý order |
| `MktInvoiceModule` | Tạo và quản lý hóa đơn |
| `MktLicenseModule` | Quản lý license với gia hạn tự động |
| `MktPaymentModule` | Xử lý thanh toán (SEPay, BIDV) |
| `MktDepartmentModule` | Phân cấp phòng ban (tree structure) |
| `MktCustomerModule` | Quản lý khách hàng và tags |
| `MktProductModule` | Quản lý sản phẩm và biến thể |
| `UserManagementModule` | Quản lý người dùng và roles |

### Key Features
- **License Management**: Trạng thái (ACTIVE, INACTIVE, TRIAL, EXPIRED, RENEWING), lịch sử, gia hạn
- **Order Processing**: Workflow đơn hàng (PENDING, CONFIRMED, BLOCKED, OVERDUE)
- **Payment Integration**: SEPay webhook, BIDV QR code
- **Department Hierarchy**: Tree queries với ancestors/descendants
- **RBAC Enterprise**: Role-based access control
- **KPI System**: Theo dõi KPI với templates và history
- **2FA**: OTP-based authentication
- **Reseller Management**: Tier system (Bronze, Silver, Gold)

### Key Files
```
mkt-core/
├── mkt-core.module.ts                    # Main module definition
├── constants/
│   ├── mkt-object-ids.ts                 # Entity identifiers (immutable)
│   └── mkt-field-ids.ts                  # Field identifiers (immutable)
├── license/                              # License management
├── order/                                # Order processing
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

### WorkspaceEntity Pattern
Tất cả entities tuân theo pattern của Twenty CRM:
```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktLicense,
  namePlural: 'mktLicenses',
  labelSingular: 'License',
  icon: 'IconBox'
})
export class MktLicenseWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({ ... })
  name: string;

  @WorkspaceRelation({ ... })
  customer: MktCustomerWorkspaceEntity;
}
```

## Key Development Principles

### Code Standards
- **Functional components only** (no class components)
- **Named exports only** (no default exports)
- **Types over interfaces** (except when extending third-party interfaces)
- **No 'any' type allowed**
- **No forEach** - sử dụng for...of hoặc map/filter/reduce
- **No hard-coded values** - khai báo bằng const hoặc enum với default values
- **Early return pattern** - tránh chuỗi if-else
- **Prefer lodash** để tối ưu code size

### State Management
- **Recoil** for global state management
- Component-specific state with React hooks
- GraphQL cache managed by Apollo Client

### Backend Architecture
- **NestJS modules** for feature organization
- **TypeORM** for database ORM with PostgreSQL
- **GraphQL** API with code-first approach
- **Redis** for caching and session management
- **BullMQ** for background job processing
- **Hooks system** for pre/post query validation

### Database
- **PostgreSQL** as primary database
- **Redis** for caching and sessions
- **TypeORM migrations** for schema management
- **ClickHouse** for analytics (when enabled)

## Development Workflow

### Before Making Changes
1. Always run linting and type checking after code changes
2. Test changes with relevant test suites
3. Ensure database migrations are properly structured
4. Check that GraphQL schema changes are backward compatible

### Code Style Notes
- Use **Emotion** for styling with styled-components pattern
- Follow **Nx** workspace conventions for imports
- Use **Lingui** for internationalization
- Components should be in their own directories with tests and stories

### Testing Strategy
- **Unit tests** with Jest for both frontend and backend
- **Integration tests** for critical backend workflows
- **Storybook** for component development and testing
- **E2E tests** with Playwright for critical user flows

## Important Files
- `nx.json` - Nx workspace configuration with task definitions
- `tsconfig.base.json` - Base TypeScript configuration
- `package.json` - Root package with workspace definitions
- `packages/twenty-server/src/mkt-core/` - Custom business logic
- `packages/twenty-server/src/mkt-core/constants/` - Object và field IDs

## Git Workflow
- **Main branch**: `main`
- **Development branch**: `develop`
- Feature branches: `feature/[name]`, `task/[name]`

## Coding Conventions
- Do not use type `any`
- Use named exports only (no default exports)
- Prefer types over interfaces (except when extending third-party interfaces)
- Use early return pattern instead of nested if-else
- Use lodash for array/object operations
- Declare constants with const or enum, add default values when needed
