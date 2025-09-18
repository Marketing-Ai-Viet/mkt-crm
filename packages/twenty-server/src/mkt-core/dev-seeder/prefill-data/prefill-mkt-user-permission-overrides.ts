import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_USER_PERMISSION_OVERRIDE_DATA_SEEDS,
  MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_COLUMNS,
} from 'src/mkt-core/dev-seeder/constants/mkt-user-permission-override-data-seeds.constants';

export const prefillMktUserPermissionOverrides = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
): Promise<void> => {
  const tableName = `${schemaName}."mktUserPermissionOverride"`;

  // Check if user permission overrides already exist
  const existingOverrides = await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .select('*')
    .from(tableName, 'override')
    .getRawMany();

  if (existingOverrides.length === 0) {
    // Prepare data ensuring all fields are present
    const seedData = MKT_USER_PERMISSION_OVERRIDE_DATA_SEEDS.map(
      (override) => ({
        ...override,
        // Ensure all optional fields have values (null if not provided)
        contextFilter: override.contextFilter || null,
        expiresAt: override.expiresAt || null,
        reasonDescription: override.reasonDescription || null,
        approvedById: override.approvedById || null,
        approvedAt: override.approvedAt || null,
      }),
    );

    // Insert user permission overrides
    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(tableName, MKT_USER_PERMISSION_OVERRIDE_DATA_SEED_COLUMNS)
      .values(seedData)
      .execute();
  }
};
