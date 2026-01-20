# Tài liệu triển khai Refactor Customer Module

## Mục tiêu

Refactor Customer Module để:
1. **Hủy bỏ các hook validation hiện tại** (`mkt-customer-create-one.pre-query.hook.ts`, `mkt-customer-update-one.pre-query.hook.ts`)
2. **Disable các hook tự sinh** sử dụng Block Hook Factory pattern (tham khảo Contract Module)
3. **Tạo custom resolvers** cho các endpoint CRUD với RBAC protection

---

## 1. Cấu trúc hiện tại

### 1.1 Các Hook cần hủy bỏ

```
packages/twenty-server/src/mkt-core/customer/hooks/
├── index.ts
├── mkt-customer-create-one.pre-query.hook.ts  # ← XÓA
└── mkt-customer-update-one.pre-query.hook.ts  # ← XÓA
```

#### Logic cần chuyển từ Hook sang Service:

**CreateOne Hook:**
| Logic | Chuyển đến |
|-------|-----------|
| Validate email format | `MktCustomerValidationService` |
| Validate email uniqueness | `MktCustomerValidationService` |
| Validate tax code format | `MktCustomerValidationService` |
| Generate customer code | `MktCustomerCodeGenerationService` (đã có) |
| Set default values | `MktCustomerService.create()` |
| Build ownership fields | `MktCustomerService.create()` |

**UpdateOne Hook:**
| Logic | Chuyển đến |
|-------|-----------|
| Prevent mktCustomerCode change | `MktCustomerValidationService` |
| Validate email format | `MktCustomerValidationService` |
| Validate email uniqueness | `MktCustomerValidationService` |
| Validate tax code format | `MktCustomerValidationService` |
| Validate linkedAccounts | `MktCustomerValidationService` |

### 1.2 Resolvers hiện tại

```
packages/twenty-server/src/mkt-core/customer/resolvers/
├── mkt-customer-license.resolver.ts
├── mkt-customer-tier.resolver.ts
├── mkt-customer-tier-history.resolver.ts
├── mkt-customer-export.resolver.ts
└── mkt-customer-linked-account.resolver.ts
```

**Cần thêm mới:**
- `customer-query.resolver.ts` - Query operations (CRUD Read)
- `customer-mutation.resolver.ts` - Mutation operations (CRUD Create/Update/Delete)

---

## 2. Pattern tham khảo từ Contract Module

### 2.1 Block Hook Factory Pattern

**Pattern từ Contract module:** Define entity name constant trong workspace-entity file và import từ đó.

**File reference:** `mkt-core/contract/workspace-entity/mkt-contract.workspace-entity.ts`

```typescript
// Contract module defines constant in workspace-entity
export const MKT_CONTRACT_ENTITY_NAME = 'mktContract';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktContract,
  namePlural: `${MKT_CONTRACT_ENTITY_NAME}s`, // Uses the constant
  // ...
})
```

**Áp dụng cho Customer:** Cần thêm constant vào workspace-entity trước

```typescript
// File: objects/mkt-customer.workspace-entity.ts
// Thêm constant này vào file
export const MKT_CUSTOMER_ENTITY_NAME = 'mktCustomer';

// Sau đó trong hooks file, import từ workspace-entity
import { BlockHookConfig, createBlockHooks } from 'src/mkt-core/common/hooks';
import { MKT_CUSTOMER_ENTITY_NAME } from '../objects/mkt-customer.workspace-entity';

export const CUSTOMER_BLOCK_CONFIG: BlockHookConfig = {
  entityName: MKT_CUSTOMER_ENTITY_NAME, // Single source of truth
  logContext: 'Customer:BlockHook',
  blockedMessage:
    'This operation is disabled. Use custom Customer resolvers instead (getCustomerById, createCustomer, etc.)',
};

const { providers, blockedOperations } = createBlockHooks(CUSTOMER_BLOCK_CONFIG);

export const CUSTOMER_BLOCK_HOOKS = providers;
export const CUSTOMER_BLOCKED_OPERATIONS = blockedOperations;
```

### 2.2 Các Operation bị Block (13 operations)

| Category | Operations |
|----------|------------|
| **Queries** | `findMany`, `findOne`, `findDuplicates` |
| **Mutations** | `createOne`, `createMany`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `destroyOne`, `destroyMany`, `restoreOne`, `restoreMany` |

### 2.3 Module Registration Pattern

```typescript
@Module({
  imports: [MktRbacEnterpriseGradeModule],
  providers: [
    // Repositories
    MktCustomerRepository,

    // Services
    MktCustomerService,
    MktCustomerValidationService,

    // Resolvers - RBAC protected GraphQL operations
    CustomerQueryResolver,
    CustomerMutationResolver,

    // Hooks - Block all 13 auto-generated GraphQL operations
    ...CUSTOMER_BLOCK_HOOKS,
  ],
})
export class CustomerModule {}
```

---

## 3. Kế hoạch triển khai

### Phase 0: Cập nhật Workspace Entity (Pre-requisite)

Trước tiên cần thêm constant `MKT_CUSTOMER_ENTITY_NAME` vào workspace-entity file để làm single source of truth.

**File cần cập nhật:** `objects/mkt-customer.workspace-entity.ts`

```typescript
// Thêm constant sau các import, trước @WorkspaceEntity decorator
/**
 * Entity name for mktCustomer - used in GraphQL operations and hooks
 * Format: 'mkt{EntityName}' (camelCase)
 */
export const MKT_CUSTOMER_ENTITY_NAME = 'mktCustomer';

// Cập nhật namePlural để sử dụng constant (optional, để consistency với Contract)
@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktCustomer,
  namePlural: `${MKT_CUSTOMER_ENTITY_NAME}s`, // Thay vì '$mktCustomers'
  // ... rest unchanged
})
```

> **Lưu ý:** Entity hiện tại dùng `namePlural: '$mktCustomers'` với prefix `$`.
> Nếu thay đổi cần migration. Có thể giữ nguyên `namePlural` và chỉ export constant.

---

### Phase 1: Chuẩn bị (Không breaking change)

#### 3.1 Tạo MktCustomerValidationService

**File mới:** `services/validation/mkt-customer-validation.service.ts`

```typescript
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MktCustomerRepository } from '../../repositories/mkt-customer.repository';
import { CUSTOMER_MESSAGES, MKT_CUSTOMER_LOG_CONTEXT } from '../../messages';
import { LinkedAccount } from '../../types';
import { LinkedAccountValidationUtil } from '../../utils';

type CreateValidationInput = {
  email?: string;
  taxCode?: string;
  workspaceId?: string;
};

type UpdateValidationInput = {
  customerId: string;
  email?: string;
  taxCode?: string;
  mktCustomerCode?: string;
  linkedAccounts?: LinkedAccount[];
  workspaceId?: string;
};

type ValidationResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

@Injectable()
export class MktCustomerValidationService {
  private readonly logger = new Logger(`${MKT_CUSTOMER_LOG_CONTEXT}:Validation`);

  constructor(private readonly customerRepository: MktCustomerRepository) {}

  /**
   * Validate input for creating a customer
   */
  async validateCreate(input: CreateValidationInput): Promise<ValidationResult> {
    // 1. Validate email format
    if (input.email) {
      const emailResult = this.validateEmailFormat(input.email);
      if (!emailResult.success) return emailResult;

      // 2. Validate email uniqueness
      const uniqueResult = await this.validateEmailUniqueness(
        input.email,
        undefined,
        input.workspaceId,
      );
      if (!uniqueResult.success) return uniqueResult;
    }

    // 3. Validate tax code format
    if (input.taxCode) {
      const taxResult = this.validateTaxCode(input.taxCode);
      if (!taxResult.success) return taxResult;
    }

    return { success: true };
  }

  /**
   * Validate input for updating a customer
   */
  async validateUpdate(input: UpdateValidationInput): Promise<ValidationResult<{ linkedAccounts?: LinkedAccount[] }>> {
    // 1. Prevent mktCustomerCode from being changed
    if (input.mktCustomerCode !== undefined) {
      const codeResult = await this.validateCustomerCodeImmutable(
        input.customerId,
        input.mktCustomerCode,
      );
      if (!codeResult.success) return codeResult;
    }

    // 2. Validate email format (if email is being updated)
    if (input.email !== undefined && input.email !== null) {
      const emailResult = this.validateEmailFormat(input.email);
      if (!emailResult.success) return emailResult;

      // 3. Validate email uniqueness
      const uniqueResult = await this.validateEmailUniqueness(
        input.email,
        input.customerId,
        input.workspaceId,
      );
      if (!uniqueResult.success) return uniqueResult;
    }

    // 4. Validate tax code format
    if (input.taxCode !== undefined && input.taxCode !== null) {
      const taxResult = this.validateTaxCode(input.taxCode);
      if (!taxResult.success) return taxResult;
    }

    // 5. Validate and auto-fix linkedAccounts
    let fixedLinkedAccounts: LinkedAccount[] | undefined;
    if (input.linkedAccounts !== undefined && input.linkedAccounts !== null) {
      const linkedResult = this.validateAndFixLinkedAccounts(input.linkedAccounts);
      if (!linkedResult.success) return linkedResult;
      fixedLinkedAccounts = linkedResult.data;
    }

    return { success: true, data: { linkedAccounts: fixedLinkedAccounts } };
  }

  // ============================================
  // PRIVATE VALIDATION METHODS
  // ============================================

  private validateEmailFormat(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: CUSTOMER_MESSAGES.ERROR.INVALID_EMAIL_FORMAT(email),
      };
    }
    return { success: true };
  }

  private async validateEmailUniqueness(
    email: string,
    currentCustomerId?: string,
    workspaceId?: string,
  ): Promise<ValidationResult> {
    const existingCustomer = await this.customerRepository.findByEmail(
      email,
      workspaceId,
    );

    if (existingCustomer) {
      // For update: allow if same customer
      if (currentCustomerId && existingCustomer.id === currentCustomerId) {
        return { success: true };
      }
      return {
        success: false,
        error: CUSTOMER_MESSAGES.ERROR.EMAIL_ALREADY_EXISTS(email),
      };
    }
    return { success: true };
  }

  private validateTaxCode(taxCode: string): ValidationResult {
    const cleanTaxCode = taxCode.replace(/\D/g, '');
    if (cleanTaxCode.length !== 10 && cleanTaxCode.length !== 13) {
      return {
        success: false,
        error: CUSTOMER_MESSAGES.ERROR.INVALID_TAX_CODE(taxCode),
      };
    }
    return { success: true };
  }

  private async validateCustomerCodeImmutable(
    customerId: string,
    newCode: string,
  ): Promise<ValidationResult> {
    const existingCustomer = await this.customerRepository.findByIdOrNull(customerId);
    if (
      existingCustomer?.mktCustomerCode &&
      existingCustomer.mktCustomerCode !== newCode
    ) {
      return {
        success: false,
        error: 'Customer code cannot be changed after creation',
      };
    }
    return { success: true };
  }

  private validateAndFixLinkedAccounts(
    linkedAccounts: LinkedAccount[],
  ): ValidationResult<LinkedAccount[]> {
    const { fixed, fixedProviders } =
      LinkedAccountValidationUtil.autoFixPrimary(linkedAccounts);

    if (fixedProviders.length > 0) {
      this.logger.warn(
        CUSTOMER_MESSAGES.WARN.LINKED_ACCOUNT_PRIMARY_AUTO_FIXED(fixedProviders),
      );
    }

    // Final validation
    try {
      LinkedAccountValidationUtil.validateOrThrow(fixed);
      return { success: true, data: fixed };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid linked accounts',
      };
    }
  }
}
```

#### 3.2 Tạo MktCustomerService (Core CRUD)

**File mới:** `services/mkt-customer.service.ts`

```typescript
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MktCustomerRepository } from '../repositories/mkt-customer.repository';
import { MktCustomerCodeGenerationService } from './core/mkt-customer-code-generation.service';
import { MktCustomerValidationService } from './validation/mkt-customer-validation.service';
import { MktCustomerWorkspaceEntity } from '../objects/mkt-customer.workspace-entity';
import { CUSTOMER_MESSAGES, MKT_CUSTOMER_LOG_CONTEXT } from '../messages';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { buildOwnershipFields } from 'src/mkt-core/common/repositories/base-workspace.repository';
import { ServiceResult } from 'src/mkt-core/common/types';

// Input types
type CreateCustomerInput = {
  email?: string;
  name: string;
  phone?: string;
  companyName?: string;
  taxCode?: string;
  address?: string;
  status?: string;
  tier?: string;
  lifecycleStage?: string;
  notes?: string;
  accountOwnerId?: string;
  workspaceMemberId?: string;
  workspaceId?: string;
};

type UpdateCustomerInput = {
  customerId: string;
  email?: string;
  name?: string;
  phone?: string;
  companyName?: string;
  taxCode?: string;
  address?: string;
  status?: string;
  tier?: string;
  lifecycleStage?: string;
  notes?: string;
  accountOwnerId?: string;
  linkedAccounts?: unknown[];
  workspaceId?: string;
};

type CustomerQueryOptions = {
  take?: number;
  skip?: number;
  filter?: Record<string, unknown>;
  hasFullAccess?: boolean;
};

// Response types
type CreateCustomerResult = {
  customerId: string;
  customerCode: string;
  status: string;
};

type UpdateCustomerResult = {
  customerId: string;
  updatedFields: string[];
};

@Injectable()
export class MktCustomerService {
  private readonly logger = new Logger(`${MKT_CUSTOMER_LOG_CONTEXT}:Service`);

  constructor(
    private readonly customerRepository: MktCustomerRepository,
    private readonly codeGenerationService: MktCustomerCodeGenerationService,
    private readonly validationService: MktCustomerValidationService,
  ) {}

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  async createCustomer(
    input: CreateCustomerInput,
  ): Promise<ServiceResult<CreateCustomerResult>> {
    this.logger.log(CUSTOMER_MESSAGES.LOG.CUSTOMER_PRE_CREATE(input.email ?? 'unknown'));

    // 1. Validate input
    const validation = await this.validationService.validateCreate({
      email: input.email,
      taxCode: input.taxCode,
      workspaceId: input.workspaceId,
    });

    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // 2. Generate customer code
    const customerCode = await this.codeGenerationService.generateUniqueCustomerCode(true);

    // 3. Build customer data with defaults
    const now = DateTimeUtils.toDate(DateTimeUtils.now());
    const ownershipFields = buildOwnershipFields({
      workspaceMemberId: input.workspaceMemberId,
      accountOwnerId: input.accountOwnerId,
    });

    const customerData = {
      mktCustomerCode: customerCode,
      name: input.name,
      email: input.email,
      phone: input.phone,
      companyName: input.companyName,
      taxCode: input.taxCode,
      address: input.address,
      status: input.status ?? 'ACTIVE',
      tier: input.tier ?? 'BRONZE',
      lifecycleStage: input.lifecycleStage ?? 'PROSPECTIVE',
      registrationDate: now,
      totalOrderValue: 0,
      licensesCount: 0,
      churnRiskScore: 0,
      engagementScore: 0,
      customerLtv: 0,
      notes: input.notes,
      ...ownershipFields,
    };

    // 4. Create customer
    const customer = await this.customerRepository.createOne(customerData);

    return {
      success: true,
      data: {
        customerId: customer.id,
        customerCode: customer.mktCustomerCode,
        status: customer.status,
      },
    };
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  async updateCustomer(
    input: UpdateCustomerInput,
  ): Promise<ServiceResult<UpdateCustomerResult>> {
    this.logger.debug(`Updating customer: ${input.customerId}`);

    // 1. Validate input
    const validation = await this.validationService.validateUpdate({
      customerId: input.customerId,
      email: input.email,
      taxCode: input.taxCode,
      mktCustomerCode: undefined, // Not allowed to update
      linkedAccounts: input.linkedAccounts as never,
      workspaceId: input.workspaceId,
    });

    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // 2. Build update data
    const updateData: Partial<MktCustomerWorkspaceEntity> = {};
    const updatedFields: string[] = [];

    if (input.email !== undefined) {
      updateData.email = input.email;
      updatedFields.push('email');
    }
    if (input.name !== undefined) {
      updateData.name = input.name;
      updatedFields.push('name');
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone;
      updatedFields.push('phone');
    }
    if (input.companyName !== undefined) {
      updateData.companyName = input.companyName;
      updatedFields.push('companyName');
    }
    if (input.taxCode !== undefined) {
      updateData.taxCode = input.taxCode;
      updatedFields.push('taxCode');
    }
    if (input.address !== undefined) {
      updateData.address = input.address;
      updatedFields.push('address');
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
      updatedFields.push('status');
    }
    if (input.tier !== undefined) {
      updateData.tier = input.tier;
      updatedFields.push('tier');
    }
    if (input.lifecycleStage !== undefined) {
      updateData.lifecycleStage = input.lifecycleStage;
      updatedFields.push('lifecycleStage');
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
      updatedFields.push('notes');
    }
    if (input.accountOwnerId !== undefined) {
      updateData.accountOwnerId = input.accountOwnerId;
      updatedFields.push('accountOwnerId');
    }
    if (validation.data?.linkedAccounts !== undefined) {
      updateData.linkedAccounts = validation.data.linkedAccounts;
      updatedFields.push('linkedAccounts');
    }

    // 3. Update customer
    await this.customerRepository.updateById(input.customerId, updateData);

    return {
      success: true,
      data: {
        customerId: input.customerId,
        updatedFields,
      },
    };
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  async findById(customerId: string): Promise<MktCustomerWorkspaceEntity | null> {
    return this.customerRepository.findByIdOrNull(customerId);
  }

  async findByIdOrThrow(customerId: string): Promise<MktCustomerWorkspaceEntity> {
    const customer = await this.customerRepository.findByIdOrNull(customerId);
    if (!customer) {
      throw new NotFoundException(CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId));
    }
    return customer;
  }

  async findByEmail(email: string): Promise<MktCustomerWorkspaceEntity | null> {
    return this.customerRepository.findByEmail(email);
  }

  async findByCode(customerCode: string): Promise<MktCustomerWorkspaceEntity | null> {
    return this.customerRepository.findByCode(customerCode);
  }

  async findAll(options?: CustomerQueryOptions): Promise<MktCustomerWorkspaceEntity[]> {
    return this.customerRepository.findAllCustomers({
      take: options?.take ?? 50,
      skip: options?.skip ?? 0,
      where: options?.filter,
    });
  }

  async findByStatus(status: string, options?: CustomerQueryOptions): Promise<MktCustomerWorkspaceEntity[]> {
    return this.customerRepository.findAllCustomers({
      take: options?.take ?? 50,
      skip: options?.skip ?? 0,
      where: { status, ...options?.filter },
    });
  }

  async findByTier(tier: string, options?: CustomerQueryOptions): Promise<MktCustomerWorkspaceEntity[]> {
    return this.customerRepository.findAllCustomers({
      take: options?.take ?? 50,
      skip: options?.skip ?? 0,
      where: { tier, ...options?.filter },
    });
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  async softDelete(customerId: string): Promise<ServiceResult<{ customerId: string }>> {
    const customer = await this.findByIdOrThrow(customerId);
    await this.customerRepository.softDelete(customerId);

    return {
      success: true,
      data: { customerId: customer.id },
    };
  }

  async restore(customerId: string): Promise<ServiceResult<{ customerId: string; status: string }>> {
    const customer = await this.customerRepository.findByIdOrNull(customerId, {
      withDeleted: true,
    });

    if (!customer) {
      throw new NotFoundException(CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId));
    }

    await this.customerRepository.restore(customerId);

    return {
      success: true,
      data: {
        customerId: customer.id,
        status: customer.status,
      },
    };
  }
}
```

### Phase 2: Tạo Block Hooks và Resolvers

#### 3.3 Tạo Block Hooks

**File mới:** `hooks/customer-block.pre-query.hook.ts`

```typescript
/**
 * Customer Block Pre-Query Hooks
 *
 * Blocks ALL 13 auto-generated GraphQL operations on mktCustomer.
 * Forces users to use custom resolvers (CustomerQueryResolver, CustomerMutationResolver).
 *
 * Blocked operations:
 * - Queries: findMany, findOne, findDuplicates
 * - Mutations: createOne, createMany, updateOne, updateMany,
 *              deleteOne, deleteMany, destroyOne, destroyMany,
 *              restoreOne, restoreMany
 */

import { BlockHookConfig, createBlockHooks } from 'src/mkt-core/common/hooks';
// Import từ workspace-entity để có single source of truth
import { MKT_CUSTOMER_ENTITY_NAME } from '../objects/mkt-customer.workspace-entity';

/**
 * Block hook configuration for mktCustomer entity
 */
export const CUSTOMER_BLOCK_CONFIG: BlockHookConfig = {
  entityName: MKT_CUSTOMER_ENTITY_NAME, // Từ workspace-entity, không hardcode
  logContext: 'Customer:BlockHook',
  blockedMessage:
    'This operation is disabled. Use custom Customer resolvers instead (getCustomerById, createCustomer, updateCustomer, etc.)',
};

/**
 * Generated block hooks using factory
 */
const { providers, blockedOperations } = createBlockHooks(CUSTOMER_BLOCK_CONFIG);

/**
 * All Customer block hook providers (13 hooks)
 * Import this into CustomerModule
 */
export const CUSTOMER_BLOCK_HOOKS = providers;

/**
 * List of blocked operation strings for reference
 * e.g., ['mktCustomer.findMany', 'mktCustomer.findOne', ...]
 */
export const CUSTOMER_BLOCKED_OPERATIONS = blockedOperations;
```

**Cập nhật:** `hooks/index.ts`

```typescript
// Block hooks - disable auto-generated operations
export * from './customer-block.pre-query.hook';

// Legacy validation hooks - XÓA SAU KHI MIGRATE XONG
// export * from './mkt-customer-create-one.pre-query.hook';
// export * from './mkt-customer-update-one.pre-query.hook';
```

#### 3.4 Tạo DTOs

**File mới:** `dto/customer-crud.input.ts`

```typescript
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCustomerInput {
  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  companyName?: string;

  @Field(() => String, { nullable: true })
  taxCode?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  tier?: string;

  @Field(() => String, { nullable: true })
  lifecycleStage?: string;

  @Field(() => String, { nullable: true })
  notes?: string;

  @Field(() => String, { nullable: true })
  accountOwnerId?: string;
}

@InputType()
export class UpdateCustomerInput {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  companyName?: string;

  @Field(() => String, { nullable: true })
  taxCode?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  tier?: string;

  @Field(() => String, { nullable: true })
  lifecycleStage?: string;

  @Field(() => String, { nullable: true })
  notes?: string;

  @Field(() => String, { nullable: true })
  accountOwnerId?: string;
}
```

**File mới:** `dto/customer-crud.output.ts`

> **Lưu ý về typing:**
> - **Date fields** (`registrationDate`, `lastPurchase`, `createdAt`, `updatedAt`): Entity type là `Date`, output là `String` (ISO 8601)
> - **Number fields** (`totalOrderValue`, `customerLtv`): Dùng `Float` cho tiền tệ VND
> - **Integer fields** (`licensesCount`, `totalOrderCount`, scores): Dùng `Int`

```typescript
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CustomerOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  mktCustomerCode: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  companyName?: string;

  @Field(() => String, { nullable: true })
  taxCode?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => String)
  status: string;

  @Field(() => String)
  tier: string;

  @Field(() => String)
  lifecycleStage: string;

  // ============ ANALYTICS - Currency (Float) ============
  @Field(() => Float, { nullable: true, description: 'Total order value in VND' })
  totalOrderValue?: number;

  @Field(() => Float, { nullable: true, description: 'Customer lifetime value in VND' })
  customerLtv?: number;

  // ============ ANALYTICS - Integers ============
  @Field(() => Int, { nullable: true })
  licensesCount?: number;

  @Field(() => Int, { nullable: true })
  totalOrderCount?: number;

  @Field(() => Int, { nullable: true, description: 'Churn risk score (0-100)' })
  churnRiskScore?: number;

  @Field(() => Int, { nullable: true, description: 'Engagement score (0-100)' })
  engagementScore?: number;

  // ============ DATES - ISO 8601 String ============
  @Field(() => String, { nullable: true, description: 'ISO 8601 date string' })
  registrationDate?: string;

  @Field(() => String, { nullable: true, description: 'ISO 8601 date string' })
  lastPurchase?: string;

  @Field(() => String, { nullable: true, description: 'ISO 8601 date string' })
  createdAt?: string;

  @Field(() => String, { nullable: true, description: 'ISO 8601 date string' })
  updatedAt?: string;

  // ============ RELATIONS ============
  @Field(() => String, { nullable: true })
  accountOwnerId?: string;

  @Field(() => String, { nullable: true })
  createdById?: string;
}

@ObjectType()
export class CustomerListOutput {
  @Field(() => [CustomerOutput])
  customers: CustomerOutput[];

  @Field(() => Number)
  totalCount: number;
}

@ObjectType()
export class CreateCustomerResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => String, { nullable: true })
  customerCode?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
export class UpdateCustomerResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => [String], { nullable: true })
  updatedFields?: string[];

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
export class DeleteCustomerResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
export class RestoreCustomerResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}
```

#### 3.5 Tạo Query Resolver

**File mới:** `resolvers/customer-query.resolver.ts`

```typescript
/**
 * CustomerQueryResolver - GraphQL resolver for Customer queries
 *
 * Access Control:
 * - Authenticated users with workspace access
 *
 * Provides queries for:
 * - getCustomerById: Get customer by ID
 * - getCustomerByCode: Get customer by customer code
 * - getCustomerByEmail: Get customer by email
 * - getCustomers: Get all customers with pagination
 * - getCustomersByStatus: Get customers by status
 * - getCustomersByTier: Get customers by tier
 */

import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { MktCustomerService } from '../services/mkt-customer.service';
import { CustomerOutput, CustomerListOutput } from '../dto';
import { MktCustomerWorkspaceEntity } from '../objects/mkt-customer.workspace-entity';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class CustomerQueryResolver {
  constructor(private readonly customerService: MktCustomerService) {}

  /**
   * Get customer by ID
   */
  @Query(() => CustomerOutput, {
    description: 'Get customer by ID',
    nullable: true,
  })
  async getCustomerById(
    @Args('customerId', { type: () => String }) customerId: string,
  ): Promise<CustomerOutput | null> {
    const customer = await this.customerService.findById(customerId);
    return customer ? this.mapToOutput(customer) : null;
  }

  /**
   * Get customer by customer code
   */
  @Query(() => CustomerOutput, {
    description: 'Get customer by customer code',
    nullable: true,
  })
  async getCustomerByCode(
    @Args('customerCode', { type: () => String }) customerCode: string,
  ): Promise<CustomerOutput | null> {
    const customer = await this.customerService.findByCode(customerCode);
    return customer ? this.mapToOutput(customer) : null;
  }

  /**
   * Get customer by email
   */
  @Query(() => CustomerOutput, {
    description: 'Get customer by email',
    nullable: true,
  })
  async getCustomerByEmail(
    @Args('email', { type: () => String }) email: string,
  ): Promise<CustomerOutput | null> {
    const customer = await this.customerService.findByEmail(email);
    return customer ? this.mapToOutput(customer) : null;
  }

  /**
   * Get all customers with pagination
   */
  @Query(() => CustomerListOutput, {
    description: 'Get all customers with pagination',
  })
  async getCustomers(
    @Args('take', { type: () => Number, nullable: true, defaultValue: 50 }) take: number,
    @Args('skip', { type: () => Number, nullable: true, defaultValue: 0 }) skip: number,
  ): Promise<CustomerListOutput> {
    const customers = await this.customerService.findAll({ take, skip });
    return {
      customers: customers.map((c) => this.mapToOutput(c)),
      totalCount: customers.length,
    };
  }

  /**
   * Get customers by status
   */
  @Query(() => CustomerListOutput, {
    description: 'Get customers by status',
  })
  async getCustomersByStatus(
    @Args('status', { type: () => String }) status: string,
    @Args('take', { type: () => Number, nullable: true, defaultValue: 50 }) take: number,
    @Args('skip', { type: () => Number, nullable: true, defaultValue: 0 }) skip: number,
  ): Promise<CustomerListOutput> {
    const customers = await this.customerService.findByStatus(status, { take, skip });
    return {
      customers: customers.map((c) => this.mapToOutput(c)),
      totalCount: customers.length,
    };
  }

  /**
   * Get customers by tier
   */
  @Query(() => CustomerListOutput, {
    description: 'Get customers by tier',
  })
  async getCustomersByTier(
    @Args('tier', { type: () => String }) tier: string,
    @Args('take', { type: () => Number, nullable: true, defaultValue: 50 }) take: number,
    @Args('skip', { type: () => Number, nullable: true, defaultValue: 0 }) skip: number,
  ): Promise<CustomerListOutput> {
    const customers = await this.customerService.findByTier(tier, { take, skip });
    return {
      customers: customers.map((c) => this.mapToOutput(c)),
      totalCount: customers.length,
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Map entity to output DTO
   *
   * Note: Date fields are converted to ISO 8601 strings
   * - Entity stores Date objects
   * - Output returns ISO strings for GraphQL compatibility
   */
  private mapToOutput(customer: MktCustomerWorkspaceEntity): CustomerOutput {
    return {
      id: customer.id,
      mktCustomerCode: customer.mktCustomerCode,
      name: customer.name,
      email: customer.email ?? undefined,
      phone: customer.phone ?? undefined,
      companyName: customer.companyName ?? undefined,
      taxCode: customer.taxCode ?? undefined,
      address: customer.address ?? undefined,
      status: customer.status,
      tier: customer.tier,
      lifecycleStage: customer.lifecycleStage,
      // Currency fields (Float)
      totalOrderValue: customer.totalOrderValue ?? undefined,
      customerLtv: customer.customerLtv ?? undefined,
      // Integer fields
      licensesCount: customer.licensesCount ?? undefined,
      totalOrderCount: customer.totalOrderCount ?? undefined,
      churnRiskScore: customer.churnRiskScore ?? undefined,
      engagementScore: customer.engagementScore ?? undefined,
      // Date fields - convert Date to ISO string
      registrationDate: this.dateToISOString(customer.registrationDate),
      lastPurchase: this.dateToISOString(customer.lastPurchase),
      createdAt: this.dateToISOString(customer.createdAt),
      updatedAt: this.dateToISOString(customer.updatedAt),
      // Relations
      accountOwnerId: customer.accountOwnerId ?? undefined,
      createdById: customer.createdById ?? undefined,
    };
  }

  /**
   * Safely convert Date to ISO string
   * Handles both Date objects and existing ISO strings
   */
  private dateToISOString(date: Date | string | null | undefined): string | undefined {
    if (!date) return undefined;

    // If already a string (ISO format), return as-is
    if (typeof date === 'string') return date;

    // If Date object, convert to ISO string
    if (date instanceof Date) {
      return date.toISOString();
    }

    return undefined;
  }
}
```

#### 3.6 Tạo Mutation Resolver

**File mới:** `resolvers/customer-mutation.resolver.ts`

```typescript
/**
 * CustomerMutationResolver - GraphQL resolver for Customer mutations
 *
 * Access Control:
 * - Authenticated users with workspace access
 *
 * Provides mutations for:
 * - createCustomer: Create a new customer
 * - updateCustomer: Update an existing customer
 * - deleteCustomer: Soft delete a customer
 * - restoreCustomer: Restore a soft deleted customer
 */

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { MktCustomerService } from '../services/mkt-customer.service';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateCustomerResponseDto,
  UpdateCustomerResponseDto,
  DeleteCustomerResponseDto,
  RestoreCustomerResponseDto,
} from '../dto';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class CustomerMutationResolver {
  constructor(private readonly customerService: MktCustomerService) {}

  /**
   * Create a new customer
   */
  @Mutation(() => CreateCustomerResponseDto, {
    description: 'Create a new customer',
  })
  async createCustomer(
    @Args('input') input: CreateCustomerInput,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<CreateCustomerResponseDto> {
    const result = await this.customerService.createCustomer({
      ...input,
      workspaceMemberId,
      workspaceId: workspace.id,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      customerId: result.data.customerId,
      customerCode: result.data.customerCode,
      status: result.data.status,
    };
  }

  /**
   * Update an existing customer
   */
  @Mutation(() => UpdateCustomerResponseDto, {
    description: 'Update an existing customer',
  })
  async updateCustomer(
    @Args('input') input: UpdateCustomerInput,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<UpdateCustomerResponseDto> {
    const result = await this.customerService.updateCustomer({
      customerId: input.id,
      ...input,
      workspaceId: workspace.id,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      customerId: result.data.customerId,
      updatedFields: result.data.updatedFields,
    };
  }

  /**
   * Soft delete a customer
   */
  @Mutation(() => DeleteCustomerResponseDto, {
    description: 'Soft delete a customer',
  })
  async deleteCustomer(
    @Args('customerId', { type: () => String }) customerId: string,
  ): Promise<DeleteCustomerResponseDto> {
    const result = await this.customerService.softDelete(customerId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      customerId: result.data.customerId,
      message: 'Customer deleted successfully',
    };
  }

  /**
   * Restore a soft deleted customer
   */
  @Mutation(() => RestoreCustomerResponseDto, {
    description: 'Restore a soft deleted customer',
  })
  async restoreCustomer(
    @Args('customerId', { type: () => String }) customerId: string,
  ): Promise<RestoreCustomerResponseDto> {
    const result = await this.customerService.restore(customerId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      customerId: result.data.customerId,
      status: result.data.status,
    };
  }
}
```

### Phase 3: Cập nhật Module

#### 3.7 Cập nhật customer.module.ts

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

// Hooks - Block auto-generated operations
import { CUSTOMER_BLOCK_HOOKS } from './hooks';

// Repositories
import { MktCustomerRepository } from './repositories/mkt-customer.repository';
import { MktCustomerTierHistoryRepository } from './repositories/mkt-customer-tier-history.repository';

// Services
import { MktCustomerService } from './services/mkt-customer.service';
import { MktCustomerValidationService } from './services/validation/mkt-customer-validation.service';
import {
  MktCustomerCodeGenerationService,
  MktCustomerCreationService,
  MktCustomerUpdateService,
  MktCustomerCronRegistrationService,
  MktCustomerDowngradePolicyService,
  MktCustomerQueueService,
  MktCustomerTierCalculationService,
  MktCustomerTierHistoryService,
  MktCustomerTierService,
  MktCustomerAutoAssignService,
  MktCustomerCategorizationService,
  MktCustomerAccountService,
  MktCustomerLicenseService,
  MktCustomerExportService,
} from './services';

// Resolvers - CRUD operations
import { CustomerQueryResolver } from './resolvers/customer-query.resolver';
import { CustomerMutationResolver } from './resolvers/customer-mutation.resolver';
// Resolvers - Domain-specific
import { MktCustomerExportResolver } from './resolvers/mkt-customer-export.resolver';
import { MktCustomerLicenseResolver } from './resolvers/mkt-customer-license.resolver';
import { MktCustomerLinkedAccountResolver } from './resolvers/mkt-customer-linked-account.resolver';
import { MktCustomerTierResolver } from './resolvers/mkt-customer-tier.resolver';
import { MktCustomerTierHistoryResolver } from './resolvers/mkt-customer-tier-history.resolver';

// Event Listeners
import { MktCustomerEventListener } from './listeners/mkt-customer-event.listener';

// Jobs
import {
  MktCustomerCategorizationCronJob,
  MktCustomerTierCronJob,
  MktCustomerTierUpdateJob,
} from './jobs';

// External modules
import { MktEmailModule } from 'src/mkt-core/email/mkt-email.module';
import { MktLicenseIntegrationModule } from 'src/mkt-core/mkt-license-integration/mkt-license-integration.module';
import { MktSendmailTemplateModule } from 'src/mkt-core/mkt-sendmail-template/mkt-sendmail-template.module';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';

@Module({
  imports: [
    EmailModule,
    MktEmailModule,
    MktSendmailTemplateModule,
    TokenModule,
    TwentyORMModule,
    WorkspaceCacheStorageModule,
    MktLicenseIntegrationModule,
    MessageQueueModule,
    TypeOrmModule.forFeature([Workspace], 'core'),
  ],
  providers: [
    // Repositories
    MktCustomerRepository,
    MktCustomerTierHistoryRepository,
    MktWorkspaceMemberRepository,
    MktOrderRepository,

    // Services - Core CRUD
    MktCustomerService,
    MktCustomerValidationService,

    // Services - Legacy (kept for backwards compatibility)
    MktCustomerCreationService,
    MktCustomerAccountService,
    MktCustomerTierCalculationService,
    MktCustomerTierHistoryService,
    MktCustomerTierService,
    MktCustomerQueueService,
    MktCustomerUpdateService,
    MktCustomerCronRegistrationService,
    MktCustomerExportService,
    MktCustomerLicenseService,
    MktCustomerCodeGenerationService,
    MktCustomerCategorizationService,
    MktCustomerAutoAssignService,
    MktCustomerDowngradePolicyService,

    // Resolvers - CRUD (NEW)
    CustomerQueryResolver,
    CustomerMutationResolver,

    // Resolvers - Domain-specific (existing)
    MktCustomerLicenseResolver,
    MktCustomerLinkedAccountResolver,
    MktCustomerExportResolver,
    MktCustomerTierResolver,
    MktCustomerTierHistoryResolver,

    // Hooks - Block all 13 auto-generated GraphQL operations (NEW)
    ...CUSTOMER_BLOCK_HOOKS,

    // Event Listeners
    MktCustomerEventListener,

    // Jobs & Commands
    MktCustomerTierUpdateJob,
    MktCustomerTierCronJob,
    MktCustomerCategorizationCronJob,
  ],
  exports: [
    // Repositories
    MktCustomerRepository,
    MktCustomerTierHistoryRepository,

    // Services - Core
    MktCustomerService,
    MktCustomerValidationService,

    // Services - Legacy
    MktCustomerCreationService,
    MktCustomerAccountService,
    MktCustomerQueueService,
    MktCustomerTierHistoryService,
    MktCustomerExportService,
    MktCustomerLicenseService,
    MktCustomerUpdateService,
    MktCustomerTierService,
    MktCustomerCategorizationService,
    MktCustomerAutoAssignService,
    MktCustomerCodeGenerationService,
    MktCustomerDowngradePolicyService,
  ],
})
export class CustomerModule {}
```

---

## 4. Danh sách files cần tạo/cập nhật

### Files cần cập nhật TRƯỚC (Pre-requisite)

| File | Thay đổi |
|------|----------|
| `objects/mkt-customer.workspace-entity.ts` | Export `MKT_CUSTOMER_ENTITY_NAME` constant |

### Files mới cần tạo

| File | Mô tả |
|------|-------|
| `hooks/customer-block.pre-query.hook.ts` | Block hooks configuration |
| `services/mkt-customer.service.ts` | Core CRUD service |
| `services/validation/mkt-customer-validation.service.ts` | Validation service |
| `resolvers/customer-query.resolver.ts` | Query resolver |
| `resolvers/customer-mutation.resolver.ts` | Mutation resolver |
| `dto/customer-crud.input.ts` | Input DTOs |
| `dto/customer-crud.output.ts` | Output DTOs (Float cho VND, Int cho counts) |

### Files cần cập nhật

| File | Thay đổi |
|------|----------|
| `hooks/index.ts` | Export block hooks, comment out legacy hooks |
| `services/index.ts` | Export new services |
| `dto/index.ts` | Export new DTOs |
| `resolvers/index.ts` | Export new resolvers |
| `customer.module.ts` | Register new providers, block hooks |

### Files cần xóa (Phase cuối)

| File | Lý do |
|------|-------|
| `hooks/mkt-customer-create-one.pre-query.hook.ts` | Replaced by ValidationService + block hooks |
| `hooks/mkt-customer-update-one.pre-query.hook.ts` | Replaced by ValidationService + block hooks |

---

## 5. Migration Checklist

### Phase 0: Pre-requisite 🔧
- [ ] Thêm `MKT_CUSTOMER_ENTITY_NAME` constant vào `mkt-customer.workspace-entity.ts`
- [ ] Export constant từ workspace-entity file

### Phase 1: Chuẩn bị ✅
- [ ] Tạo `MktCustomerValidationService`
- [ ] Tạo `MktCustomerService`
- [ ] Viết unit tests cho services mới

### Phase 2: Block Hooks & Resolvers ✅
- [ ] Tạo `customer-block.pre-query.hook.ts` (import từ workspace-entity)
- [ ] Tạo DTOs (input/output với đúng types: Float cho VND, Int cho counts, String cho dates)
- [ ] Tạo `CustomerQueryResolver`
- [ ] Tạo `CustomerMutationResolver`
- [ ] Viết unit tests cho resolvers

### Phase 3: Integration ✅
- [ ] Cập nhật `customer.module.ts`
- [ ] Cập nhật index files
- [ ] Test integration với frontend

### Phase 4: Cleanup 🧹
- [ ] Xóa legacy hooks
- [ ] Remove legacy hook imports
- [ ] Final testing

---

## 6. GraphQL API mới

### Queries

```graphql
type Query {
  # Get customer by ID
  getCustomerById(customerId: String!): CustomerOutput

  # Get customer by customer code
  getCustomerByCode(customerCode: String!): CustomerOutput

  # Get customer by email
  getCustomerByEmail(email: String!): CustomerOutput

  # Get all customers with pagination
  getCustomers(take: Int = 50, skip: Int = 0): CustomerListOutput!

  # Get customers by status
  getCustomersByStatus(status: String!, take: Int = 50, skip: Int = 0): CustomerListOutput!

  # Get customers by tier
  getCustomersByTier(tier: String!, take: Int = 50, skip: Int = 0): CustomerListOutput!
}
```

### Mutations

```graphql
type Mutation {
  # Create a new customer
  createCustomer(input: CreateCustomerInput!): CreateCustomerResponseDto!

  # Update an existing customer
  updateCustomer(input: UpdateCustomerInput!): UpdateCustomerResponseDto!

  # Soft delete a customer
  deleteCustomer(customerId: String!): DeleteCustomerResponseDto!

  # Restore a soft deleted customer
  restoreCustomer(customerId: String!): RestoreCustomerResponseDto!
}
```

---

## 7. Lưu ý quan trọng

### 7.1 Single Source of Truth cho Entity Name

- **ĐÚNG**: Import `MKT_CUSTOMER_ENTITY_NAME` từ `objects/mkt-customer.workspace-entity.ts`
- **SAI**: Hardcode `'mktCustomer'` trong nhiều files khác nhau

### 7.2 Type Mapping trong DTOs

| Entity Field Type | GraphQL Type | Conversion |
|------------------|--------------|------------|
| `Date` | `String` | `date.toISOString()` hoặc giữ nguyên nếu đã là string |
| `number` (currency VND) | `Float` | Giữ nguyên |
| `number` (count, score) | `Int` | Giữ nguyên |
| `string` | `String` | Giữ nguyên |
| `string \| null` | `String` (nullable) | `?? undefined` |

### 7.3 Block hooks sẽ chặn TẤT CẢ 13 operations của auto-generated GraphQL

```
mktCustomer.findMany
mktCustomer.findOne
mktCustomer.findDuplicates
mktCustomer.createOne
mktCustomer.createMany
mktCustomer.updateOne
mktCustomer.updateMany
mktCustomer.deleteOne
mktCustomer.deleteMany
mktCustomer.destroyOne
mktCustomer.destroyMany
mktCustomer.restoreOne
mktCustomer.restoreMany
```

### 7.4 Frontend cần cập nhật

Sử dụng GraphQL queries/mutations mới thay vì auto-generated.

### 7.5 Event listeners vẫn hoạt động

Event listeners (`MktCustomerEventListener`) không bị ảnh hưởng bởi block hooks.

### 7.6 Backwards compatibility

Các service cũ (`MktCustomerCreationService`, `MktCustomerUpdateService`) vẫn được giữ lại để các module khác có thể sử dụng.

---

## 8. Testing

### Unit Tests

```typescript
// services/validation/mkt-customer-validation.service.spec.ts
describe('MktCustomerValidationService', () => {
  describe('validateCreate', () => {
    it('should validate email format');
    it('should check email uniqueness');
    it('should validate tax code format');
  });

  describe('validateUpdate', () => {
    it('should prevent customer code change');
    it('should validate email format');
    it('should validate linked accounts');
  });
});

// services/mkt-customer.service.spec.ts
describe('MktCustomerService', () => {
  describe('createCustomer', () => {
    it('should create customer with defaults');
    it('should generate customer code');
  });

  describe('updateCustomer', () => {
    it('should update customer fields');
    it('should track updated fields');
  });
});
```

### Integration Tests

```typescript
// resolvers/customer-mutation.resolver.integration.spec.ts
describe('CustomerMutationResolver (Integration)', () => {
  it('should create customer via GraphQL');
  it('should update customer via GraphQL');
  it('should soft delete customer via GraphQL');
  it('should restore customer via GraphQL');
});
```
