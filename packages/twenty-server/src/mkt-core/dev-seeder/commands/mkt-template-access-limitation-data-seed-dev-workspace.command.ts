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
import { prefillMktTemplateAccessLimitations } from 'src/mkt-core/dev-seeder/prefill-data/prefill-mkt-template-access-limitations';
import { mktTemplateAccessLimitationsAllView } from 'src/mkt-core/dev-seeder/prefill-view/mkt-template-access-limitation-all.view';

interface SeedTemplateAccessLimitationModuleOptions {
  workspaceId?: string;
}

type TemplateAccessLimitationViewDefinition = ReturnType<
  typeof mktTemplateAccessLimitationsAllView
>;

@Command({
  name: 'workspace:seed:template-access-limitation-module',
  description:
    'Seed template access limitation module data for existing workspace',
})
export class SeedTemplateAccessLimitationModuleCommand extends CommandRunner {
  private readonly logger = new Logger(
    SeedTemplateAccessLimitationModuleCommand.name,
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
    description: 'workspace id to seed template access limitation module for',
  })
  parseWorkspaceId(value: string): string {
    return value;
  }

  async run(
    passedParam: string[],
    options: SeedTemplateAccessLimitationModuleOptions,
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
        await this.seedTemplateAccessLimitationModuleForWorkspace(workspace.id);
        // Get viewId of 'All Template Access Limitations' view after seed
        const mainDataSource =
          await this.workspaceDataSourceService.connectToMainDataSource();
        const schemaName = getWorkspaceSchemaName(workspace.id);
        const viewRow = await mainDataSource
          .createQueryBuilder()
          .select('id')
          .from(`${schemaName}.view`, 'view')
          .where('view.name = :name', {
            name: 'All Template Access Limitations',
          })
          .andWhere('view.key = :key', { key: 'INDEX' })
          .getRawOne();
        const templateAccessLimitationViewId = viewRow?.id;

        if (templateAccessLimitationViewId) {
          // Insert new Favorite with this viewId
          await mainDataSource
            .createQueryBuilder()
            .insert()
            .into(`${schemaName}.favorite`, ['viewId'])
            .values([{ viewId: templateAccessLimitationViewId }])
            .execute();
          this.logger.log(
            `✅ Inserted new Favorite record with viewId: ${templateAccessLimitationViewId}`,
          );
        } else {
          this.logger.warn(
            '⚠️ Could not find viewId for All Template Access Limitations view to update Favorite records',
          );
        }
        this.logger.log(
          `✅ Template access limitation module seeded for workspace: ${workspace.id}`,
        );
        await this.workspaceCacheStorageService.flush(workspace.id, undefined);
      } catch (error) {
        this.logger.error(
          `❌ Failed to seed template access limitation module for workspace ${workspace.id}:`,
          error,
        );
      }
    }
  }

  private async seedTemplateAccessLimitationModuleForWorkspace(
    workspaceId: string,
  ): Promise<void> {
    this.logger.log(
      `🚀 Starting template access limitation module seeding for workspace ${workspaceId}`,
    );

    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();

    if (!mainDataSource) {
      throw new Error('Could not connect to main data source');
    }

    const objectMetadataItems =
      await this.objectMetadataService.findManyWithinWorkspace(workspaceId);

    // Find template access limitation object metadata
    const templateAccessLimitationObjectMetadata = objectMetadataItems.find(
      (item) => item.nameSingular === 'mktTemplateAccessLimitation',
    );

    this.logger.log(
      `🔍 Debug - All objects in workspace: ${objectMetadataItems.map((item) => `${item.nameSingular}(${item.standardId})`).join(', ')}`,
    );
    this.logger.log(
      `🔍 Debug - Looking for template access limitation object with nameSingular: 'mktTemplateAccessLimitation'`,
    );
    this.logger.log(
      `🔍 Debug - Template access limitation object found: ${templateAccessLimitationObjectMetadata ? 'YES' : 'NO'}`,
    );

    if (!templateAccessLimitationObjectMetadata) {
      this.logger.log(
        `Template access limitation object not found in workspace ${workspaceId}, skipping...`,
      );

      return;
    }

    const schemaName = getWorkspaceSchemaName(workspaceId);

    await mainDataSource.transaction(
      async (entityManager: WorkspaceEntityManager) => {
        // Check if template access limitation view already exists by looking for a view with name 'All Template Access Limitations'
        const existingView = await entityManager
          .createQueryBuilder(undefined, undefined, undefined, {
            shouldBypassPermissionChecks: true,
          })
          .select('*')
          .from(`${schemaName}.view`, 'view')
          .where('view.name = :name', {
            name: 'All Template Access Limitations',
          })
          .andWhere('view.key = :key', { key: 'INDEX' })
          .getRawOne();

        if (existingView) {
          this.logger.log(
            `Template access limitation view already exists for workspace ${workspaceId}. Deleting and recreating...`,
          );

          // Delete existing view (cascade will delete viewFields)
          await entityManager
            .createQueryBuilder(undefined, undefined, undefined, {
              shouldBypassPermissionChecks: true,
            })
            .delete()
            .from(`${schemaName}.view`)
            .where('name = :name', {
              name: 'All Template Access Limitations',
            })
            .andWhere('key = :key', { key: 'INDEX' })
            .execute();
        }

        // Create template access limitation view
        const templateAccessLimitationViewDefinition: TemplateAccessLimitationViewDefinition =
          mktTemplateAccessLimitationsAllView(objectMetadataItems);

        // Seed mkt template access limitations
        await prefillMktTemplateAccessLimitations(entityManager, schemaName);

        if (!templateAccessLimitationViewDefinition) {
          this.logger.log(
            `Could not create template access limitation view definition for workspace ${workspaceId}`,
          );

          return;
        }

        this.logger.log(
          `🔍 Debug - View definition created with ${templateAccessLimitationViewDefinition.fields?.length || 0} fields`,
        );

        const viewDefinitionWithId = {
          ...templateAccessLimitationViewDefinition,
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
          `✅ Template access limitation view created successfully for workspace ${workspaceId}`,
        );
      },
    );
  }
}
