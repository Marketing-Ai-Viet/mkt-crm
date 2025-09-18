import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS,
  MKT_USER_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS,
} from 'src/mkt-core/dev-seeder/constants/mkt-user-permission-template-data-seeds.constants';

export const prefillMktUserPermissionTemplates = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
): Promise<void> => {
  const tableName = `${schemaName}."mktUserPermissionTemplate"`;

  // Check if user permission templates already exist
  const existingTemplates = await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .select('*')
    .from(tableName, 'template')
    .getRawMany();

  if (existingTemplates.length === 0) {
    // Prepare data ensuring all fields are present
    const seedData = MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS.map(
      (template) => ({
        ...template,
        // Ensure all optional fields have values (null if not provided)
        expiresAt: template.expiresAt || null,
        assignedById: template.assignedById || null,
        assignmentReason: template.assignmentReason || null,
      }),
    );

    // Insert user permission templates
    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(tableName, MKT_USER_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS)
      .values(seedData)
      .execute();
  }
};
