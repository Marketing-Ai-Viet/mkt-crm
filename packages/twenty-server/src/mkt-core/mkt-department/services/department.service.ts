import { Injectable, NotFoundException } from '@nestjs/common';

import {
  DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES,
  MAX_DEPTH,
} from 'src/mkt-core/mkt-department/constants/relationship-type.constants';
import { DEPARTMENT_MESSAGES } from 'src/mkt-core/mkt-department/messages';
import {
  MktDepartmentRepository,
  MktDepartmentHierarchyRepository,
} from 'src/mkt-core/mkt-department/repositories';
import {
  DepartmentAncestor,
  DepartmentDescendant,
  DepartmentTreeNode,
  DepartmentTreeOptions,
  HierarchyStatistics,
} from 'src/mkt-core/mkt-department/types';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department.workspace-entity';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly departmentRepository: MktDepartmentRepository,
    private readonly hierarchyRepository: MktDepartmentHierarchyRepository,
  ) {}

  /**
   * Get complete department tree from root
   */
  async getDepartmentTree(
    workspaceId: string,
    departmentId: string,
    options: DepartmentTreeOptions = {},
  ): Promise<DepartmentTreeNode> {
    // Step 1: Find root department
    const rootDepartment = await this.findRootDepartment(
      workspaceId,
      departmentId,
      options,
    );

    // Step 2: Build tree from root
    const tree = await this.buildTreeFromRoot(
      workspaceId,
      rootDepartment.id,
      options,
      0,
    );

    if (!tree) {
      throw new NotFoundException(
        DEPARTMENT_MESSAGES.ERROR.BUILD_TREE_FAILED(departmentId),
      );
    }

    return tree;
  }

  /**
   * Get subtree starting from specific department
   */
  async getDepartmentSubtree(
    workspaceId: string,
    departmentId: string,
    options: DepartmentTreeOptions = {},
  ): Promise<DepartmentTreeNode> {
    await this.validateDepartmentExists(workspaceId, departmentId);

    const tree = await this.buildTreeFromRoot(
      workspaceId,
      departmentId,
      options,
      0,
    );

    if (!tree) {
      throw new NotFoundException(
        DEPARTMENT_MESSAGES.ERROR.BUILD_SUBTREE_FAILED(departmentId),
      );
    }

    return tree;
  }

  /**
   * Get all ancestors of a department
   */
  async getDepartmentAncestors(
    workspaceId: string,
    departmentId: string,
    relationshipTypes?: string[],
  ): Promise<DepartmentAncestor[]> {
    await this.validateDepartmentExists(workspaceId, departmentId);

    const ancestors: DepartmentAncestor[] = [];
    let currentDeptId = departmentId;
    let distance = 0;
    const visited = new Set<string>();

    while (currentDeptId && !visited.has(currentDeptId)) {
      visited.add(currentDeptId);
      distance++;

      const parentHierarchy =
        await this.hierarchyRepository.findParentHierarchy(
          currentDeptId,
          relationshipTypes,
        );

      if (!parentHierarchy) break;

      ancestors.push({
        id: parentHierarchy.parentDepartment.id,
        departmentCode: parentHierarchy.parentDepartment.departmentCode,
        departmentName: parentHierarchy.parentDepartment.departmentName,
        level: (parentHierarchy.hierarchyLevel ?? 1) - 1,
        relationshipType: parentHierarchy.relationshipType ?? '',
        hierarchyId: parentHierarchy.id,
        distance,
      });

      currentDeptId = parentHierarchy.parentDepartmentId;
    }

    return ancestors.reverse(); // Root first
  }

  /**
   * Get all descendants of a department
   */
  async getDepartmentDescendants(
    workspaceId: string,
    departmentId: string,
    maxDepth = MAX_DEPTH,
    relationshipTypes?: string[],
  ): Promise<DepartmentDescendant[]> {
    await this.validateDepartmentExists(workspaceId, departmentId);

    const descendants: DepartmentDescendant[] = [];

    await this.collectDescendants(
      workspaceId,
      departmentId,
      descendants,
      maxDepth,
      0,
      [],
      relationshipTypes,
    );

    return descendants;
  }

  /**
   * Get hierarchy statistics
   */
  async getHierarchyStatistics(
    workspaceId: string,
  ): Promise<HierarchyStatistics> {
    const [
      totalHierarchies,
      activeHierarchies,
      maxDepth,
      averageDepth,
      orphanedCount,
      circularCount,
    ] = await Promise.all([
      this.hierarchyRepository.count(),
      this.hierarchyRepository.countActive(),
      this.hierarchyRepository.getMaxLevel(),
      this.hierarchyRepository.getAverageLevel(),
      this.countOrphanedDepartments(),
      this.detectCircularReferences(workspaceId),
    ]);

    return {
      totalHierarchies,
      activeHierarchies,
      maxDepth,
      averageDepth,
      orphanedDepartments: orphanedCount,
      circularReferences: circularCount,
    };
  }

  /**
   * Get complete department structure (all root departments with their trees)
   */
  async getCompleteDepartmentStructure(
    workspaceId: string,
    options: DepartmentTreeOptions = {},
  ): Promise<DepartmentTreeNode[]> {
    // Find all root departments (departments that don't have parents)
    const rootDepartments = await this.findAllRootDepartments(
      workspaceId,
      options,
    );

    // Build trees for each root department
    const trees = await Promise.all(
      rootDepartments.map(async (rootDept) => {
        return await this.buildTreeFromRoot(
          workspaceId,
          rootDept.id,
          options,
          0,
        );
      }),
    );

    // Filter out null results and return
    return trees.filter((tree) => tree !== null) as DepartmentTreeNode[];
  }

  /**
   * Rebuild hierarchy paths for all hierarchies
   */
  async rebuildAllHierarchyPaths(workspaceId: string): Promise<number> {
    let rebuilt = 0;

    // Process level by level to maintain dependencies
    for (let level = 0; level <= MAX_DEPTH; level++) {
      const hierarchies = await this.hierarchyRepository.findByLevel(
        level,
        true,
      );

      for (const hierarchy of hierarchies) {
        const path = await this.computeHierarchyPath(
          workspaceId,
          hierarchy.childDepartmentId,
        );

        await this.hierarchyRepository.update(hierarchy.id, {
          hierarchyPath: path,
        });
        rebuilt++;
      }
    }

    return rebuilt;
  }

  // Private helper methods
  private async findAllRootDepartments(
    workspaceId: string,
    options: DepartmentTreeOptions = {},
  ): Promise<MktDepartmentWorkspaceEntity[]> {
    const { relationshipTypes, includeInactive = false } = options;

    // Get all departments
    const allDepartments = await this.departmentRepository.findAll();

    // Get all hierarchies based on filters
    const hierarchies = await this.hierarchyRepository.findAllWithFilters({
      isActive: !includeInactive ? true : undefined,
      relationshipTypes:
        relationshipTypes && relationshipTypes.length > 0
          ? relationshipTypes
          : [DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES.PARENT_CHILD],
    });

    // Collect all department IDs that are children (have parents)
    const childDepartmentIds = new Set<string>();

    for (const hierarchy of hierarchies) {
      if (hierarchy.childDepartmentId) {
        childDepartmentIds.add(hierarchy.childDepartmentId);
      }
    }

    // Root departments are those that don't appear as children in any hierarchy
    return allDepartments.filter((dept) => !childDepartmentIds.has(dept.id));
  }

  private async findRootDepartment(
    workspaceId: string,
    departmentId: string,
    options: DepartmentTreeOptions = {},
  ): Promise<MktDepartmentWorkspaceEntity> {
    const { relationshipTypes } = options;
    let currentDeptId = departmentId;
    const visited = new Set<string>();

    while (currentDeptId && !visited.has(currentDeptId)) {
      visited.add(currentDeptId);

      const parentHierarchy =
        await this.hierarchyRepository.findParentHierarchy(
          currentDeptId,
          relationshipTypes && relationshipTypes.length > 0
            ? relationshipTypes
            : undefined,
        );

      if (!parentHierarchy) break;
      currentDeptId = parentHierarchy.parentDepartmentId;
    }

    const rootDepartment =
      await this.departmentRepository.findById(currentDeptId);

    if (!rootDepartment) {
      throw new NotFoundException(
        DEPARTMENT_MESSAGES.ERROR.ROOT_DEPARTMENT_NOT_FOUND(departmentId),
      );
    }

    return rootDepartment;
  }

  private async buildTreeFromRoot(
    workspaceId: string,
    rootId: string,
    options: DepartmentTreeOptions = {},
    currentDepth = 0,
  ): Promise<DepartmentTreeNode | null> {
    const { maxDepth = MAX_DEPTH } = options;

    if (currentDepth >= maxDepth) return null;

    const department = await this.findDepartmentById(workspaceId, rootId);
    const children = await this.buildChildrenNodes(
      workspaceId,
      rootId,
      options,
      currentDepth,
    );

    return this.createDepartmentTreeNode(department, currentDepth, children);
  }

  private async findDepartmentById(
    workspaceId: string,
    departmentId: string,
  ): Promise<MktDepartmentWorkspaceEntity> {
    const department = await this.departmentRepository.findById(departmentId);

    if (!department) {
      throw new NotFoundException(
        DEPARTMENT_MESSAGES.ERROR.DEPARTMENT_NOT_FOUND(departmentId),
      );
    }

    return department;
  }

  private async buildChildrenNodes(
    workspaceId: string,
    parentId: string,
    options: DepartmentTreeOptions,
    currentDepth: number,
  ): Promise<DepartmentTreeNode[]> {
    const {
      maxDepth = MAX_DEPTH,
      includeInactive,
      relationshipTypes,
      sortBy,
      sortDirection,
    } = options;

    if (currentDepth >= maxDepth - 1) {
      return [];
    }

    const childHierarchies =
      await this.hierarchyRepository.findChildHierarchies(parentId, {
        includeInactive,
        relationshipTypes,
        sortBy,
        sortDirection: sortDirection as 'ASC' | 'DESC',
      });

    const childPromises = childHierarchies.map(async (hierarchy) => {
      const childTree = await this.buildTreeFromRoot(
        workspaceId,
        hierarchy.childDepartmentId,
        options,
        currentDepth + 1,
      );

      if (childTree) {
        childTree.relationshipType = hierarchy.relationshipType ?? undefined;
        childTree.hierarchyId = hierarchy.id;
      }

      return childTree;
    });

    const children = await Promise.all(childPromises);

    return children.filter(Boolean) as DepartmentTreeNode[];
  }

  private createDepartmentTreeNode(
    department: MktDepartmentWorkspaceEntity,
    currentDepth: number,
    children: DepartmentTreeNode[],
  ): DepartmentTreeNode {
    return {
      id: department.id,
      departmentCode: department.departmentCode,
      departmentName: department.departmentName,
      level: currentDepth,
      children,
      relationshipType: currentDepth === 0 ? undefined : undefined,
      hierarchyId: currentDepth === 0 ? undefined : undefined,
    };
  }

  private async collectDescendants(
    workspaceId: string,
    parentId: string,
    descendants: DepartmentDescendant[],
    maxDepth: number,
    currentDepth: number,
    currentPath: string[],
    relationshipTypes?: string[],
  ): Promise<void> {
    if (currentDepth >= maxDepth) return;

    const childHierarchies =
      await this.hierarchyRepository.findChildHierarchies(parentId, {
        includeInactive: false,
        relationshipTypes,
        sortBy: 'displayOrder',
        sortDirection: 'ASC',
      });

    for (const hierarchy of childHierarchies) {
      const newPath = [
        ...currentPath,
        hierarchy.childDepartment.departmentCode,
      ];

      descendants.push({
        id: hierarchy.childDepartment.id,
        departmentCode: hierarchy.childDepartment.departmentCode,
        departmentName: hierarchy.childDepartment.departmentName,
        level: hierarchy.hierarchyLevel ?? 0,
        relationshipType: hierarchy.relationshipType ?? '',
        hierarchyId: hierarchy.id,
        distance: currentDepth + 1,
        path: newPath,
      });

      // Recursive call for deeper levels
      await this.collectDescendants(
        workspaceId,
        hierarchy.childDepartmentId,
        descendants,
        maxDepth,
        currentDepth + 1,
        newPath,
        relationshipTypes,
      );
    }
  }

  private async computeHierarchyPath(
    workspaceId: string,
    departmentId: string,
  ): Promise<string[]> {
    const path: string[] = [];
    let currentDeptId = departmentId;
    const visited = new Set<string>();

    while (currentDeptId && !visited.has(currentDeptId)) {
      visited.add(currentDeptId);

      const parentHierarchy =
        await this.hierarchyRepository.findParentHierarchy(currentDeptId, [
          DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES.PARENT_CHILD,
        ]);

      if (!parentHierarchy) break;

      path.unshift(parentHierarchy.parentDepartmentId);
      currentDeptId = parentHierarchy.parentDepartmentId;
    }

    return path;
  }

  private async validateDepartmentExists(
    workspaceId: string,
    departmentId: string,
  ): Promise<void> {
    const exists = await this.departmentRepository.exists(departmentId);

    if (!exists) {
      throw new NotFoundException(
        DEPARTMENT_MESSAGES.ERROR.DEPARTMENT_NOT_FOUND(departmentId),
      );
    }
  }

  private async countOrphanedDepartments(): Promise<number> {
    const allDepartments = await this.departmentRepository.findAll();
    const hierarchies = await this.hierarchyRepository.findAll();

    const departmentsInHierarchy = new Set<string>();

    for (const h of hierarchies) {
      if (h.parentDepartmentId)
        departmentsInHierarchy.add(h.parentDepartmentId);
      if (h.childDepartmentId) departmentsInHierarchy.add(h.childDepartmentId);
    }

    return allDepartments.filter((d) => !departmentsInHierarchy.has(d.id))
      .length;
  }

  private async detectCircularReferences(
    _workspaceId: string,
  ): Promise<number> {
    // TODO: Implement circular reference detection
    // This would require more complex graph traversal logic
    return 0;
  }
}
