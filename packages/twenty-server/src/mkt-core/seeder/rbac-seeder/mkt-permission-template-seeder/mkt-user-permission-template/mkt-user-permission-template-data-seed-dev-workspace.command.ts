import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';

import { prefillMktUserPermissionTemplates } from './prefill-mkt-user-permission-templates';

@Command({
  name: 'workspace-seed-dev:mkt-user-permission-templates',
  description: 'Seed user permission templates for mkt workspace',
})
export class MktUserPermissionTemplateDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktUserPermissionTemplateDataSeedDevWorkspaceCommand.name,
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
      `Seeding user permission templates for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktUserPermissionTemplates(entityManager, schemaName);

    this.logger.log(
      'User permission templates seeding completed successfully!',
    );
  }
}
