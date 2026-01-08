/**
 * Pre-Query Hook Template
 *
 * Pre-hooks run BEFORE the query executes.
 * Use for: validation, data modification, setting defaults
 *
 * TODO:
 * 1. Replace 'YourEntity' with your entity name
 * 2. Replace 'yourEntity' with camelCase entity name
 * 3. Replace 'createOne' with the method (createOne, updateOne, deleteOne, etc.)
 * 4. Register this hook in your module providers
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import {
  CreateOneResolverArgs,
  // UpdateOneResolverArgs,
  // DeleteOneResolverArgs,
} from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';

// TODO: Import your entity
// import { MktYourEntityWorkspaceEntity } from '../objects/mkt-your-entity.workspace-entity';
// import { YOUR_ENTITY_STATUS } from '../constants/your-entity-status.constants';

@Injectable()
@WorkspaceQueryHook('mktYourEntity.createOne') // TODO: Update hook key
export class MktYourEntityCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(MktYourEntityCreateOnePreQueryHook.name);

  constructor(
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    // TODO: Inject services if needed
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs<unknown>, // TODO: Replace unknown with your entity type
  ): Promise<CreateOneResolverArgs<unknown>> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      throw new BadRequestException('Workspace ID not found');
    }

    this.logger.log(`Pre-hook executing for workspace: ${workspaceId}`);

    // Example: Validate required fields
    // if (!payload.data.name) {
    //   throw new BadRequestException('Name is required');
    // }

    // Example: Set default values
    const newPayload = {
      ...payload,
      data: {
        ...payload.data,
        // status: YOUR_ENTITY_STATUS.DRAFT,
        // accountOwnerId: authContext.workspaceMemberId || null,
        // createdById: authContext.workspaceMemberId,
      },
    };

    // Example: Validate with database check
    // const repository = await this.twentyORMGlobalManager
    //   .getRepositoryForWorkspace(workspaceId, MktYourEntityWorkspaceEntity);
    //
    // const existing = await repository.findOne({
    //   where: { name: payload.data.name },
    // });
    //
    // if (existing) {
    //   throw new BadRequestException('Entity with this name already exists');
    // }

    return newPayload;
  }
}

/**
 * Example for UpdateOne Pre-Hook
 */
// @Injectable()
// @WorkspaceQueryHook('mktYourEntity.updateOne')
// export class MktYourEntityUpdateOnePreQueryHook
//   implements WorkspacePreQueryHookInstance
// {
//   async execute(
//     authContext: AuthContext,
//     _objectName: string,
//     payload: UpdateOneResolverArgs<unknown>,
//   ): Promise<UpdateOneResolverArgs<unknown>> {
//     // Validation before update
//     return payload;
//   }
// }

/**
 * Example for DeleteOne Pre-Hook
 */
// @Injectable()
// @WorkspaceQueryHook('mktYourEntity.deleteOne')
// export class MktYourEntityDeleteOnePreQueryHook
//   implements WorkspacePreQueryHookInstance
// {
//   async execute(
//     authContext: AuthContext,
//     _objectName: string,
//     payload: DeleteOneResolverArgs,
//   ): Promise<DeleteOneResolverArgs> {
//     // Check if can delete (no children, etc.)
//     return payload;
//   }
// }
