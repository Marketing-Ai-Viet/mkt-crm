# Dynamic Authorization Rules - Proposal

## Vấn đề hiện tại

Authorization rules được khai báo **static trong code**:

```typescript
// order-authorization.constants.ts
export const ORDER_AUTHORIZATION = {
  CREATE_ORDER: {
    allowedDepartments: [DEPARTMENT.SALES],
    allowManagers: false,
    allowExecutives: true,
    deniedMessage: 'Only sales staff can create orders',
  },
  // ...
};
```

**Hạn chế:**
- Thay đổi rules cần deploy lại code
- Không thể customize theo từng workspace
- Không có audit trail khi thay đổi rules

---

## Giải pháp: Dynamic Authorization từ Database

### Option 1: Mở rộng PermissionContext (Recommended)

Sử dụng entity `MktPermissionContext` có sẵn, thêm fields cho mutation authorization.

#### 1.1 Thêm fields vào MktPermissionContextWorkspaceEntity

```typescript
// Thêm vào mkt-permission-context.workspace-entity.ts

@WorkspaceField({
  standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.authorizationConfig,
  type: FieldMetadataType.RAW_JSON,
  label: msg`Authorization Config`,
  description: msg`Department authorization configuration`,
  icon: 'IconShield',
})
authorizationConfig?: DepartmentAuthOptions;

@WorkspaceField({
  standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.resourceKey,
  type: FieldMetadataType.TEXT,
  label: msg`Resource Key`,
  description: msg`Resource identifier (e.g., "order", "invoice")`,
  icon: 'IconKey',
})
resourceKey?: string;

@WorkspaceField({
  standardId: MKT_PERMISSION_CONTEXT_FIELD_IDS.actionKey,
  type: FieldMetadataType.TEXT,
  label: msg`Action Key`,
  description: msg`Action identifier (e.g., "create", "publish", "confirm")`,
  icon: 'IconClick',
})
actionKey?: string;
```

#### 1.2 Data trong database

```json
{
  "contextKey": "order:create",
  "resourceKey": "order",
  "actionKey": "create",
  "authorizationConfig": {
    "allowedDepartments": ["SALES", "IT"],
    "allowManagers": false,
    "allowExecutives": true,
    "allowHighPriorityTemplates": false,
    "deniedMessage": "Only sales staff or executives can create orders"
  },
  "isActive": true
}
```

---

### Option 2: Tạo Entity riêng MktMutationAuthorizationRule

```typescript
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktMutationAuthRule,
  namePlural: 'mktMutationAuthRules',
  labelSingular: msg`Mutation Auth Rule`,
  labelPlural: msg`Mutation Auth Rules`,
  description: msg`Dynamic authorization rules for mutations`,
  icon: 'IconShieldLock',
})
export class MktMutationAuthRuleWorkspaceEntity extends BaseWorkspaceEntity {

  @WorkspaceField({
    standardId: MKT_MUTATION_AUTH_RULE_FIELD_IDS.ruleKey,
    type: FieldMetadataType.TEXT,
    label: msg`Rule Key`,
    description: msg`Unique key (e.g., "ORDER_CREATE", "ORDER_PUBLISH")`,
    icon: 'IconKey',
  })
  ruleKey: string; // "ORDER_CREATE", "ORDER_PUBLISH", etc.

  @WorkspaceField({
    standardId: MKT_MUTATION_AUTH_RULE_FIELD_IDS.resourceType,
    type: FieldMetadataType.TEXT,
    label: msg`Resource Type`,
    description: msg`Type of resource (e.g., "order", "invoice")`,
    icon: 'IconBox',
  })
  resourceType: string;

  @WorkspaceField({
    standardId: MKT_MUTATION_AUTH_RULE_FIELD_IDS.action,
    type: FieldMetadataType.TEXT,
    label: msg`Action`,
    description: msg`Action name (e.g., "create", "publish", "confirm")`,
    icon: 'IconClick',
  })
  action: string;

  @WorkspaceField({
    standardId: MKT_MUTATION_AUTH_RULE_FIELD_IDS.allowedDepartments,
    type: FieldMetadataType.RAW_JSON,
    label: msg`Allowed Departments`,
    description: msg`List of allowed department codes`,
    icon: 'IconBuilding',
  })
  allowedDepartments: string[];

  @WorkspaceField({
    standardId: MKT_MUTATION_AUTH_RULE_FIELD_IDS.allowManagers,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Allow Managers`,
    description: msg`Allow users with manager level`,
    icon: 'IconUserCheck',
    defaultValue: false,
  })
  allowManagers: boolean;

  @WorkspaceField({
    standardId: MKT_MUTATION_AUTH_RULE_FIELD_IDS.allowExecutives,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Allow Executives`,
    description: msg`Allow users with executive level`,
    icon: 'IconCrown',
    defaultValue: true,
  })
  allowExecutives: boolean;

  @WorkspaceField({
    standardId: MKT_MUTATION_AUTH_RULE_FIELD_IDS.allowHighPriorityTemplates,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Allow High Priority Templates`,
    description: msg`Allow users with high priority permission templates`,
    icon: 'IconTemplate',
    defaultValue: false,
  })
  allowHighPriorityTemplates: boolean;

  @WorkspaceField({
    standardId: MKT_MUTATION_AUTH_RULE_FIELD_IDS.minTemplatePriority,
    type: FieldMetadataType.NUMBER,
    label: msg`Min Template Priority`,
    description: msg`Minimum template priority required`,
    icon: 'IconSortAscending',
    defaultValue: 500,
  })
  minTemplatePriority: number;

  @WorkspaceField({
    standardId: MKT_MUTATION_AUTH_RULE_FIELD_IDS.deniedMessage,
    type: FieldMetadataType.TEXT,
    label: msg`Denied Message`,
    description: msg`Message shown when access is denied`,
    icon: 'IconMessageOff',
  })
  deniedMessage: string;

  @WorkspaceField({
    standardId: MKT_MUTATION_AUTH_RULE_FIELD_IDS.isActive,
    type: FieldMetadataType.BOOLEAN,
    label: msg`Is Active`,
    description: msg`Whether this rule is currently active`,
    icon: 'IconCheck',
    defaultValue: true,
  })
  isActive: boolean;

  @WorkspaceField({
    standardId: MKT_MUTATION_AUTH_RULE_FIELD_IDS.priority,
    type: FieldMetadataType.NUMBER,
    label: msg`Priority`,
    description: msg`Priority for rule evaluation (higher = first)`,
    icon: 'IconArrowUp',
    defaultValue: 0,
  })
  priority: number;
}
```

---

## Implementation Flow

### 1. Service để load rules từ database

```typescript
// mutation-authorization-rule.service.ts

@Injectable()
export class MutationAuthorizationRuleService {
  private readonly cache = new Map<string, DepartmentAuthOptions>();

  constructor(
    private readonly repository: MktMutationAuthRuleRepository,
    private readonly cacheService: RbacCacheService,
  ) {}

  /**
   * Get authorization options by rule key
   * Fallback to static constants if not found in database
   */
  async getAuthOptions(
    workspaceId: string,
    ruleKey: string,
  ): Promise<DepartmentAuthOptions> {
    // Check memory cache
    const cacheKey = `${workspaceId}:${ruleKey}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Query database
    const rule = await this.repository.findByRuleKey(workspaceId, ruleKey);

    if (rule?.isActive) {
      const options = this.mapRuleToOptions(rule);
      this.cache.set(cacheKey, options);
      return options;
    }

    // Fallback to static constants
    return this.getStaticFallback(ruleKey);
  }

  private mapRuleToOptions(rule: MktMutationAuthRuleWorkspaceEntity): DepartmentAuthOptions {
    return {
      allowedDepartments: rule.allowedDepartments ?? [],
      allowManagers: rule.allowManagers,
      allowExecutives: rule.allowExecutives,
      allowHighPriorityTemplates: rule.allowHighPriorityTemplates,
      minTemplatePriority: rule.minTemplatePriority,
      deniedMessage: rule.deniedMessage,
    };
  }

  private getStaticFallback(ruleKey: string): DepartmentAuthOptions {
    // Fallback to ORDER_AUTHORIZATION constants
    const staticRules = ORDER_AUTHORIZATION as Record<string, DepartmentAuthOptions>;
    return staticRules[ruleKey] ?? this.getDefaultOptions();
  }

  private getDefaultOptions(): DepartmentAuthOptions {
    return {
      allowedDepartments: [],
      allowManagers: false,
      allowExecutives: true,
      deniedMessage: 'Access denied',
    };
  }

  /**
   * Invalidate cache when rules change
   */
  invalidateCache(workspaceId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(workspaceId)) {
        this.cache.delete(key);
      }
    }
  }
}
```

### 2. Decorator mới: @RequireDynamicDepartment

```typescript
// require-dynamic-department.decorator.ts

export const DYNAMIC_DEPARTMENT_AUTH_KEY = 'dynamic_department_auth';

export type DynamicDepartmentAuthOptions = {
  ruleKey: string;  // Key để lookup từ database
  fallbackOptions?: DepartmentAuthOptions; // Fallback nếu không tìm thấy
};

export const RequireDynamicDepartment = (
  options: DynamicDepartmentAuthOptions,
): MethodDecorator => {
  return SetMetadata(DYNAMIC_DEPARTMENT_AUTH_KEY, options);
};
```

### 3. Guard mới: DynamicDepartmentAuthorizationGuard

```typescript
// dynamic-department-authorization.guard.ts

@Injectable()
export class DynamicDepartmentAuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacContextService: RbacContextService,
    private readonly ruleService: MutationAuthorizationRuleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get decorator options
    const dynamicOptions = this.reflector.get<DynamicDepartmentAuthOptions>(
      DYNAMIC_DEPARTMENT_AUTH_KEY,
      context.getHandler(),
    );

    if (!dynamicOptions) {
      return true;
    }

    // Extract context
    const { userId, workspaceId } = this.extractContext(context);

    // Load authorization options from database
    const authOptions = await this.ruleService.getAuthOptions(
      workspaceId,
      dynamicOptions.ruleKey,
    );

    // Resolve user context
    const userContext = await this.rbacContextService.resolveContext(
      userId,
      workspaceId,
    );

    // Check authorization (reuse existing logic)
    const result = this.checkAuthorization(userContext, authOptions);

    if (!result.allowed) {
      throw new ForbiddenException(authOptions.deniedMessage);
    }

    return true;
  }

  // ... reuse checkAuthorization logic from DepartmentAuthorizationGuard
}
```

### 4. Usage trong Resolver

```typescript
// order-mutation.resolver.ts

@Resolver()
export class OrderMutationResolver {

  // Dynamic authorization - load từ database
  @RequireDynamicDepartment({ ruleKey: 'ORDER_CREATE' })
  @Mutation(() => MktOrderWorkspaceEntity)
  async createOrder(@Args('input') input: CreateOrderInput) {
    // ...
  }

  // Dynamic với fallback
  @RequireDynamicDepartment({
    ruleKey: 'ORDER_PUBLISH',
    fallbackOptions: {
      allowedDepartments: [],
      allowManagers: true,
      allowExecutives: true,
      deniedMessage: 'Cannot publish order',
    },
  })
  @Mutation(() => MktOrderWorkspaceEntity)
  async publishDraftOrder(@Args('id') id: string) {
    // ...
  }
}
```

---

## Database Seeding

```typescript
// mutation-auth-rule-seeder.ts

const MUTATION_AUTH_RULES: CreateMutationAuthRuleInput[] = [
  {
    ruleKey: 'ORDER_CREATE',
    resourceType: 'order',
    action: 'create',
    allowedDepartments: ['SALES', 'IT'],
    allowManagers: false,
    allowExecutives: true,
    deniedMessage: 'Only sales staff or executives can create orders',
    isActive: true,
    priority: 100,
  },
  {
    ruleKey: 'ORDER_PUBLISH',
    resourceType: 'order',
    action: 'publish',
    allowedDepartments: [],
    allowManagers: true,
    allowExecutives: true,
    allowHighPriorityTemplates: true,
    minTemplatePriority: 0,
    deniedMessage: 'You do not have permission to publish draft orders',
    isActive: true,
    priority: 100,
  },
  {
    ruleKey: 'ORDER_CONFIRM',
    resourceType: 'order',
    action: 'confirm',
    allowedDepartments: ['ACCOUNTING'],
    allowManagers: false,
    allowExecutives: true,
    deniedMessage: 'Only accounting staff can confirm order payments',
    isActive: true,
    priority: 100,
  },
  // ... more rules
];
```

---

## Migration Path

### Phase 1: Hybrid Approach (Backward Compatible)
1. Tạo entity và service mới
2. Tạo `@RequireDynamicDepartment` decorator
3. Seed data từ static constants
4. Guard fallback về static nếu không có trong DB

### Phase 2: Full Dynamic
1. Migrate tất cả resolvers sang dynamic decorator
2. Tạo Admin UI để quản lý rules
3. Add audit logging cho rule changes
4. Remove static constants (optional)

---

## Benefits

| Aspect | Static (Current) | Dynamic (Proposed) |
|--------|------------------|-------------------|
| Thay đổi rules | Deploy code | Update database |
| Workspace-specific | Không | Có |
| Audit trail | Git history | Database audit log |
| Runtime flexibility | Không | Có |
| Admin UI | Không | Có thể xây dựng |
| Rollback | Git revert | Update DB |
| A/B Testing | Khó | Dễ (theo workspace) |

---

## Recommendation

**Nên dùng Option 2** (Entity riêng) vì:
1. Tách biệt concern rõ ràng
2. Không ảnh hưởng đến PermissionContext hiện tại
3. Dễ extend thêm fields sau này
4. Có thể tạo Admin UI riêng cho mutation rules
