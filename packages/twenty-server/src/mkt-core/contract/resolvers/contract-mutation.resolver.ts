/**
 * ContractMutationResolver - GraphQL resolver for Contract mutations
 *
 * Access Control (enforced by @RequireContractAccess):
 * - Finance/Accounting Department: Full access
 * - Executive (levels 1-3): Full access
 * - Other roles: 403 Forbidden
 *
 * Provides mutations for:
 * - createContract: Create a new contract
 * - updateContract: Update an existing contract
 * - updateContractStatus: Update contract status
 * - deleteContract: Soft delete a contract
 * - restoreContract: Restore a soft deleted contract
 *
 * Architecture: Thin resolver - delegates business logic to MktContractService
 */

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { CONTRACT_DATA_SCOPE } from 'src/mkt-core/contract/constants';
import {
  CONTRACT_MUTATION_DESCRIPTIONS,
  CONTRACT_RESPONSE_MESSAGES,
} from 'src/mkt-core/contract/messages';
import {
  RequireContractWriteAccess,
  RequireContractDeleteAccess,
} from 'src/mkt-core/contract/decorators';
import {
  CreateContractInput,
  UpdateContractInput,
  UpdateContractStatusInput,
  CreateContractResponseDto,
  UpdateContractResponseDto,
  UpdateContractStatusResponseDto,
  DeleteContractResponseDto,
  RestoreContractResponseDto,
} from 'src/mkt-core/contract/dto';
import { MktContractService } from 'src/mkt-core/contract/services/mkt-contract.service';
import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';

/**
 * ContractMutationResolver - GraphQL resolver for Contract mutations with RBAC
 *
 * Access rules:
 * - Only Finance/Accounting and Executive (levels 1-3) can access
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class ContractMutationResolver {
  constructor(private readonly contractService: MktContractService) {}

  /**
   * Create a new contract
   */
  @Mutation(() => CreateContractResponseDto, {
    description: CONTRACT_MUTATION_DESCRIPTIONS.CREATE_CONTRACT,
  })
  @RequireContractWriteAccess()
  @DataScope(CONTRACT_DATA_SCOPE.MUTATION_CREATE)
  async createContract(
    @Args('input') input: CreateContractInput,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ): Promise<CreateContractResponseDto> {
    const result = await this.contractService.createContractFromInput({
      ...input,
      workspaceMemberId,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      contractId: result.data.contractId,
      contractNumber: result.data.contractNumber,
      status: result.data.status,
    };
  }

  /**
   * Update an existing contract
   */
  @Mutation(() => UpdateContractResponseDto, {
    description: CONTRACT_MUTATION_DESCRIPTIONS.UPDATE_CONTRACT,
  })
  @RequireContractWriteAccess()
  @DataScope(CONTRACT_DATA_SCOPE.MUTATION_UPDATE)
  async updateContract(
    @Args('input') input: UpdateContractInput,
  ): Promise<UpdateContractResponseDto> {
    const result = await this.contractService.updateContractFromInput(input);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      contractId: result.data.contractId,
      previousStatus: result.data.previousStatus,
      newStatus: result.data.newStatus,
    };
  }

  /**
   * Update contract status
   */
  @Mutation(() => UpdateContractStatusResponseDto, {
    description: CONTRACT_MUTATION_DESCRIPTIONS.UPDATE_CONTRACT_STATUS,
  })
  @RequireContractWriteAccess()
  @DataScope(CONTRACT_DATA_SCOPE.MUTATION_UPDATE)
  async updateContractStatus(
    @Args('input') input: UpdateContractStatusInput,
  ): Promise<UpdateContractStatusResponseDto> {
    const result = await this.contractService.updateStatus(
      input.id,
      input.status,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      contractId: result.data.contractId,
      previousStatus: result.data.previousStatus,
      newStatus: result.data.newStatus,
      message: CONTRACT_RESPONSE_MESSAGES.SUCCESS.STATUS_UPDATED(
        result.data.previousStatus,
        result.data.newStatus,
      ),
    };
  }

  /**
   * Soft delete a contract
   */
  @Mutation(() => DeleteContractResponseDto, {
    description: CONTRACT_MUTATION_DESCRIPTIONS.DELETE_CONTRACT,
  })
  @RequireContractDeleteAccess()
  @DataScope(CONTRACT_DATA_SCOPE.MUTATION_DELETE)
  async deleteContract(
    @Args('contractId', { type: () => String }) contractId: string,
  ): Promise<DeleteContractResponseDto> {
    const result = await this.contractService.softDelete(contractId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      contractId: result.data.contractId,
      message: CONTRACT_RESPONSE_MESSAGES.SUCCESS.CONTRACT_DELETED,
    };
  }

  /**
   * Restore a soft deleted contract
   */
  @Mutation(() => RestoreContractResponseDto, {
    description: CONTRACT_MUTATION_DESCRIPTIONS.RESTORE_CONTRACT,
  })
  @RequireContractWriteAccess()
  @DataScope(CONTRACT_DATA_SCOPE.MUTATION_RESTORE)
  async restoreContract(
    @Args('contractId', { type: () => String }) contractId: string,
  ): Promise<RestoreContractResponseDto> {
    const result = await this.contractService.restore(contractId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      contractId: result.data.contractId,
      status: result.data.status,
    };
  }
}
