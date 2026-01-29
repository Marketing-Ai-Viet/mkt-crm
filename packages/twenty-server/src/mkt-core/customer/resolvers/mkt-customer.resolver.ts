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
import {
  Args,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

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
import { GetPurchaseHistoryArgs } from 'src/mkt-core/customer/dto/purchase-history.args';
import {
  PurchasedProductOutput,
  PurchaseHistoryOutput,
} from 'src/mkt-core/customer/dto/purchase-history.dto';
import { MktCustomerPurchaseHistoryService } from 'src/mkt-core/customer/services/core/mkt-customer-purchase-history.service';
import { MktCustomerService } from 'src/mkt-core/customer/services/mkt-customer.service';

@Resolver(() => CustomerOutput)
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class MktCustomerResolver {
  constructor(
    private readonly customerService: MktCustomerService,
    private readonly purchaseHistoryService: MktCustomerPurchaseHistoryService,
  ) {}

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get customer by ID with customerNotes
   */
  @Query(() => CustomerOutput, {
    description: 'Get customer by ID',
    nullable: true,
  })
  async getCustomerById(
    @Args('customerId', { type: () => String }) customerId: string,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<CustomerOutput | null> {
    const customer = await this.customerService.findById(
      customerId,
      workspace.id,
    );

    if (!customer) {
      return null;
    }

    return this.customerService.mapCustomerToOutput(customer);
  }

  /**
   * Get customer by customer code with customerNotes
   */
  @Query(() => CustomerOutput, {
    description: 'Get customer by customer code',
    nullable: true,
  })
  async getCustomerByCode(
    @Args('customerCode', { type: () => String }) customerCode: string,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<CustomerOutput | null> {
    const customer = await this.customerService.findByCode(
      customerCode,
      workspace.id,
    );

    if (!customer) {
      return null;
    }

    return this.customerService.mapCustomerToOutput(customer);
  }

  /**
   * Get customer by email with customerNotes
   */
  @Query(() => CustomerOutput, {
    description: 'Get customer by email',
    nullable: true,
  })
  async getCustomerByEmail(
    @Args('email', { type: () => String }) email: string,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<CustomerOutput | null> {
    const customer = await this.customerService.findByEmail(
      email,
      workspace.id,
    );

    if (!customer) {
      return null;
    }

    return this.customerService.mapCustomerToOutput(customer);
  }

  /**
   * Get all customers with pagination and customerNotes
   */
  @Query(() => CustomerListOutput, {
    description: 'Get all customers with pagination',
  })
  async getCustomers(
    @Args('take', { type: () => Int, nullable: true, defaultValue: 50 })
    take: number,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<CustomerListOutput> {
    const [customers, totalCount] = await Promise.all([
      this.customerService.findAll({ take, skip }, workspace.id),
      this.customerService.countAll(workspace.id),
    ]);

    return {
      customers: customers.map((c) =>
        this.customerService.mapCustomerToOutput(c),
      ),
      totalCount,
    };
  }

  /**
   * Get customers by status with customerNotes
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
    @AuthWorkspace() workspace: Workspace,
  ): Promise<CustomerListOutput> {
    const [customers, totalCount] = await Promise.all([
      this.customerService.findByStatus(status, { take, skip }, workspace.id),
      this.customerService.countByStatus(status, workspace.id),
    ]);

    return {
      customers: customers.map((c) =>
        this.customerService.mapCustomerToOutput(c),
      ),
      totalCount,
    };
  }

  /**
   * Get customers by tier with customerNotes
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
    @AuthWorkspace() workspace: Workspace,
  ): Promise<CustomerListOutput> {
    const [customers, totalCount] = await Promise.all([
      this.customerService.findByTier(tier, { take, skip }, workspace.id),
      this.customerService.countByTier(tier, workspace.id),
    ]);

    return {
      customers: customers.map((c) =>
        this.customerService.mapCustomerToOutput(c),
      ),
      totalCount,
    };
  }

  /**
   * Get customer purchase history with pagination and filters
   */
  @Query(() => PurchaseHistoryOutput, {
    description: 'Get customer purchase history with pagination and filters',
  })
  async getCustomerPurchaseHistory(
    @Args() args: GetPurchaseHistoryArgs,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<PurchaseHistoryOutput> {
    return this.purchaseHistoryService.getPurchaseHistory(args, workspace.id);
  }

  // ============================================
  // FIELD RESOLVERS
  // ============================================

  /**
   * Resolve purchasedProducts field for CustomerOutput
   * Lazy-loaded only when client requests this field
   */
  @ResolveField(() => [PurchasedProductOutput], {
    nullable: true,
    description: 'Purchased products (lazy-loaded)',
  })
  async purchasedProducts(
    @Parent() customer: CustomerOutput,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<PurchasedProductOutput[]> {
    const result = await this.purchaseHistoryService.getPurchasedProducts(
      { customerId: customer.id },
      workspace.id,
    );

    return result.products;
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
}
