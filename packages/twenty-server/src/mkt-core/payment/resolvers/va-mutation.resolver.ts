/**
 * VA Mutation Resolver
 *
 * GraphQL resolver for Virtual Account mutations.
 * Thin resolver that delegates to CreateVAUseCase for business logic.
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  CreateVAInputDto,
  DeactivateVAInputDto,
} from 'src/mkt-core/payment/dto/va.input';
import {
  CreateVAOutputDto,
  DeactivateVAOutputDto,
} from 'src/mkt-core/payment/dto/va.output';
import { CreateVAUseCase } from 'src/mkt-core/payment/application/use-cases';
import { MktVirtualAccountRepository } from 'src/mkt-core/payment/repositories';

/**
 * VAMutationResolver
 *
 * Provides GraphQL mutations for Virtual Account operations:
 * - createVirtualAccount: Create new VA for an order
 * - deactivateVirtualAccount: Deactivate an existing VA
 *
 * Guards:
 * - WorkspaceAuthGuard: Ensures valid workspace context
 * - UserAuthGuard: Ensures authenticated user
 */
@Resolver()
export class VAMutationResolver {
  constructor(
    private readonly createVAUseCase: CreateVAUseCase,
    private readonly vaRepository: MktVirtualAccountRepository,
  ) {}

  /**
   * Create a new Virtual Account for an order
   *
   * If an active VA already exists for the order, returns that VA instead
   * (unless forceCreate is true).
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => CreateVAOutputDto, {
    description: 'Create a new Virtual Account for an order',
  })
  async createVirtualAccount(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: CreateVAInputDto,
  ): Promise<CreateVAOutputDto> {
    const result = await this.createVAUseCase.execute({
      orderId: input.orderId,
      workspaceId: workspace.id,
      expiryHours: input.expiryHours,
      forceCreate: input.forceCreate,
    });

    // Map use case output to GraphQL output
    return {
      success: result.success,
      message: result.message,
      status: result.status,
      vaDetails: result.vaDetails
        ? {
            id: result.vaDetails.id,
            vaNumber: result.vaDetails.vaNumber,
            bankCode: result.vaDetails.bankCode,
            bankName: result.vaDetails.bankName,
            accountName: result.vaDetails.accountName,
            amount: result.vaDetails.amount,
            qrCodeUrl: result.vaDetails.qrCodeUrl,
            expiresAt: result.vaDetails.expiresAt,
            provider: result.vaDetails.provider,
          }
        : undefined,
      error: result.error,
      isExisting: result.status === 'ALREADY_EXISTS',
    };
  }

  /**
   * Deactivate a Virtual Account
   *
   * Use this to manually deactivate a VA before it expires.
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => DeactivateVAOutputDto, {
    description: 'Deactivate a Virtual Account',
  })
  async deactivateVirtualAccount(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: DeactivateVAInputDto,
  ): Promise<DeactivateVAOutputDto> {
    try {
      // Find the VA (workspace context is handled by the request scope)
      const va = await this.vaRepository.findById(input.vaId);

      if (!va) {
        return {
          success: false,
          message: 'Virtual Account not found',
          error: `VA with ID ${input.vaId} does not exist`,
        };
      }

      if (!va.isActive) {
        return {
          success: true,
          message: 'Virtual Account is already inactive',
        };
      }

      // Deactivate the VA
      await this.vaRepository.deactivate(input.vaId);

      return {
        success: true,
        message: 'Virtual Account deactivated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to deactivate Virtual Account',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Deactivate VA by ID (simplified mutation)
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Deactivate a Virtual Account by ID',
  })
  async deactivateVA(
    @AuthWorkspace() _workspace: Workspace,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    try {
      await this.vaRepository.deactivate(id);

      return true;
    } catch {
      return false;
    }
  }
}
