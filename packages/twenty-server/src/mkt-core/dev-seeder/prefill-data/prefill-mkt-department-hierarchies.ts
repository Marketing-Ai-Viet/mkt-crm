import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_DEPARTMENT_HIERARCHY_DATA_SEED_COLUMNS,
  MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS,
} from 'src/mkt-core/dev-seeder/constants/mkt-department-hierarchy-data-seeds.constants';

export const prefillMktDepartmentHierarchies = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktDepartmentHierarchy`,
      MKT_DEPARTMENT_HIERARCHY_DATA_SEED_COLUMNS,
    )
    .values(MKT_DEPARTMENT_HIERARCHY_DATA_SEEDS)
    .execute();
};
