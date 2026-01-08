import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { prefillMktWebhookLogs } from 'src/mkt-core/seeder/prefill-data/prefill-mkt-webhook-logs';

@Command({
  name: 'workspace-seed-dev:mkt-webhook-logs',
  description: 'Seed webhook logs for mkt workspace',
})
export class MktWebhookLogDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktWebhookLogDataSeedDevWorkspaceCommand.name,
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
      `Seeding webhook logs for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktWebhookLogs(entityManager, schemaName);

    this.logger.log('Webhook logs seeding completed successfully!');
  }
}
