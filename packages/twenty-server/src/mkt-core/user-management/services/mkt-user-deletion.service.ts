import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';

import { User } from 'src/engine/core-modules/user/user.entity';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';

@Injectable()
export class MktUserDeletionService {
  private readonly logger = new Logger(MktUserDeletionService.name);

  constructor(
    @InjectDataSource('core')
    private readonly coreDataSource: DataSource,
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserWorkspace, 'core')
    private readonly userWorkspaceRepository: Repository<UserWorkspace>,
    @InjectRepository(RoleTargetsEntity, 'core')
    private readonly roleTargetsRepository: Repository<RoleTargetsEntity>,
  ) {}

  /**
   * Delete user workspace with transaction wrapper
   * Ensures atomic operation - either all deletions succeed or all rollback
   */
  async deleteUserWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    const userWorkspace = await this.userWorkspaceRepository.findOne({
      where: { userId, workspaceId },
    });

    if (!userWorkspace) {
      this.logger.warn(
        `User workspace not found for user ${userId} in workspace ${workspaceId}`,
      );

      return;
    }

    // Use transaction to ensure atomic deletion
    await this.coreDataSource.transaction(
      async (transactionalEntityManager) => {
        // Delete role targets first (hard delete - RoleTargetsEntity doesn't support soft delete)
        // This is a junction table, so hard delete is acceptable
        await transactionalEntityManager.delete(RoleTargetsEntity, {
          userWorkspaceId: userWorkspace.id,
          workspaceId,
        });

        // Soft delete user workspace (has deletedAt column)
        await transactionalEntityManager.softDelete(UserWorkspace, {
          id: userWorkspace.id,
        });

        this.logger.log(`Soft deleted user workspace for user: ${userId}`);
      },
    );
  }

  /**
   * Soft delete user if they have no remaining workspaces
   * Uses transaction to ensure atomic check-and-delete operation
   */
  async softDeleteUserIfNoWorkspaces(userId: string): Promise<void> {
    await this.coreDataSource.transaction(
      async (transactionalEntityManager) => {
        // Query within transaction to ensure consistency
        const remainingUserWorkspaces = await transactionalEntityManager.find(
          UserWorkspace,
          {
            where: { userId },
          },
        );

        if (remainingUserWorkspaces.length === 0) {
          await transactionalEntityManager.softDelete(User, { id: userId });
          this.logger.log(`Soft deleted user: ${userId}`);
        } else {
          this.logger.log(
            `User ${userId} still has ${remainingUserWorkspaces.length} workspaces`,
          );
        }
      },
    );
  }
}
