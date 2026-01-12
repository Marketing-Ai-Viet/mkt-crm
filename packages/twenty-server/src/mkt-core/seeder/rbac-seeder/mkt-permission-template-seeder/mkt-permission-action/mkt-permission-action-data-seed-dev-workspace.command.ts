import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { prefillMktPermissionActions } from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-action/prefill-mkt-permission-actions';

@Command({
  name: 'workspace-seed-dev:mkt-permission-actions',
  description: 'Seed permission actions for mkt workspace',
})
export class MktPermissionActionDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktPermissionActionDataSeedDevWorkspaceCommand.name,
  );

  constructor(
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
  ) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const workspaceId = passedParams[0];
    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();
    const entityManager =
      mainDataSource.createEntityManager() as WorkspaceEntityManager;
    const schemaName = `workspace_${workspaceId}`;

    this.logger.log(
      `Seeding permission actions for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktPermissionActions(entityManager, schemaName);

    this.logger.log('Permission actions seeding completed successfully!');
  }
}
