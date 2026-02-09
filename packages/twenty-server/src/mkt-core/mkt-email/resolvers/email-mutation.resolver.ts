/**
 * EmailMutationResolver - GraphQL resolver for Email mutations
 *
 * No RBAC decorators - emails are workspace-level shared resources.
 * Guards: WorkspaceAuthGuard + UserAuthGuard for authentication only.
 *
 * Architecture: Thin resolver - delegates to MktEmailRepository directly
 */

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { MKT_EMAIL_STATUS } from 'src/mkt-core/mkt-email/constants/mkt-email.constant';
import {
  CreateEmailInput,
  UpdateEmailInput,
  CreateEmailResponseDto,
  UpdateEmailResponseDto,
  DeleteEmailResponseDto,
} from 'src/mkt-core/mkt-email/dto';
import {
  EMAIL_MUTATION_DESCRIPTIONS,
  EMAIL_RESPONSE_MESSAGES,
} from 'src/mkt-core/mkt-email/messages';
import { MktEmailRepository } from 'src/mkt-core/mkt-email/repositories';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class EmailMutationResolver {
  constructor(private readonly emailRepository: MktEmailRepository) {}

  /**
   * Create a new email
   */
  @Mutation(() => CreateEmailResponseDto, {
    description: EMAIL_MUTATION_DESCRIPTIONS.CREATE_EMAIL,
  })
  async createEmail(
    @Args('input') input: CreateEmailInput,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ): Promise<CreateEmailResponseDto> {
    try {
      const email = await this.emailRepository.createEmail({
        subject: input.subject,
        to: input.to,
        from: input.from,
        body: input.body,
        emailType: input.emailType,
        status: MKT_EMAIL_STATUS.DRAFT,
        accountOwnerId: input.accountOwnerId ?? workspaceMemberId,
      });

      return {
        success: true,
        emailId: email.id,
        status: MKT_EMAIL_STATUS.DRAFT,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : EMAIL_RESPONSE_MESSAGES.FAILURE.CREATE_FAILED,
      };
    }
  }

  /**
   * Update an existing email
   */
  @Mutation(() => UpdateEmailResponseDto, {
    description: EMAIL_MUTATION_DESCRIPTIONS.UPDATE_EMAIL,
  })
  async updateEmail(
    @Args('input') input: UpdateEmailInput,
  ): Promise<UpdateEmailResponseDto> {
    try {
      const { id, ...updateData } = input;

      await this.emailRepository.updateEmail(id, updateData);

      return {
        success: true,
        emailId: id,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : EMAIL_RESPONSE_MESSAGES.FAILURE.UPDATE_FAILED,
      };
    }
  }

  /**
   * Soft delete an email
   */
  @Mutation(() => DeleteEmailResponseDto, {
    description: EMAIL_MUTATION_DESCRIPTIONS.DELETE_EMAIL,
  })
  async deleteEmail(
    @Args('emailId', { type: () => String }) emailId: string,
  ): Promise<DeleteEmailResponseDto> {
    try {
      await this.emailRepository.softDeleteEmail(emailId);

      return {
        success: true,
        emailId,
        message: EMAIL_RESPONSE_MESSAGES.SUCCESS.EMAIL_DELETED,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : EMAIL_RESPONSE_MESSAGES.FAILURE.DELETE_FAILED,
      };
    }
  }
}
