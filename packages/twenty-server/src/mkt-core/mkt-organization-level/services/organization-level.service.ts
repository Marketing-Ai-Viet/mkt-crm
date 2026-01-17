import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { In } from 'typeorm';

import { getHierarchyLevelValidationError } from 'src/mkt-core/mkt-organization-level/validators/hierarchy-level-range.validator';
import {
  HIERARCHY_PERFORMANCE_LIMITS,
  MAX_ORGANIZATION_HIERARCHY_DEPTH,
} from 'src/mkt-core/mkt-organization-level/constants/hierarchy-constraints.constants';
import {
  CreateOrganizationLevelInput,
  LevelEmployeeCount,
  OrganizationLevelHierarchyNode,
  OrganizationLevelQueryOptions,
  OrganizationLevelStatistics,
  UpdateOrganizationLevelInput,
} from 'src/mkt-core/mkt-organization-level/graphql-types';
import { MktOrganizationLevelWorkspaceEntity } from 'src/mkt-core/mkt-organization-level/workspace-entity/mkt-organization-level.workspace-entity';
import { OrganizationLevelHierarchyValidator } from 'src/mkt-core/mkt-organization-level/validators/hierarchy-validator';
import { MktOrganizationLevelRepository } from 'src/mkt-core/mkt-organization-level/repositories/mkt-organization-level.repository';

@Injectable()
export class OrganizationLevelService {
  private readonly logger = new Logger('MktOrganizationLevel:Service');

  constructor(
    private readonly repository: MktOrganizationLevelRepository,
    private readonly hierarchyValidator: OrganizationLevelHierarchyValidator,
  ) {}

  /**
   * Get organization level hierarchy tree
   */
  async getOrganizationLevelHierarchy(
    workspaceId: string,
    options: OrganizationLevelQueryOptions = {},
  ): Promise<OrganizationLevelHierarchyNode[]> {
    this.logger.debug('Getting organization level hierarchy');

    const organizationLevelRepository = await this.repository.getRepository();

    // Build query conditions
    const whereConditions: Record<string, unknown> = {};

    if (!options.includeInactive) {
      whereConditions.isActive = true;
    }
    if (options.levelCodes?.length) {
      whereConditions.levelCode = In(options.levelCodes);
    }
    if (options.hierarchyLevels?.length) {
      whereConditions.hierarchyLevel = In(options.hierarchyLevels);
    }

    // Get all organization levels
    const organizationLevels = await organizationLevelRepository.find({
      where: whereConditions,
      order: { hierarchyLevel: 'ASC', displayOrder: 'ASC' },
    });

    if (organizationLevels.length === 0) {
      return [];
    }

    // Get employee counts in one query to avoid N+1
    const levelIds = organizationLevels.map((l) => l.id);
    const employeeCounts = options.includeStatistics
      ? await this.repository.getEmployeeCountsByLevels(levelIds)
      : new Map<string, number>();

    // Build hierarchy tree
    const levelMap = new Map<string, OrganizationLevelHierarchyNode>();
    const rootLevels: OrganizationLevelHierarchyNode[] = [];

    // First pass: Create nodes
    for (const level of organizationLevels) {
      const node = this.buildHierarchyNode(
        level,
        employeeCounts.get(level.id) ?? 0,
        options.includeStatistics ?? false,
      );

      levelMap.set(level.id, node);

      // Root levels (hierarchyLevel = 1 or no parent)
      if (level.hierarchyLevel === 1 || !level.parentLevelId) {
        rootLevels.push(node);
      }
    }

    // Second pass: Build parent-child relationships
    for (const level of organizationLevels) {
      const node = levelMap.get(level.id);

      if (!node) {
        continue;
      }

      if (level.parentLevelId) {
        const parentNode = levelMap.get(level.parentLevelId);

        if (parentNode) {
          node.parent = parentNode;
          parentNode.children.push(node);
        }
      }
    }

    // Calculate descendant counts
    this.calculateDescendantCounts(rootLevels);

    return rootLevels;
  }

  /**
   * Get single organization level with hierarchy context
   */
  async getOrganizationLevel(
    workspaceId: string,
    levelId: string,
    options: OrganizationLevelQueryOptions = {},
  ): Promise<OrganizationLevelHierarchyNode> {
    const organizationLevel = await this.repository.findById(levelId);

    if (!organizationLevel) {
      throw new NotFoundException(
        `Organization level with ID ${levelId} not found`,
      );
    }

    const employeeCount = options.includeStatistics
      ? await this.repository.countEmployeesAtLevel(levelId)
      : 0;

    return this.buildHierarchyNode(
      organizationLevel,
      employeeCount,
      options.includeStatistics ?? false,
    );
  }

  /**
   * Get organization level statistics
   */
  async getOrganizationLevelStatistics(): Promise<OrganizationLevelStatistics> {
    // Get all organization levels
    const allLevels = await this.repository.findAllWithOptions({
      includeInactive: true,
      orderBy: 'hierarchyLevel',
    });

    const activeLevels = allLevels.filter((l) => l.isActive);

    // Get employee counts in one query to avoid N+1
    const levelIds = allLevels.map((l) => l.id);
    const employeeCounts =
      await this.repository.getEmployeeCountsByLevels(levelIds);

    // Build employee stats by level
    const employeesByLevel: LevelEmployeeCount[] = [];
    let totalEmployees = 0;
    let activeEmployees = 0;

    for (const level of allLevels) {
      const employeeCount = employeeCounts.get(level.id) ?? 0;

      totalEmployees += employeeCount;
      activeEmployees += employeeCount; // Assuming all counted are active

      let status: 'normal' | 'understaffed' | 'overstaffed' = 'normal';

      if (employeeCount > HIERARCHY_PERFORMANCE_LIMITS.MAX_USERS_PER_LEVEL) {
        status = 'overstaffed';
      } else if (employeeCount === 0 && level.isActive) {
        status = 'understaffed';
      }

      employeesByLevel.push({
        levelId: level.id,
        levelName: level.levelName,
        hierarchyLevel: level.hierarchyLevel,
        employeeCount,
        activeEmployeeCount: employeeCount,
        status,
      });
    }

    // Check for hierarchy issues
    const hasGapsInHierarchy = this.checkHierarchyGaps(allLevels);
    const hasCircularReferences = this.checkCircularReferences(allLevels);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      allLevels,
      employeesByLevel,
      hasGapsInHierarchy,
      hasCircularReferences,
    );

    return {
      totalLevels: allLevels.length,
      activeLevels: activeLevels.length,
      maxHierarchyDepth:
        allLevels.length > 0
          ? Math.max(...allLevels.map((l) => l.hierarchyLevel))
          : 0,
      rootLevelsCount: allLevels.filter((l) => l.hierarchyLevel === 1).length,
      totalEmployees,
      activeEmployees,
      employeesByLevel,
      levelsWithoutEmployees: employeesByLevel.filter(
        (l) => l.employeeCount === 0,
      ).length,
      levelsExceedingRecommendedSize: employeesByLevel.filter(
        (l) => l.status === 'overstaffed',
      ).length,
      hasGapsInHierarchy,
      hasCircularReferences,
      recommendations,
    };
  }

  /**
   * Create new organization level
   */
  async createOrganizationLevel(
    workspaceId: string,
    input: CreateOrganizationLevelInput,
  ): Promise<OrganizationLevelHierarchyNode> {
    this.logger.debug(`Creating organization level: ${input.levelCode}`);

    // 1. Validate hierarchy level range
    const rangeError = getHierarchyLevelValidationError(input.hierarchyLevel);

    if (rangeError) {
      throw new BadRequestException(rangeError);
    }

    // 2. Get existing levels for validation
    const existingLevels = await this.repository.findAllWithOptions({
      includeInactive: true,
    });

    // 3. Validate input - transform data to match validator interface
    const validationResult = this.hierarchyValidator.validateOrganizationLevel(
      input.hierarchyLevel,
      input.parentLevelId,
      existingLevels.map((level) => ({
        id: level.id,
        hierarchyLevel: level.hierarchyLevel,
        isActive: level.isActive ?? false,
      })),
    );

    if (!validationResult.isValid) {
      throw new BadRequestException(
        `Validation failed: ${validationResult.errors.map((e) => e.message).join(', ')}`,
      );
    }

    // Check for unique level code
    const codeExists = await this.repository.existsByCode(input.levelCode);

    if (codeExists) {
      throw new BadRequestException(
        `Organization level with code '${input.levelCode}' already exists`,
      );
    }

    // Create the organization level
    const newLevel = await this.repository.create({
      levelCode: input.levelCode,
      levelName: input.levelName,
      levelNameEn: input.levelNameEn,
      description: input.description,
      hierarchyLevel: input.hierarchyLevel,
      parentLevelId: input.parentLevelId,
      displayOrder: input.displayOrder ?? 0,
      isActive: input.isActive ?? true,
    });

    return this.buildHierarchyNode(newLevel, 0, true);
  }

  /**
   * Update organization level
   */
  async updateOrganizationLevel(
    workspaceId: string,
    levelId: string,
    input: UpdateOrganizationLevelInput,
  ): Promise<OrganizationLevelHierarchyNode> {
    this.logger.debug(`Updating organization level: ${levelId}`);

    const existingLevel = await this.repository.findById(levelId);

    if (!existingLevel) {
      throw new NotFoundException(
        `Organization level with ID ${levelId} not found`,
      );
    }

    // Validate hierarchy level range if being changed
    if (
      input.hierarchyLevel &&
      input.hierarchyLevel !== existingLevel.hierarchyLevel
    ) {
      const rangeError = getHierarchyLevelValidationError(input.hierarchyLevel);

      if (rangeError) {
        throw new BadRequestException(rangeError);
      }

      const allLevels = await this.repository.findAllWithOptions({
        includeInactive: true,
      });

      const validationResult =
        this.hierarchyValidator.validateOrganizationLevel(
          input.hierarchyLevel,
          input.parentLevelId ?? existingLevel.parentLevelId,
          allLevels
            .filter((l) => l.id !== levelId)
            .map((level) => ({
              id: level.id,
              hierarchyLevel: level.hierarchyLevel,
              isActive: level.isActive ?? false,
            })),
        );

      if (!validationResult.isValid) {
        throw new BadRequestException(
          `Validation failed: ${validationResult.errors.map((e) => e.message).join(', ')}`,
        );
      }
    }

    // Update the level
    const updatedLevel = await this.repository.updateAndReturn(levelId, input);

    if (!updatedLevel) {
      throw new NotFoundException(
        `Organization level with ID ${levelId} not found after update`,
      );
    }

    const employeeCount = await this.repository.countEmployeesAtLevel(levelId);

    return this.buildHierarchyNode(updatedLevel, employeeCount, true);
  }

  /**
   * Delete organization level
   */
  async deleteOrganizationLevel(
    workspaceId: string,
    levelId: string,
  ): Promise<boolean> {
    this.logger.debug(`Deleting organization level: ${levelId}`);

    const existingLevel = await this.repository.findById(levelId);

    if (!existingLevel) {
      throw new NotFoundException(
        `Organization level with ID ${levelId} not found`,
      );
    }

    // Check if there are employees assigned to this level
    const empCount = await this.repository.countEmployeesAtLevel(levelId);

    if (empCount > 0) {
      throw new BadRequestException(
        `Cannot delete organization level. There are ${empCount} employees assigned to this level.`,
      );
    }

    // Check if there are child levels
    const childrenCount = await this.repository.countChildren(levelId);

    if (childrenCount > 0) {
      throw new BadRequestException(
        `Cannot delete organization level. There are ${childrenCount} child levels dependent on this level.`,
      );
    }

    await this.repository.deleteLevel(levelId);

    return true;
  }

  // Private helper methods

  /**
   * Build hierarchy node từ entity
   */
  private buildHierarchyNode(
    level: MktOrganizationLevelWorkspaceEntity,
    employeeCount: number,
    includeStatistics: boolean,
  ): OrganizationLevelHierarchyNode {
    return {
      id: level.id,
      levelCode: level.levelCode,
      levelName: level.levelName,
      levelNameEn: level.levelNameEn,
      description: level.description,
      hierarchyLevel: level.hierarchyLevel,
      parentLevelId: level.parentLevelId,
      displayOrder: level.displayOrder,
      isActive: level.isActive,
      children: [],
      totalEmployees: includeStatistics ? employeeCount : 0,
      activeEmployees: includeStatistics ? employeeCount : 0,
      directChildrenCount: 0, // Will be calculated later
      totalDescendantsCount: 0, // Will be calculated later
      createdAt: new Date(level.createdAt),
      updatedAt: new Date(level.updatedAt),
      entity: level,
    };
  }

  private calculateDescendantCounts(
    nodes: OrganizationLevelHierarchyNode[],
  ): void {
    for (const node of nodes) {
      node.directChildrenCount = node.children.length;

      if (node.children.length > 0) {
        this.calculateDescendantCounts(node.children);
        node.totalDescendantsCount = node.children.reduce(
          (sum, child) => sum + 1 + child.totalDescendantsCount,
          0,
        );
      }
    }
  }

  private checkHierarchyGaps(
    levels: MktOrganizationLevelWorkspaceEntity[],
  ): boolean {
    const hierarchyLevels = levels
      .map((l) => l.hierarchyLevel)
      .sort((a, b) => a - b);

    for (let i = 1; i < hierarchyLevels.length; i++) {
      if (hierarchyLevels[i] - hierarchyLevels[i - 1] > 1) {
        return true;
      }
    }

    return false;
  }

  /**
   * Kiểm tra circular references trong hierarchy
   */
  private checkCircularReferences(
    levels: MktOrganizationLevelWorkspaceEntity[],
  ): boolean {
    // Simple circular reference check using DFS
    for (const level of levels) {
      if (level.parentLevelId) {
        const visited = new Set<string>();
        let currentId: string | undefined = level.parentLevelId;

        while (currentId && !visited.has(currentId)) {
          if (currentId === level.id) {
            return true; // Circular reference found
          }

          visited.add(currentId);
          const parent = levels.find((l) => l.id === currentId);

          currentId = parent?.parentLevelId ?? undefined;
        }
      }
    }

    return false;
  }

  private generateRecommendations(
    levels: MktOrganizationLevelWorkspaceEntity[],
    employeeCounts: LevelEmployeeCount[],
    hasGaps: boolean,
    hasCircularRefs: boolean,
  ): string[] {
    const recommendations: string[] = [];

    if (hasCircularRefs) {
      recommendations.push('Fix circular references in organization hierarchy');
    }

    if (hasGaps) {
      recommendations.push(
        'Fill gaps in hierarchy levels for better organization',
      );
    }

    const overstaffedLevels = employeeCounts.filter(
      (l) => l.status === 'overstaffed',
    );

    if (overstaffedLevels.length > 0) {
      recommendations.push(
        `Consider splitting levels with too many employees: ${overstaffedLevels.map((l) => l.levelName).join(', ')}`,
      );
    }

    const understaffedLevels = employeeCounts.filter(
      (l) => l.status === 'understaffed',
    );

    if (understaffedLevels.length > 0) {
      recommendations.push(
        `Consider assigning employees to empty levels: ${understaffedLevels.map((l) => l.levelName).join(', ')}`,
      );
    }

    if (levels.length > MAX_ORGANIZATION_HIERARCHY_DEPTH) {
      recommendations.push(
        'Consider reducing hierarchy depth for better performance',
      );
    }

    return recommendations;
  }
}
