import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { v4 as uuidv4 } from 'uuid';
import { Command, CommandRunner, Option } from 'nest-commander';
import { Repository } from 'typeorm';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceCacheStorageService } from 'src/engine/workspace-cache-storage/workspace-cache-storage.service';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { prefillMktUserPermissionOverrides } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-user-permission-overrides';
import { mktUserPermissionOverridesAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-user-permission-override-all.view';

interface SeedUserPermissionOverrideModuleOptions {
  workspaceId?: string;
}

type UserPermissionOverrideViewDefinition = ReturnType<
  typeof mktUserPermissionOverridesAllView
>;

@Command({
  name: 'workspace:seed:user-permission-override-module',
  description:
    'Seed user permission override module data for existing workspace',
})
export class SeedUserPermissionOverrideModuleCommand extends CommandRunner {
  private readonly logger = new Logger(
    SeedUserPermissionOverrideModuleCommand.name,
  );

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
    description: 'workspace id to seed user permission override module for',
  })
  parseWorkspaceId(value: string): string {
    return value;
  }

  async run(
    passedParam: string[],
    options: SeedUserPermissionOverrideModuleOptions,
  ): Promise<void> {
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
        await this.seedUserPermissionOverrideModuleForWorkspace(workspace.id);
        // Get viewId of 'All User Permission Overrides' view after seed
        const mainDataSource =
          await this.workspaceDataSourceService.connectToMainDataSource();
        const schemaName = getWorkspaceSchemaName(workspace.id);
        const viewRow = await mainDataSource
          .createQueryBuilder()
          .select('id')
          .from(`${schemaName}.view`, 'view')
          .where('view.name = :name', {
            name: 'All User Permission Overrides',
          })
          .andWhere('view.key = :key', { key: 'INDEX' })
          .getRawOne();
        const userPermissionOverrideViewId = viewRow?.id;

        if (userPermissionOverrideViewId) {
          // Insert new Favorite with this viewId
          await mainDataSource
            .createQueryBuilder()
            .insert()
            .into(`${schemaName}.favorite`, ['viewId'])
            .values([{ viewId: userPermissionOverrideViewId }])
            .execute();
          this.logger.log(
            `✅ Inserted new Favorite record with viewId: ${userPermissionOverrideViewId}`,
          );
        } else {
          this.logger.warn(
            '⚠️ Could not find viewId for All User Permission Overrides view to update Favorite records',
          );
        }
        this.logger.log(
          `✅ User permission override module seeded for workspace: ${workspace.id}`,
        );
        await this.workspaceCacheStorageService.flush(workspace.id, undefined);
      } catch (error) {
        this.logger.error(
          `❌ Failed to seed user permission override module for workspace ${workspace.id}:`,
          error,
        );
      }
    }
  }

  private async seedUserPermissionOverrideModuleForWorkspace(
    workspaceId: string,
  ): Promise<void> {
    this.logger.log(
      `🚀 Starting user permission override module seeding for workspace ${workspaceId}`,
    );

    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();

    if (!mainDataSource) {
      throw new Error('Could not connect to main data source');
    }

    const objectMetadataItems =
      await this.objectMetadataService.findManyWithinWorkspace(workspaceId);

    // Find user permission override object metadata
    const userPermissionOverrideObjectMetadata = objectMetadataItems.find(
      (item) => item.nameSingular === 'mktUserPermissionOverride',
    );

    this.logger.log(
      `🔍 Debug - All objects in workspace: ${objectMetadataItems.map((item) => `${item.nameSingular}(${item.standardId})`).join(', ')}`,
    );
    this.logger.log(
      `🔍 Debug - Looking for user permission override object with nameSingular: 'mktUserPermissionOverride'`,
    );
    this.logger.log(
      `🔍 Debug - User permission override object found: ${userPermissionOverrideObjectMetadata ? 'YES' : 'NO'}`,
    );

    if (!userPermissionOverrideObjectMetadata) {
      this.logger.log(
        `User permission override object not found in workspace ${workspaceId}, skipping...`,
      );

      return;
    }

    const schemaName = getWorkspaceSchemaName(workspaceId);

    await mainDataSource.transaction(
      async (entityManager: WorkspaceEntityManager) => {
        // Check if user permission override view already exists by looking for a view with name 'All User Permission Overrides'
        const existingView = await entityManager
          .createQueryBuilder(undefined, undefined, undefined, {
            shouldBypassPermissionChecks: true,
          })
          .select('*')
          .from(`${schemaName}.view`, 'view')
          .where('view.name = :name', {
            name: 'All User Permission Overrides',
          })
          .andWhere('view.key = :key', { key: 'INDEX' })
          .getRawOne();

        if (existingView) {
          this.logger.log(
            `User permission override view already exists for workspace ${workspaceId}. Deleting and recreating...`,
          );

          // Delete existing view (cascade will delete viewFields)
          await entityManager
            .createQueryBuilder(undefined, undefined, undefined, {
              shouldBypassPermissionChecks: true,
            })
            .delete()
            .from(`${schemaName}.view`)
            .where('name = :name', {
              name: 'All User Permission Overrides',
            })
            .andWhere('key = :key', { key: 'INDEX' })
            .execute();
        }

        // Create user permission override view
        const userPermissionOverrideViewDefinition: UserPermissionOverrideViewDefinition =
          mktUserPermissionOverridesAllView(objectMetadataItems);

        // Seed mkt user permission overrides
        await prefillMktUserPermissionOverrides(entityManager, schemaName);

        if (!userPermissionOverrideViewDefinition) {
          this.logger.log(
            `Could not create user permission override view definition for workspace ${workspaceId}`,
          );

          return;
        }

        this.logger.log(
          `🔍 Debug - View definition created with ${userPermissionOverrideViewDefinition.fields?.length || 0} fields`,
        );

        const viewDefinitionWithId = {
          ...userPermissionOverrideViewDefinition,
          id: uuidv4(),
        };

        // Insert view
        await entityManager
          .createQueryBuilder(undefined, undefined, undefined, {
            shouldBypassPermissionChecks: true,
          })
          .insert()
          .into(`${schemaName}.view`, [
            'id',
            'name',
            'objectMetadataId',
            'type',
            'key',
            'position',
            'icon',
            'openRecordIn',
            'kanbanFieldMetadataId',
          ])
          .values({
            id: viewDefinitionWithId.id,
            name: viewDefinitionWithId.name,
            objectMetadataId: viewDefinitionWithId.objectMetadataId,
            type: viewDefinitionWithId.type,
            key: viewDefinitionWithId.key,
            position: viewDefinitionWithId.position,
            icon: viewDefinitionWithId.icon,
            openRecordIn: viewDefinitionWithId.openRecordIn,
            kanbanFieldMetadataId: viewDefinitionWithId.kanbanFieldMetadataId,
          })
          .execute();

        // Insert view fields
        if (
          viewDefinitionWithId.fields &&
          viewDefinitionWithId.fields.length > 0
        ) {
          this.logger.log(
            `🔍 Debug - Creating ${viewDefinitionWithId.fields.length} view fields`,
          );
          await entityManager
            .createQueryBuilder(undefined, undefined, undefined, {
              shouldBypassPermissionChecks: true,
            })
            .insert()
            .into(`${schemaName}.viewField`, [
              'id',
              'fieldMetadataId',
              'position',
              'isVisible',
              'size',
              'viewId',
            ])
            .values(
              viewDefinitionWithId.fields.map((field) => ({
                id: uuidv4(),
                fieldMetadataId: field.fieldMetadataId,
                position: field.position,
                isVisible: field.isVisible,
                size: field.size,
                viewId: viewDefinitionWithId.id,
              })),
            )
            .execute();
        }

        // Insert view sorts
        if (
          viewDefinitionWithId.sorts &&
          viewDefinitionWithId.sorts.length > 0
        ) {
          this.logger.log(
            `🔍 Debug - Creating ${viewDefinitionWithId.sorts.length} view sorts`,
          );
          await entityManager
            .createQueryBuilder(undefined, undefined, undefined, {
              shouldBypassPermissionChecks: true,
            })
            .insert()
            .into(`${schemaName}.viewSort`, [
              'id',
              'fieldMetadataId',
              'direction',
              'viewId',
            ])
            .values(
              viewDefinitionWithId.sorts.map((sort) => ({
                id: uuidv4(),
                fieldMetadataId: sort.fieldMetadataId,
                direction: sort.direction,
                viewId: viewDefinitionWithId.id,
              })),
            )
            .execute();
        }

        this.logger.log(
          `✅ Successfully seeded user permission override module for workspace ${workspaceId}`,
        );
      },
    );
  }
}
