import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  CreatePaymentInputDto,
  UpdatePaymentInputDto,
} from 'src/mkt-core/payment/dto/payment.input';
import {
  CreatePaymentResponseDto,
  UpdatePaymentResponseDto,
} from 'src/mkt-core/payment/dto/payment.output';
import { MktPaymentService } from 'src/mkt-core/payment/services/mkt-payment.service';

/**
 * PaymentMutationResolver - GraphQL resolver for payment mutations
 *
 * Thin resolver that delegates to MktPaymentService for business logic.
 *
 * Responsibilities:
 * - Authentication & Authorization (Guards)
 * - Delegation to services for business logic
 *
 * Provides mutations for:
 * - createPayment: Create new payment with auto-prepared data
 * - updatePayment: Update payment with QR code regeneration logic
 */
@Resolver()
export class PaymentMutationResolver {
  constructor(private readonly mktPaymentService: MktPaymentService) {}

  /**
   * Create a new payment
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => CreatePaymentResponseDto, {
    description: 'Create a new payment with auto-prepared data from order',
  })
  async createPayment(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() _workspaceMemberId: string | undefined,
    @Args('input') input: CreatePaymentInputDto,
  ): Promise<CreatePaymentResponseDto> {
    return this.mktPaymentService.createPaymentMutation(workspace.id, input);
  }

  /**
   * Update a payment
   */
  @UseGuards(WorkspaceAuthGuard, UserAuthGuard)
  @Mutation(() => UpdatePaymentResponseDto, {
    description: 'Update a payment with QR code regeneration logic',
  })
  async updatePayment(
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() _workspaceMemberId: string | undefined,
    @Args('input') input: UpdatePaymentInputDto,
  ): Promise<UpdatePaymentResponseDto> {
    return this.mktPaymentService.updatePaymentMutation(workspace.id, input);
  }
}
