# Cache Implementation Guide

## Tổng quan

Tài liệu này hướng dẫn chi tiết cách implement cache cho CRM system để nâng cao performance. Dự án đã có sẵn infrastructure cache với Redis, chúng ta sẽ tận dụng và mở rộng.

## Kiến trúc Cache hiện tại

### Infrastructure có sẵn

```
packages/twenty-server/src/engine/core-modules/cache-storage/
├── cache-storage.module.ts           # CacheModule configuration
├── cache-storage.service.ts          # Core cache operations
└── decorators/cache-storage.decorator.ts

packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/services/
└── rbac-cache-manager.service.ts     # RBAC-specific cache manager
```

### Cache Namespaces

```typescript
enum CacheStorageNamespace {
  EngineWorkspace = 'engine:workspace',
  EngineMetadata = 'engine:metadata',
  EnginePermissions = 'engine:permissions',
  // ... other namespaces
}
```

---

## Phase 1: High Priority Implementation (Tuần 1-2)

### 1. User Context Cache

**File**: `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/services/step2-user-context-resolution.service.ts`

**Mục tiêu**: Cache user context để tránh query workspace member mỗi request

#### Bước 1: Inject RbacCacheManagerService

```typescript
import { RbacCacheManagerService } from '../rbac-cache-manager.service';

@Injectable()
export class Step2UserContextResolutionService implements PermissionValidationStep {
  private readonly logger = new Logger(Step2UserContextResolutionService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly rbacCacheManager: RbacCacheManagerService, // ADD THIS
  ) {}
```

#### Bước 2: Implement cache logic trong validate method

Tìm method `validate()` và thêm cache check:

```typescript
async validate(
  context: EnhancedPermissionContext,
): Promise<StepValidationResult> {
  const startTime = DateTime.now();
  const workspaceMemberId = context.userContext?.workspaceMemberId;

  if (!workspaceMemberId) {
    return this.createErrorResult('Missing workspace member ID');
  }

  try {
    // CHECK CACHE FIRST
    const cachedContext = await this.rbacCacheManager.getCachedUserContext(
      workspaceMemberId,
    );

    if (cachedContext && this.isCachedContextValid(cachedContext)) {
      this.logger.debug('User context cache hit', { workspaceMemberId });

      // Enrich context from cache
      context.userContext = {
        ...context.userContext,
        ...cachedContext,
        isEnriched: true,
      } as EnhancedUserContext;

      return {
        stepNumber: this.stepNumber,
        stepName: this.stepName,
        passed: true,
        result: CheckResult.PROCEED,
        executionTime: DateTime.now().diff(startTime).milliseconds,
        details: { source: 'cache' },
      };
    }

    // CACHE MISS - Query database
    this.logger.debug('User context cache miss', { workspaceMemberId });

    const workspaceId = context.userContext?.workspaceId;
    if (!workspaceId) {
      return this.createErrorResult('Missing workspace ID');
    }

    // Existing logic to fetch from database
    const workspaceMemberRepo = await this.getWorkspaceMemberRepositories(workspaceId);
    const workspaceMember = await workspaceMemberRepo.findOne({
      where: { id: workspaceMemberId },
      relations: ['department', 'organizationLevel', 'employmentStatus'],
    });

    if (!workspaceMember) {
      return this.createErrorResult('Workspace member not found');
    }

    // Build enriched context
    const enrichedContext = await this.buildEnrichedUserContext(
      workspaceMember,
      context,
    );

    // CACHE THE RESULT
    await this.rbacCacheManager.cacheUserContext(
      workspaceMemberId,
      enrichedContext,
      30 * 60 * 1000, // 30 minutes TTL
    );

    // Update context
    context.userContext = enrichedContext;

    return {
      stepNumber: this.stepNumber,
      stepName: this.stepName,
      passed: true,
      result: CheckResult.PROCEED,
      executionTime: DateTime.now().diff(startTime).milliseconds,
      details: { source: 'database' },
    };
  } catch (error) {
    this.logger.error('User context resolution failed', {
      error: error.message,
      workspaceMemberId,
    });
    return this.createErrorResult(error.message);
  }
}
```

#### Bước 3: Add helper methods

```typescript
/**
 * Validate cached context is still valid
 */
private isCachedContextValid(cachedContext: any): boolean {
  return (
    cachedContext &&
    cachedContext.workspaceMemberId &&
    cachedContext.departmentId !== undefined &&
    cachedContext.isEnriched === true
  );
}

/**
 * Build enriched user context from workspace member
 */
private async buildEnrichedUserContext(
  workspaceMember: WorkspaceMemberWorkspaceEntity,
  context: EnhancedPermissionContext,
): Promise<EnhancedUserContext> {
  return {
    userId: context.userContext?.userId || '',
    workspaceId: context.userContext?.workspaceId || '',
    workspaceMemberId: workspaceMember.id,
    email: workspaceMember.userEmail || '',
    roleId: context.userContext?.roleId,

    // Department info
    departmentId: workspaceMember.departmentId || null,
    departmentName: workspaceMember.department?.name || null,

    // Organization level
    organizationLevelId: workspaceMember.organizationLevelId || null,
    hierarchyLevel: workspaceMember.organizationLevel?.level || 0,

    // Employment status
    employmentStatusId: workspaceMember.employmentStatusId || null,
    isActive: workspaceMember.employmentStatus?.isActive || true,

    isEnriched: true,
  };
}

/**
 * Create error result
 */
private createErrorResult(message: string): StepValidationResult {
  return {
    stepNumber: this.stepNumber,
    stepName: this.stepName,
    passed: false,
    result: CheckResult.DENY,
    executionTime: 0,
    message,
  };
}
```

#### Bước 4: Add cache invalidation

Tạo file mới: `packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/listeners/user-context-invalidation.listener.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RbacCacheManagerService } from '../services/rbac-cache-manager.service';

@Injectable()
export class UserContextInvalidationListener {
  private readonly logger = new Logger(UserContextInvalidationListener.name);

  constructor(
    private readonly rbacCacheManager: RbacCacheManagerService,
  ) {}

  @OnEvent('workspaceMember.updated')
  async handleWorkspaceMemberUpdated(event: { workspaceMemberId: string }) {
    this.logger.debug('Invalidating user context cache', {
      workspaceMemberId: event.workspaceMemberId,
    });

    await this.rbacCacheManager.invalidateUserCache(event.workspaceMemberId);
  }

  @OnEvent('workspaceMember.deleted')
  async handleWorkspaceMemberDeleted(event: { workspaceMemberId: string }) {
    await this.rbacCacheManager.invalidateUserCache(event.workspaceMemberId);
  }

  @OnEvent('department.updated')
  async handleDepartmentUpdated(event: { departmentId: string }) {
    // Invalidate all users in this department
    await this.rbacCacheManager.invalidateByPattern(
      `rbac:user:context:*:department:${event.departmentId}*`,
    );
  }
}
```

#### Bước 5: Register listener trong module

`packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/mkt-rbac-enterprise-grade.module.ts`

```typescript
import { UserContextInvalidationListener } from './listeners/user-context-invalidation.listener';

@Module({
  imports: [CacheStorageModule.forRoot(CacheStorageNamespace.EngineWorkspace)],
  providers: [
    // ... existing providers
    UserContextInvalidationListener, // ADD THIS
  ],
  exports: [
    // ... existing exports
    UserContextInvalidationListener,
  ],
})
export class MktRbacEnterpriseGradeModule {}
```

#### Testing

```typescript
// Test file: step2-user-context-resolution.service.spec.ts
describe('Step2UserContextResolutionService with Cache', () => {
  let service: Step2UserContextResolutionService;
  let rbacCacheManager: RbacCacheManagerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        Step2UserContextResolutionService,
        {
          provide: RbacCacheManagerService,
          useValue: {
            getCachedUserContext: jest.fn(),
            cacheUserContext: jest.fn(),
            invalidateUserCache: jest.fn(),
          },
        },
        // ... other providers
      ],
    }).compile();

    service = module.get(Step2UserContextResolutionService);
    rbacCacheManager = module.get(RbacCacheManagerService);
  });

  it('should return cached user context on cache hit', async () => {
    const cachedContext = {
      workspaceMemberId: 'member-123',
      departmentId: 'dept-456',
      isEnriched: true,
    };

    jest.spyOn(rbacCacheManager, 'getCachedUserContext').mockResolvedValue(cachedContext);

    const context: EnhancedPermissionContext = {
      userContext: { workspaceMemberId: 'member-123' },
    };

    const result = await service.validate(context);

    expect(result.passed).toBe(true);
    expect(result.details.source).toBe('cache');
    expect(rbacCacheManager.getCachedUserContext).toHaveBeenCalledWith('member-123');
  });

  it('should query database and cache on cache miss', async () => {
    jest.spyOn(rbacCacheManager, 'getCachedUserContext').mockResolvedValue(null);
    jest.spyOn(rbacCacheManager, 'cacheUserContext').mockResolvedValue(undefined);

    // ... test implementation
  });
});
```

---

### 2. Product Cache

**File**: `packages/twenty-server/src/mkt-core/product/services/product-cache.service.ts` (NEW FILE)

#### Bước 1: Tạo ProductCacheService

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { MktProductWorkspaceEntity } from '../objects/mkt-product.workspace-entity';
import { In } from 'typeorm';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';

const PRODUCT_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const PRODUCT_CACHE_PREFIX = 'product';

@Injectable()
export class ProductCacheService {
  private readonly logger = new Logger(ProductCacheService.name);

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.EngineWorkspace)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  /**
   * Get single product with cache
   */
  async getProduct(
    productId: string,
    repository: WorkspaceRepository<MktProductWorkspaceEntity>,
  ): Promise<MktProductWorkspaceEntity | null> {
    const cacheKey = this.getProductCacheKey(productId);

    try {
      // Try cache first
      const cached = await this.cacheStorage.get<MktProductWorkspaceEntity>(cacheKey);

      if (cached) {
        this.logger.debug('Product cache hit', { productId });
        return cached;
      }

      // Cache miss - query database
      this.logger.debug('Product cache miss', { productId });
      const product = await repository.findOne({
        where: { id: productId },
      });

      if (product) {
        await this.cacheStorage.set(cacheKey, product, PRODUCT_CACHE_TTL);
      }

      return product;
    } catch (error) {
      this.logger.error('Failed to get product with cache', {
        error: error.message,
        productId,
      });
      // Fallback to direct query
      return repository.findOne({ where: { id: productId } });
    }
  }

  /**
   * Get multiple products with cache (batch optimization)
   */
  async getProducts(
    productIds: string[],
    repository: WorkspaceRepository<MktProductWorkspaceEntity>,
  ): Promise<Map<string, MktProductWorkspaceEntity>> {
    const resultMap = new Map<string, MktProductWorkspaceEntity>();
    const missingIds: string[] = [];

    try {
      // Try to get from cache
      const cacheKeys = productIds.map((id) => this.getProductCacheKey(id));
      const cachedProducts = await Promise.all(
        cacheKeys.map((key) => this.cacheStorage.get<MktProductWorkspaceEntity>(key)),
      );

      // Separate cached and missing
      productIds.forEach((id, index) => {
        if (cachedProducts[index]) {
          resultMap.set(id, cachedProducts[index]!);
        } else {
          missingIds.push(id);
        }
      });

      this.logger.debug('Product batch cache stats', {
        total: productIds.length,
        cached: resultMap.size,
        missing: missingIds.length,
      });

      // Fetch missing products from database
      if (missingIds.length > 0) {
        const freshProducts = await repository.find({
          where: { id: In(missingIds) },
        });

        // Cache the fresh products and add to result
        await Promise.all(
          freshProducts.map(async (product) => {
            const cacheKey = this.getProductCacheKey(product.id);
            await this.cacheStorage.set(cacheKey, product, PRODUCT_CACHE_TTL);
            resultMap.set(product.id, product);
          }),
        );
      }

      return resultMap;
    } catch (error) {
      this.logger.error('Failed to get products with cache', {
        error: error.message,
        productIds,
      });

      // Fallback to direct query
      const products = await repository.find({
        where: { id: In(productIds) },
      });

      products.forEach((p) => resultMap.set(p.id, p));
      return resultMap;
    }
  }

  /**
   * Invalidate product cache
   */
  async invalidateProduct(productId: string): Promise<void> {
    const cacheKey = this.getProductCacheKey(productId);
    await this.cacheStorage.del(cacheKey);
    this.logger.debug('Product cache invalidated', { productId });
  }

  /**
   * Invalidate all product caches
   */
  async invalidateAllProducts(): Promise<void> {
    await this.cacheStorage.flushByPattern(`*:${PRODUCT_CACHE_PREFIX}:*`);
    this.logger.debug('All product caches invalidated');
  }

  /**
   * Warm up cache for frequently accessed products
   */
  async warmUpCache(
    productIds: string[],
    repository: WorkspaceRepository<MktProductWorkspaceEntity>,
  ): Promise<void> {
    this.logger.debug('Warming up product cache', { count: productIds.length });

    const products = await repository.find({
      where: { id: In(productIds) },
    });

    await Promise.all(
      products.map((product) =>
        this.cacheStorage.set(
          this.getProductCacheKey(product.id),
          product,
          PRODUCT_CACHE_TTL,
        ),
      ),
    );

    this.logger.debug('Product cache warmed up', { count: products.length });
  }

  private getProductCacheKey(productId: string): string {
    return `${PRODUCT_CACHE_PREFIX}:${productId}`;
  }
}
```

#### Bước 2: Update MktOrderService để sử dụng cache

`packages/twenty-server/src/mkt-core/order/mkt-order.service.ts`

```typescript
import { ProductCacheService } from '../product/services/product-cache.service';

@Injectable()
export class MktOrderService {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly productCacheService: ProductCacheService, // ADD THIS
  ) {}

  async createOrderWithItems(
    input: CreateOrderWithItemsInput,
  ): Promise<MktOrderWorkspaceEntity> {
    const { items, ...orderData } = input;
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      throw new Error('Workspace ID is required');
    }

    const orderRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
        workspaceId,
        'mktOrder',
        { shouldBypassPermissionChecks: true },
      );

    const productRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktProductWorkspaceEntity>(
        workspaceId,
        'mktProduct',
        { shouldBypassPermissionChecks: true },
      );

    const orderItemRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderItemWorkspaceEntity>(
        workspaceId,
        'mktOrderItem',
        { shouldBypassPermissionChecks: true },
      );

    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace({
        workspaceId,
      });

    return await dataSource.transaction(async () => {
      // REPLACE THIS: Batch fetch with cache
      const productIds = items.map((item) => item.mktProductId);

      // OLD CODE:
      // const products = await productRepository.find({
      //   where: { id: In(productIds) },
      // });

      // NEW CODE WITH CACHE:
      const productMap = await this.productCacheService.getProducts(
        productIds,
        productRepository,
      );

      // Validate all products exist
      const missingProductIds = productIds.filter((id) => !productMap.has(id));

      if (missingProductIds.length > 0) {
        throw new NotFoundException(
          `Products not found: ${missingProductIds.join(', ')}`,
        );
      }

      // Create order
      const orderDataWithStatus = {
        ...orderData,
        status: mapGraphQLOrderStatusToEntity(orderData.status),
      };
      const savedOrder = await orderRepository.save(orderDataWithStatus);

      // Prepare order items
      let totalAmount = 0;
      const orderItemsData = items.map((item) => {
        const product = productMap.get(item.mktProductId);

        if (!product) {
          throw new Error(`Product ${item.mktProductId} not found in map`);
        }

        const unitPrice = product.price ?? 0;
        const itemTotalPrice = unitPrice * item.quantity;

        totalAmount += itemTotalPrice;

        return {
          ...item,
          mktOrder: savedOrder,
          unitPrice,
          totalPrice: itemTotalPrice,
          name: product.name,
        };
      });

      await orderItemRepository.save(orderItemsData);
      await orderRepository.update(savedOrder.id, { totalAmount });

      const completeOrder = await orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: ['orderItems', 'orderItems.mktProduct'],
      });

      if (!completeOrder) {
        throw new Error('Failed to retrieve order immediately after creation.');
      }

      return completeOrder as MktOrderWorkspaceEntity;
    });
  }
}
```

#### Bước 3: Add cache invalidation hooks

`packages/twenty-server/src/mkt-core/product/hooks/product-update.post-query.hook.ts` (NEW FILE)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { WorkspacePostQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { ProductCacheService } from '../services/product-cache.service';

@WorkspacePostQueryHook(`mktProduct.updateOne`)
@Injectable()
export class ProductUpdatePostQueryHook implements WorkspacePostQueryHookInstance {
  private readonly logger = new Logger(ProductUpdatePostQueryHook.name);

  constructor(private readonly productCacheService: ProductCacheService) {}

  async execute(payload: any): Promise<void> {
    try {
      if (payload.id) {
        await this.productCacheService.invalidateProduct(payload.id);
        this.logger.debug('Product cache invalidated after update', {
          productId: payload.id,
        });
      }
    } catch (error) {
      this.logger.error('Failed to invalidate product cache', {
        error: error.message,
        productId: payload.id,
      });
    }
  }
}
```

#### Bước 4: Register trong module

`packages/twenty-server/src/mkt-core/product/product.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ProductCacheService } from './services/product-cache.service';
import { ProductUpdatePostQueryHook } from './hooks/product-update.post-query.hook';
import { CacheStorageModule } from 'src/engine/core-modules/cache-storage/cache-storage.module';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';

@Module({
  imports: [
    CacheStorageModule.forRoot(CacheStorageNamespace.EngineWorkspace),
  ],
  providers: [
    ProductCacheService,
    ProductUpdatePostQueryHook,
  ],
  exports: [ProductCacheService],
})
export class ProductModule {}
```

---

### 3. Permission Template Cache

**File**: Sử dụng service có sẵn trong `rbac-cache-manager.service.ts`

#### Update các RBAC services để sử dụng template cache

`packages/twenty-server/src/mkt-core/mkt-rbac-enterprise-grade/services/step4-permission-template-resolution.service.ts`

Thêm logic cache:

```typescript
async validate(
  context: EnhancedPermissionContext,
): Promise<StepValidationResult> {
  const startTime = DateTime.now();

  const templateId = context.userContext?.permissionTemplateId;
  if (!templateId) {
    return this.createResult(false, 'No permission template assigned');
  }

  try {
    // TRY CACHE FIRST
    const cachedTemplate = await this.rbacCacheManager.getCachedTemplatePermissions(
      templateId,
    );

    if (cachedTemplate) {
      this.logger.debug('Permission template cache hit', { templateId });

      context.permissionTemplate = cachedTemplate as any;

      return {
        stepNumber: this.stepNumber,
        stepName: this.stepName,
        passed: true,
        result: CheckResult.PROCEED,
        executionTime: DateTime.now().diff(startTime).milliseconds,
        details: { source: 'cache', templateId },
      };
    }

    // CACHE MISS - Query database
    this.logger.debug('Permission template cache miss', { templateId });

    const workspaceId = context.userContext?.workspaceId;
    const templateRepo = await this.getPermissionTemplateRepository(workspaceId);

    const template = await templateRepo.findOne({
      where: { id: templateId },
      relations: ['resourcePermissions', 'systemActions', 'accessLimitations'],
    });

    if (!template) {
      return this.createResult(false, 'Permission template not found');
    }

    // CACHE THE RESULT
    await this.rbacCacheManager.cacheTemplatePermissions(
      templateId,
      template,
      2 * 60 * 60 * 1000, // 2 hours
    );

    context.permissionTemplate = template;

    return {
      stepNumber: this.stepNumber,
      stepName: this.stepName,
      passed: true,
      result: CheckResult.PROCEED,
      executionTime: DateTime.now().diff(startTime).milliseconds,
      details: { source: 'database', templateId },
    };
  } catch (error) {
    this.logger.error('Permission template resolution failed', {
      error: error.message,
      templateId,
    });
    return this.createResult(false, error.message);
  }
}
```

---

## Phase 2: Medium Priority (Tuần 3-4)

### 4. Department Hierarchy Cache

**File**: `packages/twenty-server/src/mkt-core/mkt-department-hierarchy/services/department-hierarchy-cache.service.ts` (NEW)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';

const HIERARCHY_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const HIERARCHY_CACHE_PREFIX = 'hierarchy:department';

interface DepartmentHierarchyCache {
  departmentId: string;
  parentDepartmentIds: string[];
  childDepartmentIds: string[];
  level: number;
  path: string[];
  cachedAt: number;
}

@Injectable()
export class DepartmentHierarchyCacheService {
  private readonly logger = new Logger(DepartmentHierarchyCacheService.name);

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.EngineWorkspace)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  async getHierarchy(
    departmentId: string,
    fetchFn: () => Promise<DepartmentHierarchyCache>,
  ): Promise<DepartmentHierarchyCache> {
    const cacheKey = `${HIERARCHY_CACHE_PREFIX}:${departmentId}`;

    try {
      const cached = await this.cacheStorage.get<DepartmentHierarchyCache>(cacheKey);

      if (cached) {
        this.logger.debug('Department hierarchy cache hit', { departmentId });
        return cached;
      }

      this.logger.debug('Department hierarchy cache miss', { departmentId });

      const hierarchy = await fetchFn();
      hierarchy.cachedAt = Date.now();

      await this.cacheStorage.set(cacheKey, hierarchy, HIERARCHY_CACHE_TTL);

      return hierarchy;
    } catch (error) {
      this.logger.error('Failed to get department hierarchy with cache', {
        error: error.message,
        departmentId,
      });
      return fetchFn();
    }
  }

  async invalidateDepartment(departmentId: string): Promise<void> {
    const cacheKey = `${HIERARCHY_CACHE_PREFIX}:${departmentId}`;
    await this.cacheStorage.del(cacheKey);
    this.logger.debug('Department hierarchy cache invalidated', { departmentId });
  }

  async invalidateAllHierarchy(): Promise<void> {
    await this.cacheStorage.flushByPattern(`*:${HIERARCHY_CACHE_PREFIX}:*`);
    this.logger.debug('All department hierarchy caches invalidated');
  }
}
```

**Usage** trong `step11-department-restrictions.service.ts`:

```typescript
constructor(
  private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  private readonly departmentHierarchyCache: DepartmentHierarchyCacheService,
) {}

async validate(context: EnhancedPermissionContext): Promise<StepValidationResult> {
  // ... existing code

  const hierarchy = await this.departmentHierarchyCache.getHierarchy(
    userDepartmentId,
    () => this.fetchDepartmentHierarchyFromDatabase(userDepartmentId, workspaceId),
  );

  // Use hierarchy for validation
}
```

---

### 5. Metadata Cache Optimization

**File**: `packages/twenty-server/src/engine/metadata-modules/field-metadata/field-metadata.service.ts`

Thêm aggressive caching với version:

```typescript
import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';

const METADATA_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

@Injectable()
export class FieldMetadataService {
  constructor(
    @InjectCacheStorage(CacheStorageNamespace.EngineMetadata)
    private readonly metadataCache: CacheStorageService,
    // ... other dependencies
  ) {}

  async findManyWithCache(
    workspaceId: string,
    metadataVersion: number,
  ): Promise<FieldMetadata[]> {
    // Version-based cache key
    const cacheKey = `field-metadata:v${metadataVersion}:workspace:${workspaceId}`;

    try {
      const cached = await this.metadataCache.get<FieldMetadata[]>(cacheKey);

      if (cached) {
        this.logger.debug('Field metadata cache hit', {
          workspaceId,
          metadataVersion,
        });
        return cached;
      }

      this.logger.debug('Field metadata cache miss', {
        workspaceId,
        metadataVersion,
      });

      const fieldMetadata = await this.fieldMetadataRepository.find({
        where: { workspaceId },
        relations: ['object'],
      });

      await this.metadataCache.set(cacheKey, fieldMetadata, METADATA_CACHE_TTL);

      return fieldMetadata;
    } catch (error) {
      this.logger.error('Failed to get field metadata with cache', {
        error: error.message,
        workspaceId,
      });

      return this.fieldMetadataRepository.find({
        where: { workspaceId },
        relations: ['object'],
      });
    }
  }

  async invalidateMetadataCache(workspaceId: string): Promise<void> {
    // Invalidate all versions for this workspace
    await this.metadataCache.flushByPattern(
      `*:field-metadata:v*:workspace:${workspaceId}`,
    );
    this.logger.debug('Field metadata cache invalidated', { workspaceId });
  }
}
```

---

## Monitoring & Observability

### 1. Cache Metrics Endpoint

`packages/twenty-server/src/engine/core-modules/cache-storage/controllers/cache-metrics.controller.ts` (NEW)

```typescript
import { Controller, Get } from '@nestjs/common';
import { RbacCacheManagerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache-manager.service';

@Controller('cache')
export class CacheMetricsController {
  constructor(private readonly rbacCacheManager: RbacCacheManagerService) {}

  @Get('metrics')
  getMetrics() {
    return this.rbacCacheManager.getPerformanceMetrics();
  }

  @Get('health')
  getHealth() {
    return this.rbacCacheManager.getCacheHealthStatus();
  }
}
```

### 2. Logging

Thêm structured logging cho cache operations:

```typescript
this.logger.debug('Cache operation', {
  operation: 'get',
  key: cacheKey,
  hit: !!result,
  duration: Date.now() - startTime,
  service: 'ProductCacheService',
});
```

### 3. Metrics với Prometheus (Optional)

```typescript
import { Counter, Histogram } from 'prom-client';

const cacheHitCounter = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['service', 'operation'],
});

const cacheLatency = new Histogram({
  name: 'cache_operation_duration_ms',
  help: 'Cache operation duration in milliseconds',
  labelNames: ['service', 'operation'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('ProductCacheService', () => {
  let service: ProductCacheService;
  let cacheStorage: CacheStorageService;

  beforeEach(() => {
    cacheStorage = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;

    service = new ProductCacheService(cacheStorage);
  });

  it('should return cached product on cache hit', async () => {
    const mockProduct = { id: 'prod-123', name: 'Test Product' };
    jest.spyOn(cacheStorage, 'get').mockResolvedValue(mockProduct);

    const mockRepo = {} as any;
    const result = await service.getProduct('prod-123', mockRepo);

    expect(result).toEqual(mockProduct);
    expect(cacheStorage.get).toHaveBeenCalledWith('product:prod-123');
  });

  it('should fetch from database on cache miss', async () => {
    jest.spyOn(cacheStorage, 'get').mockResolvedValue(null);

    const mockProduct = { id: 'prod-123', name: 'Test Product' };
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(mockProduct),
    } as any;

    const result = await service.getProduct('prod-123', mockRepo);

    expect(result).toEqual(mockProduct);
    expect(cacheStorage.set).toHaveBeenCalledWith(
      'product:prod-123',
      mockProduct,
      expect.any(Number),
    );
  });
});
```

### Integration Tests

```typescript
describe('Order Creation with Product Cache (Integration)', () => {
  let orderService: MktOrderService;
  let productCacheService: ProductCacheService;
  let cacheStorage: CacheStorageService;

  beforeAll(async () => {
    // Setup test database and cache
  });

  it('should use cached products when creating order', async () => {
    // Pre-populate cache
    await productCacheService.warmUpCache(['prod-1', 'prod-2'], productRepo);

    const spy = jest.spyOn(productRepo, 'find');

    await orderService.createOrderWithItems({
      items: [
        { mktProductId: 'prod-1', quantity: 2 },
        { mktProductId: 'prod-2', quantity: 1 },
      ],
    });

    // Should not hit database because products are cached
    expect(spy).not.toHaveBeenCalled();
  });
});
```

### Performance Tests

```typescript
describe('Cache Performance', () => {
  it('should improve response time by 80%', async () => {
    // Measure without cache
    const start1 = Date.now();
    await getUserContextWithoutCache(memberId);
    const withoutCacheDuration = Date.now() - start1;

    // Warm up cache
    await getUserContext(memberId);

    // Measure with cache
    const start2 = Date.now();
    await getUserContext(memberId);
    const withCacheDuration = Date.now() - start2;

    expect(withCacheDuration).toBeLessThan(withoutCacheDuration * 0.2);
  });
});
```

---

## Rollout Plan

### Week 1-2: Phase 1 Implementation
- [ ] Implement User Context Cache
- [ ] Implement Product Cache
- [ ] Add cache invalidation listeners
- [ ] Unit tests for cache services
- [ ] Deploy to staging

### Week 3: Testing & Monitoring
- [ ] Integration tests
- [ ] Performance benchmarks
- [ ] Monitor cache hit rates
- [ ] Tune TTL values
- [ ] Load testing

### Week 4: Production Rollout
- [ ] Feature flag: `ENABLE_USER_CONTEXT_CACHE=true`
- [ ] Feature flag: `ENABLE_PRODUCT_CACHE=true`
- [ ] Monitor metrics (hit rate, latency, error rate)
- [ ] Gradual rollout: 25% → 50% → 100%

### Week 5-6: Phase 2 Implementation
- [ ] Department Hierarchy Cache
- [ ] Metadata Cache optimization
- [ ] Workspace Settings Cache

---

## Troubleshooting

### Cache Miss Rate cao (>30%)

**Nguyên nhân**:
- TTL quá ngắn
- Invalidation quá aggressive
- Cache key không consistent

**Giải pháp**:
- Tăng TTL (nhưng cân nhắc data consistency)
- Review invalidation logic
- Standardize cache key generation

### Memory Usage cao

**Nguyên nhân**:
- Cache quá nhiều data
- TTL quá dài
- Không có eviction policy

**Giải pháp**:
- Implement cache size limits
- Giảm TTL cho cold data
- Use Redis maxmemory-policy: `allkeys-lru`

### Cache Stampede

**Nguyên nhân**: Nhiều requests cùng query khi cache expires

**Giải pháp**: Implement cache locking

```typescript
async getWithLock(key: string, fetchFn: () => Promise<T>): Promise<T> {
  const cached = await this.cacheStorage.get(key);
  if (cached) return cached;

  // Try to acquire lock
  const lockKey = `lock:${key}`;
  const acquired = await this.cacheStorage.acquireLock(lockKey, 5000);

  if (acquired) {
    try {
      const data = await fetchFn();
      await this.cacheStorage.set(key, data, TTL);
      return data;
    } finally {
      await this.cacheStorage.releaseLock(lockKey);
    }
  } else {
    // Wait for lock to be released, then retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getWithLock(key, fetchFn);
  }
}
```

---

## Best Practices

### 1. Cache Key Naming Convention

```
<namespace>:<entity>:<version>:<identifier>:<filters>

Examples:
- rbac:user:context:member-123
- product:prod-456
- metadata:v2:field:workspace-789:company
- hierarchy:department:dept-abc
```

### 2. TTL Guidelines

| Data Type | TTL | Reasoning |
|-----------|-----|-----------|
| User sessions | 30 min | Balance security & UX |
| Product catalog | 15 min | Frequent updates |
| Metadata | 2-4 hours | Rarely changes |
| Permissions | 30-60 min | Security-sensitive |
| Hierarchy | 1 hour | Org changes are rare |

### 3. Invalidation Strategy

- **Eager invalidation**: Invalidate immediately on update
- **Lazy invalidation**: Let TTL expire, good for non-critical data
- **Pattern-based**: Invalidate related keys (e.g., all users in a department)

### 4. Error Handling

Always fallback to database on cache errors:

```typescript
try {
  const cached = await this.cacheStorage.get(key);
  if (cached) return cached;
} catch (error) {
  this.logger.error('Cache error, falling back to database', { error });
}

// Always execute database query as fallback
return await this.repository.find(...);
```

---

## Configuration

### Environment Variables

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Cache settings
CACHE_TTL_SHORT=300000        # 5 minutes
CACHE_TTL_MEDIUM=1800000      # 30 minutes
CACHE_TTL_LONG=7200000        # 2 hours

# Feature flags
ENABLE_USER_CONTEXT_CACHE=true
ENABLE_PRODUCT_CACHE=true
ENABLE_METADATA_CACHE=true
ENABLE_HIERARCHY_CACHE=false  # Phase 2

# Monitoring
CACHE_METRICS_ENABLED=true
CACHE_LOG_LEVEL=debug
```

### Redis Configuration

```typescript
// cache-storage.module-factory.ts
CacheModule.register({
  store: redisStore,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB,
  ttl: 1800000, // Default 30 minutes
  max: 10000, // Max items in cache

  // Redis-specific
  socket: {
    connectTimeout: 5000,
    keepAlive: 30000,
  },

  // Eviction policy
  maxmemory_policy: 'allkeys-lru',
});
```

---

## Kết luận

Document này cung cấp hướng dẫn chi tiết để implement cache trong CRM system. Bắt đầu với Phase 1 (User Context, Product, Permission Template) sẽ mang lại impact lớn nhất với effort thấp.

**Expected Results sau Phase 1**:
- ✅ Giảm 50-70% database queries
- ✅ Cải thiện response time 40-60%
- ✅ Tăng throughput 2-3x
- ✅ Giảm database load 60-80%

**Next Steps**:
1. Review document với team
2. Chọn 1-2 services để pilot implementation
3. Measure baseline performance
4. Implement cache
5. Measure improvement
6. Iterate và scale