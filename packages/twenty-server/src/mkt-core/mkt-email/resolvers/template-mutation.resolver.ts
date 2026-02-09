/**
 * TemplateMutationResolver - GraphQL resolver for Template mutations
 *
 * No RBAC decorators - templates are workspace-level shared resources.
 * Guards: WorkspaceAuthGuard + UserAuthGuard for authentication only.
 *
 * Architecture: Thin resolver - delegates to MktTemplateRepository directly
 */

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateTemplateResponseDto,
  UpdateTemplateResponseDto,
  ToggleTemplateActiveResponseDto,
  DeleteTemplateResponseDto,
} from 'src/mkt-core/mkt-email/dto';
import {
  TEMPLATE_MUTATION_DESCRIPTIONS,
  TEMPLATE_RESPONSE_MESSAGES,
} from 'src/mkt-core/mkt-email/messages';
import { MktTemplateRepository } from 'src/mkt-core/mkt-email/repositories';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class TemplateMutationResolver {
  constructor(private readonly templateRepository: MktTemplateRepository) {}

  /**
   * Create a new template
   */
  @Mutation(() => CreateTemplateResponseDto, {
    description: TEMPLATE_MUTATION_DESCRIPTIONS.CREATE_TEMPLATE,
  })
  async createTemplate(
    @Args('input') input: CreateTemplateInput,
  ): Promise<CreateTemplateResponseDto> {
    try {
      const template = await this.templateRepository.createEntity({
        name: input.name,
        type: input.type,
        templateKey: input.templateKey,
        subject: input.subject,
        content: input.content,
        version: input.version,
        locale: input.locale,
        accountOwnerId: input.accountOwnerId,
      });

      return {
        success: true,
        templateId: template.id,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : TEMPLATE_RESPONSE_MESSAGES.FAILURE.CREATE_FAILED,
      };
    }
  }

  /**
   * Update an existing template
   */
  @Mutation(() => UpdateTemplateResponseDto, {
    description: TEMPLATE_MUTATION_DESCRIPTIONS.UPDATE_TEMPLATE,
  })
  async updateTemplate(
    @Args('input') input: UpdateTemplateInput,
  ): Promise<UpdateTemplateResponseDto> {
    try {
      const { id, ...updateData } = input;

      await this.templateRepository.update(id, updateData);

      return {
        success: true,
        templateId: id,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : TEMPLATE_RESPONSE_MESSAGES.FAILURE.UPDATE_FAILED,
      };
    }
  }

  /**
   * Toggle template active status
   */
  @Mutation(() => ToggleTemplateActiveResponseDto, {
    description: TEMPLATE_MUTATION_DESCRIPTIONS.TOGGLE_TEMPLATE_ACTIVE,
  })
  async toggleTemplateActive(
    @Args('templateId', { type: () => String }) templateId: string,
    @Args('isActive', { type: () => Boolean }) isActive: boolean,
  ): Promise<ToggleTemplateActiveResponseDto> {
    try {
      if (isActive) {
        await this.templateRepository.activate(templateId);
      } else {
        await this.templateRepository.deactivate(templateId);
      }

      return {
        success: true,
        templateId,
        isActive,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : TEMPLATE_RESPONSE_MESSAGES.FAILURE.TOGGLE_FAILED,
      };
    }
  }

  /**
   * Soft delete a template
   */
  @Mutation(() => DeleteTemplateResponseDto, {
    description: TEMPLATE_MUTATION_DESCRIPTIONS.DELETE_TEMPLATE,
  })
  async deleteTemplate(
    @Args('templateId', { type: () => String }) templateId: string,
  ): Promise<DeleteTemplateResponseDto> {
    try {
      await this.templateRepository.softDelete(templateId);

      return {
        success: true,
        templateId,
        message: TEMPLATE_RESPONSE_MESSAGES.SUCCESS.TEMPLATE_DELETED,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : TEMPLATE_RESPONSE_MESSAGES.FAILURE.DELETE_FAILED,
      };
    }
  }
}
