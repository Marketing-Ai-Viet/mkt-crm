import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_PERMISSION_AUDIT_DATA_SEED_COLUMNS,
  MKT_PERMISSION_AUDIT_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-audit/mkt-permission-audit-data-seeds.constants';

export const prefillMktPermissionAudits = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  const tableName = `${schemaName}."mktPermissionAudit"`;

  // Check if permission audits already exist
  const existingPermissionAudits = await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .select('*')
    .from(tableName, 'audit')
    .getRawMany();

  if (existingPermissionAudits.length === 0) {
    // Prepare data with JSON stringification for complex fields
    const seedData = MKT_PERMISSION_AUDIT_DATA_SEEDS.map((audit) => ({
      ...audit,
      // Stringify object fields for database insertion
      requestContext: audit.requestContext
        ? JSON.stringify(audit.requestContext)
        : null,
      stepResults: audit.stepResults ? JSON.stringify(audit.stepResults) : null,
      metadata: audit.metadata ? JSON.stringify(audit.metadata) : null,
    }));

    // Insert permission audits
    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(tableName, MKT_PERMISSION_AUDIT_DATA_SEED_COLUMNS)
      .values(seedData)
      .execute();
  }
};
