import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';

import { prefillMktPermissionResources } from './prefill-mkt-permission-resources';

@Command({
  name: 'workspace-seed-dev:mkt-permission-resources',
  description: 'Seed permission resources for mkt workspace',
})
export class MktPermissionResourceDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktPermissionResourceDataSeedDevWorkspaceCommand.name,
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
      `Seeding permission resources for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktPermissionResources(entityManager, schemaName);

    this.logger.log('Permission resources seeding completed successfully!');
  }
}
