import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { prefillMktVirtualAccounts } from 'src/mkt-core/seeder/payment-seeder/mkt-virtual-account/prefill-mkt-virtual-accounts';

@Command({
  name: 'workspace-seed-dev:mkt-virtual-accounts',
  description: 'Seed virtual accounts for mkt workspace',
})
export class MktVirtualAccountDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktVirtualAccountDataSeedDevWorkspaceCommand.name,
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
      `Seeding virtual accounts for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktVirtualAccounts(entityManager, schemaName);

    this.logger.log('Virtual accounts seeding completed successfully!');
  }
}
