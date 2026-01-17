# Twenty ORM Documentation

Tài liệu chi tiết về Twenty ORM - hệ thống ORM tùy chỉnh cho Twenty CRM.

## Tổng quan

Twenty ORM là một ORM system được xây dựng trên TypeORM, được thiết kế đặc biệt cho Twenty CRM với các tính năng:

- ✅ **Workspace-scoped entities**: Multi-tenant data isolation
- ✅ **Dynamic schema**: Runtime schema modifications
- ✅ **Custom objects**: User-defined entities
- ✅ **Metadata-driven**: Metadata-based configuration
- ✅ **GraphQL integration**: Automatic GraphQL API generation
- ✅ **Full-text search**: PostgreSQL ts_vector integration
- ✅ **Audit logging**: Automatic change tracking
- ✅ **Feature flags**: Gate entities/fields behind flags

## Tài liệu

### Core Documentation

1. **[Decorators](./decorators/README.md)** - Tổng quan về tất cả decorators
2. **[Workspace Index Decorator](./workspace-index-decorator.md)** - Chi tiết về index decorator

### Decorator Documentation

#### Entity-Level Decorators

| Decorator | Mô tả | File |
|-----------|-------|------|
| `@WorkspaceEntity()` | Định nghĩa workspace entity (bắt buộc) | [workspace-entity.md](./decorators/workspace-entity.md) |
| `@WorkspaceCustomEntity()` | Đánh dấu entity có thể mở rộng | [workspace-custom-entity.md](./decorators/workspace-custom-entity.md) |
| `@WorkspaceIndex()` | Tạo composite index | [workspace-index-decorator.md](./workspace-index-decorator.md) |
| `@WorkspaceDuplicateCriteria()` | Định nghĩa tiêu chí phát hiện duplicate | [workspace-duplicate-criteria.md](./decorators/workspace-duplicate-criteria.md) |

#### Field-Level Decorators

| Decorator | Mô tả | File |
|-----------|-------|------|
| `@WorkspaceField()` | Định nghĩa field (bắt buộc cho non-relation fields) | [workspace-field.md](./decorators/workspace-field.md) |
| `@WorkspaceRelation()` | Định nghĩa relation giữa entities | [workspace-relation.md](./decorators/workspace-relation.md) |
| `@WorkspaceDynamicRelation()` | Định nghĩa dynamic/polymorphic relation | [workspace-dynamic-relation.md](./decorators/workspace-dynamic-relation.md) |
| `@WorkspaceJoinColumn()` | Kết nối foreign key với relation | [workspace-join-column.md](./decorators/workspace-join-column.md) |
| `@WorkspaceFieldIndex()` | Tạo index trên field | [workspace-field-index.md](./decorators/workspace-field-index.md) |

#### Field Modifiers

| Decorator | Mô tả | File |
|-----------|-------|------|
| `@WorkspaceIsNullable()` | Cho phép field có giá trị NULL | [workspace-is-nullable.md](./decorators/workspace-is-nullable.md) |
| `@WorkspaceIsUnique()` | Tạo unique constraint | [workspace-is-unique.md](./decorators/workspace-is-unique.md) |
| `@WorkspaceIsPrimaryField()` | Đánh dấu làm primary identifier | [workspace-is-primary-field.md](./decorators/workspace-is-primary-field.md) |
| `@WorkspaceIsDeprecated()` | Đánh dấu field deprecated | [workspace-is-deprecated.md](./decorators/workspace-is-deprecated.md) |

#### System & Feature Flags

| Decorator | Mô tả | File |
|-----------|-------|------|
| `@WorkspaceIsSystem()` | Đánh dấu entity/field là system | [workspace-is-system.md](./decorators/workspace-is-system.md) |
| `@WorkspaceIsNotAuditLogged()` | Tắt audit logging | [workspace-is-not-audit-logged.md](./decorators/workspace-is-not-audit-logged.md) |
| `@WorkspaceIsSearchable()` | Kích hoạt full-text search | [workspace-is-searchable.md](./decorators/workspace-is-searchable.md) |
| `@WorkspaceGate()` | Feature flag gating | [workspace-gate.md](./decorators/workspace-gate.md) |

## Quick Start

### 1. Tạo Entity cơ bản

```typescript
import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';
import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';

@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.product,
  namePlural: 'products',
  labelSingular: msg`Product`,
  labelPlural: msg`Products`,
  description: msg`A product`,
  icon: 'IconBox',
})
export class ProductWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    icon: 'IconTag',
  })
  name: string;

  @WorkspaceField({
    standardId: FIELD_IDS.price,
    type: FieldMetadataType.CURRENCY,
    label: msg`Price`,
    icon: 'IconCurrencyDollar',
  })
  @WorkspaceIsNullable()
  price: { amountMicros: number; currencyCode: string } | null;
}
```

### 2. Tạo Relations

```typescript
// Parent entity
@WorkspaceEntity({...})
export class CompanyWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceRelation({
    standardId: FIELD_IDS.products,
    type: RelationType.ONE_TO_MANY,
    label: msg`Products`,
    inverseSideTarget: () => ProductWorkspaceEntity,
  })
  products: Relation<ProductWorkspaceEntity[]>;
}

// Child entity
@WorkspaceEntity({...})
export class ProductWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceRelation({
    standardId: FIELD_IDS.company,
    type: RelationType.MANY_TO_ONE,
    label: msg`Company`,
    inverseSideTarget: () => CompanyWorkspaceEntity,
    inverseSideFieldKey: 'products',
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  company: Relation<CompanyWorkspaceEntity> | null;

  @WorkspaceField({
    standardId: FIELD_IDS.companyId,
    type: FieldMetadataType.UUID,
    label: msg`Company ID`,
  })
  @WorkspaceIsNullable()
  @WorkspaceJoinColumn('company')
  companyId: string | null;
}
```

### 3. Sync Metadata

```bash
# Sync metadata to database
npx nx run twenty-server:command workspace:sync-metadata -f

# Generate migration if needed
npx nx run twenty-server:typeorm migration:generate src/database/typeorm/core/migrations/AddProduct -d src/database/typeorm/core/core.datasource.ts

# Run migration
npx nx run twenty-server:database:migrate:prod
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Decorator Application                    │
│  (@WorkspaceEntity, @WorkspaceField, etc.)      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         Metadata Args Storage                    │
│  (Stores all decorator metadata)                │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│      Workspace Sync Metadata Process             │
│  (Reads metadata and syncs with database)       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         Object/Field Metadata Tables             │
│  (Runtime configuration in database)            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│           GraphQL Schema Generation              │
│  (Automatic API from metadata)                  │
└─────────────────────────────────────────────────┘
```

## Key Concepts

### 1. Workspace Scoping

Mỗi entity instance thuộc về một workspace:
```typescript
// Automatic workspace isolation
const people = await personRepository.find({
  where: { workspaceId: currentWorkspaceId }
});
```

### 2. Metadata-Driven

Schema được lưu trong metadata tables:
- `objectMetadata` - Entity definitions
- `fieldMetadata` - Field definitions
- `relationMetadata` - Relation definitions
- `indexMetadata` - Index definitions

### 3. Standard IDs

Mỗi entity/field có unique standardId:
```typescript
standardId: STANDARD_OBJECT_IDS.person  // '20202020-...'
standardId: PERSON_STANDARD_FIELD_IDS.name  // '20202020-...'
```

### 4. i18n Support

Sử dụng Lingui cho internationalization:
```typescript
label: msg`Name`  // Translatable
description: msg`Person's full name`  // Translatable
```

## Common Patterns

### Soft Delete

```typescript
// BaseWorkspaceEntity includes:
@WorkspaceField({...})
@WorkspaceIsNullable()
@WorkspaceIsSystem()
deletedAt: Date | null;

// Queries automatically filter deleted records
```

### Audit Fields

```typescript
// BaseWorkspaceEntity includes:
createdAt: Date;
updatedAt: Date;
deletedAt: Date | null;

// Plus entity-level audit logging (if not disabled)
```

### Full-Text Search

```typescript
@WorkspaceEntity({...})
@WorkspaceIsSearchable()
export class SearchableEntity extends BaseWorkspaceEntity {
  @WorkspaceField({...})
  searchVector: string;  // Generated tsvector
}
```

## Best Practices

### ✅ DO

- Use `msg` macro for all labels/descriptions
- Always provide `standardId` from constants
- Use `BaseWorkspaceEntity` as base class
- Mark system fields with `@WorkspaceIsSystem()`
- Index foreign keys with `@WorkspaceJoinColumn()`
- Document decorator usage with comments
- Sync metadata after schema changes

### ❌ DON'T

- Don't use default exports (use named exports)
- Don't use `any` type (use specific types)
- Don't hardcode UUIDs (use constants)
- Don't skip metadata sync
- Don't create entities without `@WorkspaceEntity()`
- Don't forget to run migrations

## Commands Reference

```bash
# Development
npx nx start twenty-server        # Start server
npx nx start twenty-front         # Start frontend

# Metadata
npx nx run twenty-server:command workspace:sync-metadata -f

# Database
npx nx database:reset twenty-server
npx nx run twenty-server:database:migrate:prod

# Migrations
npx nx run twenty-server:typeorm migration:generate src/database/typeorm/core/migrations/[Name] -d src/database/typeorm/core/core.datasource.ts
npx nx run twenty-server:typeorm migration:run -d src/database/typeorm/core/core.datasource.ts

# Testing
npx nx test twenty-server
npx nx test twenty-front

# Linting
npx nx lint twenty-server
npx nx lint twenty-front
```

## Troubleshooting

### Entity không xuất hiện trong API

1. Check `@WorkspaceEntity()` decorator
2. Run metadata sync
3. Check feature gates
4. Verify extends `BaseWorkspaceEntity`

### Migration errors

1. Check entity definitions
2. Verify foreign key constraints
3. Check for circular dependencies
4. Review database logs

### Type errors

1. Ensure TypeScript types match field metadata types
2. Check nullable consistency
3. Verify relation types
4. Update generated types

## Resources

- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [GraphQL Schema](https://graphql.org/learn/schema/)
- [Twenty Development Guide](../../README.md)

## Contributing

Khi thêm decorators mới:

1. Create decorator in `/decorators` folder
2. Add to metadata args storage
3. Update sync metadata process
4. Write tests
5. Document in this folder
6. Update README.md

## License

Twenty CRM - AGPL-3.0 License

---

**Last Updated**: 2024-10-02

**Maintainer**: Twenty Development Team
