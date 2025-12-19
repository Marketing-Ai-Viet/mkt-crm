import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';

import { prefillMktPromotionUsages } from './prefill-mkt-promotion-usages';

@Command({
  name: 'workspace-seed-dev:mkt-promotion-usages',
  description: 'Seed promotion usages for mkt workspace',
})
export class MktPromotionUsageDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktPromotionUsageDataSeedDevWorkspaceCommand.name,
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
      `Seeding promotion usages for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktPromotionUsages(entityManager, schemaName);

    this.logger.log('Promotion usages seeding completed successfully!');
  }
}
