import { DataSource } from 'typeorm';

import { seedBillingSubscriptions } from 'src/engine/workspace-manager/dev-seeder/core/billing/utils/seed-billing-subscriptions.util';
import { seedAgents } from 'src/engine/workspace-manager/dev-seeder/core/utils/seed-agents.util';
import { seedApiKeys } from 'src/engine/workspace-manager/dev-seeder/core/utils/seed-api-keys.util';
import { seedFeatureFlags } from 'src/engine/workspace-manager/dev-seeder/core/utils/seed-feature-flags.util';
import { seedUserWorkspaces } from 'src/engine/workspace-manager/dev-seeder/core/utils/seed-user-workspaces.util';
import { seedUsers } from 'src/engine/workspace-manager/dev-seeder/core/utils/seed-users.util';
import { seedWorkspaces } from 'src/engine/workspace-manager/dev-seeder/core/utils/seed-workspaces.util';
import {
  SeedUserConfig,
  SeedWorkspaceConfig,
} from 'src/mkt-core/seeder/services/seed-config.service';

type SeedCoreSchemaArgs = {
  dataSource: DataSource;
  workspaceId: string;
  appVersion: string | undefined;
  seedBilling?: boolean;
  seedFeatureFlags?: boolean;
  /** Optional workspace config from environment variables */
  workspaceConfig?: SeedWorkspaceConfig;
  /** Optional user config from environment variables */
  userConfig?: SeedUserConfig;
  /** Whether to include legacy demo users (default: false for production) */
  includeLegacyUsers?: boolean;
};

export const seedCoreSchema = async ({
  appVersion,
  dataSource,
  workspaceId,
  seedBilling = true,
  seedFeatureFlags: shouldSeedFeatureFlags = true,
  workspaceConfig,
  userConfig,
  includeLegacyUsers = false,
}: SeedCoreSchemaArgs) => {
  const schemaName = 'core';

  await seedWorkspaces({
    dataSource,
    schemaName,
    workspaceId,
    appVersion,
    workspaceConfig,
  });

  await seedUsers({
    dataSource,
    schemaName,
    userConfig,
    includeLegacyUsers,
  });

  await seedUserWorkspaces(dataSource, schemaName, workspaceId);

  await seedAgents(dataSource, schemaName, workspaceId);

  await seedApiKeys(dataSource, schemaName, workspaceId);

  if (shouldSeedFeatureFlags) {
    await seedFeatureFlags(dataSource, schemaName, workspaceId);
  }

  if (seedBilling) {
    await seedBillingSubscriptions(dataSource, schemaName, workspaceId);
  }
};
