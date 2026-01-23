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
import {
  MKT_ORGANIZATION_LEVEL_LOG_CONTEXT,
  ORGANIZATION_LEVEL_MESSAGES,
} from 'src/mkt-core/mkt-organization-level/messages';

@Injectable()
export class OrganizationLevelService {
  private readonly logger = new Logger(
    `${MKT_ORGANIZATION_LEVEL_LOG_CONTEXT}:Service`,
  );

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
   * Bao gồm full validation từ pre-query hook
   */
  async createOrganizationLevel(
    workspaceId: string,
    input: CreateOrganizationLevelInput,
  ): Promise<OrganizationLevelHierarchyNode> {
    this.logger.log(
      ORGANIZATION_LEVEL_MESSAGES.LOG.CREATE_START(input.levelCode),
    );

    // 1. Validate hierarchy level range
    const rangeError = getHierarchyLevelValidationError(input.hierarchyLevel);

    if (rangeError) {
      throw new BadRequestException(rangeError);
    }

    // 2. Validate level code uniqueness
    await this.validateLevelCodeUniqueness(input.levelCode);

    // 3. Validate parent level relationship (including active check)
    await this.validateParentLevel({
      hierarchyLevel: input.hierarchyLevel,
      parentLevelId: input.parentLevelId,
    });

    // 4. Get existing levels for hierarchy validation
    const existingLevels = await this.repository.findAllWithOptions({
      includeInactive: true,
    });

    // 5. Validate hierarchy structure
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

    // 6. Create the organization level
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

    this.logger.log(
      ORGANIZATION_LEVEL_MESSAGES.LOG.CREATE_SUCCESS(newLevel.id),
    );

    return this.buildHierarchyNode(newLevel, 0, true);
  }

  /**
   * Update organization level
   * Bao gồm full validation từ pre-query hook
   */
  async updateOrganizationLevel(
    workspaceId: string,
    levelId: string,
    input: UpdateOrganizationLevelInput,
  ): Promise<OrganizationLevelHierarchyNode> {
    this.logger.log(ORGANIZATION_LEVEL_MESSAGES.LOG.UPDATE_START(levelId));

    // 1. Get current record
    const currentRecord = await this.repository.findById(levelId);

    if (!currentRecord) {
      throw new NotFoundException(
        ORGANIZATION_LEVEL_MESSAGES.ERROR.LEVEL_NOT_FOUND(levelId),
      );
    }

    // 2. Validate level code uniqueness (if changed)
    if (input.levelCode && input.levelCode !== currentRecord.levelCode) {
      await this.validateLevelCodeUniqueness(input.levelCode, levelId);
    }

    // 3. Validate hierarchy level changes
    if (input.hierarchyLevel !== undefined) {
      await this.validateHierarchyLevelUpdate(input, currentRecord);

      // Validate range
      const rangeError = getHierarchyLevelValidationError(input.hierarchyLevel);

      if (rangeError) {
        throw new BadRequestException(rangeError);
      }

      // Validate structure
      const allLevels = await this.repository.findAllWithOptions({
        includeInactive: true,
      });

      const validationResult =
        this.hierarchyValidator.validateOrganizationLevel(
          input.hierarchyLevel,
          input.parentLevelId ?? currentRecord.parentLevelId,
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

    // 4. Validate parent level changes
    if (
      input.parentLevelId !== undefined ||
      input.hierarchyLevel !== undefined
    ) {
      await this.validateParentLevelUpdate(input, currentRecord);
    }

    // 5. Validate activation/deactivation
    if (input.isActive !== undefined) {
      await this.validateActivationChange(input.isActive, currentRecord);
    }

    // 6. Update the level
    const updatedLevel = await this.repository.updateAndReturn(levelId, input);

    if (!updatedLevel) {
      throw new NotFoundException(
        ORGANIZATION_LEVEL_MESSAGES.ERROR.LEVEL_NOT_FOUND(levelId),
      );
    }

    this.logger.log(ORGANIZATION_LEVEL_MESSAGES.LOG.UPDATE_SUCCESS(levelId));

    const employeeCount = await this.repository.countEmployeesAtLevel(levelId);

    return this.buildHierarchyNode(updatedLevel, employeeCount, true);
  }

  /**
   * Delete organization level
   * Bao gồm full validation từ pre-query hook
   */
  async deleteOrganizationLevel(
    workspaceId: string,
    levelId: string,
  ): Promise<boolean> {
    this.logger.log(ORGANIZATION_LEVEL_MESSAGES.LOG.DELETE_START(levelId));

    // 1. Get current record
    const recordToDelete = await this.repository.findById(levelId);

    if (!recordToDelete) {
      throw new NotFoundException(
        ORGANIZATION_LEVEL_MESSAGES.ERROR.LEVEL_NOT_FOUND(levelId),
      );
    }

    // 2. Check if level has child levels
    await this.validateNoChildLevels(levelId);

    // 3. Check if level is assigned to any workspace members
    await this.validateNoAssignedMembers(levelId);

    // 4. Check if this is the last active level
    await this.validateNotLastActiveLevel(recordToDelete);

    // 5. Delete the level
    await this.repository.deleteLevel(levelId);

    this.logger.log(ORGANIZATION_LEVEL_MESSAGES.LOG.DELETE_SUCCESS(levelId));

    return true;
  }

  // ============================================
  // VALIDATION METHODS (Di chuyển từ hooks)
  // ============================================

  /**
   * Validate level code uniqueness
   * @param levelCode - Level code to check
   * @param excludeId - ID to exclude from check (for update)
   */
  private async validateLevelCodeUniqueness(
    levelCode: string,
    excludeId?: string,
  ): Promise<void> {
    const exists = await this.repository.existsByCode(levelCode, excludeId);

    if (exists) {
      throw new BadRequestException(
        ORGANIZATION_LEVEL_MESSAGES.ERROR.CODE_EXISTS(levelCode),
      );
    }
  }

  /**
   * Validate parent level exists and is valid
   */
  private async validateParentLevel(input: {
    hierarchyLevel: number;
    parentLevelId?: string;
  }): Promise<void> {
    const { hierarchyLevel, parentLevelId } = input;

    if (!parentLevelId) {
      return;
    }

    const parentLevel = await this.repository.findById(parentLevelId);

    if (!parentLevel) {
      throw new BadRequestException(
        ORGANIZATION_LEVEL_MESSAGES.ERROR.PARENT_NOT_FOUND(parentLevelId),
      );
    }

    if (parentLevel.hierarchyLevel >= hierarchyLevel) {
      throw new BadRequestException(
        ORGANIZATION_LEVEL_MESSAGES.ERROR.PARENT_HIERARCHY_INVALID(
          parentLevel.hierarchyLevel,
          hierarchyLevel,
        ),
      );
    }

    if (!parentLevel.isActive) {
      throw new BadRequestException(
        ORGANIZATION_LEVEL_MESSAGES.ERROR.PARENT_INACTIVE,
      );
    }
  }

  /**
   * Validate hierarchy level update
   * Kiểm tra nếu có child levels thì không được thay đổi hierarchy level
   */
  private async validateHierarchyLevelUpdate(
    input: { hierarchyLevel?: number },
    currentRecord: MktOrganizationLevelWorkspaceEntity,
  ): Promise<void> {
    const newHierarchyLevel = input.hierarchyLevel;
    const oldHierarchyLevel = currentRecord.hierarchyLevel;

    if (!newHierarchyLevel || newHierarchyLevel === oldHierarchyLevel) {
      return;
    }

    const childLevels = await this.repository.findByParentId(currentRecord.id);

    if (
      childLevels.length > 0 &&
      newHierarchyLevel >= Math.min(...childLevels.map((c) => c.hierarchyLevel))
    ) {
      throw new BadRequestException(
        ORGANIZATION_LEVEL_MESSAGES.ERROR.HIERARCHY_CHANGE_INVALID,
      );
    }
  }

  /**
   * Validate parent level update
   * Kiểm tra parent-child relationships và circular references
   */
  private async validateParentLevelUpdate(
    input: { hierarchyLevel?: number; parentLevelId?: string },
    currentRecord: MktOrganizationLevelWorkspaceEntity,
  ): Promise<void> {
    const newHierarchyLevel =
      input.hierarchyLevel ?? currentRecord.hierarchyLevel;
    const newParentLevelId =
      input.parentLevelId !== undefined
        ? input.parentLevelId
        : currentRecord.parentLevelId;

    // Level 1 should not have parent
    if (newHierarchyLevel === 1 && newParentLevelId) {
      throw new BadRequestException(
        ORGANIZATION_LEVEL_MESSAGES.ERROR.LEVEL_1_NO_PARENT,
      );
    }

    // Levels > 1 should have parent
    if (newHierarchyLevel > 1 && !newParentLevelId) {
      throw new BadRequestException(
        ORGANIZATION_LEVEL_MESSAGES.ERROR.LEVEL_NEEDS_PARENT,
      );
    }

    // Validate parent exists and relationships
    if (newParentLevelId && newParentLevelId !== currentRecord.id) {
      const parentLevel = await this.repository.findById(newParentLevelId);

      if (!parentLevel) {
        throw new BadRequestException(
          ORGANIZATION_LEVEL_MESSAGES.ERROR.PARENT_NOT_FOUND(newParentLevelId),
        );
      }

      if (parentLevel.hierarchyLevel >= newHierarchyLevel) {
        throw new BadRequestException(
          ORGANIZATION_LEVEL_MESSAGES.ERROR.PARENT_HIERARCHY_INVALID(
            parentLevel.hierarchyLevel,
            newHierarchyLevel,
          ),
        );
      }

      if (!parentLevel.isActive) {
        throw new BadRequestException(
          ORGANIZATION_LEVEL_MESSAGES.ERROR.PARENT_INACTIVE,
        );
      }

      // Check for circular reference
      await this.checkCircularReferenceForUpdate(
        currentRecord.id,
        newParentLevelId,
      );
    }
  }

  /**
   * Check for circular reference in parent chain
   */
  private async checkCircularReferenceForUpdate(
    currentId: string,
    newParentId: string,
  ): Promise<void> {
    let checkId: string | null | undefined = newParentId;
    const visited = new Set<string>();

    while (checkId && !visited.has(checkId)) {
      if (checkId === currentId) {
        throw new BadRequestException(
          ORGANIZATION_LEVEL_MESSAGES.ERROR.CIRCULAR_REFERENCE,
        );
      }

      visited.add(checkId);

      const parent = await this.repository.findById(checkId);

      checkId = parent?.parentLevelId ?? null;
    }
  }

  /**
   * Validate activation/deactivation change
   */
  private async validateActivationChange(
    newIsActive: boolean,
    currentRecord: MktOrganizationLevelWorkspaceEntity,
  ): Promise<void> {
    // If deactivating, check if this level has active children
    if (!newIsActive && currentRecord.isActive) {
      const childLevels = await this.repository.findByParentId(
        currentRecord.id,
      );

      const activeChildren = childLevels.filter((c) => c.isActive);

      if (activeChildren.length > 0) {
        throw new BadRequestException(
          ORGANIZATION_LEVEL_MESSAGES.ERROR.DEACTIVATE_HAS_CHILDREN,
        );
      }
    }

    // If activating, check if parent is active
    if (newIsActive && !currentRecord.isActive && currentRecord.parentLevelId) {
      const parent = await this.repository.findById(
        currentRecord.parentLevelId,
      );

      if (parent && !parent.isActive) {
        throw new BadRequestException(
          ORGANIZATION_LEVEL_MESSAGES.ERROR.ACTIVATE_PARENT_INACTIVE,
        );
      }
    }
  }

  /**
   * Validate no child levels exist before delete
   */
  private async validateNoChildLevels(recordId: string): Promise<void> {
    const childLevels = await this.repository.findByParentId(recordId);

    if (childLevels.length > 0) {
      const childNames = childLevels.map((child) => child.levelName).join(', ');

      throw new BadRequestException(
        ORGANIZATION_LEVEL_MESSAGES.ERROR.DELETE_HAS_CHILDREN(
          childLevels.length,
          childNames,
        ),
      );
    }
  }

  /**
   * Validate no workspace members assigned before delete
   */
  private async validateNoAssignedMembers(recordId: string): Promise<void> {
    try {
      const employeeCount =
        await this.repository.countEmployeesAtLevel(recordId);

      if (employeeCount > 0) {
        throw new BadRequestException(
          ORGANIZATION_LEVEL_MESSAGES.ERROR.DELETE_HAS_MEMBERS(employeeCount),
        );
      }
    } catch (error) {
      // Nếu là BadRequestException, throw lại
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Các lỗi khác thì log warning và tiếp tục
      this.logger.warn(
        ORGANIZATION_LEVEL_MESSAGES.WARN.EMPLOYEE_CHECK_FAILED(
          (error as Error).message,
        ),
      );
    }
  }

  /**
   * Validate not the last active level before delete
   */
  private async validateNotLastActiveLevel(
    recordToDelete: MktOrganizationLevelWorkspaceEntity,
  ): Promise<void> {
    if (!recordToDelete.isActive) {
      return; // If already inactive, deletion is allowed
    }

    const activeCount = await this.repository.countActive();

    if (activeCount <= 1) {
      throw new BadRequestException(
        ORGANIZATION_LEVEL_MESSAGES.ERROR.DELETE_LAST_ACTIVE,
      );
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

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
