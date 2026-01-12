import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';

import { prefillMktPermissionTemplates } from './prefill-mkt-permission-templates';

@Command({
  name: 'workspace-seed-dev:mkt-permission-templates',
  description: 'Seed permission templates for mkt workspace',
})
export class MktPermissionTemplateDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktPermissionTemplateDataSeedDevWorkspaceCommand.name,
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
      `Seeding permission templates for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktPermissionTemplates(entityManager, schemaName);

    this.logger.log('Permission templates seeding completed successfully!');
  }
}
