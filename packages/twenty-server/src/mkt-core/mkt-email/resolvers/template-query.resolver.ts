/**
 * TemplateQueryResolver - GraphQL resolver for Template queries
 *
 * No RBAC decorators - templates are workspace-level shared resources.
 * Guards: WorkspaceAuthGuard + UserAuthGuard for authentication only.
 *
 * Architecture: Thin resolver - delegates to MktTemplateRepository directly
 */

import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { TemplateOutput, TemplateListOutput } from 'src/mkt-core/mkt-email/dto';
import { TEMPLATE_QUERY_DESCRIPTIONS } from 'src/mkt-core/mkt-email/messages';
import { MktTemplateRepository } from 'src/mkt-core/mkt-email/repositories';
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/mkt-email/workspace-entities';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class TemplateQueryResolver {
  constructor(private readonly templateRepository: MktTemplateRepository) {}

  /**
   * Get template by ID
   */
  @Query(() => TemplateOutput, {
    description: TEMPLATE_QUERY_DESCRIPTIONS.GET_TEMPLATE_BY_ID,
    nullable: true,
  })
  async getTemplateById(
    @Args('templateId', { type: () => String }) templateId: string,
  ): Promise<TemplateOutput | null> {
    const template = await this.templateRepository.findById(templateId);

    return template ? this.mapToOutput(template) : null;
  }

  /**
   * Get all templates with pagination
   */
  @Query(() => TemplateListOutput, {
    description: TEMPLATE_QUERY_DESCRIPTIONS.GET_ALL_TEMPLATES,
  })
  async getTemplates(
    @Args('take', { type: () => Number, nullable: true, defaultValue: 50 })
    take: number,
    @Args('skip', { type: () => Number, nullable: true, defaultValue: 0 })
    skip: number,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<TemplateListOutput> {
    const templates = await this.templateRepository.findAllWithOptions(
      workspace.id,
      { limit: take, offset: skip },
    );

    return {
      templates: templates.map((t) => this.mapToOutput(t)),
      totalCount: templates.length,
    };
  }

  /**
   * Get templates by type
   */
  @Query(() => TemplateListOutput, {
    description: TEMPLATE_QUERY_DESCRIPTIONS.GET_TEMPLATES_BY_TYPE,
  })
  async getTemplatesByType(
    @Args('type', { type: () => String }) type: string,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<TemplateListOutput> {
    const templates = await this.templateRepository.findByType(
      workspace.id,
      type,
    );

    return {
      templates: templates.map((t) => this.mapToOutput(t)),
      totalCount: templates.length,
    };
  }

  /**
   * Get template by template key
   */
  @Query(() => TemplateOutput, {
    description: TEMPLATE_QUERY_DESCRIPTIONS.GET_TEMPLATE_BY_KEY,
    nullable: true,
  })
  async getTemplateByKey(
    @Args('templateKey', { type: () => String }) templateKey: string,
  ): Promise<TemplateOutput | null> {
    const template = await this.templateRepository.findByKey(templateKey);

    return template ? this.mapToOutput(template) : null;
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Map template entity to output DTO
   */
  private mapToOutput(template: MktTemplateWorkspaceEntity): TemplateOutput {
    return {
      id: template.id,
      name: template.name ?? undefined,
      type: template.type ?? undefined,
      templateKey: template.templateKey ?? undefined,
      subject: template.subject ?? undefined,
      content: template.content ?? undefined,
      version: template.version ?? undefined,
      locale: template.locale ?? undefined,
      isActive: template.isActive,
      position: template.position ?? undefined,
      accountOwnerId: template.accountOwnerId ?? undefined,
      createdAt: template.createdAt?.toString(),
      updatedAt: template.updatedAt?.toString(),
    };
  }
}
