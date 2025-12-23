import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { DataSource } from 'typeorm';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { SeedWorkspaceConfig } from 'src/mkt-core/seeder/services/seed-config.service';
import { extractVersionMajorMinorPatch } from 'src/utils/version/extract-version-major-minor-patch';

const tableName = 'workspace';

// Legacy constants for backward compatibility
export const SEED_APPLE_WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
export const SEED_YCOMBINATOR_WORKSPACE_ID =
  '3b8e6458-5fc1-4e63-8563-008ccddaa6db';

export type SeedWorkspaceArgs = {
  dataSource: DataSource;
  schemaName: string;
  workspaceId: string;
  appVersion: string | undefined;
  /** Optional workspace config from environment variables */
  workspaceConfig?: SeedWorkspaceConfig;
};

const workspaceSeederFields = [
  'id',
  'displayName',
  'subdomain',
  'inviteHash',
  'logo',
  'activationStatus',
  'version',
  'isTwoFactorAuthenticationEnforced',
] as const satisfies (keyof Workspace)[];

type WorkspaceSeederFields = Pick<
  Workspace,
  (typeof workspaceSeederFields)[number]
>;

/**
 * Legacy workspaces for backward compatibility
 * Used when no workspaceConfig is provided
 */
const LEGACY_WORKSPACES: Record<string, Partial<WorkspaceSeederFields>> = {
  [SEED_APPLE_WORKSPACE_ID]: {
    displayName: 'Apple',
    subdomain: 'apple',
    inviteHash: 'apple.dev-invite-hash',
    logo: 'https://twentyhq.github.io/placeholder-images/workspaces/apple-logo.png',
  },
  [SEED_YCOMBINATOR_WORKSPACE_ID]: {
    displayName: 'YCombinator',
    subdomain: 'yc',
    inviteHash: 'yc.dev-invite-hash',
    logo: 'https://twentyhq.github.io/placeholder-images/workspaces/ycombinator-logo.png',
  },
};

export const seedWorkspaces = async ({
  schemaName,
  dataSource,
  workspaceId,
  appVersion,
  workspaceConfig,
}: SeedWorkspaceArgs) => {
  const version = extractVersionMajorMinorPatch(appVersion);

  // Use config from env if provided, otherwise fall back to legacy
  const legacyConfig = LEGACY_WORKSPACES[workspaceId];

  // Build workspace data from config or legacy
  let workspaceData: WorkspaceSeederFields;

  if (workspaceConfig) {
    // Use environment-based config
    workspaceData = {
      id: workspaceId,
      displayName: workspaceConfig.displayName,
      subdomain: workspaceConfig.subdomain,
      inviteHash: workspaceConfig.inviteHash,
      logo: undefined,
      activationStatus: WorkspaceActivationStatus.PENDING_CREATION,
      version: version,
      isTwoFactorAuthenticationEnforced: false,
    };
  } else if (legacyConfig) {
    // Use legacy config for backward compatibility
    workspaceData = {
      id: workspaceId,
      displayName: legacyConfig.displayName || 'MKT CRM',
      subdomain: legacyConfig.subdomain || 'mkt',
      inviteHash: legacyConfig.inviteHash || 'mkt-invite-hash',
      logo: legacyConfig.logo ?? undefined,
      activationStatus: WorkspaceActivationStatus.PENDING_CREATION,
      version: version,
      isTwoFactorAuthenticationEnforced: false,
    };
  } else {
    // Create new workspace with provided ID and default values
    workspaceData = {
      id: workspaceId,
      displayName: 'MKT CRM',
      subdomain: 'mkt',
      inviteHash: 'mkt-invite-hash',
      logo: undefined,
      activationStatus: WorkspaceActivationStatus.PENDING_CREATION,
      version: version,
      isTwoFactorAuthenticationEnforced: false,
    };
  }

  await dataSource
    .createQueryBuilder()
    .insert()
    .into(`${schemaName}.${tableName}`, workspaceSeederFields)
    .orIgnore()
    .values(workspaceData)
    .execute();
};

export const deleteWorkspaces = async (
  dataSource: DataSource,
  schemaName: string,
  workspaceId: string,
) => {
  await dataSource
    .createQueryBuilder()
    .delete()
    .from(`${schemaName}.${tableName}`)
    .where(`${tableName}."id" = :id`, { id: workspaceId })
    .execute();
};
