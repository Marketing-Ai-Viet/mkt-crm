import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_DEPARTMENT_DATA_SEED_COLUMNS,
  MKT_DEPARTMENT_DATA_SEEDS,
} from 'src/mkt-core/dev-seeder/constants/mkt-department-data-seeds.constants';

export const prefillMktDepartments = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktDepartment`, MKT_DEPARTMENT_DATA_SEED_COLUMNS)
    .values(MKT_DEPARTMENT_DATA_SEEDS)
    .execute();
};
