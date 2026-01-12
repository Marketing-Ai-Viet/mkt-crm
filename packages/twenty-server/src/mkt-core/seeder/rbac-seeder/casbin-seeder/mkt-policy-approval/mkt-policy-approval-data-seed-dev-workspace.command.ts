import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';

import { prefillMktPolicyApprovals } from './prefill-mkt-policy-approvals';

@Command({
  name: 'workspace-seed-dev:mkt-policy-approvals',
  description: 'Seed policy approvals for RBAC approval workflow',
})
export class MktPolicyApprovalDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktPolicyApprovalDataSeedDevWorkspaceCommand.name,
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
      `Seeding policy approvals for workspace ${workspaceId} in schema ${schemaName}`,
    );

    try {
      await prefillMktPolicyApprovals(entityManager, schemaName);
      this.logger.log('Policy approvals seeding completed successfully!');
    } catch (error) {
      this.logger.error('Failed to seed policy approvals', error);
      throw error;
    }
  }
}
