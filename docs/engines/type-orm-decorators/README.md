# Twenty ORM Decorators Documentation

Tài liệu chi tiết về hệ thống decorators trong Twenty ORM - cơ chế metadata-driven để định nghĩa WorkspaceEntity.

## Tài liệu có sẵn

| File | Mô tả |
|------|-------|
| [WORKSPACE_DECORATORS_GUIDE.md](./WORKSPACE_DECORATORS_GUIDE.md) | Hướng dẫn đầy đủ về tất cả decorators |

## Quick Reference

### Entity Decorators

| Decorator | Mục đích |
|-----------|----------|
| `@WorkspaceEntity` | Định nghĩa WorkspaceEntity (table) |
| `@WorkspaceCustomEntity` | Đánh dấu custom entity |

### Field Decorators

| Decorator | Mục đích |
|-----------|----------|
| `@WorkspaceField` | Định nghĩa field với type và options |
| `@WorkspaceIsNullable` | Đánh dấu field có thể NULL |
| `@WorkspaceIsUnique` | Đánh dấu field unique (tự động tạo index) |
| `@WorkspaceIsPrimaryField` | Đánh dấu field là primary identifier |
| `@WorkspaceIsDeprecated` | Đánh dấu field deprecated |

### Relation Decorators

| Decorator | Mục đích |
|-----------|----------|
| `@WorkspaceRelation` | Định nghĩa relation (ONE_TO_MANY, MANY_TO_ONE) |
| `@WorkspaceDynamicRelation` | Định nghĩa dynamic relation cho custom entities |
| `@WorkspaceJoinColumn` | Định nghĩa foreign key column |

### Index Decorators

| Decorator | Mục đích |
|-----------|----------|
| `@WorkspaceIndex` | Tạo composite index (class-level) |
| `@WorkspaceFieldIndex` | Tạo index cho một field (property-level) |

### Behavior Decorators

| Decorator | Mục đích |
|-----------|----------|
| `@WorkspaceIsSystem` | Đánh dấu entity/field là system-level |
| `@WorkspaceIsSearchable` | Đánh dấu entity có thể search |
| `@WorkspaceIsNotAuditLogged` | Tắt audit logging |
| `@WorkspaceDuplicateCriteria` | Định nghĩa tiêu chí phát hiện duplicate |
| `@WorkspaceGate` | Điều khiển visibility theo feature flag |

## Source Code Location

```
packages/twenty-server/src/engine/twenty-orm/decorators/
├── workspace-entity.decorator.ts
├── workspace-custom-entity.decorator.ts
├── workspace-field.decorator.ts
├── workspace-relation.decorator.ts
├── workspace-dynamic-relation.decorator.ts
├── workspace-join-column.decorator.ts
├── workspace-index.decorator.ts
├── workspace-field-index.decorator.ts
├── workspace-is-nullable.decorator.ts
├── workspace-is-unique.decorator.ts
├── workspace-is-primary-field.decorator.ts
├── workspace-is-deprecated.decorator.ts
├── workspace-is-system.decorator.ts
├── workspace-is-searchable.decorator.ts
├── workspace-is-not-audit-logged.decorator.ts
├── workspace-duplicate-criteria.decorator.ts
└── workspace-gate.decorator.ts
```

## Ví dụ Entity Đầy Đủ

Xem section "Complete Entity Example" trong [WORKSPACE_DECORATORS_GUIDE.md](./WORKSPACE_DECORATORS_GUIDE.md#6-complete-entity-example).
