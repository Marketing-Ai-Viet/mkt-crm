/**
 * MktCustomerResolver - GraphQL resolver for Customer CRUD operations
 *
 * Access Control:
 * - Authenticated users with workspace access
 *
 * Provides:
 * - Queries: getCustomerById, getCustomerByCode, getCustomerByEmail, getCustomers, getCustomersByStatus, getCustomersByTier
 * - Mutations: createCustomer, updateCustomer, deleteCustomer, restoreCustomer
 */

import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
} from 'src/mkt-core/customer/dto/customer-crud.input';
import {
  CreateCustomerResponseDto,
  CustomerListOutput,
  CustomerOutput,
  DeleteCustomerResponseDto,
  RestoreCustomerResponseDto,
  UpdateCustomerResponseDto,
} from 'src/mkt-core/customer/dto/customer-crud.output';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktCustomerService } from 'src/mkt-core/customer/services/mkt-customer.service';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class MktCustomerResolver {
  constructor(private readonly customerService: MktCustomerService) {}

  // ============================================
  // QUERIES
  // ============================================

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
    @Args('take', { type: () => Int, nullable: true, defaultValue: 50 })
    take: number,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
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
    @Args('take', { type: () => Int, nullable: true, defaultValue: 50 })
    take: number,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
  ): Promise<CustomerListOutput> {
    const customers = await this.customerService.findByStatus(status, {
      take,
      skip,
    });

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
    @Args('take', { type: () => Int, nullable: true, defaultValue: 50 })
    take: number,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
  ): Promise<CustomerListOutput> {
    const customers = await this.customerService.findByTier(tier, {
      take,
      skip,
    });

    return {
      customers: customers.map((c) => this.mapToOutput(c)),
      totalCount: customers.length,
    };
  }

  // ============================================
  // MUTATIONS
  // ============================================

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
    try {
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
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
    try {
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Restore failed',
      };
    }
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
      createdById: customer.createdBy?.workspaceMemberId ?? undefined,
    };
  }

  /**
   * Safely convert Date to ISO string
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

    // If Date object, convert to ISO string
    if (date instanceof Date) {
      return date.toISOString();
    }

    return undefined;
  }
}
