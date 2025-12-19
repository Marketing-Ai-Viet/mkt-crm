import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { prefillMktGenericComboItems } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-generic-combo-items';

@Command({
  name: 'workspace-seed-dev:mkt-generic-combo-items',
  description: 'Seed generic combo items for mkt workspace',
})
export class MktGenericComboItemDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktGenericComboItemDataSeedDevWorkspaceCommand.name,
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
      `Seeding generic combo items for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktGenericComboItems(entityManager, schemaName);

    this.logger.log('Generic combo items seeding completed successfully!');
  }
}
