import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';

import { prefillMktCasbinRules } from './prefill-mkt-casbin-rules';

@Command({
  name: 'workspace-seed-dev:mkt-casbin-rules',
  description: 'Seed Casbin authorization rules for mkt workspace',
})
export class MktCasbinRuleDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktCasbinRuleDataSeedDevWorkspaceCommand.name,
  );

  constructor(
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
  ) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const workspaceId = passedParams[0];

    if (!workspaceId) {
      this.logger.error('Workspace ID is required');

      return;
    }

    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();
    const entityManager =
      mainDataSource.createEntityManager() as WorkspaceEntityManager;
    const schemaName = `workspace_${workspaceId}`;

    this.logger.log(
      `Seeding Casbin rules for workspace ${workspaceId} in schema ${schemaName}`,
    );

    try {
      await prefillMktCasbinRules(entityManager, schemaName);
      this.logger.log('Casbin rules seeding completed successfully!');
    } catch (error) {
      this.logger.error('Failed to seed Casbin rules', error);
      throw error;
    }
  }
}
