# MktDepartmentHierarchyWorkspaceEntity - Tài liệu Thiết kế Database

## Tổng quan

`MktDepartmentHierarchyWorkspaceEntity` là một entity quan trọng trong hệ thống CRM, quản lý các mối quan hệ phân cấp giữa các phòng ban trong tổ chức. Entity này hỗ trợ hệ thống RBAC (Role-Based Access Control) tiên tiến với khả năng quản lý quyền hạn phức tạp theo cấu trúc tổ chức.

## Thông tin Entity

- **Tên Entity**: `MktDepartmentHierarchyWorkspaceEntity`
- **Tên Bảng**: `mktDepartmentHierarchies`
- **Icon**: `IconHierarchy`
- **Shortcut**: `H`
- **Có thể tìm kiếm**: ✅

## Cấu trúc Database

### 1. Thông tin Cơ bản (Core Fields)

| Tên Field | Kiểu Dữ liệu | Bắt buộc | Mô tả |
|-----------|--------------|----------|-------|
| `id` | UUID | ✅ | Primary key, ID duy nhất của quan hệ phân cấp |
| `createdAt` | DateTime | ✅ | Thời gian tạo record (từ BaseWorkspaceEntity) |
| `updatedAt` | DateTime | ✅ | Thời gian cập nhật cuối (từ BaseWorkspaceEntity) |
| `deletedAt` | DateTime | ❌ | Thời gian xóa mềm (từ BaseWorkspaceEntity) |

### 2. Thông tin Phân cấp (Hierarchy Information)

| Tên Field | Kiểu Dữ liệu | Bắt buộc | Mô tả |
|-----------|--------------|----------|-------|
| `hierarchyLevel` | NUMBER | ✅ | **Cấp độ trong hierarchy**: 0 = root, 1 = cấp 1, 2 = cấp 2, v.v. |
| `relationshipType` | SELECT | ✅ | **Loại quan hệ phân cấp**: PARENT_CHILD, MATRIX, FUNCTIONAL, TEMPORARY, SUPERVISORY, ADVISORY |
| `hierarchyPath` | ARRAY | ❌ | **Đường dẫn từ root**: Mảng các department ID từ root đến node hiện tại |
| `displayOrder` | NUMBER | ❌ | **Thứ tự hiển thị**: Để sắp xếp trong hierarchy tree |
| `position` | POSITION | ❌ | **Vị trí trong danh sách**: Để drag & drop |

### 3. Quan hệ với Phòng ban (Department Relations)

| Tên Field | Kiểu Dữ liệu | Bắt buộc | Mô tả |
|-----------|--------------|----------|-------|
| `parentDepartment` | RELATION | ❌ | **Phòng ban cha**: Many-to-One với MktDepartmentWorkspaceEntity |
| `parentDepartmentId` | UUID | ❌ | **ID phòng ban cha**: Foreign key |
| `childDepartment` | RELATION | ❌ | **Phòng ban con**: Many-to-One với MktDepartmentWorkspaceEntity |
| `childDepartmentId` | UUID | ❌ | **ID phòng ban con**: Foreign key |

### 4. Thời gian Hiệu lực (Validity Period)

| Tên Field | Kiểu Dữ liệu | Bắt buộc | Mô tả |
|-----------|--------------|----------|-------|
| `validFrom` | DATE_TIME | ❌ | **Ngày bắt đầu hiệu lực**: Quan hệ phân cấp có hiệu lực từ ngày này |
| `validTo` | DATE_TIME | ❌ | **Ngày kết thúc hiệu lực**: Quan hệ phân cấp hết hiệu lực sau ngày này |
| `isActive` | BOOLEAN | ❌ | **Trạng thái hoạt động**: Có đang hoạt động hay không |

### 5. Quyền hạn Cơ bản (Basic RBAC Fields)

| Tên Field | Kiểu Dữ liệu | Bắt buộc | Mô tả |
|-----------|--------------|----------|-------|
| `inheritsPermissions` | BOOLEAN | ❌ | **Kế thừa quyền**: Phòng ban con có kế thừa quyền từ phòng ban cha không |
| `inheritsParentPermissions` | BOOLEAN | ❌ | **Kế thừa quyền cha**: Có kế thừa từ tất cả cấp cha không |
| `canViewTeamData` | BOOLEAN | ❌ | **Xem dữ liệu team**: Manager có thể xem dữ liệu các phòng ban con |
| `canEditTeamData` | BOOLEAN | ❌ | **Chỉnh sửa dữ liệu team**: Manager có thể chỉnh sửa dữ liệu các phòng ban con |
| `canExportTeamData` | BOOLEAN | ❌ | **Xuất dữ liệu team**: Manager có thể xuất dữ liệu các phòng ban con |

### 6. Quyền hạn Nâng cao (Enhanced RBAC Fields)

| Tên Field | Kiểu Dữ liệu | Bắt buộc | Mô tả |
|-----------|--------------|----------|-------|
| `minimumSecurityLevel` | SELECT | ❌ | **Cấp độ bảo mật tối thiểu**: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, TOP_SECRET |
| `canApprove` | BOOLEAN | ❌ | **Quyền phê duyệt**: Có quyền phê duyệt các yêu cầu |
| `canDelegate` | BOOLEAN | ❌ | **Quyền ủy quyền**: Có thể ủy quyền cho người khác |
| `canAudit` | BOOLEAN | ❌ | **Quyền kiểm toán**: Có quyền truy cập audit logs |
| `canManageUsers` | BOOLEAN | ❌ | **Quản lý người dùng**: Có thể quản lý tài khoản và quyền người dùng |
| `canAccessSensitiveData` | BOOLEAN | ❌ | **Truy cập dữ liệu nhạy cảm**: Có quyền truy cập dữ liệu business quan trọng |

### 7. Quy tắc Kinh doanh (Business Rule Fields)

| Tên Field | Kiểu Dữ liệu | Bắt buộc | Mô tả |
|-----------|--------------|----------|-------|
| `canEscalateToParent` | BOOLEAN | ❌ | **Có thể escalate**: Vấn đề có thể được escalate lên cấp cha |
| `allowsCrossBranchAccess` | BOOLEAN | ❌ | **Cho phép truy cập cross-branch**: Truy cập giữa các nhánh khác nhau |
| `canOverrideSubordinates` | BOOLEAN | ❌ | **Override cấp dưới**: Có thể ghi đè quyết định của cấp dưới |
| `requiresDualApproval` | BOOLEAN | ❌ | **Yêu cầu phê duyệt kép**: Cần 2 người phê duyệt |
| `requiresMFA` | BOOLEAN | ❌ | **Yêu cầu MFA**: Bắt buộc multi-factor authentication |
| `canAccessAfterHours` | BOOLEAN | ❌ | **Truy cập ngoài giờ**: Được phép truy cập ngoài giờ làm việc |

### 8. Tuân thủ (Compliance Fields)

| Tên Field | Kiểu Dữ liệu | Bắt buộc | Mô tả |
|-----------|--------------|----------|-------|
| `requiresFullAuditTrail` | BOOLEAN | ❌ | **Audit trail đầy đủ**: Tất cả hành động phải được log chi tiết |
| `canDeleteData` | BOOLEAN | ❌ | **Quyền xóa dữ liệu**: Có thể xóa dữ liệu business |
| `gdprCompliant` | BOOLEAN | ❌ | **Tuân thủ GDPR**: Phải tuân thủ quy định GDPR |

### 9. Metadata và Cấu hình (Metadata Fields)

| Tên Field | Kiểu Dữ liệu | Bắt buộc | Mô tả |
|-----------|--------------|----------|-------|
| `priorityLevel` | NUMBER | ❌ | **Mức độ ưu tiên**: 1-10 (10 = cao nhất) |
| `permissionWeight` | NUMBER | ❌ | **Trọng số quyền**: 0-100, dùng để tính toán quyền ưu tiên |
| `notes` | TEXT | ❌ | **Ghi chú**: Thông tin bổ sung về quan hệ phân cấp |
| `securityNotes` | TEXT | ❌ | **Ghi chú bảo mật**: Thông tin bảo mật đặc biệt |
| `createdBy` | ACTOR | ✅ | **Người tạo**: Thông tin về người tạo record |

## Mối quan hệ Database

### 1. Relations với Department Entity

```sql
-- Parent Department
parentDepartmentId -> MktDepartmentWorkspaceEntity.id (Many-to-One)
-- Child Department
childDepartmentId -> MktDepartmentWorkspaceEntity.id (Many-to-One)
```

### 2. Inverse Relations

- `MktDepartmentWorkspaceEntity.childHierarchies` ← `parentDepartment`
- `MktDepartmentWorkspaceEntity.parentHierarchies` ← `childDepartment`

## Chỉ mục (Indexes) Đề xuất

```sql
-- Chỉ mục chính
CREATE INDEX idx_mkt_dept_hierarchy_parent ON mktDepartmentHierarchies(parentDepartmentId);
CREATE INDEX idx_mkt_dept_hierarchy_child ON mktDepartmentHierarchies(childDepartmentId);
CREATE INDEX idx_mkt_dept_hierarchy_level ON mktDepartmentHierarchies(hierarchyLevel);

-- Chỉ mục phức hợp
CREATE INDEX idx_mkt_dept_hierarchy_active_valid ON mktDepartmentHierarchies(isActive, validFrom, validTo);
CREATE INDEX idx_mkt_dept_hierarchy_parent_child ON mktDepartmentHierarchies(parentDepartmentId, childDepartmentId);

-- Chỉ mục hiệu suất RBAC
CREATE INDEX idx_mkt_dept_hierarchy_security ON mktDepartmentHierarchies(minimumSecurityLevel, priorityLevel);
CREATE INDEX idx_mkt_dept_hierarchy_permissions ON mktDepartmentHierarchies(canViewTeamData, canEditTeamData, canExportTeamData);
```

## Ràng buộc Database (Constraints)

### 1. Check Constraints

```sql
-- Hierarchy level phải >= 0
ALTER TABLE mktDepartmentHierarchies ADD CONSTRAINT chk_hierarchy_level_positive
CHECK (hierarchyLevel >= 0);

-- Priority level trong khoảng 1-10
ALTER TABLE mktDepartmentHierarchies ADD CONSTRAINT chk_priority_level_range
CHECK (priorityLevel >= 1 AND priorityLevel <= 10);

-- Permission weight trong khoảng 0-100
ALTER TABLE mktDepartmentHierarchies ADD CONSTRAINT chk_permission_weight_range
CHECK (permissionWeight >= 0 AND permissionWeight <= 100);

-- Valid date range
ALTER TABLE mktDepartmentHierarchies ADD CONSTRAINT chk_valid_date_range
CHECK (validFrom IS NULL OR validTo IS NULL OR validFrom <= validTo);
```

### 2. Unique Constraints

```sql
-- Một cặp parent-child chỉ có một quan hệ active tại một thời điểm
CREATE UNIQUE INDEX idx_mkt_dept_hierarchy_unique_active
ON mktDepartmentHierarchies(parentDepartmentId, childDepartmentId)
WHERE isActive = true AND deletedAt IS NULL;
```

## Triggers và Business Logic

### 1. Hierarchy Path Update Trigger

```sql
-- Tự động cập nhật hierarchyPath khi có thay đổi
CREATE OR REPLACE FUNCTION update_hierarchy_path()
RETURNS TRIGGER AS $$
BEGIN
    -- Logic cập nhật hierarchy path
    -- Được thực hiện trong application layer
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_hierarchy_path
    BEFORE INSERT OR UPDATE ON mktDepartmentHierarchies
    FOR EACH ROW
    EXECUTE FUNCTION update_hierarchy_path();
```

### 2. Circular Reference Prevention

```sql
-- Ngăn chặn circular reference trong hierarchy
CREATE OR REPLACE FUNCTION prevent_circular_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
    -- Kiểm tra circular reference
    -- Logic được implement trong application layer
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Patterns và Best Practices

### 1. Materialized Path Pattern

- Sử dụng `hierarchyPath` array để lưu trữ đường dẫn từ root
- Giúp truy vấn hierarchy nhanh chóng
- Ví dụ: `['root-id', 'level-1-id', 'level-2-id']`

### 2. Effective Dating Pattern

- Sử dụng `validFrom` và `validTo` để quản lý thời gian hiệu lực
- Cho phép lịch sử thay đổi cấu trúc tổ chức
- Hỗ trợ planning cho tương lai

### 3. RBAC Integration

- Fields RBAC được thiết kế để tích hợp với Enterprise RBAC system
- `minimumSecurityLevel` và `permissionWeight` để tính toán quyền
- Flags boolean cho các quyền cụ thể

## Use Cases Chính

### 1. Organizational Hierarchy Management

```sql
-- Lấy tất cả phòng ban con của một phòng ban
SELECT * FROM mktDepartmentHierarchies
WHERE parentDepartmentId = ? AND isActive = true;

-- Lấy toàn bộ hierarchy path từ root
SELECT * FROM mktDepartmentHierarchies
WHERE ? = ANY(hierarchyPath) AND isActive = true;
```

### 2. Permission Inheritance

```sql
-- Tìm các quyền được kế thừa từ phòng ban cha
SELECT * FROM mktDepartmentHierarchies
WHERE childDepartmentId = ?
  AND inheritsPermissions = true
  AND isActive = true;
```

### 3. Security Level Enforcement

```sql
-- Kiểm tra quyền truy cập theo security level
SELECT * FROM mktDepartmentHierarchies h
JOIN users u ON u.departmentId = h.childDepartmentId
WHERE u.securityClearance >= h.minimumSecurityLevel;
```

## Performance Considerations

### 1. Indexing Strategy

- Index trên parent/child department IDs cho joins nhanh
- Composite index cho queries phức tạp
- Partial index cho active records

### 2. Query Optimization

- Sử dụng materialized path cho deep hierarchy queries
- Cache hierarchy data ở application layer
- Batch updates cho hierarchy changes

### 3. Data Volume Management

- Soft delete để maintain audit trail
- Archive old hierarchy relationships
- Monitor index performance

## Security Considerations

### 1. Data Sensitivity

- `securityNotes` có thể chứa thông tin nhạy cảm
- `minimumSecurityLevel` controls access
- Audit all permission changes

### 2. Access Control

- Row-level security based on user's department
- Permission-based field access
- Encrypted sensitive data fields

### 3. Compliance

- GDPR compliance tracking với `gdprCompliant` field
- Full audit trail với `requiresFullAuditTrail`
- Data retention policies

## Migration và Deployment

### 1. Schema Migration

```sql
-- Initial schema creation
CREATE TABLE mktDepartmentHierarchies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Add all fields as specified in entity
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL
);
```

### 2. Data Migration

- Import existing hierarchy data
- Calculate initial hierarchy paths
- Set up default permissions

### 3. Rollback Strategy

- Backup before major changes
- Incremental rollback capability
- Data validation checks

## Monitoring và Maintenance

### 1. Health Checks

- Verify hierarchy integrity
- Check for circular references
- Validate permission consistency

### 2. Performance Monitoring

- Query performance tracking
- Index usage statistics
- Slow query identification

### 3. Data Quality

- Regular data validation
- Orphaned record cleanup
- Permission audit reports

---

**Lưu ý**: Document này mô tả thiết kế database cho MktDepartmentHierarchyWorkspaceEntity trong hệ thống CRM Twenty. Entity này hỗ trợ Enterprise RBAC với khả năng quản lý phức tạp cấu trúc tổ chức và phân quyền chi tiết.