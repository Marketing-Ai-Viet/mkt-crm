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
import { prefillMktTemplateResourcePermissions } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-template-resource-permissions';
import { mktTemplateResourcePermissionsAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-template-resource-permission.view';

interface SeedTemplateResourcePermissionModuleOptions {
  workspaceId?: string;
}

type TemplateResourcePermissionViewDefinition = ReturnType<
  typeof mktTemplateResourcePermissionsAllView
>;

@Command({
  name: 'workspace:seed:template-resource-permission-module',
  description:
    'Seed template resource permission module data for existing workspace',
})
export class SeedTemplateResourcePermissionModuleCommand extends CommandRunner {
  private readonly logger = new Logger(
    SeedTemplateResourcePermissionModuleCommand.name,
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
    description: 'workspace id to seed template resource permission module for',
  })
  parseWorkspaceId(value: string): string {
    return value;
  }

  async run(
    passedParam: string[],
    options: SeedTemplateResourcePermissionModuleOptions,
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
        await this.seedTemplateResourcePermissionModuleForWorkspace(
          workspace.id,
        );
        // Get viewId of 'All Template Resource Permissions' view after seed
        const mainDataSource =
          await this.workspaceDataSourceService.connectToMainDataSource();
        const schemaName = getWorkspaceSchemaName(workspace.id);
        const viewRow = await mainDataSource
          .createQueryBuilder()
          .select('id')
          .from(`${schemaName}.view`, 'view')
          .where('view.name = :name', {
            name: 'All Template Resource Permissions',
          })
          .andWhere('view.key = :key', { key: 'INDEX' })
          .getRawOne();
        const templateResourcePermissionViewId = viewRow?.id;

        if (templateResourcePermissionViewId) {
          // Insert new Favorite with this viewId
          await mainDataSource
            .createQueryBuilder()
            .insert()
            .into(`${schemaName}.favorite`, ['viewId'])
            .values([{ viewId: templateResourcePermissionViewId }])
            .execute();
          this.logger.log(
            `✅ Inserted new Favorite record with viewId: ${templateResourcePermissionViewId}`,
          );
        } else {
          this.logger.warn(
            '⚠️ Could not find viewId for All Template Resource Permissions view to update Favorite records',
          );
        }
        this.logger.log(
          `✅ Template resource permission module seeded for workspace: ${workspace.id}`,
        );
        await this.workspaceCacheStorageService.flush(workspace.id, undefined);
      } catch (error) {
        this.logger.error(
          `❌ Failed to seed template resource permission module for workspace ${workspace.id}:`,
          error,
        );
      }
    }
  }

  private async seedTemplateResourcePermissionModuleForWorkspace(
    workspaceId: string,
  ): Promise<void> {
    this.logger.log(
      `🚀 Starting template resource permission module seeding for workspace ${workspaceId}`,
    );

    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();

    if (!mainDataSource) {
      throw new Error('Could not connect to main data source');
    }

    const objectMetadataItems =
      await this.objectMetadataService.findManyWithinWorkspace(workspaceId);

    // Find template resource permission object metadata
    const templateResourcePermissionObjectMetadata = objectMetadataItems.find(
      (item) => item.nameSingular === 'mktTemplateResourcePermission',
    );

    this.logger.log(
      `🔍 Debug - All objects in workspace: ${objectMetadataItems.map((item) => `${item.nameSingular}(${item.standardId})`).join(', ')}`,
    );
    this.logger.log(
      `🔍 Debug - Looking for template resource permission object with nameSingular: 'mktTemplateResourcePermission'`,
    );
    this.logger.log(
      `🔍 Debug - Template resource permission object found: ${templateResourcePermissionObjectMetadata ? 'YES' : 'NO'}`,
    );

    if (!templateResourcePermissionObjectMetadata) {
      this.logger.log(
        `Template resource permission object not found in workspace ${workspaceId}, skipping...`,
      );

      return;
    }

    const schemaName = getWorkspaceSchemaName(workspaceId);

    await mainDataSource.transaction(
      async (entityManager: WorkspaceEntityManager) => {
        // Check if template resource permission view already exists by looking for a view with name 'All Template Resource Permissions'
        const existingView = await entityManager
          .createQueryBuilder(undefined, undefined, undefined, {
            shouldBypassPermissionChecks: true,
          })
          .select('*')
          .from(`${schemaName}.view`, 'view')
          .where('view.name = :name', {
            name: 'All Template Resource Permissions',
          })
          .andWhere('view.key = :key', { key: 'INDEX' })
          .getRawOne();

        if (existingView) {
          this.logger.log(
            `Template resource permission view already exists for workspace ${workspaceId}. Deleting and recreating...`,
          );

          // Delete existing view (cascade will delete viewFields)
          await entityManager
            .createQueryBuilder(undefined, undefined, undefined, {
              shouldBypassPermissionChecks: true,
            })
            .delete()
            .from(`${schemaName}.view`)
            .where('name = :name', {
              name: 'All Template Resource Permissions',
            })
            .andWhere('key = :key', { key: 'INDEX' })
            .execute();
        }

        // Create template resource permission view
        const templateResourcePermissionViewDefinition: TemplateResourcePermissionViewDefinition =
          mktTemplateResourcePermissionsAllView(objectMetadataItems);

        // Seed mkt template resource permissions
        await prefillMktTemplateResourcePermissions(entityManager, schemaName);

        if (!templateResourcePermissionViewDefinition) {
          this.logger.log(
            `Could not create template resource permission view definition for workspace ${workspaceId}`,
          );

          return;
        }

        this.logger.log(
          `🔍 Debug - View definition created with ${templateResourcePermissionViewDefinition.fields?.length || 0} fields`,
        );

        const viewDefinitionWithId = {
          ...templateResourcePermissionViewDefinition,
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

        this.logger.log(
          `✅ Template resource permission view created successfully for workspace ${workspaceId}`,
        );
      },
    );
  }
}
