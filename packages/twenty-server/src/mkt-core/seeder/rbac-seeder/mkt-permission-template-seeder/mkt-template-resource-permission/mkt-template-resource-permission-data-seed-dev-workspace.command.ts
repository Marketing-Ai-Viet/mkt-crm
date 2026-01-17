import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';

import { prefillMktTemplateResourcePermissions } from './prefill-mkt-template-resource-permissions';

@Command({
  name: 'workspace-seed-dev:mkt-template-resource-permissions',
  description: 'Seed template resource permissions for mkt workspace',
})
export class MktTemplateResourcePermissionDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktTemplateResourcePermissionDataSeedDevWorkspaceCommand.name,
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
      `Seeding template resource permissions for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktTemplateResourcePermissions(entityManager, schemaName);

    this.logger.log(
      'Template resource permissions seeding completed successfully!',
    );
  }
}
