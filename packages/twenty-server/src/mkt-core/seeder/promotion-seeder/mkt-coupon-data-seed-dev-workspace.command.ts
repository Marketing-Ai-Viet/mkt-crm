import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';

import { prefillMktCoupons } from './prefill-mkt-coupons';

@Command({
  name: 'workspace-seed-dev:mkt-coupons',
  description: 'Seed coupons for mkt workspace',
})
export class MktCouponDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktCouponDataSeedDevWorkspaceCommand.name,
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
      `Seeding coupons for workspace ${workspaceId} in schema ${schemaName}`,
    );

    await prefillMktCoupons(entityManager, schemaName);

    this.logger.log('Coupons seeding completed successfully!');
  }
}
