# Repository Implementation Guide

Hướng dẫn triển khai Repository pattern trong mkt-core module, sử dụng `BaseWorkspaceRepository` làm base class tiêu chuẩn.

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Cấu trúc BaseWorkspaceRepository](#2-cấu-trúc-baseworkspacerepository)
3. [Cách triển khai Repository mới](#3-cách-triển-khai-repository-mới)
4. [Các phương thức có sẵn](#4-các-phương-thức-có-sẵn)
5. [Thêm Specialized Methods](#5-thêm-specialized-methods)
6. [Patterns và Best Practices](#6-patterns-và-best-practices)
7. [Ví dụ thực tế](#7-ví-dụ-thực-tế)

---

## 1. Tổng quan

### 1.1 Tại sao sử dụng BaseWorkspaceRepository?

- **Giảm code duplication**: Các CRUD operations cơ bản được tái sử dụng
- **Consistency**: Tất cả repositories tuân theo cùng pattern
- **Type-safe**: Generic type đảm bảo type safety
- **Workspace-aware**: Tự động xử lý workspace context

### 1.2 Khi nào sử dụng

| Trường hợp | Sử dụng |
|------------|---------|
| Repository cho WorkspaceEntity với TwentyORMGlobalManager | ✅ BaseWorkspaceRepository |
| Repository với TwentyORMManager (scoped context) | ❌ Không sử dụng |
| Repository với custom dependencies (cache, etc.) | ⚠️ Cân nhắc - có thể extend nhưng cần thêm dependencies |

---

## 2. Cấu trúc BaseWorkspaceRepository

```typescript
// File: src/mkt-core/common/repositories/base-workspace.repository.ts

export abstract class BaseWorkspaceRepository<T extends BaseWorkspaceEntityLike> {
  protected readonly logger: Logger;

  constructor(
    protected readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    protected readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    protected readonly entityClass: new () => T,
    logContext: string,
  );

  // Các phương thức có sẵn...
}
```

### 2.1 Constructor Parameters

| Parameter | Mô tả |
|-----------|-------|
| `twentyORMGlobalManager` | Manager để lấy repository cho workspace |
| `scopedWorkspaceContextFactory` | Factory để lấy workspace context khi không có workspaceId |
| `entityClass` | Class của entity (dùng cho getRepository) |
| `logContext` | Tên để ghi log, nên dùng `ClassName.name` |

---

## 3. Cách triển khai Repository mới

### 3.1 Bước 1: Tạo file repository

```typescript
// File: src/mkt-core/[module]/repositories/[entity].repository.ts

import { Injectable } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MyWorkspaceEntity } from '../workspace-entity/my.workspace-entity';

@Injectable()
export class MyRepository extends BaseWorkspaceRepository<MyWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MyWorkspaceEntity,
      MyRepository.name, // Sử dụng ClassName.name thay vì hardcode string
    );
  }

  // Thêm specialized methods tại đây...
}
```

### 3.2 Bước 2: Export từ index.ts

```typescript
// File: src/mkt-core/[module]/repositories/index.ts

export * from './my.repository';
```

### 3.3 Bước 3: Register trong Module

```typescript
// File: src/mkt-core/[module]/[module].module.ts

@Module({
  providers: [MyRepository],
  exports: [MyRepository],
})
export class MyModule {}
```

---

## 4. Các phương thức có sẵn

### 4.1 Repository Access

```typescript
// Lấy TypeORM repository
async getRepository(workspaceId?: string): Promise<WorkspaceRepository<T>>
```

### 4.2 Find Operations

```typescript
// Tìm theo ID
async findById(workspaceId: string, id: string, options?: BaseRepositoryOptions): Promise<T | null>

// Tìm nhiều theo IDs
async findByIds(workspaceId: string, ids: string[], options?: BaseRepositoryOptions): Promise<T[]>

// Lấy tất cả
async findAll(workspaceId: string, options?: BaseRepositoryOptions): Promise<T[]>

// Tìm với where clause
async findMany(workspaceId: string, where: FindOptionsWhere<T>, options?: BaseRepositoryOptions): Promise<T[]>

// Tìm một với where clause
async findOne(workspaceId: string, where: FindOptionsWhere<T>, options?: BaseRepositoryOptions): Promise<T | null>
```

### 4.3 Create Operations

```typescript
// Tạo mới
async create(workspaceId: string, data: DeepPartial<T>): Promise<T>

// Tạo nhiều
async bulkCreate(workspaceId: string, items: DeepPartial<T>[]): Promise<T[]>
```

### 4.4 Update Operations

```typescript
// Cập nhật theo ID
async update(workspaceId: string, id: string, data: DeepPartial<T>): Promise<void>

// Cập nhật và trả về entity
async updateAndReturn(workspaceId: string, id: string, data: DeepPartial<T>, options?: BaseRepositoryOptions): Promise<T | null>

// Cập nhật theo where clause
async updateWhere(workspaceId: string, where: FindOptionsWhere<T>, data: DeepPartial<T>): Promise<{ affected: number }>
```

### 4.5 Delete Operations

```typescript
// Kiểm tra tồn tại
async exists(workspaceId: string, id: string): Promise<boolean>

// Kiểm tra tồn tại theo where
async existsWhere(workspaceId: string, where: FindOptionsWhere<T>): Promise<boolean>

// Soft delete theo ID
async softDelete(workspaceId: string, id: string): Promise<void>

// Soft delete nhiều
async softDeleteMany(workspaceId: string, ids: string[]): Promise<void>

// Soft delete theo where
async softDeleteWhere(workspaceId: string, where: FindOptionsWhere<T>): Promise<number>
```

### 4.6 Count Operations

```typescript
// Đếm entities
async count(workspaceId: string, where?: FindOptionsWhere<T>): Promise<number>
```

---

## 5. Thêm Specialized Methods

### 5.1 Find by specific field

```typescript
@Injectable()
export class MktDepartmentRepository extends BaseWorkspaceRepository<MktDepartmentWorkspaceEntity> {
  // ... constructor

  /**
   * Find department by code
   */
  async findByCode(
    workspaceId: string,
    departmentCode: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    return this.findOne(workspaceId, { departmentCode });
  }

  /**
   * Find departments by manager ID
   */
  async findByManagerId(
    workspaceId: string,
    managerId: string,
  ): Promise<MktDepartmentWorkspaceEntity[]> {
    return this.findMany(workspaceId, { managerId });
  }
}
```

### 5.2 Find with ordering

```typescript
async findByDepartmentId(
  workspaceId: string,
  departmentId: string,
  options?: { activeOnly?: boolean },
): Promise<MktDepartmentSubManagerWorkspaceEntity[]> {
  const repository = await this.getRepository(workspaceId);

  const whereClause: Record<string, unknown> = {
    departmentId,
    deletedAt: IsNull(),
  };

  if (options?.activeOnly) {
    whereClause.isActive = true;
  }

  return repository.find({
    where: whereClause,
    order: { isPrimary: 'DESC', assignedAt: 'ASC' },
  });
}
```

### 5.3 Complex queries with QueryBuilder

```typescript
async findAncestorIds(
  workspaceId: string,
  departmentId: string,
): Promise<string[]> {
  const repository = await this.getRepository(workspaceId);

  const results = await repository
    .createQueryBuilder('ancestry')
    .select('ancestry.ancestorId', 'ancestorId')
    .where('ancestry.departmentId = :departmentId', { departmentId })
    .andWhere('ancestry.deletedAt IS NULL')
    .orderBy('ancestry.distance', 'ASC')
    .getRawMany<{ ancestorId: string }>();

  return results.map((r) => r.ancestorId);
}
```

### 5.4 Specialized create with defaults

```typescript
async createAssignment(
  workspaceId: string,
  data: Partial<MktDepartmentSubManagerWorkspaceEntity>,
): Promise<MktDepartmentSubManagerWorkspaceEntity> {
  return this.create(workspaceId, {
    ...data,
    assignedAt: data.assignedAt ?? DateTimeUtils.now().toJSDate(),
    isActive: data.isActive ?? true,
    isPrimary: data.isPrimary ?? false,
  });
}
```

### 5.5 Batch operations

```typescript
async findAncestorIdsForMany(
  workspaceId: string,
  departmentIds: string[],
): Promise<Map<string, string[]>> {
  if (departmentIds.length === 0) {
    return new Map();
  }

  const repository = await this.getRepository(workspaceId);

  const results = await repository.find({
    where: {
      departmentId: In(departmentIds),
      deletedAt: IsNull(),
    },
    select: ['departmentId', 'ancestorId'],
    order: { distance: 'ASC' },
  });

  const ancestorMap = new Map<string, string[]>();

  for (const deptId of departmentIds) {
    ancestorMap.set(deptId, []);
  }

  for (const record of results) {
    const ancestors = ancestorMap.get(record.departmentId) ?? [];
    ancestors.push(record.ancestorId);
    ancestorMap.set(record.departmentId, ancestors);
  }

  return ancestorMap;
}
```

---

## 6. Patterns và Best Practices

### 6.1 Naming Conventions

| Convention | Example |
|------------|---------|
| Repository class | `Mkt[Entity]Repository` |
| Log context | `ClassName.name` |
| Find single | `findBy[Field]` |
| Find multiple | `findBy[Field]` hoặc `findAll[Entity]` |
| Find with options | `findBy[Field](workspaceId, value, options?)` |

### 6.2 Parameter Order

```typescript
// Đúng: workspaceId luôn là parameter đầu tiên
async findByCode(workspaceId: string, code: string): Promise<T | null>

// Sai: workspaceId ở cuối
async findByCode(code: string, workspaceId?: string): Promise<T | null>
```

### 6.3 Use Early Return

```typescript
// Đúng
async findByIds(workspaceId: string, ids: string[]): Promise<T[]> {
  if (ids.length === 0) {
    return [];
  }
  // ... logic
}

// Sai
async findByIds(workspaceId: string, ids: string[]): Promise<T[]> {
  if (ids.length > 0) {
    // ... logic
  } else {
    return [];
  }
}
```

### 6.4 Use Constants thay vì Magic Strings

```typescript
// Đúng
import { REPOSITORY_MESSAGES } from 'src/mkt-core/common/messages';

throw new NotFoundException(REPOSITORY_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);

// Sai
throw new NotFoundException('Workspace not found');
```

### 6.5 Sử dụng DateTimeUtils

```typescript
// Đúng
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

const now = DateTimeUtils.now().toJSDate();

// Sai
const now = new Date();
```

---

## 7. Ví dụ thực tế

### 7.1 Repository đơn giản

```typescript
// src/mkt-core/mkt-department/repositories/mkt-department.repository.ts

import { Injectable } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktDepartmentWorkspaceEntity } from '../workspace-entity/mkt-department.workspace-entity';

@Injectable()
export class MktDepartmentRepository extends BaseWorkspaceRepository<MktDepartmentWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktDepartmentWorkspaceEntity,
      MktDepartmentRepository.name,
    );
  }

  async findByCode(
    workspaceId: string,
    departmentCode: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    return this.findOne(workspaceId, { departmentCode });
  }

  async findByManagerId(
    workspaceId: string,
    managerId: string,
  ): Promise<MktDepartmentWorkspaceEntity[]> {
    return this.findMany(workspaceId, { managerId });
  }
}
```

### 7.2 Repository với nhiều specialized methods

Xem file: `src/mkt-core/mkt-department/repositories/mkt-department-ancestry.repository.ts`

### 7.3 Repository với complex operations

Xem file: `src/mkt-core/mkt-department/repositories/mkt-department-sub-manager.repository.ts`

---

## Checklist khi tạo Repository mới

- [ ] Extend từ `BaseWorkspaceRepository<T>`
- [ ] Constructor nhận `TwentyORMGlobalManager` và `ScopedWorkspaceContextFactory`
- [ ] Sử dụng `ClassName.name` cho log context
- [ ] Export từ `index.ts`
- [ ] Register trong module
- [ ] workspaceId là parameter đầu tiên
- [ ] Sử dụng `DateTimeUtils` cho date/time
- [ ] Sử dụng `REPOSITORY_MESSAGES` cho error messages
- [ ] Early return cho empty arrays
- [ ] Không hard-code magic strings
