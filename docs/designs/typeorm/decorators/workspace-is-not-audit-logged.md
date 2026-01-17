# WorkspaceIsNotAuditLogged Decorator

## Tổng quan

`@WorkspaceIsNotAuditLogged()` vô hiệu hóa audit logging cho entity. Các changes trên entity này sẽ không được log trong audit trail. Class decorator.

## Vị trí

```
/packages/twenty-server/src/engine/twenty-orm/decorators/workspace-is-not-audit-logged.decorator.ts
```

## Cú pháp

```typescript
@WorkspaceIsNotAuditLogged()
```

## Ví dụ

### Ví dụ 1: Temporary data entity

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.session,
  namePlural: 'sessions',
  labelSingular: msg`Session`,
  labelPlural: msg`Sessions`,
})
@WorkspaceIsNotAuditLogged()  // Sessions không cần audit log
export class SessionWorkspaceEntity extends BaseWorkspaceEntity {
  // Temporary session data
}
```

### Ví dụ 2: High-volume entity

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.analyticsEvent,
  namePlural: 'analyticsEvents',
  labelSingular: msg`Analytics Event`,
  labelPlural: msg`Analytics Events`,
})
@WorkspaceIsNotAuditLogged()  // Too many events, skip audit
export class AnalyticsEventWorkspaceEntity extends BaseWorkspaceEntity {
  // High-volume tracking data
}
```

### Ví dụ 3: Cache entity

```typescript
@WorkspaceEntity({
  standardId: STANDARD_OBJECT_IDS.cache,
  namePlural: 'caches',
  labelSingular: msg`Cache`,
  labelPlural: msg`Cache`,
})
@WorkspaceIsNotAuditLogged()  // Cache changes không cần log
@WorkspaceIsSystem()
export class CacheWorkspaceEntity extends BaseWorkspaceEntity {
  // Cache data
}
```

## Mặc định

Nếu không có `@WorkspaceIsNotAuditLogged`:
- `isAuditLogged = true` (default)
- Mọi changes được log
- Audit trail được maintained

## Audit Logging Behavior

### With Audit Logging (Default)

```typescript
@WorkspaceEntity({...})
export class PersonWorkspaceEntity {
  // Changes được log:
  // - CREATE: New person created
  // - UPDATE: Name changed from "John" to "Jane"
  // - DELETE: Person deleted
}
```

### Without Audit Logging

```typescript
@WorkspaceEntity({...})
@WorkspaceIsNotAuditLogged()
export class SessionWorkspaceEntity {
  // Changes KHÔNG được log:
  // - CREATE: (not logged)
  // - UPDATE: (not logged)
  // - DELETE: (not logged)
}
```

## Use Cases

### 1. Temporary/Ephemeral Data

```typescript
@WorkspaceIsNotAuditLogged()
export class SessionWorkspaceEntity {
  // Sessions expire, không cần history
}

@WorkspaceIsNotAuditLogged()
export class TemporaryTokenWorkspaceEntity {
  // Tokens expire, không cần audit
}
```

### 2. High-Volume Data

```typescript
@WorkspaceIsNotAuditLogged()
export class PageViewWorkspaceEntity {
  // Millions of page views, audit log quá lớn
}

@WorkspaceIsNotAuditLogged()
export class MetricWorkspaceEntity {
  // Frequent updates, audit không practical
}
```

### 3. Cache/Internal Data

```typescript
@WorkspaceIsNotAuditLogged()
export class CacheWorkspaceEntity {
  // Cache invalidation không cần audit
}

@WorkspaceIsNotAuditLogged()
export class QueueWorkspaceEntity {
  // Queue processing internal
}
```

### 4. System/Infrastructure Data

```typescript
@WorkspaceIsNotAuditLogged()
@WorkspaceIsSystem()
export class SystemConfigWorkspaceEntity {
  // System data, không user-facing
}
```

## Performance Benefits

Audit logging có cost:
- 💾 Extra database writes
- 🗄️ Storage space cho audit records
- ⏱️ Slower INSERT/UPDATE/DELETE
- 🔍 Slower queries (triggers overhead)

Tắt audit logging giúp:
- ✅ Faster operations
- ✅ Less storage
- ✅ Reduced database load

## Tradeoffs

### Pros của @WorkspaceIsNotAuditLogged
- ✅ Better performance
- ✅ Less storage
- ✅ Simpler for ephemeral data

### Cons của @WorkspaceIsNotAuditLogged
- ❌ No audit trail
- ❌ Can't track changes
- ❌ No compliance history
- ❌ No undo capability

## When NOT to Use

### ❌ Business-critical data

```typescript
// ❌ Sai - cần audit
@WorkspaceEntity({...})
@WorkspaceIsNotAuditLogged()  // Don't do this!
export class InvoiceWorkspaceEntity {
  // Invoices cần audit trail cho compliance
}
```

### ❌ Compliance-required data

```typescript
// ❌ Sai - compliance requires audit
@WorkspaceEntity({...})
@WorkspaceIsNotAuditLogged()  // Don't do this!
export class PatientRecordWorkspaceEntity {
  // Healthcare data cần audit
}
```

### ❌ User-facing data

```typescript
// ❌ Sai - users cần history
@WorkspaceEntity({...})
@WorkspaceIsNotAuditLogged()  // Don't do this!
export class NoteWorkspaceEntity {
  // Notes cần track ai edit gì
}
```

## When TO Use

### ✅ Temporary data

```typescript
// ✅ Đúng
@WorkspaceIsNotAuditLogged()
export class TemporaryUploadWorkspaceEntity {
  // Files expire, không cần audit
}
```

### ✅ High-frequency data

```typescript
// ✅ Đúng
@WorkspaceIsNotAuditLogged()
export class RealtimePresenceWorkspaceEntity {
  // Updates every second, audit không practical
}
```

### ✅ Cache/derived data

```typescript
// ✅ Đúng
@WorkspaceIsNotAuditLogged()
export class ComputedMetricWorkspaceEntity {
  // Derived from other data, can recompute
}
```

## Best Practices

### 1. Document why audit is disabled

```typescript
// ✅ Đúng - documented
@WorkspaceEntity({
  description: msg`Session data (audit disabled for performance)`,
})
@WorkspaceIsNotAuditLogged()  // High-volume temp data
export class SessionWorkspaceEntity {}
```

### 2. Combine với @WorkspaceIsSystem

```typescript
// ✅ Common pattern
@WorkspaceEntity({...})
@WorkspaceIsSystem()         // Internal entity
@WorkspaceIsNotAuditLogged() // No audit needed
export class InternalWorkspaceEntity {}
```

### 3. Review periodically

```typescript
// TODO: Review if audit logging needed
// Current reason: High-volume temporary data
@WorkspaceIsNotAuditLogged()
export class Entity {}
```

### 4. Consider regulatory requirements

```typescript
// ⚠️ Check compliance requirements before disabling audit
@WorkspaceIsNotAuditLogged()  // OK for this use case?
export class SensitiveDataEntity {}
```

## Metadata Storage

```typescript
{
  // ... other entity metadata
  isAuditLogged: false,  // ← Set bởi decorator
  // Default là true
  // ... other entity metadata
}
```

## Audit Log Table

Audit logs thường lưu trong separate table:

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  entity_type VARCHAR,  -- 'person', 'note', etc.
  entity_id UUID,       -- ID của record
  operation VARCHAR,    -- 'CREATE', 'UPDATE', 'DELETE'
  changes JSONB,        -- Old/new values
  user_id UUID,         -- Ai thực hiện
  timestamp TIMESTAMP,
  workspace_id UUID
);
```

Entities có `@WorkspaceIsNotAuditLogged` không tạo records trong bảng này.

## Compliance Considerations

### GDPR
- Audit logs giúp track data access/changes
- Cần cho "right to know" requests
- Cân nhắc kỹ trước khi disable

### SOC 2
- Audit trails often required
- Cần document why audit disabled

### HIPAA
- Healthcare data cần comprehensive audit
- Không nên disable audit cho patient data

## Troubleshooting

### Không thấy audit logs

**Kiểm tra:**
1. Entity có `@WorkspaceIsNotAuditLogged()` không?
2. Audit logging có enabled globally không?
3. User có permission xem audit logs không?

### Performance issues

**Nếu audit logging gây chậm:**
1. Consider `@WorkspaceIsNotAuditLogged()` cho high-volume entities
2. Archive old audit logs
3. Optimize audit log queries

## See Also

- [WorkspaceEntity Decorator](./workspace-entity.md)
- [WorkspaceIsSystem Decorator](./workspace-is-system.md)
- [Audit Logging System](../../audit-logging.md)
- [Compliance Guide](../../compliance.md)
