import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { DEPARTMENT_MANAGER_ASSIGNMENTS } from 'src/mkt-core/seeder/department-seeder/mkt-department/mkt-department-data-seeds.constants';

/**
 * Phase 3: Update department managers sau khi workspace members đã được seed
 * Giải quyết circular dependency: Department.managerId -> WorkspaceMember
 */
export const updateMktDepartmentManagers = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  // Update từng department với managerId tương ứng
  for (const assignment of DEPARTMENT_MANAGER_ASSIGNMENTS) {
    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .update(`${schemaName}.mktDepartment`)
      .set({ managerId: assignment.managerId })
      .where('id = :id', { id: assignment.departmentId })
      .execute();
  }
};
