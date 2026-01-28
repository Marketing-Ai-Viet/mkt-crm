import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import pickBy from 'lodash.pickby';
import { IsNull } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { transactionContextStore } from 'src/mkt-core/common/transaction';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { MktCustomerNoteRepository } from 'src/mkt-core/customer/repositories/mkt-customer-note.repository';
import { MktCustomerCodeGenerationService } from 'src/mkt-core/customer/services/core/mkt-customer-code-generation.service';
import { MktCustomerValidationService } from 'src/mkt-core/customer/services/validation/mkt-customer-validation.service';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { buildOwnershipFields } from 'src/mkt-core/common/repositories/base-workspace.repository';
import {
  MKT_CUSTOMER_LIFECYCLE_STAGE,
  MKT_CUSTOMER_STATUS,
  MKT_CUSTOMER_TIER,
} from 'src/mkt-core/customer/constants/mkt-customer.constant';
import {
  CreateCustomerResult,
  CustomerQueryOptions,
  ServiceCustomerResult,
  UpdateCustomerResult,
} from 'src/mkt-core/customer/types';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerOutput,
  CustomerNoteOutput,
} from 'src/mkt-core/customer/dto';
import { MktCustomerNoteWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-note.workspace-entity';

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
  private readonly logger = new Logger(MktCustomerService.name);

  // Default values for customer creation
  private readonly defaults = {
    status: MKT_CUSTOMER_STATUS.ACTIVE,
    tier: MKT_CUSTOMER_TIER.BRONZE,
    lifecycleStage: MKT_CUSTOMER_LIFECYCLE_STAGE.PROSPECTIVE,
    take: 50,
    skip: 0,
  } as const;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly customerRepository: MktCustomerRepository,
    private readonly customerNoteRepository: MktCustomerNoteRepository,
    private readonly codeGenerationService: MktCustomerCodeGenerationService,
    private readonly validationService: MktCustomerValidationService,
  ) {}

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new customer
   *
   * Uses TypeORM transaction to ensure data consistency when creating customer and notes.
   *
   * @param input - Customer data
   * @returns ServiceResult with customerId, customerCode, status
   */
  async createCustomer(
    input: CreateCustomerInput,
  ): Promise<ServiceCustomerResult<CreateCustomerResult>> {
    this.logger.log(
      CUSTOMER_MESSAGES.LOG.CUSTOMER_PRE_CREATE(input.email ?? 'unknown'),
    );

    // 1. Validate input (outside transaction - read-only)
    const validation = await this.validationService.validateCreate({
      email: input.email,
      citizenId: input.citizenId,
      taxCode: input.taxCode,
      workspaceId: input.workspaceId,
    });

    if (!validation.success) {
      return { success: false, error: validation.error ?? 'Validation failed' };
    }

    // 2. Generate customer code (outside transaction - read-only)
    const customerCode =
      await this.codeGenerationService.generateUniqueCustomerCode(true);

    // 3. Get DataSource and run in transaction
    const workspaceId = input.workspaceId ?? '';
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace({
        workspaceId,
      });

    // 4. Run create operations in TypeORM transaction
    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 4.1. Run operations within transaction context (ALS binding)
      const result = await transactionContextStore.run(
        {
          workspaceId,
          queryRunner,
          txId: randomUUID(),
          startedAt: Date.now(),
        },
        async () => {
          // Build customer data with defaults
          const now = DateTimeUtils.toDate(DateTimeUtils.now());
          const ownershipFields = buildOwnershipFields({
            workspaceMemberId: input.workspaceMemberId,
            accountOwnerId: input.accountOwnerId,
          });

          const customerData: Partial<MktCustomerWorkspaceEntity> = {
            // Basic Info
            mktCustomerCode: customerCode,
            name: input.name,
            email: input.email,
            phone: input.phone,
            citizenId: input.citizenId,
            type: input.type,

            // Business Info
            companyName: input.companyName,
            taxCode: input.taxCode,
            address: input.address,
            companySize: input.companySize,
            industry: input.industry,
            contactPosition: input.contactPosition,
            contactDepartment: input.contactDepartment,

            // Status & Tier
            status: input.status ?? this.defaults.status,
            tier: input.tier ?? this.defaults.tier,
            lifecycleStage:
              input.lifecycleStage ?? this.defaults.lifecycleStage,

            // Analytics (defaults)
            registrationDate: now,
            totalOrderValue: 0,
            licensesCount: 0,
            churnRiskScore: 0,
            engagementScore: 0,
            customerLtv: 0,

            // Relations
            supportOwnerId: input.supportOwnerId,
            linkedAccounts: input.linkedAccounts,
            ...ownershipFields,
          };

          // Create customer (repository auto-binds to transaction via ALS)
          const customer = await this.customerRepository.create(customerData);

          this.logger.log(`Created customer: ${customer.id}`);

          // Create initial notes if provided
          if (input.initialNotes && input.initialNotes.length > 0) {
            const noteEntities = input.initialNotes.map((note) => ({
              customerId: customer.id,
              content: note.content,
              noteType: note.noteType ?? 'GENERAL',
            }));

            await this.customerNoteRepository.bulkCreate(noteEntities);

            this.logger.log(
              `Created ${input.initialNotes.length} initial notes for customer: ${customer.id}`,
            );
          }

          return {
            customerId: customer.id,
            customerCode: customer.mktCustomerCode,
            status: customer.status,
          };
        },
      );

      // 4.2. Commit transaction
      await queryRunner.commitTransaction();

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();

      this.logger.error(`Failed to create customer: ${error}`);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create customer',
      };
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update an existing customer
   *
   * Uses TypeORM transaction to ensure data consistency when updating customer and creating notes.
   *
   * @param input - Update data with customerId
   * @returns ServiceResult with customerId and updatedFields
   */
  async updateCustomer(
    input: UpdateCustomerInput,
  ): Promise<ServiceCustomerResult<UpdateCustomerResult>> {
    const customerId = input.customerId ?? input.id;

    this.logger.debug(`Updating customer: ${customerId}`);

    // 0. Check if customer exists (outside transaction - read-only)
    const existingCustomer = await this.findById(customerId, input.workspaceId);

    if (!existingCustomer) {
      return {
        success: false,
        error: CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId),
      };
    }

    // 1. Validate input (outside transaction - read-only)
    const validation = await this.validationService.validateUpdate({
      customerId,
      email: input.email,
      citizenId: input.citizenId,
      taxCode: input.taxCode,
      mktCustomerCode: undefined,
      linkedAccounts: input.linkedAccounts,
      workspaceId: input.workspaceId,
    });

    if (!validation.success) {
      return { success: false, error: validation.error ?? 'Validation failed' };
    }

    // 2. Get DataSource and run in transaction
    const workspaceId = input.workspaceId ?? '';
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace({
        workspaceId,
      });

    // 3. Run update operations in TypeORM transaction
    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3.1. Run operations within transaction context (ALS binding)
      const result = await transactionContextStore.run(
        {
          workspaceId,
          queryRunner,
          txId: randomUUID(),
          startedAt: Date.now(),
        },
        async () => {
          // Build update data from defined fields
          const updateData = this.buildUpdateData(input, validation.data);
          const updatedFields = Object.keys(updateData);

          // Update customer (repository auto-binds to transaction via ALS)
          if (updatedFields.length > 0) {
            await this.customerRepository.update(customerId, updateData);

            this.logger.log(
              `Updated customer ${customerId}: ${updatedFields.join(', ')}`,
            );
          }

          // Create new notes if provided
          if (input.newNotes && input.newNotes.length > 0) {
            const noteEntities = input.newNotes.map((note) => ({
              customerId,
              content: note.content,
              noteType: note.noteType ?? 'GENERAL',
            }));

            await this.customerNoteRepository.bulkCreate(noteEntities);

            this.logger.log(
              `Created ${input.newNotes.length} new notes for customer: ${customerId}`,
            );
          }

          return {
            customerId,
            updatedFields,
          };
        },
      );

      // 3.2. Commit transaction
      await queryRunner.commitTransaction();

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();

      this.logger.error(`Failed to update customer ${customerId}: ${error}`);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update customer',
      };
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  /**
   * Build update data from input, filtering only defined fields
   */
  private buildUpdateData(
    input: UpdateCustomerInput,
    validationData?: { linkedAccounts?: unknown },
  ): Partial<MktCustomerWorkspaceEntity> {
    // Pick only updatable fields that are defined (not undefined)
    const fieldsFromInput = pickBy(
      {
        name: input.name,
        email: input.email,
        phone: input.phone,
        citizenId: input.citizenId,
        type: input.type,
        companyName: input.companyName,
        taxCode: input.taxCode,
        address: input.address,
        companySize: input.companySize,
        industry: input.industry,
        contactPosition: input.contactPosition,
        contactDepartment: input.contactDepartment,
        status: input.status,
        tier: input.tier,
        lifecycleStage: input.lifecycleStage,
        accountOwnerId: input.accountOwnerId,
        supportOwnerId: input.supportOwnerId,
      },
      (value) => value !== undefined,
    ) as Partial<MktCustomerWorkspaceEntity>;

    // Add linkedAccounts from validation if present
    if (validationData?.linkedAccounts !== undefined) {
      fieldsFromInput.linkedAccounts =
        validationData.linkedAccounts as MktCustomerWorkspaceEntity['linkedAccounts'];
    }

    return fieldsFromInput;
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Find customer by ID (returns null if not found)
   * @param customerId - Customer ID
   * @param workspaceId - Optional, falls back to scoped context if not provided
   */
  async findById(
    customerId: string,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity | null> {
    return this.customerRepository.findByIdWithNotes(customerId, workspaceId);
  }

  /**
   * Find customer by ID (throws if not found)
   * @param customerId - Customer ID
   * @param workspaceId - Optional, falls back to scoped context if not provided
   */
  async findByIdOrThrow(
    customerId: string,
    workspaceId?: string,
  ): Promise<MktCustomerWorkspaceEntity> {
    const customer = await this.customerRepository.findByIdWithNotes(
      customerId,
      workspaceId,
    );

    if (!customer) {
      throw new NotFoundException(
        CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId),
      );
    }

    return customer;
  }

  /**
   * Find customer by email with customerNotes
   */
  async findByEmail(
    email: string,
    workspaceId: string,
  ): Promise<MktCustomerWorkspaceEntity | null> {
    const repository = await this.customerRepository.getRepository(workspaceId);

    return repository.findOne({
      where: { email, deletedAt: IsNull() },
      relations: ['customerNotes'],
    });
  }

  /**
   * Find customer by customer code with customerNotes
   */
  async findByCode(
    customerCode: string,
    workspaceId: string,
  ): Promise<MktCustomerWorkspaceEntity | null> {
    const repository = await this.customerRepository.getRepository(workspaceId);

    return repository.findOne({
      where: { mktCustomerCode: customerCode, deletedAt: IsNull() },
      relations: ['customerNotes'],
    });
  }

  /**
   * Find all customers with pagination and customerNotes
   */
  async findAll(
    options: CustomerQueryOptions | undefined,
    workspaceId: string,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const take = options?.take ?? this.defaults.take;

    // Handle take <= 0: return empty array
    if (take <= 0) {
      return [];
    }

    const repository = await this.customerRepository.getRepository(workspaceId);

    return repository.find({
      where: { deletedAt: IsNull() },
      relations: ['customerNotes'],
      take,
      skip: options?.skip ?? this.defaults.skip,
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Find customers by status with customerNotes
   */
  async findByStatus(
    status: string,
    options: CustomerQueryOptions | undefined,
    workspaceId: string,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const take = options?.take ?? this.defaults.take;

    // Handle take <= 0: return empty array
    if (take <= 0) {
      return [];
    }

    const repository = await this.customerRepository.getRepository(workspaceId);

    return repository.find({
      where: { status, deletedAt: IsNull() },
      relations: ['customerNotes'],
      take,
      skip: options?.skip ?? this.defaults.skip,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find customers by tier with customerNotes
   */
  async findByTier(
    tier: string,
    options: CustomerQueryOptions | undefined,
    workspaceId: string,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const take = options?.take ?? this.defaults.take;

    // Handle take <= 0: return empty array
    if (take <= 0) {
      return [];
    }

    const repository = await this.customerRepository.getRepository(workspaceId);

    return repository.find({
      where: { tier, deletedAt: IsNull() },
      relations: ['customerNotes'],
      take,
      skip: options?.skip ?? this.defaults.skip,
      order: { totalOrderValue: 'DESC' },
    });
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count all customers
   */
  async countAll(workspaceId: string): Promise<number> {
    return this.customerRepository.countCustomers(workspaceId);
  }

  /**
   * Count customers by status
   */
  async countByStatus(status: string, workspaceId: string): Promise<number> {
    const repository = await this.customerRepository.getRepository(workspaceId);

    return repository.count({
      where: { status, deletedAt: IsNull() },
    });
  }

  /**
   * Count customers by tier
   */
  async countByTier(tier: string, workspaceId: string): Promise<number> {
    const repository = await this.customerRepository.getRepository(workspaceId);

    return repository.count({
      where: { tier, deletedAt: IsNull() },
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
  ): Promise<ServiceCustomerResult<{ customerId: string }>> {
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
  ): Promise<ServiceCustomerResult<{ customerId: string; status: string }>> {
    const repository = await this.customerRepository.getRepository();

    // Find including soft-deleted
    const customer = await repository.findOne({
      where: { id: customerId },
      withDeleted: true,
    });

    if (!customer) {
      throw new NotFoundException(
        CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId),
      );
    }

    // Check if customer is actually deleted
    if (!customer.deletedAt) {
      return {
        success: false,
        error: CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_DELETED(customerId),
      };
    }

    // Restore by setting deletedAt to null
    await repository.update(customerId, { deletedAt: null });

    this.logger.log(`Restored customer: ${customerId}`);

    return {
      success: true,
      data: {
        customerId: customer.id,
        status: customer.status,
      },
    };
  }

  // ============================================
  // MAPPING OPERATIONS
  // ============================================

  /**
   * Map entity to output DTO
   *
   * Maps all fields from mktCustomer table to CustomerOutput
   * Date fields are converted to ISO 8601 strings using DateTimeUtils
   */
  mapCustomerToOutput(customer: MktCustomerWorkspaceEntity): CustomerOutput {
    return {
      // Basic Info
      id: customer.id,
      mktCustomerCode: customer.mktCustomerCode,
      name: customer.name,
      email: customer.email ?? undefined,
      phone: customer.phone ?? undefined,
      citizenId: customer.citizenId ?? undefined,
      type: customer.type ?? undefined,

      // Business Info
      companyName: customer.companyName ?? undefined,
      taxCode: customer.taxCode ?? undefined,
      address: customer.address ?? undefined,
      companySize: customer.companySize ?? undefined,
      industry: customer.industry ?? undefined,
      contactPosition: customer.contactPosition ?? undefined,
      contactDepartment: customer.contactDepartment ?? undefined,

      // Status & Tier
      status: customer.status,
      tier: customer.tier,
      lastTierUpgradeAt: this.dateToISOString(customer.lastTierUpgradeAt),
      lifecycleStage: customer.lifecycleStage,

      // Analytics - Currency (Float)
      totalOrderValue: customer.totalOrderValue ?? undefined,
      customerLtv: customer.customerLtv ?? undefined,

      // Analytics - Integers
      licensesCount: customer.licensesCount ?? undefined,
      totalOrderCount: customer.totalOrderCount ?? undefined,
      churnRiskScore: customer.churnRiskScore ?? undefined,
      engagementScore: customer.engagementScore ?? undefined,

      // Dates - ISO 8601 String
      registrationDate: this.dateToISOString(customer.registrationDate),
      firstPurchase: this.dateToISOString(customer.firstPurchase),
      lastPurchase: this.dateToISOString(customer.lastPurchase),
      assignedDate: this.dateToISOString(customer.assignedDate),
      assignedReason: customer.assignedReason ?? undefined,
      createdAt: this.dateToISOString(customer.createdAt),
      updatedAt: this.dateToISOString(customer.updatedAt),

      // Relations
      accountOwnerId: customer.accountOwnerId ?? undefined,
      supportOwnerId: customer.supportOwnerId ?? undefined,

      // Created By
      createdBySource: customer.createdBy?.source ?? undefined,
      createdByName: customer.createdBy?.name ?? undefined,
      createdByWorkspaceMemberId:
        customer.createdBy?.workspaceMemberId ?? undefined,

      // Linked Accounts
      linkedAccounts: customer.linkedAccounts ?? undefined,

      // Customer Notes
      customerNotes: this.mapCustomerNotesToOutput(customer.customerNotes),
    };
  }

  /**
   * Map customer notes entity array to output DTO array
   */
  private mapCustomerNotesToOutput(
    notes: MktCustomerNoteWorkspaceEntity[] | null | undefined,
  ): CustomerNoteOutput[] | undefined {
    if (!notes || notes.length === 0) {
      return undefined;
    }

    return notes.map((note) => ({
      id: note.id,
      content: note.content,
      noteType: note.noteType,
      customerId: note.customerId,
      createdAt: this.dateToISOString(note.createdAt) ?? '',
      updatedAt: this.dateToISOString(note.updatedAt) ?? '',
    }));
  }

  /**
   * Safely convert Date to ISO string using DateTimeUtils
   * Handles both Date objects and existing ISO strings
   */
  private dateToISOString(
    date: Date | string | null | undefined,
  ): string | undefined {
    if (!date) {
      return undefined;
    }

    // If already a string (ISO format), return as-is
    if (typeof date === 'string') {
      return date;
    }

    // Date object - convert using DateTimeUtils
    return DateTimeUtils.toISO(DateTimeUtils.fromDate(date));
  }
}
