# Development Workflow - Twenty CRM

> Daily workflow, commands, and development practices

---

## Quick Start

### Prerequisites

- Node.js v18+
- PostgreSQL v14+
- Redis v7+
- Yarn 4

### First Time Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd CRM

# 2. Install dependencies
yarn install

# 3. Setup environment
cp .env.example .env
# Edit .env with your configuration

# 4. Start databases (Docker)
docker-compose up -d

# 5. Reset database
npx nx database:reset twenty-server

# 6. Sync metadata
npx nx run twenty-server:command workspace:sync-metadata -f

# 7. Start development
yarn start
```

---

## Daily Development

### Start Work Day

```bash
# 1. Pull latest changes
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Start development servers
yarn start

# Or start individually:
npx nx start twenty-server    # Backend only
npx nx start twenty-front     # Frontend only
```

### Development Loop

```bash
# Backend development
npx nx start twenty-server         # Watch mode

# Run tests
npx nx test twenty-server          # Unit tests
npx nx test twenty-server --watch  # Watch mode

# Lint and fix
npx nx lint twenty-server
npx nx lint twenty-server --fix

# Type check
npx nx typecheck twenty-server
```

### End of Day

```bash
# Check code quality
npx nx lint twenty-server
npx nx typecheck twenty-server
npx nx test twenty-server

# Commit changes
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

---

## Key Commands

### Development

```bash
# Start all (frontend + backend + worker)
yarn start

# Start individual packages
npx nx start twenty-front          # Frontend dev server
npx nx start twenty-server         # Backend server
npx nx run twenty-server:worker    # Background worker
```

### Testing

```bash
# Unit tests
npx nx test twenty-front           # Frontend tests
npx nx test twenty-server          # Backend tests

# Integration tests
npx nx run twenty-server:test:integration:with-db-reset

# Watch mode
npx nx test twenty-server --watch

# Specific test file
npx nx test twenty-server --testPathPattern=order.service.spec.ts
```

### Code Quality

```bash
# Linting
npx nx lint twenty-front
npx nx lint twenty-server
npx nx lint twenty-server --fix    # Auto-fix issues

# Type checking
npx nx typecheck twenty-front
npx nx typecheck twenty-server

# Format
npx nx fmt twenty-front
npx nx fmt twenty-server
```

### Build

```bash
# Build packages
npx nx build twenty-front
npx nx build twenty-server

# Build all
npx nx run-many --target=build --all
```

### Database

```bash
# Reset database (development)
npx nx database:reset twenty-server

# Initialize database (production)
npx nx run twenty-server:database:init:prod

# Run migrations
npx nx run twenty-server:database:migrate:prod

# Generate migration
npx nx run twenty-server:typeorm migration:generate \
  src/database/typeorm/core/migrations/MigrationName \
  -d src/database/typeorm/core/core.datasource.ts

# Sync workspace metadata
npx nx run twenty-server:command workspace:sync-metadata -f
```

### Data Seeding (mkt-core)

```bash
# Seed all development data
npx nx command twenty-server -- mkt-license-data-seed-dev-workspace
npx nx command twenty-server -- mkt-customer-tag-data-seed-dev-workspace
npx nx command twenty-server -- mkt-department-data-seed-dev-workspace
npx nx command twenty-server -- mkt-payment-data-seed-dev-workspace
npx nx command twenty-server -- mkt-invoice-data-seed-dev-workspace
```

### GraphQL

```bash
# Generate GraphQL types (frontend)
npx nx run twenty-front:graphql:generate
```

---

## Creating New Features

### 1. Create WorkspaceEntity

```bash
# 1. Add Object ID to constants
# Edit: src/mkt-core/constants/mkt-object-ids.ts

# 2. Add Field IDs to constants
# Edit: src/mkt-core/constants/mkt-field-ids.ts

# 3. Create entity file
# Create: src/mkt-core/your-module/mkt-your-entity.workspace-entity.ts

# 4. Sync metadata
npx nx run twenty-server:command workspace:sync-metadata -f
```

### 2. Create Query Hook

```bash
# Create hook file
# src/mkt-core/your-module/hooks/mkt-your-entity-create-one.pre-query.hook.ts

# Register in module
# Edit: src/mkt-core/your-module/mkt-your-module.module.ts
# Add to providers array
```

### 3. Create Resolver

```bash
# Create resolver file
# src/mkt-core/your-module/resolvers/mkt-your-entity.resolver.ts

# Register in module
# Edit: src/mkt-core/your-module/mkt-your-module.module.ts
# Add to providers array
```

### 4. Create Service

```bash
# Create service file
# src/mkt-core/your-module/services/your-entity.service.ts

# Register in module
# Edit: src/mkt-core/your-module/mkt-your-module.module.ts
# Add to providers and exports arrays
```

---

## Git Workflow

### Branch Naming

```
feature/feature-name     # New features
task/task-name           # Tasks
fix/bug-description      # Bug fixes
hotfix/urgent-fix        # Production hotfixes
```

### Commit Messages

```bash
# Format: type: description

feat: add order confirmation workflow
fix: resolve payment validation error
refactor: simplify license renewal logic
docs: update API documentation
test: add unit tests for order service
chore: update dependencies
```

### Pull Request Flow

```bash
# 1. Create PR from feature branch to develop
git checkout develop
git pull origin develop
git checkout feature/your-feature
git rebase develop
git push origin feature/your-feature

# 2. Create PR on GitHub
# 3. Wait for review
# 4. Merge to develop
```

---

## Debugging

### Backend Debugging

```typescript
// Use Logger instead of console.log
import { Logger } from '@nestjs/common';

private readonly logger = new Logger(YourService.name);

this.logger.log('Info message');
this.logger.error('Error message', error.stack);
this.logger.warn('Warning message');
this.logger.debug('Debug message');
```

### VS Code Debug Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Twenty Server",
      "port": 9229,
      "restart": true
    }
  ]
}
```

```bash
# Start with debug mode
npx nx start twenty-server --inspect
```

### GraphQL Playground

Access at: `http://localhost:3000/graphql`

---

## Common Issues

### Issue: "Module not found"

```bash
# Solution: Clear cache and rebuild
npx nx reset
yarn install
npx nx build twenty-server
```

### Issue: "Database connection failed"

```bash
# Solution: Check PostgreSQL is running
docker-compose up -d postgres

# Or check .env configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

### Issue: "Workspace entity not found"

```bash
# Solution: Sync metadata
npx nx run twenty-server:command workspace:sync-metadata -f
```

### Issue: "Redis connection failed"

```bash
# Solution: Check Redis is running
docker-compose up -d redis

# Or check .env configuration
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Code Quality Checklist

Before committing:

- [ ] `npx nx lint twenty-server` passes
- [ ] `npx nx typecheck twenty-server` passes
- [ ] `npx nx test twenty-server` passes
- [ ] No `any` types used
- [ ] No `interface` used (use `type`)
- [ ] No `forEach` used (use `for...of`)
- [ ] Early return pattern applied
- [ ] Named exports only
- [ ] Proper error handling

---

## Useful Scripts

### Check all

```bash
#!/bin/bash
npx nx lint twenty-server && \
npx nx typecheck twenty-server && \
npx nx test twenty-server
```

### Reset and seed

```bash
#!/bin/bash
npx nx database:reset twenty-server && \
npx nx run twenty-server:command workspace:sync-metadata -f && \
npx nx command twenty-server -- mkt-license-data-seed-dev-workspace
```

---

## Related Resources

- [Architecture Overview](./architecture.md)
- [Code Patterns](./code-patterns.md)
- [Database Guide](./database.md)
- [TypeScript Rules](./typescript-rules.md)

---

**Version**: 1.0
**Last Updated**: 2025-12-13
