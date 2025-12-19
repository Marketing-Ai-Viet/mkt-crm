import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';

import { prefillMktPromotionAudits } from './prefill-mkt-promotion-audits';

@Command({
  name: 'workspace-seed-dev:mkt-promotion-audits',
  description: 'Seed promotion audits for mkt workspace',
})
export class MktPromotionAuditDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktPromotionAuditDataSeedDevWorkspaceCommand.name,
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
      `Seeding promotion audits for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktPromotionAudits(entityManager, schemaName);

    this.logger.log('Promotion audits seeding completed successfully!');
  }
}
