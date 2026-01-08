import { BadRequestException, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { DeleteOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { MktOrganizationLevelWorkspaceEntity } from 'src/mkt-core/mkt-organization-level/workspace-entity/mkt-organization-level.workspace-entity';
import { MktOrganizationLevelRepository } from 'src/mkt-core/mkt-organization-level/repositories/mkt-organization-level.repository';

@WorkspaceQueryHook('mktOrganizationLevel.deleteOne')
export class MktOrganizationLevelDeleteOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(
    MktOrganizationLevelDeleteOnePreQueryHook.name,
  );

  constructor(
    private readonly repository: MktOrganizationLevelRepository,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: DeleteOneResolverArgs,
  ): Promise<DeleteOneResolverArgs> {
    const recordId = payload?.id;
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!recordId || !workspaceId) {
      throw new BadRequestException('Invalid record ID or workspace context');
    }

    this.logger.log(
      `Validating organization level deletion for ID: ${recordId}`,
    );

    // Get current record
    const recordToDelete = await this.getCurrentRecord(recordId, workspaceId);

    // 1. Check if level has child levels
    await this.validateNoChildLevels(recordId, workspaceId);

    // 2. Check if level is assigned to any workspace members
    await this.validateNoAssignedMembers(recordId, workspaceId);

    // 3. Check if this is the last active level
    await this.validateNotLastActiveLevel(recordToDelete, workspaceId);

    this.logger.log(
      'Organization level deletion validation completed successfully',
    );

    return payload;
  }

  private async getCurrentRecord(
    recordId: string,
    workspaceId: string,
  ): Promise<MktOrganizationLevelWorkspaceEntity> {
    const record = await this.repository.findById(workspaceId, recordId);

    if (!record) {
      throw new BadRequestException(
        `Organization level with ID '${recordId}' not found`,
      );
    }

    return record;
  }

  private async validateNoChildLevels(
    recordId: string,
    workspaceId: string,
  ): Promise<void> {
    const childLevels = await this.repository.findByParentId(
      workspaceId,
      recordId,
    );

    if (childLevels.length > 0) {
      const childNames = childLevels.map((child) => child.levelName).join(', ');

      throw new BadRequestException(
        `Cannot delete organization level: it has ${childLevels.length} child level(s): ${childNames}. ` +
          'Please delete or reassign child levels first.',
      );
    }
  }

  private async validateNoAssignedMembers(
    recordId: string,
    workspaceId: string,
  ): Promise<void> {
    try {
      const employeeCount = await this.repository.countEmployeesAtLevel(
        workspaceId,
        recordId,
      );

      if (employeeCount > 0) {
        throw new BadRequestException(
          `Cannot delete organization level: it is assigned to ${employeeCount} workspace member(s). ` +
            'Please reassign these members to other levels first.',
        );
      }
    } catch (error) {
      // Nếu là BadRequestException, throw lại
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Các lỗi khác thì log warning và tiếp tục
      this.logger.warn(
        'Could not check workspace member assignments:',
        error.message,
      );
    }
  }

  private async validateNotLastActiveLevel(
    recordToDelete: MktOrganizationLevelWorkspaceEntity,
    workspaceId: string,
  ): Promise<void> {
    if (!recordToDelete.isActive) {
      return; // If already inactive, deletion is allowed
    }

    const activeCount = await this.repository.countActive(workspaceId);

    if (activeCount <= 1) {
      throw new BadRequestException(
        'Cannot delete the last active organization level. ' +
          'Please create another active level before deleting this one.',
      );
    }
  }
}
