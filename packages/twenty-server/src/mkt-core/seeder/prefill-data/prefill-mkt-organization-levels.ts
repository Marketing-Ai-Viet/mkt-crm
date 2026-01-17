import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
  MKT_ORGANIZATION_LEVEL_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-organization-level-data-seeds.constants';

export const prefillMktOrganizationLevels = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  // Step 1: Clear foreign key references from workspaceMember
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .update(`${schemaName}.workspaceMember`)
    .set({ organizationLevelId: null })
    .execute();

  // Step 2: Delete all existing organization levels
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .delete()
    .from(`${schemaName}.mktOrganizationLevel`)
    .execute();

  // Step 3: Insert new organization levels (11 levels)
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktOrganizationLevel`,
      MKT_ORGANIZATION_LEVEL_DATA_SEED_COLUMNS,
    )
    .values(MKT_ORGANIZATION_LEVEL_DATA_SEEDS)
    .execute();
};
