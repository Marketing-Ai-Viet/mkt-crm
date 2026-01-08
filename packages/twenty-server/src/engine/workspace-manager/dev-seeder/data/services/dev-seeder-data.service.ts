import { Injectable, Logger } from '@nestjs/common';

import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';
import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { computeTableName } from 'src/engine/utils/compute-table-name.util';
import { shouldSeedWorkspaceFavorite } from 'src/engine/utils/should-seed-workspace-favorite';
import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import {
  CALENDAR_CHANNEL_DATA_SEED_COLUMNS,
  CALENDAR_CHANNEL_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/calendar-channel-data-seeds.constant';
import {
  CALENDAR_CHANNEL_EVENT_ASSOCIATION_DATA_SEED_COLUMNS,
  CALENDAR_CHANNEL_EVENT_ASSOCIATION_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/calendar-channel-event-association-data-seeds.constant';
import {
  CALENDAR_EVENT_DATA_SEED_COLUMNS,
  CALENDAR_EVENT_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/calendar-event-data-seeds.constant';
import {
  CALENDAR_EVENT_PARTICIPANT_DATA_SEED_COLUMNS,
  CALENDAR_EVENT_PARTICIPANT_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/calendar-event-participant-data-seeds.constant';
import {
  COMPANY_DATA_SEED_COLUMNS,
  COMPANY_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/company-data-seeds.constant';
import {
  CONNECTED_ACCOUNT_DATA_SEED_COLUMNS,
  CONNECTED_ACCOUNT_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/connected-account-data-seeds.constant';
import {
  MESSAGE_CHANNEL_DATA_SEED_COLUMNS,
  MESSAGE_CHANNEL_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/message-channel-data-seeds.constant';
import {
  MESSAGE_CHANNEL_MESSAGE_ASSOCIATION_DATA_SEED_COLUMNS,
  MESSAGE_CHANNEL_MESSAGE_ASSOCIATION_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/message-channel-message-association-data-seeds.constant';
import {
  MESSAGE_DATA_SEED_COLUMNS,
  MESSAGE_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/message-data-seeds.constant';
import {
  MESSAGE_PARTICIPANT_DATA_SEED_COLUMNS,
  MESSAGE_PARTICIPANT_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/message-participant-data-seeds.constant';
import {
  MESSAGE_THREAD_DATA_SEED_COLUMNS,
  MESSAGE_THREAD_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/message-thread-data-seeds.constant';
import {
  NOTE_DATA_SEED_COLUMNS,
  NOTE_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/note-data-seeds.constant';
import {
  NOTE_TARGET_DATA_SEED_COLUMNS,
  NOTE_TARGET_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/note-target-data-seeds.constant';
import {
  OPPORTUNITY_DATA_SEED_COLUMNS,
  OPPORTUNITY_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/opportunity-data-seeds.constant';
import {
  PERSON_DATA_SEED_COLUMNS,
  PERSON_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/person-data-seeds.constant';
import {
  PET_DATA_SEED_COLUMNS,
  PET_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/pet-data-seeds.constant';
import {
  SURVEY_RESULT_DATA_SEED_COLUMNS,
  SURVEY_RESULT_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/survey-result-data-seeds.constant';
import {
  TASK_DATA_SEED_COLUMNS,
  TASK_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/task-data-seeds.constant';
import {
  TASK_TARGET_DATA_SEED_COLUMNS,
  TASK_TARGET_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/task-target-data-seeds.constant';
import {
  WORKFLOW_DATA_SEED_COLUMNS,
  WORKFLOW_DATA_SEEDS,
  WORKFLOW_VERSION_DATA_SEED_COLUMNS,
  WORKFLOW_VERSION_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/workflow-data-seeds.constants';
import {
  WORKSPACE_MEMBER_DATA_SEED_COLUMNS,
  WORKSPACE_MEMBER_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';
import { TimelineActivitySeederService } from 'src/engine/workspace-manager/dev-seeder/data/services/timeline-activity-seeder.service';
import { prefillViews } from 'src/engine/workspace-manager/standard-objects-prefill-data/prefill-views';
import { prefillWorkspaceFavorites } from 'src/engine/workspace-manager/standard-objects-prefill-data/prefill-workspace-favorites';
import {
  getCompleteMktSeedsByProfile,
  getFirstPhaseSeedsByProfile,
} from 'src/mkt-core/seeder/factories/seed-data.factory';
import {
  DEFAULT_SEED_PROFILE,
  SeedProfile,
  shouldSeedDemoData,
} from 'src/mkt-core/seeder/types/seed-profile.types';

/**
 * Standard Twenty CRM demo data seeds
 * These are only seeded for development/demo profiles
 */
const STANDARD_DEMO_SEEDS_CONFIGS = [
  {
    tableName: 'workspaceMember',
    pgColumns: WORKSPACE_MEMBER_DATA_SEED_COLUMNS,
    recordSeeds: WORKSPACE_MEMBER_DATA_SEEDS,
  },
  {
    tableName: 'company',
    pgColumns: COMPANY_DATA_SEED_COLUMNS,
    recordSeeds: COMPANY_DATA_SEEDS,
  },
  {
    tableName: 'person',
    pgColumns: PERSON_DATA_SEED_COLUMNS,
    recordSeeds: PERSON_DATA_SEEDS,
  },
  {
    tableName: 'note',
    pgColumns: NOTE_DATA_SEED_COLUMNS,
    recordSeeds: NOTE_DATA_SEEDS,
  },
  {
    tableName: 'noteTarget',
    pgColumns: NOTE_TARGET_DATA_SEED_COLUMNS,
    recordSeeds: NOTE_TARGET_DATA_SEEDS,
  },
  {
    tableName: 'opportunity',
    pgColumns: OPPORTUNITY_DATA_SEED_COLUMNS,
    recordSeeds: OPPORTUNITY_DATA_SEEDS,
  },
  {
    tableName: 'connectedAccount',
    pgColumns: CONNECTED_ACCOUNT_DATA_SEED_COLUMNS,
    recordSeeds: CONNECTED_ACCOUNT_DATA_SEEDS,
  },
  {
    tableName: 'calendarChannel',
    pgColumns: CALENDAR_CHANNEL_DATA_SEED_COLUMNS,
    recordSeeds: CALENDAR_CHANNEL_DATA_SEEDS,
  },
  {
    tableName: 'calendarEvent',
    pgColumns: CALENDAR_EVENT_DATA_SEED_COLUMNS,
    recordSeeds: CALENDAR_EVENT_DATA_SEEDS,
  },
  {
    tableName: 'calendarChannelEventAssociation',
    pgColumns: CALENDAR_CHANNEL_EVENT_ASSOCIATION_DATA_SEED_COLUMNS,
    recordSeeds: CALENDAR_CHANNEL_EVENT_ASSOCIATION_DATA_SEEDS,
  },
  {
    tableName: 'calendarEventParticipant',
    pgColumns: CALENDAR_EVENT_PARTICIPANT_DATA_SEED_COLUMNS,
    recordSeeds: CALENDAR_EVENT_PARTICIPANT_DATA_SEEDS,
  },
  {
    tableName: 'messageChannel',
    pgColumns: MESSAGE_CHANNEL_DATA_SEED_COLUMNS,
    recordSeeds: MESSAGE_CHANNEL_DATA_SEEDS,
  },
  {
    tableName: 'messageThread',
    pgColumns: MESSAGE_THREAD_DATA_SEED_COLUMNS,
    recordSeeds: MESSAGE_THREAD_DATA_SEEDS,
  },
  {
    tableName: 'message',
    pgColumns: MESSAGE_DATA_SEED_COLUMNS,
    recordSeeds: MESSAGE_DATA_SEEDS,
  },
  {
    tableName: 'messageChannelMessageAssociation',
    pgColumns: MESSAGE_CHANNEL_MESSAGE_ASSOCIATION_DATA_SEED_COLUMNS,
    recordSeeds: MESSAGE_CHANNEL_MESSAGE_ASSOCIATION_DATA_SEEDS,
  },
  {
    tableName: 'messageParticipant',
    pgColumns: MESSAGE_PARTICIPANT_DATA_SEED_COLUMNS,
    recordSeeds: MESSAGE_PARTICIPANT_DATA_SEEDS,
  },
  {
    tableName: 'workflow',
    pgColumns: WORKFLOW_DATA_SEED_COLUMNS,
    recordSeeds: WORKFLOW_DATA_SEEDS,
  },
  {
    tableName: 'workflowVersion',
    pgColumns: WORKFLOW_VERSION_DATA_SEED_COLUMNS,
    recordSeeds: WORKFLOW_VERSION_DATA_SEEDS,
  },
  {
    tableName: '_pet',
    pgColumns: PET_DATA_SEED_COLUMNS,
    recordSeeds: PET_DATA_SEEDS,
  },
  {
    tableName: '_surveyResult',
    pgColumns: SURVEY_RESULT_DATA_SEED_COLUMNS,
    recordSeeds: SURVEY_RESULT_DATA_SEEDS,
  },
  {
    tableName: 'task',
    pgColumns: TASK_DATA_SEED_COLUMNS,
    recordSeeds: TASK_DATA_SEEDS,
  },
  {
    tableName: 'taskTarget',
    pgColumns: TASK_TARGET_DATA_SEED_COLUMNS,
    recordSeeds: TASK_TARGET_DATA_SEEDS,
  },
];

@Injectable()
export class DevSeederDataService {
  private readonly logger = new Logger(DevSeederDataService.name);

  constructor(
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
    private readonly objectMetadataService: ObjectMetadataService,
    private readonly timelineActivitySeederService: TimelineActivitySeederService,
  ) {}

  /**
   * Seed business data based on profile
   *
   * @param params - Seed parameters
   * @param params.schemaName - Database schema name
   * @param params.workspaceId - Workspace ID
   * @param params.profile - Seed profile (default: DEVELOPMENT)
   */
  public async seed({
    schemaName,
    workspaceId,
    profile = DEFAULT_SEED_PROFILE,
  }: {
    schemaName: string;
    workspaceId: string;
    profile?: SeedProfile;
  }) {
    const mainDataSource =
      await this.workspaceDataSourceService.connectToMainDataSource();

    if (!mainDataSource) {
      throw new Error('Could not connect to main data source');
    }

    this.logger.log(`Seeding business data with profile: ${profile}`);

    // Get MKT seeds based on profile
    const mktFirstPhaseSeeds = getFirstPhaseSeedsByProfile(profile);
    const mktSeeds = getCompleteMktSeedsByProfile(profile);

    // Get standard seeds based on profile
    const standardSeeds = shouldSeedDemoData(profile)
      ? STANDARD_DEMO_SEEDS_CONFIGS
      : [];

    // Combine seeds in correct order:
    // 1. MKT first phase (no FK dependencies)
    // 2. Standard seeds (workspaceMember first for FK references)
    // 3. MKT remaining seeds
    const allRecordSeeds = [
      ...mktFirstPhaseSeeds,
      ...standardSeeds,
      ...mktSeeds.filter(
        (seed) =>
          !mktFirstPhaseSeeds.some((fp) => fp.tableName === seed.tableName),
      ),
    ];

    this.logger.log(`Total seed configs: ${allRecordSeeds.length}`);

    const objectMetadataItems =
      await this.objectMetadataService.findManyWithinWorkspace(workspaceId);

    await mainDataSource.transaction(
      async (entityManager: WorkspaceEntityManager) => {
        for (const recordSeedsConfig of allRecordSeeds) {
          const objectMetadata = objectMetadataItems.find(
            (item) =>
              computeTableName(item.nameSingular, item.isCustom) ===
              recordSeedsConfig.tableName,
          );

          if (!objectMetadata) {
            continue;
          }

          await this.seedRecords({
            entityManager,
            schemaName,
            tableName: recordSeedsConfig.tableName,
            pgColumns: recordSeedsConfig.pgColumns,
            recordSeeds: recordSeedsConfig.recordSeeds,
          });
        }

        // Timeline activities only for development/demo profiles
        if (shouldSeedDemoData(profile)) {
          await this.timelineActivitySeederService.seedTimelineActivities({
            entityManager,
            schemaName,
            workspaceId,
          });
        }

        // Views and favorites are always created
        const viewDefinitionsWithId = await prefillViews(
          entityManager,
          schemaName,
          objectMetadataItems.filter((item) => !item.isCustom),
        );

        await prefillWorkspaceFavorites(
          viewDefinitionsWithId
            .filter(
              (view) =>
                view.key === 'INDEX' &&
                shouldSeedWorkspaceFavorite(
                  view.objectMetadataId,
                  objectMetadataItems,
                ),
            )
            .map((view) => view.id),
          entityManager,
          schemaName,
        );
      },
    );

    this.logger.log(`Business data seeding completed for profile: ${profile}`);
  }

  private async seedRecords({
    entityManager,
    schemaName,
    tableName,
    pgColumns,
    recordSeeds,
  }: {
    entityManager: WorkspaceEntityManager;
    schemaName: string;
    tableName: string;
    pgColumns: string[];
    recordSeeds: Record<string, unknown>[];
  }) {
    if (recordSeeds.length === 0) {
      return;
    }

    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(`${schemaName}.${tableName}`, pgColumns)
      .orIgnore()
      .values(recordSeeds)
      .returning('*')
      .execute();
  }
}
