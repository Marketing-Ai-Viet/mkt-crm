/**
 * Post-Query Hook Template
 *
 * Post-hooks run AFTER the query executes.
 * Use for: side effects, notifications, cascading operations
 *
 * IMPORTANT: Don't throw errors in post-hooks (will break main query)
 *
 * TODO:
 * 1. Replace 'YourEntity' with your entity name
 * 2. Replace 'yourEntity' with camelCase entity name
 * 3. Replace 'createOne' with the method
 * 4. Register this hook in your module providers
 */

import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';

// TODO: Import your entity and services
// import { MktYourEntityWorkspaceEntity } from '../objects/mkt-your-entity.workspace-entity';
// import { YourEntityService } from '../services/your-entity.service';
// import { NotificationService } from 'src/mkt-core/common/service/notification.service';

@Injectable()
@WorkspaceQueryHook({
  key: 'mktYourEntity.createOne', // TODO: Update hook key
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class MktYourEntityCreateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(
    MktYourEntityCreateOnePostQueryHook.name,
  );

  constructor(
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    // TODO: Inject services if needed
    // private readonly yourEntityService: YourEntityService,
    // private readonly notificationService: NotificationService,
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: unknown[], // TODO: Replace with your entity type array
  ): Promise<void> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      this.logger.warn('Workspace ID not found, skipping post-hook');
      return;
    }

    const created = payload?.[0];
    if (!created) {
      this.logger.warn('No created entity in payload');
      return;
    }

    try {
      this.logger.log(
        `Post-hook executing for entity: ${(created as { id: string }).id}`,
      );

      // Example: Create related entities
      // await this.createRelatedEntities(created, workspaceId);

      // Example: Send notifications
      // await this.notificationService.sendNotification({
      //   type: 'ENTITY_CREATED',
      //   entityId: created.id,
      //   workspaceId,
      // });

      // Example: Update statistics
      // await this.yourEntityService.updateStatistics(workspaceId);

      // Example: Trigger workflow
      // await this.workflowService.trigger('entity-created', {
      //   entity: created,
      //   workspaceId,
      // });

      this.logger.log('Post-hook completed successfully');
    } catch (error) {
      // DON'T throw - let main query succeed
      this.logger.error(
        'Post-hook failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // Example helper method
  // private async createRelatedEntities(
  //   entity: MktYourEntityWorkspaceEntity,
  //   workspaceId: string,
  // ): Promise<void> {
  //   const repository = await this.twentyORMGlobalManager
  //     .getRepositoryForWorkspace(workspaceId, RelatedEntity);
  //
  //   await repository.save({
  //     yourEntityId: entity.id,
  //     // ... other fields
  //   });
  // }
}

/**
 * Example for UpdateOne Post-Hook
 */
// @Injectable()
// @WorkspaceQueryHook({
//   key: 'mktYourEntity.updateOne',
//   type: WorkspaceQueryHookType.POST_HOOK,
// })
// export class MktYourEntityUpdateOnePostQueryHook
//   implements WorkspacePostQueryHookInstance
// {
//   async execute(
//     authContext: AuthContext,
//     _objectName: string,
//     payload: unknown[],
//   ): Promise<void> {
//     // Handle update side effects
//     // - Trigger workflows based on status change
//     // - Update related entities
//     // - Send notifications
//   }
// }

/**
 * Example for DeleteOne Post-Hook
 */
// @Injectable()
// @WorkspaceQueryHook({
//   key: 'mktYourEntity.deleteOne',
//   type: WorkspaceQueryHookType.POST_HOOK,
// })
// export class MktYourEntityDeleteOnePostQueryHook
//   implements WorkspacePostQueryHookInstance
// {
//   async execute(
//     authContext: AuthContext,
//     _objectName: string,
//     payload: unknown[],
//   ): Promise<void> {
//     // Cleanup after delete
//     // - Remove related entities
//     // - Update statistics
//     // - Audit logging
//   }
// }
