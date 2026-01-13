import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Command, CommandRunner, Option } from 'nest-commander';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { Repository } from 'typeorm';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceCacheStorageService } from 'src/engine/workspace-cache-storage/workspace-cache-storage.service';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { prefillMktDepartmentSubManagers } from 'src/mkt-core/seeder/department-seeder/mkt-department-sub-manager/prefill-mkt-department-sub-managers';

type SeedModuleOptions = {
  workspaceId?: string;
};

const TABLE_NAME = 'mktDepartmentSubManager';
const NAME_SINGULAR = 'mktDepartmentSubManager';

@Command({
  name: 'mkt-department-sub-manager-data-seed-dev-workspace',
  description: 'Seed department sub-manager data for existing workspace',
})
export class SeedDepartmentSubManagerCommand extends CommandRunner {
  private readonly logger = new Logger(SeedDepartmentSubManagerCommand.name);

  constructor(
    @InjectRepository(Workspace, 'core')
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly objectMetadataService: ObjectMetadataService,
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
    private readonly workspaceCacheStorageService: WorkspaceCacheStorageService,
  ) {
    super();
  }

  @Option({
    flags: '-w, --workspace-id [workspace_id]',
    description: 'workspace id to seed module for',
  })
  parseWorkspaceId(value: string): string {
    return value;
  }

  async run(_passedParam: string[], options: SeedModuleOptions): Promise<void> {
    let workspaces: Workspace[] = [];

    if (options.workspaceId) {
      const workspace = await this.workspaceRepository.findOne({
        where: { id: options.workspaceId },
      });

      if (workspace) {
        workspaces = [workspace];
      } else {
        this.logger.error(`Workspace ${options.workspaceId} not found`);

        return;
      }
    } else {
      // Seed for all active workspaces
      workspaces = await this.workspaceRepository.find({
        where: {
          activationStatus: WorkspaceActivationStatus.ACTIVE,
        },
      });
    }

    for (const workspace of workspaces) {
      try {
        await this.seedModuleForWorkspace(workspace.id);
        this.logger.log(
          `Department sub-manager data seeded for workspace: ${workspace.id}`,
        );
        await this.workspaceCacheStorageService.flush(workspace.id, undefined);
      } catch (error) {
        this.logger.error(
          `Failed to seed department sub-manager data for workspace ${workspace.id}:`,
          error,
        );
      }
    }
  }

  private async seedModuleForWorkspace(workspaceId: string): Promise<void> {
    this.logger.log(
      `Starting department sub-manager seeding for workspace ${workspaceId}`,
    );

    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();

    if (!mainDataSource) {
      throw new Error('Could not connect to main data source');
    }

    const objectMetadataItems =
      await this.objectMetadataService.findManyWithinWorkspace(workspaceId);

    const objectMetadata = objectMetadataItems.find(
      (item) => item.nameSingular === NAME_SINGULAR,
    );

    if (!objectMetadata) {
      this.logger.log(
        `${NAME_SINGULAR} object not found in workspace ${workspaceId}, skipping...`,
      );

      return;
    }

    const schemaName = getWorkspaceSchemaName(workspaceId);

    await mainDataSource.transaction(
      async (entityManager: WorkspaceEntityManager) => {
        // Check if data already exists
        const existingData = await entityManager
          .createQueryBuilder(undefined, undefined, undefined, {
            shouldBypassPermissionChecks: true,
          })
          .select('id')
          .from(`${schemaName}.${TABLE_NAME}`, 'subManager')
          .limit(1)
          .getRawOne();

        if (existingData) {
          this.logger.log(
            `Data already exists for ${TABLE_NAME} in workspace ${workspaceId}. Deleting and recreating...`,
          );

          await entityManager
            .createQueryBuilder(undefined, undefined, undefined, {
              shouldBypassPermissionChecks: true,
            })
            .delete()
            .from(`${schemaName}.${TABLE_NAME}`)
            .execute();
        }

        await prefillMktDepartmentSubManagers(entityManager, schemaName);

        this.logger.log(
          `Department sub-manager data created for workspace ${workspaceId}`,
        );
      },
    );
  }
}
