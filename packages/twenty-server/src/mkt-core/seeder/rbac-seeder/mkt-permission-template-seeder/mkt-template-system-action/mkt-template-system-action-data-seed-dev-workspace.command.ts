import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';

import { prefillMktTemplateSystemActions } from './prefill-mkt-template-system-actions';

@Command({
  name: 'workspace-seed-dev:mkt-template-system-actions',
  description: 'Seed template system actions for mkt workspace',
})
export class MktTemplateSystemActionDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktTemplateSystemActionDataSeedDevWorkspaceCommand.name,
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
      `Seeding template system actions for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktTemplateSystemActions(entityManager, schemaName);

    this.logger.log('Template system actions seeding completed successfully!');
  }
}
