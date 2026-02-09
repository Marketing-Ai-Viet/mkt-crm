import { WorkspaceDataSource } from 'src/engine/twenty-orm/datasource/workspace.datasource';

/**
 * Helper to resolve department hierarchy and build SQL filters for dashboard queries.
 *
 * When a departmentId is provided, it resolves to [self + child departments],
 * allowing queries to filter by all members within a department and its teams.
 */
export class DepartmentFilterHelper {
  /**
   * Resolve a departmentId to an array of IDs (self + child departments).
   * Returns undefined if no departmentId provided (skip filtering).
   */
  static async resolveDepartmentIds(
    dataSource: WorkspaceDataSource,
    departmentId?: string,
  ): Promise<string[] | undefined> {
    if (!departmentId) {
      return undefined;
    }

    const rows: Array<{ childDepartmentId: string }> = await dataSource.query(
      `SELECT "childDepartmentId"
      FROM "mktDepartmentHierarchy"
      WHERE "parentDepartmentId" = $1
        AND "deletedAt" IS NULL`,
      [departmentId],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    const childIds = rows.map((r) => r.childDepartmentId);

    return [departmentId, ...childIds];
  }

  /**
   * Build a SQL WHERE fragment that filters by owner membership in resolved departments.
   * Returns { clause, params } or null if no filter needed.
   *
   * @param ownerColumn - The column referencing workspaceMember (e.g. `"accountOwnerId"`, `o."accountOwnerId"`)
   * @param departmentIds - Resolved department IDs from resolveDepartmentIds()
   * @param paramIndex - The next $N index to use for parameterized queries
   */
  static buildOwnerFilter(
    ownerColumn: string,
    departmentIds: string[] | undefined,
    paramIndex: number,
  ): { clause: string; params: string[] } | null {
    if (!departmentIds) {
      return null;
    }

    return {
      clause: `AND ${ownerColumn} IN (
        SELECT id FROM "workspaceMember"
        WHERE "deletedAt" IS NULL AND "departmentId" = ANY($${paramIndex})
      )`,
      params: departmentIds,
    };
  }
}
