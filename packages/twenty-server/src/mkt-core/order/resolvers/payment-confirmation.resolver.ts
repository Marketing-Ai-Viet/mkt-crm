/**
 * PaymentConfirmationResolver
 *
 * GraphQL resolver for payment confirmation operations.
 *
 * Permissions:
 * - confirmPaymentBySale: Requires 'confirm:sale' action
 * - confirmPaymentByAccounting: Requires 'confirm:accounting' action
 * - revokePaymentConfirmation: Requires 'confirm:revoke' action
 * - getPaymentConfirmationStatus: Requires 'view' action
 * - getPaymentConfirmationHistory: Requires 'view-history' action
 */

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { WorkspaceMember } from 'src/engine/core-modules/user/dtos/workspace-member.dto';
import { AuthWorkspaceMember } from 'src/engine/decorators/auth/auth-workspace-member.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { PAYMENT_CONFIRMATION_TYPE } from 'src/mkt-core/order/constants/confirmation-rules.constants';
import { PaymentConfirmationService } from 'src/mkt-core/order/services/domain/payment-confirmation.service';
import {
  ConfirmPaymentInputDto,
  RevokeConfirmationInputDto,
  ConfirmationResultOutput,
  OrderConfirmationStatusOutput,
  ConfirmationHistoryOutput,
  ActorInfoOutput,
} from 'src/mkt-core/order/dto/payment-confirmation.dto';
import { ConfirmationActorMetadata } from 'src/mkt-core/order/types/payment-confirmation.types';

/**
 * PaymentConfirmationResolver
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class PaymentConfirmationResolver {
  constructor(
    private readonly paymentConfirmationService: PaymentConfirmationService,
  ) {}

  /**
   * Sale confirms payment
   * Protects license from being auto-locked
   */
  @Mutation(() => ConfirmationResultOutput, {
    description:
      'Confirm payment by sale staff. Protects license from auto-lock.',
  })
  async confirmPaymentBySale(
    @Args('input') input: ConfirmPaymentInputDto,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMember() workspaceMember: WorkspaceMember,
  ): Promise<ConfirmationResultOutput> {
    const actor = this.buildActorMetadata(workspaceMember);

    const result = await this.paymentConfirmationService.confirmBySale(
      {
        orderId: input.orderId,
        idempotencyKey: input.idempotencyKey,
        note: input.note,
        metadata: input.metadata,
      },
      workspace.id,
      actor,
    );

    return this.mapToResultOutput(result, workspaceMember);
  }

  /**
   * Accounting confirms payment
   * May complete the order if payment is PAID
   */
  @Mutation(() => ConfirmationResultOutput, {
    description:
      'Confirm payment by accounting. May complete the order if payment is PAID.',
  })
  async confirmPaymentByAccounting(
    @Args('input') input: ConfirmPaymentInputDto,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMember() workspaceMember: WorkspaceMember,
  ): Promise<ConfirmationResultOutput> {
    const actor = this.buildActorMetadata(workspaceMember);

    const result = await this.paymentConfirmationService.confirmByAccounting(
      {
        orderId: input.orderId,
        idempotencyKey: input.idempotencyKey,
        note: input.note,
        metadata: input.metadata,
      },
      workspace.id,
      actor,
    );

    return this.mapToResultOutput(result, workspaceMember);
  }

  /**
   * Revoke payment confirmation
   *
   * WARNING: Revoking may cause order to be auto-locked if past deadline!
   */
  @Mutation(() => ConfirmationResultOutput, {
    description:
      'Revoke payment confirmation. WARNING: May cause auto-lock if past deadline!',
  })
  async revokePaymentConfirmation(
    @Args('input') input: RevokeConfirmationInputDto,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMember() workspaceMember: WorkspaceMember,
  ): Promise<ConfirmationResultOutput> {
    const actor = this.buildActorMetadata(workspaceMember);

    const result = await this.paymentConfirmationService.revokeConfirmation(
      {
        orderId: input.orderId,
        type: input.type,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
      },
      workspace.id,
      actor,
    );

    return this.mapToResultOutput(result, workspaceMember);
  }

  /**
   * Get current confirmation status
   */
  @Query(() => OrderConfirmationStatusOutput, {
    description: 'Get current confirmation status of an order',
  })
  async getPaymentConfirmationStatus(
    @Args('orderId') orderId: string,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<OrderConfirmationStatusOutput> {
    const status = await this.paymentConfirmationService.getConfirmationStatus(
      orderId,
      workspace.id,
    );

    return {
      orderId: status.orderId,
      saleConfirmed: status.saleConfirmed,
      saleConfirmedAt: status.saleConfirmedAt,
      saleConfirmedBy: status.saleConfirmedBy
        ? this.mapActorInfoOutput(status.saleConfirmedBy)
        : undefined,
      accountingConfirmed: status.accountingConfirmed,
      accountingConfirmedAt: status.accountingConfirmedAt,
      accountingConfirmedBy: status.accountingConfirmedBy
        ? this.mapActorInfoOutput(status.accountingConfirmedBy)
        : undefined,
      isProtectedFromAutoLock: status.isProtectedFromAutoLock,
      protectionReason: status.protectionReason,
    };
  }

  /**
   * Get confirmation history
   */
  @Query(() => ConfirmationHistoryOutput, {
    description: 'Get confirmation history of an order',
  })
  async getPaymentConfirmationHistory(
    @Args('orderId') orderId: string,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<ConfirmationHistoryOutput> {
    const history =
      await this.paymentConfirmationService.getConfirmationHistory(
        orderId,
        workspace.id,
      );

    return {
      orderId: history.orderId,
      confirmations: history.confirmations.map((c) => ({
        id: c.id,
        action: c.action,
        confirmedAt: c.confirmedAt,
        actor: this.mapActorInfoOutput(c.confirmedBy),
        note: c.note,
        reason: c.reason,
        metadata: c.metadata,
      })),
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private buildActorMetadata(
    workspaceMember: WorkspaceMember,
  ): ConfirmationActorMetadata {
    return {
      source: 'MANUAL',
      name: this.getFullName(workspaceMember),
      workspaceMemberId: workspaceMember.id,
    };
  }

  private getFullName(workspaceMember: WorkspaceMember): string {
    const firstName = workspaceMember.name?.firstName ?? '';
    const lastName = workspaceMember.name?.lastName ?? '';

    return `${firstName} ${lastName}`.trim() || 'Unknown';
  }

  private mapToResultOutput(
    result: {
      success: boolean;
      orderId: string;
      confirmedAt: string;
      type: PAYMENT_CONFIRMATION_TYPE;
      version: number;
      note?: string;
      impact?: {
        willBeLocked: boolean;
        reason: string;
        statusChanged?: boolean;
        previousStatus?: string;
        newStatus?: string;
      };
    },
    workspaceMember: WorkspaceMember,
  ): ConfirmationResultOutput {
    return {
      success: result.success,
      orderId: result.orderId,
      confirmedAt: result.confirmedAt,
      type: result.type,
      actor: {
        id: workspaceMember.id,
        name: this.getFullName(workspaceMember),
        email: undefined,
        role: undefined,
      },
      note: result.note,
      version: result.version,
      impact: result.impact
        ? {
            willBeLocked: result.impact.willBeLocked,
            reason: result.impact.reason,
            statusChanged: result.impact.statusChanged,
            previousStatus: result.impact.previousStatus,
            newStatus: result.impact.newStatus,
          }
        : undefined,
    };
  }

  private mapActorInfoOutput(actor: {
    id: string;
    name: string;
    email?: string;
    role?: string;
  }): ActorInfoOutput {
    return {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: actor.role,
    };
  }
}
