# Tài liệu Triển khai: Refactor User Creation với Role Assignment

## 1. Tổng quan

### 1.1. Mục tiêu
Refactor quy trình tạo user để hỗ trợ gán vai trò (role) trong phòng ban cụ thể thông qua `MktUserPermissionTemplate`.

### 1.2. Mô hình nghiệp vụ
```
User + Department + PermissionTemplate = Complete Role Assignment
```

| Entity | Ý nghĩa |
|--------|---------|
| `WorkspaceMember` | WHO - Thông tin nhân viên |
| `MktDepartment` | WHERE - Phòng ban làm việc |
| `MktOrganizationLevel` | LEVEL - Cấp bậc trong tổ chức |
| `MktPermissionTemplate` | WHAT - Vai trò/quyền hạn |
| `MktUserPermissionTemplate` | Junction - Gán vai trò cho user trong phòng ban |

---

## 2. Hiện trạng

### 2.1. CreateUserInput hiện tại
```typescript
// File: dto/create-user.input.ts
@InputType()
export class CreateUserInput {
  email: string;
  firstName?: string;
  lastName?: string;
  startDate: Date;
  endDate?: Date;

  departmentId?: string;           // ✅ Có
  organizationLevelId?: string;    // ✅ Có
  roleId: string;                  // ⚠️ System role (RoleTargetsEntity)

  // Thiếu: permissionTemplateId
}
```

### 2.2. User Service Flow hiện tại
```
createUser()
  └── createCompleteUser()
        ├── createCoreUser()           // User entity
        ├── createUserWorkspaceRecord() // UserWorkspace entity
        ├── assignRole()               // RoleTargetsEntity (system role)
        ├── createWorkspaceMember()    // WorkspaceMember entity
        └── sendWelcomeEmail()
```

### 2.3. Vấn đề
1. **Chưa gán MktPermissionTemplate**: User được tạo nhưng không có vai trò trong hệ thống RBAC của mkt-core
2. **departmentId chỉ là metadata**: Không liên kết với permission system
3. **organizationLevelId tách biệt**: Không được sử dụng để xác định quyền

---

## 3. Thiết kế mới

### 3.1. Cập nhật CreateUserInput
```typescript
// File: dto/create-user.input.ts
@InputType()
export class CreateUserInput {
  // ... existing fields ...

  @Field(() => String)
  @IsString()
  departmentId: string;              // Required - Phòng ban chính

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  organizationLevelId?: string;      // Optional - Cấp bậc

  @Field(() => String)
  @IsString()
  permissionTemplateId: string;      // NEW - Vai trò/Permission Template

  @Field(() => String)
  @IsString()
  roleId: string;                    // System role (giữ nguyên)
}
```

### 3.2. Cập nhật User Service Flow
```
createUser()
  └── createCompleteUser()
        ├── createCoreUser()
        ├── createUserWorkspaceRecord()
        ├── assignRole()                    // System role
        ├── createWorkspaceMember()
        ├── assignPermissionTemplate()      // NEW: MktUserPermissionTemplate
        └── sendWelcomeEmail()
```

### 3.3. Method mới: assignPermissionTemplate
```typescript
private async assignPermissionTemplate(
  workspaceId: string,
  workspaceMemberId: string,
  permissionTemplateId: string,
  departmentId: string,
  assignedById?: string,
): Promise<void> {
  // Insert vào MktUserPermissionTemplate
  const assignment = {
    workspaceMemberId,
    templateId: permissionTemplateId,
    departmentId,
    isActive: true,
    assignedAt: DateTimeUtils.now(),
    assignedById: assignedById ?? null,
    expiresAt: null,
    assignmentReason: 'Initial user creation',
    position: 1,
  };

  await this.mktUserPermissionTemplateRepository.insert(assignment);
}
```

---

## 4. Database Impact

### 4.1. Tables affected
| Table | Action |
|-------|--------|
| `mktUserPermissionTemplate` | INSERT new record |

### 4.2. Data flow
```
CreateUserInput
  ├── departmentId ──────────────────┐
  ├── permissionTemplateId ──────────┼──> MktUserPermissionTemplate
  └── workspaceMemberId (generated) ─┘
```

---

## 5. Implementation Steps

### Phase 1: DTO Updates
- [ ] Cập nhật `CreateUserInput`: thêm `permissionTemplateId`, đổi `departmentId` thành required
- [ ] Cập nhật `UpdateUserInput`: thêm `permissionTemplateId` (optional)
- [ ] Cập nhật `UserOutput`: thêm `permissionTemplateId`, `permissionTemplateName`

### Phase 2: Service Updates
- [ ] Thêm repository cho `MktUserPermissionTemplate`
- [ ] Implement `assignPermissionTemplate()` method
- [ ] Cập nhật `createCompleteUser()` để gọi `assignPermissionTemplate()`
- [ ] Cập nhật `updateUser()` để hỗ trợ thay đổi permission template
- [ ] Cập nhật `deleteUser()` để soft delete permission assignments

### Phase 3: Validation
- [ ] Validate `departmentId` exists
- [ ] Validate `permissionTemplateId` exists và active
- [ ] Validate permission template phù hợp với department (nếu có constraint)

### Phase 4: Testing
- [ ] Unit tests cho `assignPermissionTemplate()`
- [ ] Integration tests cho full user creation flow
- [ ] Test update permission template
- [ ] Test delete user với permission cleanup

---

## 6. API Changes

### 6.1. Mutation: createPersonUser
```graphql
mutation CreatePersonUser($input: CreateUserInput!) {
  createPersonUser(input: $input) {
    id
    email
    firstName
    lastName
    departmentId
    organizationLevelId
    permissionTemplateId      # NEW
    permissionTemplateName    # NEW
  }
}

input CreateUserInput {
  email: String!
  firstName: String
  lastName: String
  startDate: DateTime!
  endDate: DateTime
  departmentId: String!           # Changed: Required
  organizationLevelId: String
  permissionTemplateId: String!   # NEW: Required
  roleId: String!
  # ... other fields
}
```

### 6.2. Query: getPersonUser
```graphql
query GetPersonUser($memberId: String!) {
  getPersonUser(memberId: $memberId) {
    id
    email
    departmentId
    department {                # NEW: Nested object
      id
      departmentName
      departmentCode
    }
    permissionTemplateId        # NEW
    permissionTemplate {        # NEW: Nested object
      id
      templateName
      templateNameEn
      templateKey
    }
  }
}
```

---

## 7. Error Handling

| Error Case | Error Code | Message |
|------------|------------|---------|
| Department not found | `DEPARTMENT_NOT_FOUND` | Department với ID {id} không tồn tại |
| Template not found | `PERMISSION_TEMPLATE_NOT_FOUND` | Permission template với ID {id} không tồn tại |
| Template inactive | `PERMISSION_TEMPLATE_INACTIVE` | Permission template không active |
| Duplicate assignment | `DUPLICATE_ASSIGNMENT` | User đã được gán template này trong department |

---

## 8. Files to modify

```
packages/twenty-server/src/mkt-core/user-management/
├── dto/
│   ├── create-user.input.ts          # Add permissionTemplateId
│   ├── update-user.input.ts          # Add permissionTemplateId
│   └── user.output.ts                # Add permissionTemplateId, permissionTemplateName
├── services/
│   ├── user.service.ts               # Add assignPermissionTemplate()
│   └── workspace-member.service.ts   # Update if needed
├── repositories/
│   └── mkt-user-permission-template.repository.ts  # NEW
└── user-management.module.ts         # Register new repository
```

---

## 9. Migration Considerations

### 9.1. Existing users
- Existing users sẽ không có `MktUserPermissionTemplate` records
- Cần migration script hoặc admin tool để gán retroactively

### 9.2. Backward compatibility
- API changes có thể break existing clients
- Consider versioning hoặc optional fields during transition

---

## 10. Timeline Estimate

| Phase | Task | Complexity |
|-------|------|------------|
| 1 | DTO Updates | Low |
| 2 | Service Updates | Medium |
| 3 | Validation | Low |
| 4 | Testing | Medium |
| **Total** | | **~2-3 days** |

---

## 11. Related Documents
- [MktPermissionTemplate Entity](../../mkt-rbac-enterprise-grade/workspace-entities/template/mkt-permission-template.workspace-entity.ts)
- [MktUserPermissionTemplate Entity](../../mkt-rbac-enterprise-grade/workspace-entities/template/mkt-user-permission-template.workspace-entity.ts)
- [MktDepartment Entity](../../mkt-department/objects/mkt-department.workspace-entity.ts)
