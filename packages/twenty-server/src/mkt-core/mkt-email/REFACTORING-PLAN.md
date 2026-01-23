# Email Module Refactoring Plan

> Gộp `mkt-sendmail-template` và `email` thành một module duy nhất: `mkt-email`

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Target Architecture](#target-architecture)
4. [Migration Steps](#migration-steps)
5. [File Changes Detail](#file-changes-detail)
6. [Import Updates](#import-updates)
7. [Testing Checklist](#testing-checklist)
8. [Rollback Plan](#rollback-plan)

---

## Overview

### Mục tiêu

Gộp 2 modules:
- `mkt-sendmail-template` (Template storage)
- `email` (Email sending & tracking)

Thành 1 module duy nhất: **`mkt-email`**

### Lý do

1. **Giảm complexity** - 2 modules phụ thuộc nhau, gộp lại đơn giản hơn
2. **Centralized management** - Quản lý template và email tại một nơi
3. **Consistent naming** - Tất cả đều trong namespace `mkt-email`
4. **Easier maintenance** - Ít files, ít imports, ít dependencies

### Scope

| Item | Action |
|------|--------|
| `mkt-sendmail-template/` | DELETE (move contents to `mkt-email/`) |
| `email/` | RENAME to `mkt-email/` + ADD template files |
| External imports | UPDATE all references |

---

## Current State Analysis

### Module: mkt-sendmail-template (5 files)

```
mkt-sendmail-template/
├── mkt-sendmail-template.module.ts     # Module definition
├── repositories/
│   ├── index.ts
│   └── mkt-template.repository.ts      # Template CRUD
└── workspace-entity/
    ├── index.ts
    └── mkt-template.workspace-entity.ts # MktTemplateWorkspaceEntity
```

**Entity:** `MktTemplateWorkspaceEntity`
- Lưu templates cho: Email, Invoice, Contract, Order, Quote, Notification, Ticket, Catalog
- Fields: name, type, templateKey, subject, content, version, locale, metadata, isActive

**Exports:**
- `MktTemplateRepository`
- `MktTemplateWorkspaceEntity`
- `MKT_TEMPLATE_TYPE`

### Module: email (10 files)

```
email/
├── mkt-email.module.ts                 # Module definition
├── constants/
│   ├── index.ts
│   └── mkt-email.constant.ts           # MKT_EMAIL_STATUS, ORDER_STATUS_TEMPLATE_MAP
├── messages/
│   └── index.ts                        # EMAIL_MESSAGES
├── objects/
│   └── mkt-email.workspace-entity.ts   # MktEmailWorkspaceEntity
├── repositories/
│   ├── index.ts
│   └── mkt-email.repository.ts         # Email CRUD
├── service/
│   └── mkt-email.service.ts            # Business logic
└── types/
    ├── index.ts
    └── mkt-email.types.ts              # TypeScript types
```

**Entity:** `MktEmailWorkspaceEntity`
- Lưu email records (sent, draft, failed)
- Fields: subject, to, from, body, sentAt, status, emailType

**Exports:**
- `MktEmailRepository`
- `MktEmailService`
- `MktEmailWorkspaceEntity`
- `MKT_EMAIL_STATUS`

### Current Dependencies

```
MktSendmailTemplateModule is imported by:
├── mkt-core.module.ts (root)
├── MktEmailModule
├── MktTwoFactorAuthenticationModule
├── MktUserManagementModule
├── MktCustomerModule
└── docs/designs/customer/ARCHITECTURE.md

MktEmailModule is imported by:
├── MktOrderModule
├── MktCustomerModule
├── MktDatabaseCommandModule
└── mkt-email-data-seed-dev-workspace.command.ts
```

---

## Target Architecture

### New Module: mkt-email (15 files)

```
mkt-email/
├── mkt-email.module.ts                        # Unified module
├── constants/
│   ├── index.ts                               # Re-export all
│   ├── mkt-email-status.constant.ts           # MKT_EMAIL_STATUS
│   └── mkt-template-type.constant.ts          # MKT_TEMPLATE_TYPE (moved)
├── messages/
│   └── index.ts                               # EMAIL_MESSAGES
├── repositories/
│   ├── index.ts                               # Re-export all
│   ├── mkt-email.repository.ts                # Email CRUD
│   └── mkt-template.repository.ts             # Template CRUD (moved)
├── services/
│   ├── index.ts                               # Re-export all
│   ├── mkt-email.service.ts                   # Email sending logic
│   └── mkt-template-render.service.ts         # Template rendering (NEW)
├── types/
│   ├── index.ts                               # Re-export all
│   ├── mkt-email.types.ts                     # Email types
│   └── mkt-template.types.ts                  # Template types (NEW)
└── workspace-entities/
    ├── index.ts                               # Re-export all
    ├── mkt-email.workspace-entity.ts          # MktEmailWorkspaceEntity (moved)
    └── mkt-template.workspace-entity.ts       # MktTemplateWorkspaceEntity (moved)
```

### New Module Definition

```typescript
// mkt-email/mkt-email.module.ts
import { Module } from '@nestjs/common';

import { MktEmailRepository } from 'src/mkt-core/mkt-email/repositories/mkt-email.repository';
import { MktTemplateRepository } from 'src/mkt-core/mkt-email/repositories/mkt-template.repository';
import { MktEmailService } from 'src/mkt-core/mkt-email/services/mkt-email.service';
import { MktTemplateRenderService } from 'src/mkt-core/mkt-email/services/mkt-template-render.service';
import { MktSettingModule } from 'src/mkt-core/setting/mkt-setting.module';

/**
 * MktEmailModule - Unified Email & Template Management
 *
 * Responsibilities:
 * - Email template storage and management
 * - Email sending and tracking
 * - Template rendering with variable replacement
 *
 * Entities:
 * - MktTemplateWorkspaceEntity: Template definitions
 * - MktEmailWorkspaceEntity: Sent email records
 *
 * Services:
 * - MktEmailService: Email orchestration
 * - MktTemplateRenderService: Template rendering
 *
 * Repositories:
 * - MktTemplateRepository: Template CRUD
 * - MktEmailRepository: Email CRUD
 */
@Module({
  imports: [MktSettingModule],
  providers: [
    // Repositories
    MktEmailRepository,
    MktTemplateRepository,
    // Services
    MktEmailService,
    MktTemplateRenderService,
  ],
  exports: [
    // Repositories
    MktEmailRepository,
    MktTemplateRepository,
    // Services
    MktEmailService,
    MktTemplateRenderService,
  ],
})
export class MktEmailModule {}
```

---

## Migration Steps

### Phase 1: Preparation (No Breaking Changes)

#### Step 1.1: Create new directory structure

```bash
# Create new directories
mkdir -p packages/twenty-server/src/mkt-core/mkt-email/workspace-entities
mkdir -p packages/twenty-server/src/mkt-core/mkt-email/services
```

#### Step 1.2: Move workspace entities

```bash
# Move email entity (rename objects/ to workspace-entities/)
mv email/objects/mkt-email.workspace-entity.ts mkt-email/workspace-entities/

# Move template entity
mv mkt-sendmail-template/workspace-entity/mkt-template.workspace-entity.ts mkt-email/workspace-entities/
```

#### Step 1.3: Move template repository

```bash
mv mkt-sendmail-template/repositories/mkt-template.repository.ts mkt-email/repositories/
```

#### Step 1.4: Create new service (MktTemplateRenderService)

Extract template rendering logic from `MktEmailService` into new service.

#### Step 1.5: Reorganize constants

```bash
# Split constants
# mkt-email.constant.ts → mkt-email-status.constant.ts
# Create mkt-template-type.constant.ts from workspace-entity
```

### Phase 2: Update Module Definition

#### Step 2.1: Update mkt-email.module.ts

Remove `MktSendmailTemplateModule` import, add all providers locally.

#### Step 2.2: Create index.ts files

Create barrel exports for all subdirectories.

### Phase 3: Update External Imports

#### Step 3.1: Update all files importing from old locations

See [Import Updates](#import-updates) section.

#### Step 3.2: Update mkt-core.module.ts

Remove `MktSendmailTemplateModule` import.

### Phase 4: Cleanup

#### Step 4.1: Delete old module

```bash
rm -rf packages/twenty-server/src/mkt-core/mkt-sendmail-template/
```

#### Step 4.2: Delete old email directory (if renamed)

```bash
# If keeping 'email' as 'mkt-email'
rm -rf packages/twenty-server/src/mkt-core/email/
```

### Phase 5: Verification

- Run linting
- Run tests
- Test email sending functionality
- Test template CRUD operations

---

## File Changes Detail

### Files to CREATE

| File | Description |
|------|-------------|
| `mkt-email/workspace-entities/index.ts` | Barrel export for entities |
| `mkt-email/services/index.ts` | Barrel export for services |
| `mkt-email/services/mkt-template-render.service.ts` | Template rendering service |
| `mkt-email/types/mkt-template.types.ts` | Template type definitions |
| `mkt-email/constants/mkt-template-type.constant.ts` | MKT_TEMPLATE_TYPE constant |

### Files to MOVE

| From | To |
|------|-----|
| `email/objects/mkt-email.workspace-entity.ts` | `mkt-email/workspace-entities/mkt-email.workspace-entity.ts` |
| `mkt-sendmail-template/workspace-entity/mkt-template.workspace-entity.ts` | `mkt-email/workspace-entities/mkt-template.workspace-entity.ts` |
| `mkt-sendmail-template/repositories/mkt-template.repository.ts` | `mkt-email/repositories/mkt-template.repository.ts` |
| `email/service/mkt-email.service.ts` | `mkt-email/services/mkt-email.service.ts` |

### Files to UPDATE

| File | Changes |
|------|---------|
| `mkt-email/mkt-email.module.ts` | Add template providers, remove old import |
| `mkt-email/repositories/index.ts` | Add MktTemplateRepository export |
| `mkt-email/constants/index.ts` | Add MKT_TEMPLATE_TYPE export |
| `mkt-email/types/index.ts` | Add template types export |

### Files to DELETE

| File | Reason |
|------|--------|
| `mkt-sendmail-template/mkt-sendmail-template.module.ts` | Merged into mkt-email |
| `mkt-sendmail-template/repositories/index.ts` | Moved to mkt-email |
| `mkt-sendmail-template/repositories/mkt-template.repository.ts` | Moved to mkt-email |
| `mkt-sendmail-template/workspace-entity/index.ts` | Moved to mkt-email |
| `mkt-sendmail-template/workspace-entity/mkt-template.workspace-entity.ts` | Moved to mkt-email |

---

## Import Updates

### Files to Update Imports

#### 1. mkt-core.module.ts

```typescript
// REMOVE
import { MktSendmailTemplateModule } from 'src/mkt-core/mkt-sendmail-template/mkt-sendmail-template.module';

// KEEP (already exists)
import { MktEmailModule } from 'src/mkt-core/mkt-email/mkt-email.module';

// In @Module imports: remove MktSendmailTemplateModule
```

#### 2. customer/customer.module.ts

```typescript
// REMOVE
import { MktSendmailTemplateModule } from 'src/mkt-core/mkt-sendmail-template/mkt-sendmail-template.module';

// KEEP
import { MktEmailModule } from 'src/mkt-core/mkt-email/mkt-email.module';

// In @Module imports: remove MktSendmailTemplateModule (MktEmailModule already includes it)
```

#### 3. user-management/user-management.module.ts

```typescript
// REMOVE
import { MktSendmailTemplateModule } from 'src/mkt-core/mkt-sendmail-template/mkt-sendmail-template.module';

// ADD
import { MktEmailModule } from 'src/mkt-core/mkt-email/mkt-email.module';

// In @Module imports: replace MktSendmailTemplateModule with MktEmailModule
```

#### 4. mkt-two-facetor-authentication/mkt-two-facetor-authentication.module.ts

```typescript
// REMOVE
import { MktSendmailTemplateModule } from 'src/mkt-core/mkt-sendmail-template/mkt-sendmail-template.module';

// ADD
import { MktEmailModule } from 'src/mkt-core/mkt-email/mkt-email.module';

// In @Module imports: replace MktSendmailTemplateModule with MktEmailModule
```

#### 5. Files importing MktTemplateRepository

```typescript
// OLD
import { MktTemplateRepository } from 'src/mkt-core/mkt-sendmail-template/repositories';

// NEW
import { MktTemplateRepository } from 'src/mkt-core/mkt-email/repositories';
```

#### 6. Files importing MktTemplateWorkspaceEntity

```typescript
// OLD
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/mkt-sendmail-template/workspace-entity/mkt-template.workspace-entity';

// NEW
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/mkt-email/workspace-entities';
```

#### 7. Files importing MKT_TEMPLATE_TYPE

```typescript
// OLD (from order module)
import { MKT_TEMPLATE_TYPE } from 'src/mkt-core/order/constants/mkt-template.constant';

// OR OLD (from sendmail-template)
import { MKT_TEMPLATE_TYPE } from 'src/mkt-core/mkt-sendmail-template/workspace-entity/mkt-template.workspace-entity';

// NEW
import { MKT_TEMPLATE_TYPE } from 'src/mkt-core/mkt-email/constants';
```

---

## New Files Content

### mkt-email/workspace-entities/index.ts

```typescript
export { MktEmailWorkspaceEntity, SEARCH_FIELDS as SEARCH_FIELDS_EMAIL } from 'src/mkt-core/mkt-email/workspace-entities/mkt-email.workspace-entity';
export {
  MktTemplateWorkspaceEntity,
  MKT_TEMPLATE_TYPE,
  MktTemplateType,
  SEARCH_FIELDS_FOR_MKT_TEMPLATE,
} from 'src/mkt-core/mkt-email/workspace-entities/mkt-template.workspace-entity';
```

### mkt-email/repositories/index.ts

```typescript
export { MktEmailRepository } from 'src/mkt-core/mkt-email/repositories/mkt-email.repository';
export { MktTemplateRepository } from 'src/mkt-core/mkt-email/repositories/mkt-template.repository';
```

### mkt-email/services/index.ts

```typescript
export { MktEmailService } from 'src/mkt-core/mkt-email/services/mkt-email.service';
export { MktTemplateRenderService } from 'src/mkt-core/mkt-email/services/mkt-template-render.service';
```

### mkt-email/constants/index.ts

```typescript
export {
  MKT_EMAIL_STATUS,
  MKT_EMAIL_STATUS_OPTIONS,
  ORDER_STATUS_TEMPLATE_MAP,
  DEFAULT_LOCALE,
  DEFAULT_COMPANY_NAME,
  DEFAULT_CUSTOMER_NAME,
  DEFAULT_TRIAL_PERIOD_DAYS,
} from 'src/mkt-core/mkt-email/constants/mkt-email-status.constant';

export {
  MKT_TEMPLATE_TYPE,
  MktTemplateType,
} from 'src/mkt-core/mkt-email/workspace-entities/mkt-template.workspace-entity';
```

### mkt-email/types/index.ts

```typescript
export {
  FindEmailOptions,
  FindWithPaginationOptions,
  CreateEmailData,
  UpdateEmailData,
  SendEmailOptions,
  OrderEmailReplacements,
  StatusDistributionItem,
} from 'src/mkt-core/mkt-email/types/mkt-email.types';

export {
  FindTemplateOptions,
  CreateTemplateData,
  UpdateTemplateData,
} from 'src/mkt-core/mkt-email/types/mkt-template.types';
```

### mkt-email/types/mkt-template.types.ts

```typescript
import { MktTemplateType } from 'src/mkt-core/mkt-email/workspace-entities';

/**
 * Template Repository Types
 */

export type FindTemplateOptions = {
  limit?: number;
  offset?: number;
  isActive?: boolean;
};

export type CreateTemplateData = {
  name: string;
  type: MktTemplateType | string;
  templateKey?: string;
  subject?: string;
  content?: string;
  version?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
};

export type UpdateTemplateData = Partial<CreateTemplateData>;

/**
 * Template Render Types
 */

export type TemplateVariables = Record<string, string | number | boolean | null>;

export type RenderTemplateOptions = {
  template: string;
  variables: TemplateVariables;
  processConditionals?: boolean;
};

export type RenderTemplateResult = {
  subject: string;
  content: string;
};
```

### mkt-email/services/mkt-template-render.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { MKT_EMAIL_LOG_CONTEXT } from 'src/mkt-core/mkt-email/messages';
import {
  RenderTemplateOptions,
  TemplateVariables,
} from 'src/mkt-core/mkt-email/types';

/**
 * MktTemplateRenderService - Template rendering service
 *
 * Responsibilities:
 * - Replace template placeholders with actual values
 * - Process conditional blocks ({{#if variable}}...{{/if}})
 * - Format values (currency, date, etc.)
 *
 * Extracted from MktEmailService for reusability with
 * other template types (invoice, contract, etc.)
 */
@Injectable()
export class MktTemplateRenderService {
  private readonly logger = new Logger(`${MKT_EMAIL_LOG_CONTEXT}:TemplateRender`);

  /**
   * Render template with variables
   */
  render(template: string, variables: TemplateVariables): string {
    let result = template;

    // Step 1: Process conditionals
    result = this.processConditionals(result, variables);

    // Step 2: Replace placeholders
    result = this.replacePlaceholders(result, variables);

    return result;
  }

  /**
   * Process conditional blocks
   * Supports: {{#if variable}}content{{/if}}
   */
  private processConditionals(
    template: string,
    variables: TemplateVariables,
  ): string {
    let result = template;

    // Pattern: {{#if variable_name}}content{{/if}}
    const conditionalPattern = /{{#if\s+(\w+)\s*}}([\s\S]*?){{\/if\s*}}/g;

    result = result.replace(conditionalPattern, (_match, varName, content) => {
      const value = variables[varName];
      // Show content if value is truthy
      return value ? content : '';
    });

    return result;
  }

  /**
   * Replace placeholder values
   * Supports: {{variable}} and {variable}
   */
  private replacePlaceholders(
    template: string,
    variables: TemplateVariables,
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const stringValue = String(value ?? '');

      // Pattern for {{ variable }} (with optional spaces)
      const doubleBracePattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      // Pattern for { variable } (with optional spaces)
      const singleBracePattern = new RegExp(`{\\s*${key}\\s*}`, 'g');

      result = result
        .replace(doubleBracePattern, stringValue)
        .replace(singleBracePattern, stringValue);
    }

    return result;
  }

  /**
   * Format currency (VND)
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  /**
   * Format date (Vietnamese locale)
   */
  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('vi-VN');
  }
}
```

---

## Testing Checklist

### Unit Tests

- [ ] MktTemplateRepository - all methods work correctly
- [ ] MktEmailRepository - all methods work correctly
- [ ] MktEmailService - email sending works
- [ ] MktTemplateRenderService - template rendering works

### Integration Tests

- [ ] Create template → Send email using template → Verify email record
- [ ] Order creation → Email notification sent
- [ ] 2FA OTP → Email sent with correct template

### Manual Testing

- [ ] Create new order → Check customer receives email
- [ ] Enable 2FA → Check OTP email sent
- [ ] Create template via seed → Verify in database

### Import Verification

```bash
# Check no imports from old module
grep -r "mkt-sendmail-template" packages/twenty-server/src/

# Should return 0 results after migration
```

---

## Rollback Plan

### If migration fails:

1. **Restore old module:**
   ```bash
   git checkout HEAD~1 -- packages/twenty-server/src/mkt-core/mkt-sendmail-template/
   ```

2. **Revert import changes:**
   ```bash
   git checkout HEAD~1 -- packages/twenty-server/src/mkt-core/mkt-core.module.ts
   git checkout HEAD~1 -- packages/twenty-server/src/mkt-core/customer/customer.module.ts
   # ... other files
   ```

3. **Remove new files:**
   ```bash
   rm packages/twenty-server/src/mkt-core/mkt-email/workspace-entities/mkt-template.workspace-entity.ts
   rm packages/twenty-server/src/mkt-core/mkt-email/repositories/mkt-template.repository.ts
   rm packages/twenty-server/src/mkt-core/mkt-email/services/mkt-template-render.service.ts
   ```

4. **Restore old mkt-email.module.ts:**
   ```bash
   git checkout HEAD~1 -- packages/twenty-server/src/mkt-core/email/mkt-email.module.ts
   ```

---

## Timeline Estimate

| Phase | Tasks | Files |
|-------|-------|-------|
| Phase 1 | Create directories, move files | 10 files |
| Phase 2 | Update module definition | 3 files |
| Phase 3 | Update external imports | 8 files |
| Phase 4 | Cleanup old directories | 5 files deleted |
| Phase 5 | Testing & verification | - |

---

## Notes

### Breaking Changes

- `MktSendmailTemplateModule` sẽ bị xóa
- Import paths thay đổi cho `MktTemplateRepository` và `MktTemplateWorkspaceEntity`
- `MKT_TEMPLATE_TYPE` import location thay đổi

### Backward Compatibility

Có thể tạo re-export tạm thời tại old location nếu cần:

```typescript
// mkt-sendmail-template/index.ts (temporary, for migration period)
export * from 'src/mkt-core/mkt-email/repositories/mkt-template.repository';
export * from 'src/mkt-core/mkt-email/workspace-entities/mkt-template.workspace-entity';
```

### Documentation Updates

- Update `docs/designs/customer/ARCHITECTURE.md`
- Update any README files mentioning these modules

---

**Document Version:** 1.0.0
**Created:** 2026-01-23
**Author:** CRM Development Team
