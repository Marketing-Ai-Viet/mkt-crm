# MKT Template Module Refactoring Plan

> **Status: COMPLETED** - All phases have been implemented successfully.

## 1. Current State Analysis

### 1.1 Existing Entities

Currently, there are **2 separate entities** managing templates:

#### Entity 1: `MktSendmailTemplateWorkspaceEntity`
- **Table**: `mktSendmailTemplate`
- **Purpose**: Email templates for sending (OTP, Welcome, Account Update)
- **Fields**:
  | Field | Type | Description |
  |-------|------|-------------|
  | `name` | TEXT | Template name |
  | `language` | TEXT | Language code (en, vi-VN) |
  | `type` | TEXT | Template type (WELCOME_EMAIL, TWO_FACTOR_AUTH, ACCOUNT_UPDATE_EMAIL) |
  | `subject` | TEXT | Email subject |
  | `body` | TEXT | HTML email body |

- **Usage**:
  - `EmailNotificationService` - Send welcome/account update emails
  - `MktTwoFacetorAuthenticationService` - Send 2FA OTP emails

#### Entity 2: `MktTemplateWorkspaceEntity`
- **Table**: `mktTemplate`
- **Purpose**: General templates (Invoice, Contract, Order, etc.)
- **Fields**:
  | Field | Type | Description |
  |-------|------|-------------|
  | `name` | TEXT | Template name |
  | `type` | TEXT | Template type (EMAIL, INVOICE, CONTRACT, TICKET, ORDER, CATALOG, NOTIFICATION, QUOTE) |
  | `templateKey` | TEXT | Unique template identifier |
  | `content` | TEXT | Template content |
  | `version` | TEXT | Version number |
  | `locale` | TEXT | Locale code |
  | `metadata` | JSONB | Additional metadata |
  | `position` | POSITION | Display order |
  | `createdBy` | ACTOR | Creator info |
  | `searchVector` | TS_VECTOR | Full-text search |
  | `accountOwnerId` | UUID | Owner reference |

- **Relations**:
  - `mktInvoices` → ONE_TO_MANY → MktInvoiceWorkspaceEntity
  - `mktPayments` → ONE_TO_MANY → MktPaymentWorkspaceEntity
  - `accountOwner` → MANY_TO_ONE → WorkspaceMemberWorkspaceEntity
  - `timelineActivities` → ONE_TO_MANY → TimelineActivityWorkspaceEntity

### 1.2 Problems

1. **Redundancy**: Two entities serving similar purposes (template management)
2. **Inconsistent Features**:
   - `MktSendmailTemplate` lacks versioning, metadata, search
   - `MktTemplate` lacks `subject` field for emails
3. **Scattered Functionality**: Email templates split between two tables
4. **Maintenance Overhead**: Need to maintain 2 repositories, 2 entities

---

## 2. Proposed Solution: Unified Template Entity

### 2.1 New Entity: `MktTemplateWorkspaceEntity` (Enhanced)

Merge both entities into a single, comprehensive template entity.

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktTemplate,
  namePlural: 'mktTemplates',
  labelSingular: 'Template',
  labelPlural: 'Templates',
  description: 'Unified template entity for emails, invoices, contracts, etc.',
  icon: 'IconTemplate',
  labelIdentifierStandardId: MKT_TEMPLATE_FIELD_IDS.name,
})
export class MktTemplateWorkspaceEntity extends BaseWorkspaceEntity {
  // === CORE FIELDS ===
  name: string;                    // Template name
  templateKey: string | null;      // Unique identifier (e.g., 'welcome_email_en')
  type: MktTemplateType;           // Template type enum

  // === CONTENT FIELDS ===
  subject: string | null;          // Email subject (for EMAIL type)
  content: string | null;          // Template content/body

  // === LOCALIZATION ===
  locale: string | null;           // Locale code (en, vi-VN, etc.)

  // === VERSIONING ===
  version: string | null;          // Version number (e.g., '1.0.0')

  // === METADATA ===
  metadata: JSON | null;           // Additional metadata (variables, config)
  isActive: boolean;               // Active status

  // === SYSTEM FIELDS ===
  position: number;
  createdBy: ActorMetadata;
  searchVector: string;

  // === RELATIONS ===
  mktInvoices: Relation<MktInvoiceWorkspaceEntity[]>;
  mktPayments: Relation<MktPaymentWorkspaceEntity[]>;
  accountOwner: Relation<WorkspaceMemberWorkspaceEntity> | null;
  timelineActivities: Relation<TimelineActivityWorkspaceEntity[]>;
}
```

### 2.2 Template Type Enum

```typescript
export const MKT_TEMPLATE_TYPE = {
  // Email Templates
  EMAIL: 'EMAIL',
  WELCOME_EMAIL: 'WELCOME_EMAIL',
  TWO_FACTOR_AUTH: 'TWO_FACTOR_AUTH',
  ACCOUNT_UPDATE_EMAIL: 'ACCOUNT_UPDATE_EMAIL',
  PASSWORD_RESET: 'PASSWORD_RESET',

  // Business Templates
  INVOICE: 'INVOICE',
  CONTRACT: 'CONTRACT',
  ORDER: 'ORDER',
  QUOTE: 'QUOTE',

  // System Templates
  NOTIFICATION: 'NOTIFICATION',
  TICKET: 'TICKET',
  CATALOG: 'CATALOG',
} as const;

export type MktTemplateType = typeof MKT_TEMPLATE_TYPE[keyof typeof MKT_TEMPLATE_TYPE];
```

---

## 3. Implementation Steps

### Phase 1: Update Entity Schema

#### Step 1.1: Update Field IDs
File: `src/mkt-core/constants/mkt-field-ids.ts`

```typescript
export const MKT_TEMPLATE_FIELD_IDS = {
  // Core
  name: 'existing-uuid',
  templateKey: 'existing-uuid',
  type: 'existing-uuid',

  // Content (NEW)
  subject: 'generate-new-uuid',  // NEW FIELD
  content: 'existing-uuid',

  // Localization
  locale: 'existing-uuid',

  // Versioning
  version: 'existing-uuid',

  // Metadata
  metadata: 'existing-uuid',
  isActive: 'generate-new-uuid', // NEW FIELD

  // System
  position: 'existing-uuid',
  createdBy: 'existing-uuid',
  searchVector: 'existing-uuid',

  // Relations
  mktInvoices: 'existing-uuid',
  mktPayments: 'existing-uuid',
  accountOwner: 'existing-uuid',
  timelineActivities: 'existing-uuid',
};
```

#### Step 1.2: Update Workspace Entity
File: `src/mkt-core/mkt-sendmail-template/workspace-entity/mkt-template.workspace-entity.ts`

Add new fields:
- `subject` (TEXT, nullable) - Email subject
- `isActive` (BOOLEAN, default true) - Active status

### Phase 2: Update Repository

#### Step 2.1: Unified Repository
File: `src/mkt-core/mkt-sendmail-template/repositories/mkt-template.repository.ts`

```typescript
@Injectable()
export class MktTemplateRepository {
  // === EMAIL TEMPLATE METHODS ===

  /**
   * Find email template by type and locale
   * Replaces MktSendmailTemplateRepository.findByTypeAndLanguage
   */
  async findEmailTemplate(
    workspaceId: string,
    type: MktTemplateType,
    locale: string,
  ): Promise<MktTemplateWorkspaceEntity | null>;

  /**
   * Find all email templates by type
   */
  async findEmailTemplatesByType(
    workspaceId: string,
    type: MktTemplateType,
  ): Promise<MktTemplateWorkspaceEntity[]>;

  // === GENERAL TEMPLATE METHODS ===

  async findById(workspaceId: string, id: string): Promise<MktTemplateWorkspaceEntity | null>;
  async findByKey(workspaceId: string, templateKey: string): Promise<MktTemplateWorkspaceEntity | null>;
  async findByType(workspaceId: string, type: MktTemplateType): Promise<MktTemplateWorkspaceEntity[]>;
  async findByTypeAndLocale(workspaceId: string, type: MktTemplateType, locale: string): Promise<MktTemplateWorkspaceEntity | null>;
  async findAll(workspaceId: string, options?: FindOptions): Promise<MktTemplateWorkspaceEntity[]>;

  // === CRUD OPERATIONS ===

  async create(workspaceId: string, data: CreateTemplateDto): Promise<MktTemplateWorkspaceEntity>;
  async update(workspaceId: string, id: string, data: UpdateTemplateDto): Promise<void>;
  async upsertByTypeAndLocale(workspaceId: string, type: MktTemplateType, locale: string, data: UpsertTemplateDto): Promise<MktTemplateWorkspaceEntity>;
  async softDelete(workspaceId: string, id: string): Promise<void>;

  // === UTILITY METHODS ===

  async exists(workspaceId: string, type: MktTemplateType, locale: string): Promise<boolean>;
  async countByType(workspaceId: string, type: MktTemplateType): Promise<number>;
}
```

### Phase 3: Update Services

#### Step 3.1: Update EmailNotificationService
File: `src/mkt-core/user-management/services/email-notification.service.ts`

```typescript
// BEFORE
import { MktSendmailTemplateRepository } from 'src/mkt-core/mkt-sendmail-template/repositories';

// AFTER
import { MktTemplateRepository } from 'src/mkt-core/mkt-sendmail-template/repositories';

// BEFORE
private async getEmailTemplate(workspaceId: string, type: string) {
  return this.sendmailTemplateRepository.findByTypeAndLanguage(workspaceId, type, 'en');
}

// AFTER
private async getEmailTemplate(workspaceId: string, type: MktTemplateType) {
  return this.templateRepository.findEmailTemplate(workspaceId, type, 'en');
}
```

#### Step 3.2: Update MktTwoFacetorAuthenticationService
File: `src/mkt-core/mkt-two-facetor-authentication/mkt-two-facetor-authentication.service.ts`

```typescript
// BEFORE
const sendmailTemplate = await this.sendmailTemplateRepository.findByTypeAndLanguage(
  workspace.id,
  MKT_SENDMAIL_TEMPLATE_TYPE.TWO_FACTOR_AUTH,
  language,
);
await this.emailService.send({
  subject: sendmailTemplate.subject,
  html: sendmailTemplate.body.replace('{{otp}}', otp.toString()),
});

// AFTER
const template = await this.templateRepository.findEmailTemplate(
  workspace.id,
  MKT_TEMPLATE_TYPE.TWO_FACTOR_AUTH,
  language,
);
await this.emailService.send({
  subject: template.subject,
  html: template.content.replace('{{otp}}', otp.toString()),
});
```

### Phase 4: Data Migration

#### Step 4.1: Migration Script

```sql
-- Add new columns to mktTemplate
ALTER TABLE "mktTemplate"
  ADD COLUMN IF NOT EXISTS "subject" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;

-- Migrate data from mktSendmailTemplate to mktTemplate
INSERT INTO "mktTemplate" (
  "id", "name", "type", "templateKey", "content", "locale", "subject",
  "version", "isActive", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  "name",
  "type",
  CONCAT("type", '_', "language"),  -- Generate templateKey
  "body",                            -- Map body -> content
  "language",                        -- Map language -> locale
  "subject",
  '1.0.0',
  TRUE,
  "createdAt",
  "updatedAt"
FROM "mktSendmailTemplate"
WHERE "deletedAt" IS NULL
ON CONFLICT DO NOTHING;

-- Soft delete old table data (optional, keep for rollback)
-- UPDATE "mktSendmailTemplate" SET "deletedAt" = NOW();
```

#### Step 4.2: Update Seeder
File: `src/mkt-core/seeder/constants/mkt-sendmail-template-seeds.constant.ts.ts`

Rename to `mkt-template-seeds.constant.ts` and update structure:

```typescript
export const MKT_TEMPLATE_DATA_SEEDS: MktTemplateSeed[] = [
  {
    name: 'Welcome Email',
    templateKey: 'WELCOME_EMAIL_en',
    type: MKT_TEMPLATE_TYPE.WELCOME_EMAIL,
    locale: 'en',
    subject: 'Welcome to Our Service!',
    content: '<div>...</div>',
    version: '1.0.0',
    isActive: true,
  },
  // ... more templates
];
```

### Phase 5: Cleanup

#### Step 5.1: Remove Deprecated Entity
- Delete `mkt-sendmail-template.workpace-entity.ts`
- Delete `mkt-sendmail-template.repository.ts`
- Update `workspace-entity/index.ts`
- Update `repositories/index.ts`

#### Step 5.2: Update Module
File: `src/mkt-core/mkt-sendmail-template/mkt-sendmail-template.module.ts`

```typescript
@Module({
  providers: [MktTemplateRepository],  // Remove MktSendmailTemplateRepository
  exports: [MktTemplateRepository],
})
export class MktSendmailTemplateModule {}
```

#### Step 5.3: Update Imports
Update all files importing old entity/repository:
- `mkt.workspace.entities.ts`
- `email-notification.service.ts`
- `mkt-two-facetor-authentication.service.ts`

---

## 4. Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `constants/mkt-field-ids.ts` | UPDATE | Add `subject`, `isActive` field IDs |
| `constants/mkt-object-ids.ts` | UPDATE | Remove `mktSendmailTemplate` (optional) |
| `workspace-entity/mkt-template.workspace-entity.ts` | UPDATE | Add `subject`, `isActive` fields |
| `workspace-entity/mkt-sendmail-template.workpace-entity.ts` | DELETE | Remove deprecated entity |
| `workspace-entity/index.ts` | UPDATE | Remove MktSendmailTemplateWorkspaceEntity export |
| `repositories/mkt-template.repository.ts` | UPDATE | Add email template methods |
| `repositories/mkt-sendmail-template.repository.ts` | DELETE | Remove deprecated repository |
| `repositories/index.ts` | UPDATE | Remove MktSendmailTemplateRepository export |
| `mkt-sendmail-template.module.ts` | UPDATE | Remove MktSendmailTemplateRepository |
| `workspace-config/mkt.workspace.entities.ts` | UPDATE | Remove MktSendmailTemplateWorkspaceEntity |
| `user-management/services/email-notification.service.ts` | UPDATE | Use MktTemplateRepository |
| `mkt-two-facetor-authentication/mkt-two-facetor-authentication.service.ts` | UPDATE | Use MktTemplateRepository |
| `seeder/constants/mkt-sendmail-template-seeds.constant.ts.ts` | RENAME/UPDATE | Rename and update structure |

---

## 5. Database Schema Comparison

### Before (2 Tables)

```
mktSendmailTemplate          mktTemplate
├── id                       ├── id
├── name                     ├── name
├── language                 ├── type
├── type                     ├── templateKey
├── subject                  ├── content
├── body                     ├── version
├── createdAt                ├── locale
├── updatedAt                ├── metadata
└── deletedAt                ├── position
                             ├── createdBy*
                             ├── searchVector
                             ├── accountOwnerId
                             ├── createdAt
                             ├── updatedAt
                             └── deletedAt
```

### After (1 Table)

```
mktTemplate
├── id
├── name
├── templateKey        -- Unique identifier
├── type               -- Unified type enum
├── subject            -- NEW: Email subject
├── content            -- Template body/content
├── locale             -- Language/locale code
├── version            -- Version number
├── metadata           -- Additional config
├── isActive           -- NEW: Active status
├── position
├── createdBy*
├── searchVector
├── accountOwnerId
├── createdAt
├── updatedAt
└── deletedAt
```

---

## 6. Testing Checklist

- [ ] Email templates load correctly by type and locale
- [ ] 2FA OTP emails send with correct subject and content
- [ ] Welcome emails send with correct subject and content
- [ ] Account update emails work correctly
- [ ] Invoice templates still link to invoices
- [ ] Payment templates still link to payments
- [ ] Search functionality works for templates
- [ ] Seeder creates all required templates
- [ ] Existing data migrated correctly

---

## 7. Rollback Plan

If issues occur:
1. Re-enable `MktSendmailTemplateWorkspaceEntity`
2. Restore old repository
3. Revert service imports
4. Data in `mktSendmailTemplate` table preserved (soft delete only)

---

## 8. Timeline Estimate

| Phase | Tasks | Files |
|-------|-------|-------|
| Phase 1 | Update Entity Schema | 2 |
| Phase 2 | Update Repository | 2 |
| Phase 3 | Update Services | 2 |
| Phase 4 | Data Migration | 2 |
| Phase 5 | Cleanup | 6 |
| Testing | Integration tests | - |

---

## 9. Benefits After Refactoring

1. **Single Source of Truth**: One entity for all templates
2. **Consistent Features**: All templates have versioning, metadata, search
3. **Easier Maintenance**: One repository, one set of methods
4. **Better Extensibility**: Easy to add new template types
5. **Unified API**: Consistent interface for template operations
6. **Reduced Code Duplication**: No more parallel implementations
