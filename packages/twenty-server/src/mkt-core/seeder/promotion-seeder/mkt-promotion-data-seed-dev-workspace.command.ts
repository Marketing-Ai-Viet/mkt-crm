import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';

import { prefillMktPromotions } from './prefill-mkt-promotions';

@Command({
  name: 'workspace-seed-dev:mkt-promotions',
  description: 'Seed promotions for mkt workspace',
})
export class MktPromotionDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktPromotionDataSeedDevWorkspaceCommand.name,
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
      `Seeding promotions for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktPromotions(entityManager, schemaName);

    this.logger.log('Promotions seeding completed successfully!');
  }
}
