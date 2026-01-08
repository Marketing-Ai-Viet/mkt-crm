import { Injectable, Logger } from '@nestjs/common';

import { TypeORMService } from 'src/database/typeorm/typeorm.service';
import { FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { DataSourceService } from 'src/engine/metadata-modules/data-source/data-source.service';
import { WorkspaceCacheStorageService } from 'src/engine/workspace-cache-storage/workspace-cache-storage.service';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import { DevSeederPermissionsService } from 'src/engine/workspace-manager/dev-seeder/core/services/dev-seeder-permissions.service';
import { seedCoreSchema } from 'src/engine/workspace-manager/dev-seeder/core/utils/seed-core-schema.util';
import { DevSeederDataService } from 'src/engine/workspace-manager/dev-seeder/data/services/dev-seeder-data.service';
import { DevSeederMetadataService } from 'src/engine/workspace-manager/dev-seeder/metadata/services/dev-seeder-metadata.service';
import { WorkspaceSyncMetadataService } from 'src/engine/workspace-manager/workspace-sync-metadata/workspace-sync-metadata.service';
import { SeedConfigService } from 'src/mkt-core/seeder/services/seed-config.service';
import { shouldSeedDemoData } from 'src/mkt-core/seeder/types/seed-profile.types';

@Injectable()
export class DevSeederService {
  private readonly logger = new Logger(DevSeederService.name);

  constructor(
    private readonly typeORMService: TypeORMService,
    private readonly workspaceCacheStorageService: WorkspaceCacheStorageService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
    private readonly dataSourceService: DataSourceService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly workspaceSyncMetadataService: WorkspaceSyncMetadataService,
    private readonly devSeederMetadataService: DevSeederMetadataService,
    private readonly devSeederPermissionsService: DevSeederPermissionsService,
    private readonly devSeederDataService: DevSeederDataService,
    private readonly seedConfigService: SeedConfigService,
  ) {}

  /**
   * Seed development workspace with data
   *
   * @param workspaceId - Optional workspace ID (uses env config if not provided)
   */
  public async seedDev(workspaceId?: string): Promise<void> {
    const mainDataSource = this.typeORMService.getMainDataSource();

    if (!mainDataSource) {
      throw new Error('Could not connect to workspace data source');
    }

    // Get seed configuration from environment
    const config = await this.seedConfigService.getConfig();
    const effectiveWorkspaceId = workspaceId || config.workspace.id;
    const profile = config.profile;

    this.logger.log(`========================================`);
    this.logger.log(`Starting seed with profile: ${profile}`);
    this.logger.log(`Workspace ID: ${effectiveWorkspaceId}`);
    this.logger.log(`Workspace Name: ${config.workspace.displayName}`);
    this.logger.log(`User Email: ${config.user.email}`);
    this.logger.log(`Include demo data: ${shouldSeedDemoData(profile)}`);
    this.logger.log(`========================================`);

    const isBillingEnabled = this.twentyConfigService.get('IS_BILLING_ENABLED');
    const appVersion = this.twentyConfigService.get('APP_VERSION');

    // Seed core schema with environment config
    await seedCoreSchema({
      dataSource: mainDataSource,
      workspaceId: effectiveWorkspaceId,
      seedBilling: isBillingEnabled,
      appVersion,
      workspaceConfig: config.workspace,
      userConfig: config.user,
      // Include legacy users only for development/demo profiles
      includeLegacyUsers: shouldSeedDemoData(profile),
    });

    const schemaName =
      await this.workspaceDataSourceService.createWorkspaceDBSchema(
        effectiveWorkspaceId,
      );

    const dataSourceMetadata =
      await this.dataSourceService.createDataSourceMetadata(
        effectiveWorkspaceId,
        schemaName,
      );

    const featureFlags =
      await this.featureFlagService.getWorkspaceFeatureFlagsMap(
        effectiveWorkspaceId,
      );

    await this.workspaceSyncMetadataService.synchronize({
      workspaceId: effectiveWorkspaceId,
      dataSourceId: dataSourceMetadata.id,
      featureFlags,
    });

    await this.devSeederMetadataService.seed({
      dataSourceMetadata,
      workspaceId: effectiveWorkspaceId,
    });

    await this.devSeederPermissionsService.initPermissions(
      effectiveWorkspaceId,
    );

    // Seed business data with profile
    await this.devSeederDataService.seed({
      schemaName: dataSourceMetadata.schema,
      workspaceId: effectiveWorkspaceId,
      profile,
    });

    await this.workspaceCacheStorageService.flush(
      effectiveWorkspaceId,
      undefined,
    );

    this.logger.log(`Seed completed successfully for profile: ${profile}`);
  }
}
