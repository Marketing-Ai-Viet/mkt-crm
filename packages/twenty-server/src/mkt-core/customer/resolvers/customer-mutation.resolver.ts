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
import { MktCustomerService } from 'src/mkt-core/customer/services/mkt-customer.service';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
} from 'src/mkt-core/customer/dto/customer-crud.input';
import {
  CreateCustomerResponseDto,
  UpdateCustomerResponseDto,
  DeleteCustomerResponseDto,
  RestoreCustomerResponseDto,
} from 'src/mkt-core/customer/dto/customer-crud.output';

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
