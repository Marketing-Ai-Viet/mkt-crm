import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';

import { prefillMktPolicyVersions } from './prefill-mkt-policy-versions';

@Command({
  name: 'workspace-seed-dev:mkt-policy-versions',
  description: 'Seed policy versions for RBAC cache management',
})
export class MktPolicyVersionDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktPolicyVersionDataSeedDevWorkspaceCommand.name,
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
      `Seeding policy versions for workspace ${workspaceId} in schema ${schemaName}`,
    );

    try {
      await prefillMktPolicyVersions(entityManager, schemaName);
      this.logger.log('Policy versions seeding completed successfully!');
    } catch (error) {
      this.logger.error('Failed to seed policy versions', error);
      throw error;
    }
  }
}
