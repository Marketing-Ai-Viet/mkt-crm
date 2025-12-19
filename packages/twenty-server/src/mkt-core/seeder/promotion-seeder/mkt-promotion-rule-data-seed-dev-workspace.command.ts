import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';

import { prefillMktPromotionRules } from './prefill-mkt-promotion-rules';

@Command({
  name: 'workspace-seed-dev:mkt-promotion-rules',
  description: 'Seed promotion rules for mkt workspace',
})
export class MktPromotionRuleDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktPromotionRuleDataSeedDevWorkspaceCommand.name,
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
      `Seeding promotion rules for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktPromotionRules(entityManager, schemaName);

    this.logger.log('Promotion rules seeding completed successfully!');
  }
}
