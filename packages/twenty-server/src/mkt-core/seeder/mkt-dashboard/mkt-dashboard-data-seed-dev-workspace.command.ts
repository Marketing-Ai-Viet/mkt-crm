import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Command, CommandRunner, Option } from 'nest-commander';
import { Repository } from 'typeorm';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { v4 as uuidv4 } from 'uuid';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { WorkspaceCacheStorageService } from 'src/engine/workspace-cache-storage/workspace-cache-storage.service';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { mktDashboardWidgetsAllView } from 'src/mkt-core/seeder/mkt-dashboard/mkt-dashboard-widget/mkt-dashboard-widget-all.view';
import { prefillMktDashboardWidgets } from 'src/mkt-core/seeder/mkt-dashboard/mkt-dashboard-widget/prefill-mkt-dashboard-widgets';
import { prefillMktDashboardLayouts } from 'src/mkt-core/seeder/mkt-dashboard/mkt-dashboard-layout/prefill-mkt-dashboard-layouts';
import { prefillMktDashboardSnapshots } from 'src/mkt-core/seeder/mkt-dashboard/mkt-dashboard-snapshot/prefill-mkt-dashboard-snapshots';

interface SeedDashboardModuleOptions {
  workspaceId?: string;
}

type DashboardViewDefinition = ReturnType<typeof mktDashboardWidgetsAllView>;

@Command({
  name: 'workspace:seed:dashboard-module',
  description:
    'Seed dashboard module widgets, layouts, snapshots and views for existing workspace',
})
export class SeedDashboardModuleCommand extends CommandRunner {
  private readonly logger = new Logger(SeedDashboardModuleCommand.name);

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
    description: 'workspace id to seed dashboard module for',
  })
  parseWorkspaceId(value: string): string {
    return value;
  }

  async run(
    _passedParam: string[],
    options: SeedDashboardModuleOptions,
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
      workspaces = await this.workspaceRepository.find({
        where: {
          activationStatus: WorkspaceActivationStatus.ACTIVE,
        },
      });
    }

    for (const workspace of workspaces) {
      try {
        await this.seedDashboardModuleForWorkspace(workspace.id);

        const mainDataSource =
          await this.workspaceDataSourceService.connectToMainDataSource();
        const schemaName = getWorkspaceSchemaName(workspace.id);

        const viewRow = await mainDataSource
          .createQueryBuilder()
          .select('id')
          .from(`${schemaName}.view`, 'view')
          .where('view.name = :name', { name: 'All Dashboard Widgets' })
          .andWhere('view.key = :key', { key: 'INDEX' })
          .getRawOne();

        const dashboardViewId = viewRow?.id;

        if (dashboardViewId) {
          await mainDataSource
            .createQueryBuilder()
            .insert()
            .into(`${schemaName}.favorite`, ['viewId'])
            .values([{ viewId: dashboardViewId }])
            .execute();
          this.logger.log(
            `Inserted Favorite record with viewId: ${dashboardViewId}`,
          );
        } else {
          this.logger.warn(
            'Could not find viewId for All Dashboard Widgets view to create Favorite',
          );
        }

        this.logger.log(
          `Dashboard module seeded for workspace: ${workspace.id}`,
        );
        await this.workspaceCacheStorageService.flush(workspace.id, undefined);
      } catch (error) {
        this.logger.error(
          `Failed to seed dashboard module for workspace ${workspace.id}:`,
          error,
        );
      }
    }
  }

  private async seedDashboardModuleForWorkspace(
    workspaceId: string,
  ): Promise<void> {
    this.logger.log(
      `Starting dashboard module seeding for workspace ${workspaceId}`,
    );

    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();

    if (!mainDataSource) {
      throw new Error('Could not connect to main data source');
    }

    const objectMetadataItems =
      await this.objectMetadataService.findManyWithinWorkspace(workspaceId);

    const widgetObjectMetadata = objectMetadataItems.find(
      (item) => item.nameSingular === 'mktDashboardWidget',
    );

    if (!widgetObjectMetadata) {
      this.logger.log(
        `Dashboard widget object not found in workspace ${workspaceId}, skipping...`,
      );

      return;
    }

    const schemaName = getWorkspaceSchemaName(workspaceId);

    await mainDataSource.transaction(
      async (entityManager: WorkspaceEntityManager) => {
        // Delete existing view if exists
        const existingView = await entityManager
          .createQueryBuilder(undefined, undefined, undefined, {
            shouldBypassPermissionChecks: true,
          })
          .select('*')
          .from(`${schemaName}.view`, 'view')
          .where('view.name = :name', { name: 'All Dashboard Widgets' })
          .andWhere('view.key = :key', { key: 'INDEX' })
          .getRawOne();

        if (existingView) {
          this.logger.log(
            `Dashboard widget view already exists for workspace ${workspaceId}. Deleting and recreating...`,
          );

          await entityManager
            .createQueryBuilder(undefined, undefined, undefined, {
              shouldBypassPermissionChecks: true,
            })
            .delete()
            .from(`${schemaName}.view`)
            .where('name = :name', { name: 'All Dashboard Widgets' })
            .andWhere('key = :key', { key: 'INDEX' })
            .execute();
        }

        // Seed dashboard widgets
        await prefillMktDashboardWidgets(entityManager, schemaName);
        this.logger.log('Dashboard widgets seeded');

        // Seed dashboard layouts
        await prefillMktDashboardLayouts(entityManager, schemaName);
        this.logger.log('Dashboard layouts seeded');

        // Seed dashboard snapshots
        await prefillMktDashboardSnapshots(entityManager, schemaName);
        this.logger.log('Dashboard snapshots seeded');

        // Create view
        const dashboardViewDefinition: DashboardViewDefinition =
          mktDashboardWidgetsAllView(objectMetadataItems);

        if (!dashboardViewDefinition) {
          this.logger.log(
            `Could not create dashboard view definition for workspace ${workspaceId}`,
          );

          return;
        }

        const viewDefinitionWithId = {
          ...dashboardViewDefinition,
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

        this.logger.log(`Dashboard view created for workspace ${workspaceId}`);
      },
    );
  }
}
