/**
 * OrganizationLevelMutationResolver - GraphQL resolver for Organization Level CRUD mutations
 *
 * Thay thế các pre-query hooks:
 * - createOrganizationLevel: Tạo organization level với full validation
 * - updateOrganizationLevel: Cập nhật organization level với full validation
 * - deleteOrganizationLevel: Xóa organization level với full validation
 *
 * Auto-generated queries (findMany, findOne) vẫn hoạt động bình thường.
 */

import { Logger, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { OrganizationLevelService } from 'src/mkt-core/mkt-organization-level/services/organization-level.service';
import {
  CreateOrganizationLevelInput,
  UpdateOrganizationLevelInput,
  DeleteOrganizationLevelInput,
  OrganizationLevelMutationResponse,
} from 'src/mkt-core/mkt-organization-level/graphql-types';
import {
  MKT_ORGANIZATION_LEVEL_LOG_CONTEXT,
  ORGANIZATION_LEVEL_MESSAGES,
} from 'src/mkt-core/mkt-organization-level/messages';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class OrganizationLevelMutationResolver {
  private readonly logger = new Logger(
    `${MKT_ORGANIZATION_LEVEL_LOG_CONTEXT}:MutationResolver`,
  );

  constructor(
    private readonly organizationLevelService: OrganizationLevelService,
  ) {}

  // ============================================
  // CREATE MUTATION
  // ============================================

  /**
   * Tạo organization level mới
   *
   * Bao gồm full validation:
   * - Validate level code uniqueness
   * - Validate parent level (exists, active, correct hierarchy)
   * - Validate hierarchy structure
   */
  @Mutation(() => OrganizationLevelMutationResponse, {
    description: 'Create a new organization level',
  })
  async createOrganizationLevel(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input') input: CreateOrganizationLevelInput,
  ): Promise<OrganizationLevelMutationResponse> {
    this.logger.log(
      ORGANIZATION_LEVEL_MESSAGES.LOG.CREATE_START(input.levelCode),
    );

    try {
      const result =
        await this.organizationLevelService.createOrganizationLevel(
          workspaceId,
          input,
        );

      return {
        success: true,
        organizationLevelId: result.id,
        organizationLevel: result,
      };
    } catch (error) {
      this.logger.error(`Create failed: ${(error as Error).message}`);

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ============================================
  // UPDATE MUTATION
  // ============================================

  /**
   * Cập nhật organization level
   *
   * Bao gồm full validation:
   * - Validate level code uniqueness (if changed)
   * - Validate hierarchy level changes (check child levels)
   * - Validate parent level changes (with circular reference check)
   * - Validate activation/deactivation (check children/parent active status)
   */
  @Mutation(() => OrganizationLevelMutationResponse, {
    description: 'Update an existing organization level',
  })
  async updateOrganizationLevel(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('id') id: string,
    @Args('input') input: UpdateOrganizationLevelInput,
  ): Promise<OrganizationLevelMutationResponse> {
    this.logger.log(ORGANIZATION_LEVEL_MESSAGES.LOG.UPDATE_START(id));

    try {
      const result =
        await this.organizationLevelService.updateOrganizationLevel(
          workspaceId,
          id,
          input,
        );

      return {
        success: true,
        organizationLevelId: id,
        organizationLevel: result,
      };
    } catch (error) {
      this.logger.error(`Update failed: ${(error as Error).message}`);

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ============================================
  // DELETE MUTATION
  // ============================================

  /**
   * Xóa organization level
   *
   * Bao gồm full validation:
   * - Check no child levels exist
   * - Check no workspace members assigned
   * - Check not the last active level
   */
  @Mutation(() => OrganizationLevelMutationResponse, {
    description: 'Delete an organization level',
  })
  async deleteOrganizationLevel(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input') input: DeleteOrganizationLevelInput,
  ): Promise<OrganizationLevelMutationResponse> {
    this.logger.log(ORGANIZATION_LEVEL_MESSAGES.LOG.DELETE_START(input.id));

    try {
      await this.organizationLevelService.deleteOrganizationLevel(
        workspaceId,
        input.id,
      );

      return {
        success: true,
        organizationLevelId: input.id,
      };
    } catch (error) {
      this.logger.error(`Delete failed: ${(error as Error).message}`);

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
