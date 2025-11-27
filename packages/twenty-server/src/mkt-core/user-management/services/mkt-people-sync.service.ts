import { Injectable, Logger } from '@nestjs/common';

import { WorkspaceCacheStorageService } from 'src/engine/workspace-cache-storage/workspace-cache-storage.service';
import { MktPeopleSyncCoreService } from 'src/mkt-core/user-management/services/mkt-people-sync-core.service';

@Injectable()
export class MktPeopleSyncService {
  private readonly logger = new Logger(MktPeopleSyncService.name);

  constructor(
    private readonly mktPeopleSyncCoreService: MktPeopleSyncCoreService,
    private readonly workspaceCacheStorageService: WorkspaceCacheStorageService,
  ) {}

  async syncPeopleToUsers(workspaceId: string): Promise<void> {
    this.logger.log(`Starting people sync for workspace: ${workspaceId}`);

    try {
      await this.mktPeopleSyncCoreService.syncPeopleToUsers(workspaceId);
      await this.workspaceCacheStorageService.flush(workspaceId, undefined);
      this.logger.log(`Completed people sync for workspace: ${workspaceId}`);
    } catch (error) {
      this.logger.error(
        `Error during people sync for workspace ${workspaceId}:`,
        error,
      );
      throw error;
    }
  }
}
