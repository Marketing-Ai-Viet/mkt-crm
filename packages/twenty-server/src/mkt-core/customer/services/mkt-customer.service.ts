import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktCustomerCodeGenerationService } from 'src/mkt-core/customer/services/core/mkt-customer-code-generation.service';
import { MktCustomerValidationService } from 'src/mkt-core/customer/services/validation/mkt-customer-validation.service';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import {
  CUSTOMER_MESSAGES,
  MKT_CUSTOMER_LOG_CONTEXT,
} from 'src/mkt-core/customer/messages';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { buildOwnershipFields } from 'src/mkt-core/common/repositories/base-workspace.repository';
import { LinkedAccount } from 'src/mkt-core/customer/types';

// ============================================
// INPUT TYPES
// ============================================

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
  linkedAccounts?: LinkedAccount[];
  workspaceId?: string;
};

type CustomerQueryOptions = {
  take?: number;
  skip?: number;
  filter?: Record<string, unknown>;
  hasFullAccess?: boolean;
};

// ============================================
// RESULT TYPES
// ============================================

type ServiceResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

type CreateCustomerResult = {
  customerId: string;
  customerCode: string;
  status: string;
};

type UpdateCustomerResult = {
  customerId: string;
  updatedFields: string[];
};

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_STATUS = 'ACTIVE';
const DEFAULT_TIER = 'BRONZE';
const DEFAULT_LIFECYCLE_STAGE = 'PROSPECTIVE';
const DEFAULT_TAKE = 50;
const DEFAULT_SKIP = 0;

// ============================================
// SERVICE
// ============================================

/**
 * MktCustomerService - Core CRUD service for Customer entity
 *
 * Provides high-level business operations:
 * - createCustomer: Create with validation and defaults
 * - updateCustomer: Update with validation
 * - findById, findByEmail, findByCode, findAll: Query operations
 * - softDelete, restore: Lifecycle operations
 *
 * Uses:
 * - MktCustomerValidationService for input validation
 * - MktCustomerCodeGenerationService for customer code generation
 * - MktCustomerRepository for data access
 */
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

  /**
   * Create a new customer
   *
   * @param input - Customer data
   * @returns ServiceResult with customerId, customerCode, status
   */
  async createCustomer(
    input: CreateCustomerInput,
  ): Promise<ServiceResult<CreateCustomerResult>> {
    this.logger.log(
      CUSTOMER_MESSAGES.LOG.CUSTOMER_PRE_CREATE(input.email ?? 'unknown'),
    );

    // 1. Validate input
    const validation = await this.validationService.validateCreate({
      email: input.email,
      taxCode: input.taxCode,
      workspaceId: input.workspaceId,
    });

    if (!validation.success) {
      return { success: false, error: validation.error ?? 'Validation failed' };
    }

    // 2. Generate customer code
    const customerCode =
      await this.codeGenerationService.generateUniqueCustomerCode(true);

    // 3. Build customer data with defaults
    const now = DateTimeUtils.toDate(DateTimeUtils.now());
    const ownershipFields = buildOwnershipFields({
      workspaceMemberId: input.workspaceMemberId,
      accountOwnerId: input.accountOwnerId,
    });

    const customerData: Partial<MktCustomerWorkspaceEntity> = {
      mktCustomerCode: customerCode,
      name: input.name,
      email: input.email,
      phone: input.phone,
      companyName: input.companyName,
      taxCode: input.taxCode,
      address: input.address,
      status: input.status ?? DEFAULT_STATUS,
      tier: input.tier ?? DEFAULT_TIER,
      lifecycleStage: input.lifecycleStage ?? DEFAULT_LIFECYCLE_STAGE,
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
    const customer = await this.customerRepository.create(customerData);

    this.logger.log(`Created customer: ${customer.id}`);

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

  /**
   * Update an existing customer
   *
   * @param input - Update data with customerId
   * @returns ServiceResult with customerId and updatedFields
   */
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
      linkedAccounts: input.linkedAccounts,
      workspaceId: input.workspaceId,
    });

    if (!validation.success) {
      return { success: false, error: validation.error ?? 'Validation failed' };
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
    await this.customerRepository.update(input.customerId, updateData);

    this.logger.log(
      `Updated customer ${input.customerId}: ${updatedFields.join(', ')}`,
    );

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

  /**
   * Find customer by ID (returns null if not found)
   */
  async findById(
    customerId: string,
  ): Promise<MktCustomerWorkspaceEntity | null> {
    return this.customerRepository.findByIdOrNull(customerId);
  }

  /**
   * Find customer by ID (throws if not found)
   */
  async findByIdOrThrow(
    customerId: string,
  ): Promise<MktCustomerWorkspaceEntity> {
    const customer = await this.customerRepository.findByIdOrNull(customerId);

    if (!customer) {
      throw new NotFoundException(
        CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId),
      );
    }

    return customer;
  }

  /**
   * Find customer by email
   */
  async findByEmail(email: string): Promise<MktCustomerWorkspaceEntity | null> {
    return this.customerRepository.findByEmail(email);
  }

  /**
   * Find customer by customer code
   */
  async findByCode(
    customerCode: string,
  ): Promise<MktCustomerWorkspaceEntity | null> {
    const repository = await this.customerRepository.getRepository();

    return repository.findOne({
      where: { mktCustomerCode: customerCode } as never,
    });
  }

  /**
   * Find all customers with pagination
   */
  async findAll(
    options?: CustomerQueryOptions,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    return this.customerRepository.findAllCustomers({
      take: options?.take ?? DEFAULT_TAKE,
      skip: options?.skip ?? DEFAULT_SKIP,
    });
  }

  /**
   * Find customers by status
   */
  async findByStatus(
    status: string,
    options?: CustomerQueryOptions,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const repository = await this.customerRepository.getRepository();

    return repository.find({
      where: { status, deletedAt: null } as never,
      take: options?.take ?? DEFAULT_TAKE,
      skip: options?.skip ?? DEFAULT_SKIP,
      order: { createdAt: 'DESC' } as never,
    });
  }

  /**
   * Find customers by tier
   */
  async findByTier(
    tier: string,
    options?: CustomerQueryOptions,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    return this.customerRepository.findByTier(tier, {
      limit: options?.take ?? DEFAULT_TAKE,
      offset: options?.skip ?? DEFAULT_SKIP,
    });
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete a customer
   */
  async softDelete(
    customerId: string,
  ): Promise<ServiceResult<{ customerId: string }>> {
    const customer = await this.findByIdOrThrow(customerId);

    await this.customerRepository.softDelete(customerId);

    this.logger.log(`Soft deleted customer: ${customerId}`);

    return {
      success: true,
      data: { customerId: customer.id },
    };
  }

  /**
   * Restore a soft deleted customer
   */
  async restore(
    customerId: string,
  ): Promise<ServiceResult<{ customerId: string; status: string }>> {
    const repository = await this.customerRepository.getRepository();

    // Find including soft-deleted
    const customer = await repository.findOne({
      where: { id: customerId } as never,
      withDeleted: true,
    });

    if (!customer) {
      throw new NotFoundException(
        CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId),
      );
    }

    // Restore by setting deletedAt to null
    await repository.update(customerId, { deletedAt: null } as never);

    this.logger.log(`Restored customer: ${customerId}`);

    return {
      success: true,
      data: {
        customerId: customer.id,
        status: customer.status,
      },
    };
  }
}
