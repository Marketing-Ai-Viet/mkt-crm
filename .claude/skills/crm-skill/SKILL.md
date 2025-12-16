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
**Version**: 1.0
**Last Updated**: 2025-12-13

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

### Task: Create a Query Hook (Pre/Post)

**Load**:
1. `reference/code-patterns.md` - Hook patterns
2. `templates/pre-query-hook.template.ts`
3. `templates/post-query-hook.template.ts`

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
- **Create WorkspaceEntity** -> Load: `code-patterns.md` + `workspace-entity.template.ts`
- **Create Query Hook** -> Load: `code-patterns.md` + hook templates
- **Create Resolver** -> Load: `code-patterns.md` + `resolver.template.ts`
- **Fix TypeScript errors** -> Load: `typescript-rules.md`
- **Database migration** -> Load: `database.md`
- **Understand architecture** -> Load: `architecture.md`
- **Work with MKT Product Integration** -> Load: `architecture.md` (MKT Product Integration section)

---

## mkt-core Module Quick Reference

```
packages/twenty-server/src/mkt-core/
├── license/           # License management
├── order/             # Order processing
├── invoice/           # Invoice system
├── payment/           # Payment integration
├── customer/          # Customer management
├── product/           # Product & variants
├── mkt-department/    # Department hierarchy
├── mkt-kpi/           # KPI tracking
├── mkt-reseller/      # Reseller management
├── mkt-product-integration/  # MKT Server product integration
│   ├── configs/       # Zod-validated configuration
│   ├── constants/     # API endpoints, cache keys
│   ├── dto/           # GraphQL input/output types
│   ├── jobs/          # Scheduled sync job (cron)
│   ├── message/       # Centralized messages
│   ├── repositories/  # Data access layer (HTTP)
│   ├── resolvers/     # GraphQL resolvers
│   ├── services/      # Business logic services
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Mapper utilities
└── constants/
    ├── mkt-object-ids.ts   # Entity IDs (IMMUTABLE)
    └── mkt-field-ids.ts    # Field IDs (IMMUTABLE)
```

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
