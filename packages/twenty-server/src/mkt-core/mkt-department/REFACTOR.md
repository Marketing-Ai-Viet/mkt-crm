# Tài liệu Refactor - mkt-department Module

> Refactor module mkt-department theo chuẩn module-structure.md, tham khảo customer module

---

## 1. Tổng quan

### 1.1. Mục tiêu
- Chuẩn hóa cấu trúc thư mục theo pattern trong `module-structure.md`
- ~~Áp dụng pattern Block Hooks + Custom Resolvers (như customer module)~~ → **Xem xét lại** (Section 9)
- Tạo index files (export barrels) cho tất cả thư mục
- Tổ chức services theo subdomains
- **Sửa bug**: Register `DepartmentTreeService` và `DepartmentAncestryService` vào module

### 1.2. Tham chiếu
- **Module chuẩn**: `mkt-core/customer/`
- **Skill reference**: `.claude/skills/crm-skill/reference/module-structure.md`

### 1.3. Bugs phát hiện
| Bug | Mô tả | Priority |
|-----|-------|----------|
| Missing service registration | `DepartmentTreeService` không được register trong module nhưng đang được import bởi `mkt-rbac-enterprise-grade` | **HIGH** |
| Missing service registration | `DepartmentAncestryService` không được register trong module | MEDIUM |

---

## 2. Đánh giá Rủi ro

### 2.1. Ma trận Rủi ro

| Rủi ro | Mức độ | Ảnh hưởng | Giảm thiểu |
|--------|--------|-----------|------------|
| **Breaking imports** | 🔴 HIGH | 30+ files ngoài module bị ảnh hưởng | Search toàn repo, update atomic |
| **Block Hooks thay đổi API** | 🟡 MEDIUM | GraphQL clients dùng auto-generated CRUD | **Xem xét không áp dụng** (Section 9) |
| **Resolver rename** | 🟢 LOW | Resolver names đã là custom, không ảnh hưởng schema | Giữ nguyên tên query/mutation |
| **Index barrel enforcement** | 🟡 MEDIUM | Import trực tiếp file sẽ bypass convention | Lint rule hoặc code review |
| **Naming consistency** | 🟢 LOW | Chỉ internal, không ảnh hưởng API | Rename trong cùng commit |

### 2.2. External Dependencies Analysis

**Phân tích từ grep scan: 30+ files ngoài module import từ mkt-department**

#### 2.2.1. workspace-entity/ (HIGH IMPACT - 12+ files)

```
mkt-core/workspace-config/mkt.workspace.entities.ts
mkt-core/mkt-entities-extends/workspace-member.mkt-entity.ts
mkt-core/mkt-rbac-enterprise-grade/workspace-entities/policy/mkt-data-access-policy.workspace-entity.ts
```
→ **Cần cập nhật nếu đổi tên thư mục**

#### 2.2.2. constants/ (HIGH IMPACT - 15+ files)

```
mkt-core/order/resolvers/order-mutation.resolver.ts          # DEPARTMENT
mkt-core/order/constants/order-authorization.constants.ts    # DEPARTMENT, helpers
mkt-core/contract/decorators/require-contract-access.decorator.ts # DEPARTMENT_CODE_GROUP
mkt-core/seeder/department-seeder/*                          # MKT_DEPARTMENT_DATA_SEEDS_IDS
mkt-core/seeder/rbac-seeder/*                                # DepartmentCode
mkt-core/mkt-rbac-enterprise-grade/guards/*                  # constants
mkt-core/mkt-rbac-enterprise-grade/types/*                   # DepartmentCode
mkt-core/mkt-rbac-enterprise-grade/decorators/*              # DEPARTMENT
mkt-core/mkt-rbac-enterprise-grade/constants/core/index.ts   # re-export
engine/workspace-manager/dev-seeder/*                        # MKT_DEPARTMENT_DATA_SEEDS_IDS
```
→ **Không breaking nếu giữ nguyên export paths**

#### 2.2.3. helpers/ (MEDIUM IMPACT - 1 file)

```
mkt-core/order/constants/order-authorization.constants.ts
  → import from 'src/mkt-core/mkt-department/helpers/department-auth.helper'
```
→ **Cần cập nhật nếu đổi helpers/ → utils/**

#### 2.2.4. services/ (HIGH IMPACT - 1 file nhưng critical)

```
mkt-core/mkt-rbac-enterprise-grade/mkt-rbac-enterprise-grade.module.ts
  → import { DepartmentTreeService } from 'src/mkt-core/mkt-department/services/department-tree.service';
```
→ **⚠️ BUG: DepartmentTreeService chưa được register trong MktDepartmentModule nhưng đang được import!**

#### 2.2.5. repositories/ (HIGH IMPACT - 1 file)

```
mkt-core/mkt-rbac-enterprise-grade/services/rbac-context.service.ts
  → imports 4 repositories trực tiếp
```
→ **Cần cập nhật import from index**

#### 2.2.6. MktDepartmentModule (MEDIUM IMPACT - 3 files)

```
mkt-core/mkt-core.module.ts
mkt-core/user-management/user-management.module.ts
mkt-core/mkt-rbac-enterprise-grade/mkt-rbac-enterprise-grade.module.ts
```
→ **Không breaking, chỉ import module**

### 2.3. GraphQL Schema Impact

**Phân tích hiện trạng:**

| Entity | Auto-generated CRUD | Custom Resolvers | Đang sử dụng |
|--------|---------------------|------------------|--------------|
| mktDepartment | ✅ Có | ✅ DepartmentTreeResolver | Cả hai |
| mktDepartmentHierarchy | ✅ Có | ❌ Không | Auto-generated + Hooks |
| mktDepartmentAncestry | ✅ Có | ❌ Không | Auto-generated |
| mktDepartmentSubManager | ✅ Có | ❌ Không | Auto-generated |

**Kết luận**:
- Auto-generated CRUD đang được sử dụng cho hierarchy, ancestry, sub-manager
- Block Hooks sẽ **BREAKING** các clients đang dùng auto-generated operations
- **Khuyến nghị**: Không áp dụng Block Hooks cho module này (xem Section 9)

---

## 3. So sánh cấu trúc

### 2.1. Cấu trúc hiện tại (mkt-department)

```
mkt-department/
├── mkt-department.module.ts
├── constants/
│   ├── mkt-department.constant.ts
│   └── relationship-type.constants.ts     # ❌ Thiếu index.ts
├── graphql-types/                         # ❌ Nên đổi thành dto/
│   ├── department-ancestor.type.ts
│   ├── department-descendant.type.ts
│   ├── department-tree-node.type.ts
│   ├── department-tree-options.input.ts
│   └── hierarchy-statistics.type.ts       # ❌ Thiếu index.ts
├── helpers/                               # ❌ Nên đổi thành utils/
│   └── department-auth.helper.ts
├── hooks/
│   ├── mkt-department-create-one.post-query.hook.ts
│   └── mkt-department-update-one.post-query.hook.ts  # ❌ Thiếu index.ts
├── messages/
│   └── index.ts                           # ✅ OK
├── repositories/
│   ├── index.ts                           # ✅ OK
│   ├── mkt-department.repository.ts
│   ├── mkt-department-ancestry.repository.ts
│   ├── mkt-department-hierarchy.repository.ts
│   └── mkt-department-sub-manager.repository.ts
├── resolvers/
│   └── department-tree.resolver.ts        # ❌ Thiếu index.ts, thiếu Block Hooks
├── services/
│   ├── department.service.ts              # ❌ Thiếu tổ chức subdomain
│   ├── department-tree.service.ts
│   ├── department-ancestry.service.ts     # ❌ Chưa được register trong module
│   └── mkt-department-hierarchy.service.ts  # ❌ Thiếu index.ts
├── types/
│   ├── index.ts                           # ✅ OK
│   ├── department-tree.interface.ts
│   ├── department-ancestry.types.ts
│   ├── query-conditions.types.ts
│   └── service.types.ts
└── workspace-entity/                      # ❌ Nên đổi thành objects/
    ├── index.ts                           # ✅ OK
    ├── mkt-department.workspace-entity.ts
    ├── mkt-department-ancestry.workspace-entity.ts
    ├── mkt-department-hierarchy.workspace-entity.ts
    └── mkt-department-sub-manager.workspace-entity.ts
```

### 2.2. Cấu trúc đích (theo customer module)

```
mkt-department/
├── mkt-department.module.ts
├── constants/
│   ├── index.ts                           # ✅ Thêm mới
│   ├── mkt-department.constant.ts
│   └── relationship-type.constants.ts
├── dto/                                   # ✅ Đổi tên từ graphql-types/
│   ├── index.ts                           # ✅ Thêm mới
│   ├── department-ancestor.output.ts      # ✅ Đổi tên
│   ├── department-descendant.output.ts    # ✅ Đổi tên
│   ├── department-tree-node.output.ts     # ✅ Đổi tên
│   ├── department-tree-options.input.ts
│   └── hierarchy-statistics.output.ts     # ✅ Đổi tên
├── hooks/
│   ├── index.ts                           # ✅ Thêm mới
│   └── department-block.pre-query.hook.ts # ✅ Thêm Block Hooks
├── messages/
│   └── index.ts
├── objects/                               # ✅ Đổi tên từ workspace-entity/
│   ├── mkt-department.workspace-entity.ts
│   ├── mkt-department-ancestry.workspace-entity.ts
│   ├── mkt-department-hierarchy.workspace-entity.ts
│   └── mkt-department-sub-manager.workspace-entity.ts
├── repositories/
│   ├── index.ts
│   ├── mkt-department.repository.ts
│   ├── mkt-department-ancestry.repository.ts
│   ├── mkt-department-hierarchy.repository.ts
│   └── mkt-department-sub-manager.repository.ts
├── resolvers/
│   ├── index.ts                           # ✅ Thêm mới
│   ├── department-query.resolver.ts       # ✅ Tách từ department-tree.resolver.ts
│   └── department-mutation.resolver.ts    # ✅ Thêm mới (nếu cần)
├── services/
│   ├── index.ts                           # ✅ Thêm mới
│   ├── mkt-department.service.ts          # ✅ Core service (đổi tên từ department.service.ts)
│   ├── core/                              # ✅ Tổ chức subdomain
│   │   └── index.ts
│   ├── tree/                              # ✅ Tổ chức subdomain
│   │   ├── index.ts
│   │   ├── department-tree.service.ts
│   │   └── department-ancestry.service.ts
│   └── hierarchy/                         # ✅ Tổ chức subdomain
│       ├── index.ts
│       └── mkt-department-hierarchy.service.ts
├── types/
│   ├── index.ts
│   ├── department-tree.types.ts           # ✅ Đổi tên từ .interface.ts
│   ├── department-ancestry.types.ts
│   ├── query-conditions.types.ts
│   └── service.types.ts
└── utils/                                 # ✅ Đổi tên từ helpers/
    ├── index.ts                           # ✅ Thêm mới
    └── department-auth.util.ts            # ✅ Đổi tên từ .helper.ts
```

---

## 3. Chi tiết thay đổi

### 3.1. Đổi tên thư mục

| Hiện tại | Đích | Lý do |
|----------|------|-------|
| `graphql-types/` | `dto/` | Theo chuẩn module-structure.md |
| `workspace-entity/` | `objects/` | Theo chuẩn module-structure.md |
| `helpers/` | `utils/` | Theo chuẩn module-structure.md |

### 3.2. Đổi tên files

| Hiện tại | Đích | Lý do |
|----------|------|-------|
| `department-ancestor.type.ts` | `department-ancestor.output.ts` | Naming convention cho GraphQL output |
| `department-descendant.type.ts` | `department-descendant.output.ts` | Naming convention |
| `department-tree-node.type.ts` | `department-tree-node.output.ts` | Naming convention |
| `hierarchy-statistics.type.ts` | `hierarchy-statistics.output.ts` | Naming convention |
| `department-auth.helper.ts` | `department-auth.util.ts` | Từ helpers → utils |
| `department-tree.interface.ts` | `department-tree.types.ts` | Dùng type thay vì interface |
| `department.service.ts` | `mkt-department.service.ts` | Prefix nhất quán |

### 3.3. Tạo mới index files

#### `constants/index.ts`
```typescript
// Department enums and options
export * from './mkt-department.constant';

// Relationship type constants
export * from './relationship-type.constants';
```

#### `dto/index.ts`
```typescript
// Query inputs
export * from './department-tree-options.input';

// Query outputs
export * from './department-tree-node.output';
export * from './department-ancestor.output';
export * from './department-descendant.output';
export * from './hierarchy-statistics.output';
```

#### `hooks/index.ts`
```typescript
/**
 * Department Module Hooks
 *
 * Block hooks to disable auto-generated GraphQL operations.
 * All department CRUD operations should go through custom resolvers.
 */

// Block hooks - disable auto-generated operations
export * from './department-block.pre-query.hook';
```

#### `resolvers/index.ts`
```typescript
// Query resolvers
export * from './department-query.resolver';

// Mutation resolvers (if needed)
// export * from './department-mutation.resolver';
```

#### `services/index.ts`
```typescript
// Core CRUD service
export * from './mkt-department.service';

// Tree & Ancestry services
export * from './tree';

// Hierarchy services
export * from './hierarchy';
```

#### `utils/index.ts`
```typescript
// Department authorization helpers
export * from './department-auth.util';
```

### 3.4. ~~Thêm Block Hooks~~ (KHÔNG ÁP DỤNG)

> ⚠️ **QUYẾT ĐỊNH**: Không áp dụng Block Hooks cho module này.
> Xem chi tiết tại **Section 9 - Đánh giá Block Hooks**

**Lý do:**
- Auto-generated CRUD đang được sử dụng hợp lệ cho hierarchy, ancestry, sub-manager
- Block Hooks sẽ gây breaking API không cần thiết
- Post-hooks hiện tại đang hoạt động tốt

**Cấu trúc hooks/ giữ nguyên (chỉ thêm index.ts):**
```typescript
// hooks/index.ts
/**
 * Department Module Hooks
 * Post-query hooks cho automatic hierarchy management.
 * KHÔNG block auto-generated operations.
 */
export * from './mkt-department-create-one.post-query.hook';
export * from './mkt-department-update-one.post-query.hook';
```

### 3.5. ~~Refactor Resolver~~ (KHÔNG ĐỔI TÊN)

Giữ nguyên tên `department-tree.resolver.ts` để tránh breaking changes:

```typescript
/**
 * DepartmentQueryResolver - GraphQL resolver for Department queries
 *
 * Access Control:
 * - Authenticated users with workspace access
 *
 * Provides queries for:
 * - getDepartmentHierarchyTree: Get complete tree from root
 * - getDepartmentSubtree: Get subtree from any node
 * - getDepartmentAncestors: Get all ancestors
 * - getDepartmentDescendants: Get all descendants
 * - getHierarchyStatistics: Get hierarchy statistics
 * - getCompleteDepartmentStructure: Get all root departments
 */

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class DepartmentQueryResolver {
  // ... existing implementation
}
```

### 3.6. Cập nhật Module

```typescript
@Module({
  imports: [
    TwentyORMModule,
    WorkspaceCacheStorageModule, // Thêm nếu dùng cache
  ],
  providers: [
    // Repositories
    MktDepartmentRepository,
    MktDepartmentHierarchyRepository,
    MktDepartmentSubManagerRepository,
    MktDepartmentAncestryRepository,

    // Services - Core
    MktDepartmentService,

    // Services - Tree & Ancestry
    DepartmentTreeService,
    DepartmentAncestryService,

    // Services - Hierarchy
    MktDepartmentHierarchyService,

    // Resolvers
    DepartmentTreeResolver, // Giữ nguyên tên

    // Hooks - Post-query hooks (KHÔNG có Block Hooks)
    MktDepartmentCreateOnePostQueryHook,
    MktDepartmentUpdateOnePostQueryHook,
  ],
  exports: [
    // Repositories
    MktDepartmentRepository,
    MktDepartmentHierarchyRepository,
    MktDepartmentSubManagerRepository,
    MktDepartmentAncestryRepository,

    // Services
    MktDepartmentService,
    DepartmentTreeService,
    DepartmentAncestryService,
    MktDepartmentHierarchyService,
  ],
})
export class MktDepartmentModule {}
```

---

## 4. Cập nhật Import Paths

### 4.1. Files cần cập nhật import

| File | Import cũ | Import mới |
|------|-----------|------------|
| `resolvers/*` | `workspace-entity/` | `objects/` |
| `resolvers/*` | `graphql-types/` | `dto/` |
| `services/*` | `workspace-entity/` | `objects/` |
| `hooks/*` | `workspace-entity/` | `objects/` |
| `repositories/*` | `workspace-entity/` | `objects/` |

### 4.2. Ví dụ cập nhật

**Trước:**
```typescript
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department.workspace-entity';
import { DepartmentTreeNode } from 'src/mkt-core/mkt-department/graphql-types/department-tree-node.type';
```

**Sau:**
```typescript
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department.workspace-entity';
import { DepartmentTreeNode } from 'src/mkt-core/mkt-department/dto';
```

---

## 5. Thứ tự thực hiện

### Phase 1: Chuẩn bị (không breaking)
1. ✅ Tạo `constants/index.ts`
2. ✅ Tạo `hooks/index.ts`
3. ✅ Tạo `resolvers/index.ts`
4. ✅ Tạo `services/index.ts`

### Phase 2: Đổi tên thư mục (breaking - cần cập nhật imports)
5. ⚠️ Đổi `graphql-types/` → `dto/`
6. ⚠️ Đổi `workspace-entity/` → `objects/`
7. ⚠️ Đổi `helpers/` → `utils/`

### Phase 3: Tổ chức lại services
8. ✅ Tạo `services/core/`, `services/tree/`, `services/hierarchy/`
9. ✅ Di chuyển services vào subdomains

### Phase 4: Thêm Block Hooks
10. ✅ Tạo `hooks/department-block.pre-query.hook.ts`
11. ✅ Cập nhật module để sử dụng block hooks

### Phase 5: Cập nhật imports
12. ⚠️ Cập nhật tất cả import paths
13. ✅ Test và verify

---

## 6. Files bị ảnh hưởng ngoài module

Các files ngoài mkt-department cần cập nhật import:

```bash
# Tìm tất cả files import từ mkt-department
grep -r "from 'src/mkt-core/mkt-department/" packages/twenty-server/src --include="*.ts" | grep -v "mkt-department/"
```

**Dự kiến cần cập nhật:**
- `mkt-rbac-enterprise-grade/` - Sử dụng department hierarchy
- `dev-seeder/` - Seeding department data
- `workspace-member/` - Department assignment

---

## 7. Checklist Review

### Sau khi refactor, kiểm tra:

- [ ] Tất cả thư mục có `index.ts` export barrel
- [ ] Không còn import trực tiếp từ file, chỉ import từ index
- [ ] Services được tổ chức theo subdomain
- [ ] Block hooks hoạt động đúng (disable auto-generated operations)
- [ ] Custom resolvers hoạt động thay thế
- [ ] Lint pass (`npx nx lint twenty-server`)
- [ ] Typecheck pass (`npx nx typecheck twenty-server`)
- [ ] Tests pass (`npx nx test twenty-server`)

---

## 8. Ghi chú

### 8.1. Quyết định kiến trúc

**Q: Tại sao cần Block Hooks?**
A: Để kiểm soát truy cập và business logic thông qua custom resolvers thay vì auto-generated CRUD.

**Q: Có cần tạo `MktDepartmentService` mới không?**
A: Có, đổi tên `DepartmentService` → `MktDepartmentService` để nhất quán với naming convention.

**Q: Có cần thêm `DepartmentMutationResolver` không?**
A: Hiện tại chưa cần vì mutations đã được xử lý qua hooks. Có thể thêm sau nếu cần business logic phức tạp.

### 8.2. Migration path

Nếu có external services đang import từ module này:
1. Thông báo breaking changes
2. Cung cấp migration guide
3. Deprecate old paths trước khi xóa

---

## 9. Đánh giá Block Hooks

### 9.1. So sánh với Customer Module

| Tiêu chí | Customer | Department | Kết luận |
|----------|----------|------------|----------|
| Auto-generated CRUD đang dùng? | ❌ Không | ✅ Có (hierarchy, ancestry, sub-manager) | Khác biệt |
| Custom business logic cần kiểm soát? | ✅ Cao (validation, code generation) | 🟡 Trung bình (chỉ tree queries) | Department đơn giản hơn |
| External clients dùng API? | ❌ Chưa xác định | ❌ Chưa xác định | Cần verify |
| Hooks hiện tại xử lý gì? | ❌ Không dùng hooks | ✅ Post-hooks cho hierarchy | Đang hoạt động tốt |

### 9.2. Khuyến nghị

**❌ KHÔNG áp dụng Block Hooks cho mkt-department module**

**Lý do:**
1. Auto-generated CRUD đang được sử dụng hợp lệ cho các sub-entities
2. Hiện tại chỉ có custom resolver cho tree queries, không cần block CRUD
3. Post-hooks đang xử lý hierarchy logic tốt
4. Block Hooks sẽ breaking changes không cần thiết

**Thay vào đó:**
- Giữ nguyên post-hooks hiện tại
- Chỉ cấu trúc lại thư mục và tạo index files
- Thêm custom resolvers nếu cần trong tương lai (không block)

### 9.3. Cập nhật cấu trúc hooks/

**Cấu trúc mới (không có Block Hooks):**

```typescript
// hooks/index.ts
/**
 * Department Module Hooks
 *
 * Post-query hooks for automatic hierarchy management.
 * Does NOT block auto-generated operations.
 */

// Post-query hooks for hierarchy creation
export * from './mkt-department-create-one.post-query.hook';
export * from './mkt-department-update-one.post-query.hook';
```

---

## 10. Custom Resolvers thay thế Auto-generated

### 10.1. Mapping Auto-generated → Custom Resolver

Nếu quyết định thêm custom resolvers trong tương lai, đây là mapping:

| Auto-generated Operation | Custom Resolver Method | Status |
|--------------------------|------------------------|--------|
| `mktDepartments` (findMany) | `getDepartments` | ⏳ Chưa có |
| `mktDepartment` (findOne) | `getDepartmentById` | ⏳ Chưa có |
| `createMktDepartment` | `createDepartment` | ⏳ Chưa có (dùng hook) |
| `updateMktDepartment` | `updateDepartment` | ⏳ Chưa có (dùng hook) |
| `deleteMktDepartment` | `deleteDepartment` | ⏳ Chưa có |
| - | `getDepartmentHierarchyTree` | ✅ Có |
| - | `getDepartmentSubtree` | ✅ Có |
| - | `getDepartmentAncestors` | ✅ Có |
| - | `getDepartmentDescendants` | ✅ Có |
| - | `getHierarchyStatistics` | ✅ Có |
| - | `getCompleteDepartmentStructure` | ✅ Có |

### 10.2. Backward Compatibility

Nếu thêm custom resolvers sau này:
1. **Không rename** tên query/mutation trong schema
2. Thêm **alias** nếu cần đổi tên
3. **Deprecate** auto-generated operations trước khi block

---

## 11. Files cần cập nhật chi tiết

### 11.1. Nếu đổi workspace-entity/ → objects/

```
# Internal (trong mkt-department)
mkt-department/repositories/*.ts                    # 4 files
mkt-department/services/*.ts                        # 4 files
mkt-department/hooks/*.ts                           # 2 files
mkt-department/workspace-entity/*.ts                # Internal refs

# External (ngoài mkt-department)
mkt-core/workspace-config/mkt.workspace.entities.ts
mkt-core/mkt-entities-extends/workspace-member.mkt-entity.ts
mkt-core/mkt-rbac-enterprise-grade/workspace-entities/policy/mkt-data-access-policy.workspace-entity.ts
```

### 11.2. Nếu đổi helpers/ → utils/

```
# External
mkt-core/order/constants/order-authorization.constants.ts
```

### 11.3. Nếu đổi graphql-types/ → dto/

```
# Internal only
mkt-department/resolvers/department-tree.resolver.ts
```

---

## 12. Thứ tự thực hiện (Cập nhật)

### Phase 1: Sửa bugs (Ưu tiên cao)

1. Register `DepartmentTreeService` vào MktDepartmentModule
2. Register `DepartmentAncestryService` vào MktDepartmentModule
3. Thêm vào exports để các module khác sử dụng

### Phase 2: Tạo index files (Không breaking)

4. Tạo `constants/index.ts`
5. Tạo `hooks/index.ts` (không có Block Hooks)
6. Tạo `resolvers/index.ts`
7. Tạo `services/index.ts`
8. Tạo `graphql-types/index.ts` (trước khi đổi tên)

### Phase 3: Đổi tên thư mục (Breaking - cần cập nhật imports)

9. Đổi `graphql-types/` → `dto/`
10. Đổi `workspace-entity/` → `objects/`
11. Đổi `helpers/` → `utils/`
12. Cập nhật tất cả internal imports

### Phase 4: Cập nhật external imports

13. Cập nhật `mkt-core/workspace-config/mkt.workspace.entities.ts`
14. Cập nhật `mkt-core/mkt-entities-extends/workspace-member.mkt-entity.ts`
15. Cập nhật `mkt-core/mkt-rbac-enterprise-grade/` (3 files)
16. Cập nhật `mkt-core/order/constants/order-authorization.constants.ts`

### Phase 5: Tổ chức services (Optional)

17. Tạo subdirectories `services/tree/`, `services/hierarchy/`
18. Di chuyển services vào subdomains
19. Cập nhật index exports

### Phase 6: Verify

20. Run `npx nx lint twenty-server`
21. Run `npx nx typecheck twenty-server`
22. Run `npx nx test twenty-server`

---

## 13. Quyết định cuối cùng

### ✅ Thực hiện

- [x] Sửa bug missing service registration
- [x] Tạo index files cho tất cả thư mục
- [x] Đổi tên thư mục theo chuẩn (graphql-types → dto, workspace-entity → objects, helpers → utils)
- [x] Đổi tên file `.interface.ts` → `.types.ts`
- [x] Cập nhật imports internal và external

### ❌ Không thực hiện

- [ ] ~~Block Hooks~~ - Không cần thiết, sẽ breaking API
- [ ] ~~Rename resolver class~~ - Giữ nguyên `DepartmentTreeResolver`
- [ ] ~~Tổ chức services theo subdomain~~ - Optional, có thể làm sau

---

**Tạo bởi**: Claude Code
**Ngày**: 2026-01-22
**Version**: 2.0 (Cập nhật với Risk Assessment)
