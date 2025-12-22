import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { prefillMktGenericCombos } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-generic-combos';

@Command({
  name: 'workspace-seed-dev:mkt-generic-combos',
  description: 'Seed generic combos for mkt workspace',
})
export class MktGenericComboDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktGenericComboDataSeedDevWorkspaceCommand.name,
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
      `Seeding generic combos for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktGenericCombos(entityManager, schemaName);

    this.logger.log('Generic combos seeding completed successfully!');
  }
}
