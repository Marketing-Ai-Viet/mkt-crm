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
import { prefillMktPermissionResources } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-permission-resources';
import { mktPermissionResourcesAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-permission-resource-all.view';

interface SeedPermissionResourceModuleOptions {
  workspaceId?: string;
}

type PermissionResourceViewDefinition = ReturnType<
  typeof mktPermissionResourcesAllView
>;

@Command({
  name: 'workspace:seed:permission-resource-module',
  description: 'Seed permission resource module data for existing workspace',
})
export class SeedPermissionResourceModuleCommand extends CommandRunner {
  private readonly logger = new Logger(
    SeedPermissionResourceModuleCommand.name,
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
    description: 'workspace id to seed permission resource module for',
  })
  parseWorkspaceId(value: string): string {
    return value;
  }

  async run(
    passedParam: string[],
    options: SeedPermissionResourceModuleOptions,
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
        await this.seedPermissionResourceModuleForWorkspace(workspace.id);
        // Get viewId of 'All Permission Resources' view after seed
        const mainDataSource =
          await this.workspaceDataSourceService.connectToMainDataSource();
        const schemaName = getWorkspaceSchemaName(workspace.id);
        const viewRow = await mainDataSource
          .createQueryBuilder()
          .select('id')
          .from(`${schemaName}.view`, 'view')
          .where('view.name = :name', { name: 'All Permission Resources' })
          .andWhere('view.key = :key', { key: 'INDEX' })
          .getRawOne();
        const permissionResourceViewId = viewRow?.id;

        if (permissionResourceViewId) {
          // Insert new Favorite with this viewId
          await mainDataSource
            .createQueryBuilder()
            .insert()
            .into(`${schemaName}.favorite`, ['viewId'])
            .values([{ viewId: permissionResourceViewId }])
            .execute();
          this.logger.log(
            `✅ Inserted new Favorite record with viewId: ${permissionResourceViewId}`,
          );
        } else {
          this.logger.warn(
            '⚠️ Could not find viewId for All Permission Resources view to update Favorite records',
          );
        }
        this.logger.log(
          `✅ Permission resource module seeded for workspace: ${workspace.id}`,
        );
        await this.workspaceCacheStorageService.flush(workspace.id, undefined);
      } catch (error) {
        this.logger.error(
          `❌ Failed to seed permission resource module for workspace ${workspace.id}:`,
          error,
        );
      }
    }
  }

  private async seedPermissionResourceModuleForWorkspace(
    workspaceId: string,
  ): Promise<void> {
    this.logger.log(
      `🚀 Starting permission resource module seeding for workspace ${workspaceId}`,
    );

    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();

    if (!mainDataSource) {
      throw new Error('Could not connect to main data source');
    }

    const objectMetadataItems =
      await this.objectMetadataService.findManyWithinWorkspace(workspaceId);

    // Find permission resource object metadata
    const permissionResourceObjectMetadata = objectMetadataItems.find(
      (item) => item.nameSingular === 'mktPermissionResource',
    );

    this.logger.log(
      `🔍 Debug - All objects in workspace: ${objectMetadataItems.map((item) => `${item.nameSingular}(${item.standardId})`).join(', ')}`,
    );
    this.logger.log(
      `🔍 Debug - Looking for permission resource object with nameSingular: 'mktPermissionResource'`,
    );
    this.logger.log(
      `🔍 Debug - Permission resource object found: ${permissionResourceObjectMetadata ? 'YES' : 'NO'}`,
    );

    if (!permissionResourceObjectMetadata) {
      this.logger.log(
        `Permission resource object not found in workspace ${workspaceId}, skipping...`,
      );

      return;
    }

    const schemaName = getWorkspaceSchemaName(workspaceId);

    await mainDataSource.transaction(
      async (entityManager: WorkspaceEntityManager) => {
        // Check if permission resource view already exists by looking for a view with name 'All Permission Resources'
        const existingView = await entityManager
          .createQueryBuilder(undefined, undefined, undefined, {
            shouldBypassPermissionChecks: true,
          })
          .select('*')
          .from(`${schemaName}.view`, 'view')
          .where('view.name = :name', { name: 'All Permission Resources' })
          .andWhere('view.key = :key', { key: 'INDEX' })
          .getRawOne();

        if (existingView) {
          this.logger.log(
            `Permission resource view already exists for workspace ${workspaceId}. Deleting and recreating...`,
          );

          // Delete existing view (cascade will delete viewFields)
          await entityManager
            .createQueryBuilder(undefined, undefined, undefined, {
              shouldBypassPermissionChecks: true,
            })
            .delete()
            .from(`${schemaName}.view`)
            .where('name = :name', { name: 'All Permission Resources' })
            .andWhere('key = :key', { key: 'INDEX' })
            .execute();
        }

        // Create permission resource view
        const permissionResourceViewDefinition: PermissionResourceViewDefinition =
          mktPermissionResourcesAllView(objectMetadataItems);

        // Seed mkt permission resources
        await prefillMktPermissionResources(entityManager, schemaName);

        if (!permissionResourceViewDefinition) {
          this.logger.log(
            `Could not create permission resource view definition for workspace ${workspaceId}`,
          );

          return;
        }

        this.logger.log(
          `🔍 Debug - View definition created with ${permissionResourceViewDefinition.fields?.length || 0} fields`,
        );

        const viewDefinitionWithId = {
          ...permissionResourceViewDefinition,
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
          this.logger.log(`✅ View fields created successfully`);
        }

        // Insert view filters if any
        if (
          viewDefinitionWithId.filters &&
          viewDefinitionWithId.filters.length > 0
        ) {
          await entityManager
            .createQueryBuilder(undefined, undefined, undefined, {
              shouldBypassPermissionChecks: true,
            })
            .insert()
            .into(`${schemaName}.viewFilter`, [
              'fieldMetadataId',
              'operand',
              'value',
              'displayValue',
              'viewId',
            ])
            .values(
              (
                viewDefinitionWithId.filters as Array<{
                  fieldMetadataId: string;
                  operand: string;
                  value: unknown;
                  displayValue: string;
                }>
              ).map((filter) => ({
                fieldMetadataId: filter.fieldMetadataId,
                operand: filter.operand,
                value: filter.value,
                displayValue: filter.displayValue,
                viewId: viewDefinitionWithId.id,
              })),
            )
            .execute();
        }

        this.logger.log(
          `✅ Permission resources and view created for workspace ${workspaceId}`,
        );
      },
    );
  }
}
