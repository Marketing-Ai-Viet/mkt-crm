import { Injectable, Logger } from '@nestjs/common';

import { MktUserDeletionService } from 'src/mkt-core/user-management/services/mkt-user-deletion.service';

@Injectable()
export class MktUserCleanupService {
  private readonly logger = new Logger(MktUserCleanupService.name);

  constructor(
    private readonly mktUserDeletionService: MktUserDeletionService,
  ) {}

  async cleanupOnError(
    coreUserId: string | undefined,
    userWorkspaceId: string | undefined,
    workspaceId: string,
  ): Promise<void> {
    this.logger.error('Failed to create user, performing cleanup');

    if (userWorkspaceId && coreUserId) {
      try {
        await this.mktUserDeletionService.deleteUserWorkspace(
          coreUserId,
          workspaceId,
        );
      } catch (cleanupError) {
        this.logger.error('Failed to cleanup user workspace', cleanupError);
      }
    }

    if (coreUserId) {
      try {
        await this.mktUserDeletionService.softDeleteUserIfNoWorkspaces(
          coreUserId,
        );
      } catch (cleanupError) {
        this.logger.error('Failed to cleanup core user', cleanupError);
      }
    }
  }
}
