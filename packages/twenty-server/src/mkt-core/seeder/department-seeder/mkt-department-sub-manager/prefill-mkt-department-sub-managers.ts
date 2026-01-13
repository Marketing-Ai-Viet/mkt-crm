import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_DEPARTMENT_SUB_MANAGER_DATA_SEED_COLUMNS,
  MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS,
} from 'src/mkt-core/seeder/department-seeder/mkt-department-sub-manager/mkt-department-sub-manager-data-seeds.constants';

export const prefillMktDepartmentSubManagers = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktDepartmentSubManager`,
      MKT_DEPARTMENT_SUB_MANAGER_DATA_SEED_COLUMNS,
    )
    .values(MKT_DEPARTMENT_SUB_MANAGER_DATA_SEEDS)
    .execute();
};
