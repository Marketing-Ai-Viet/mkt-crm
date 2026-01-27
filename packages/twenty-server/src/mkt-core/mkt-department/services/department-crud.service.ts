import { Injectable, Logger } from '@nestjs/common';

import kebabCase from 'lodash.kebabcase';
import pickBy from 'lodash.pickby';
import { v4 as uuidv4 } from 'uuid';

import { TransactionScopeService } from 'src/mkt-core/common/transaction';
import {
  DEFAULT_RELATIONSHIP_TYPE,
  DepartmentOutput,
  ManagerInfo,
  SubManagerInfo,
  SubManagerOutput,
  SearchDepartmentInput,
  DepartmentListOutput,
} from 'src/mkt-core/mkt-department/dto';
import {
  DEPARTMENT_MESSAGES,
  MKT_DEPARTMENT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-department/messages';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department-hierarchy.workspace-entity';
import { MktDepartmentSubManagerWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department-sub-manager.workspace-entity';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department.workspace-entity';
import {
  MktDepartmentHierarchyRepository,
  MktDepartmentRepository,
  MktDepartmentSubManagerRepository,
} from 'src/mkt-core/mkt-department/repositories';
import {
  CreatedHierarchyInfo,
  CreateDepartmentData,
  DeleteDepartmentResult,
  DepartmentCrudResult,
  SubManagerData,
  UpdateDepartmentData,
} from 'src/mkt-core/mkt-department/types';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

// Pagination constants
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_PAGE = 1;
const MIN_LIMIT = 1;

/**
 * DepartmentCrudService - Business logic for department CRUD operations
 *
 * Provides create, update, delete operations for mktDepartment entity.
 * These replace the blocked auto-generated mutations.
 */
@Injectable()
export class DepartmentCrudService {
  private readonly logger = new Logger(
    `${MKT_DEPARTMENT_LOG_CONTEXT}:CrudService`,
  );

  constructor(
    private readonly departmentRepository: MktDepartmentRepository,
    private readonly subManagerRepository: MktDepartmentSubManagerRepository,
    private readonly hierarchyRepository: MktDepartmentHierarchyRepository,
    private readonly transactionScopeService: TransactionScopeService,
  ) {}

  /**
   * Create a new department with transaction support
   *
   * Uses TransactionScopeService to ensure data consistency:
   * - Department creation
   * - Sub-managers creation
   * - Hierarchy creation (parent and/or children)
   *
   * All operations are rolled back if any step fails.
   *
   * Hierarchy options:
   * - parentDepartmentId: Creates hierarchy with this department as child
   * - childDepartmentIds: Creates hierarchy with existing departments as children
   * - hierarchyRelationshipType: Type of relationship (default: PARENT_CHILD)
   */
  async create(
    workspaceId: string,
    data: CreateDepartmentData,
  ): Promise<DepartmentCrudResult> {
    // Auto-generate departmentCode
    const departmentCode = this.generateDepartmentCode(data.departmentName);
    const relationshipType =
      data.hierarchyRelationshipType ?? DEFAULT_RELATIONSHIP_TYPE;

    this.logger.log(DEPARTMENT_MESSAGES.LOG.CREATE_START(data.departmentName));

    try {
      // Pre-validation: check parent exists before starting transaction
      let parentDepartment: MktDepartmentWorkspaceEntity | null = null;

      if (data.parentDepartmentId) {
        parentDepartment = await this.departmentRepository.findByIdInWorkspace(
          data.parentDepartmentId,
          workspaceId,
        );

        if (!parentDepartment) {
          return this.buildErrorResult(
            DEPARTMENT_MESSAGES.ERROR.DEPARTMENT_NOT_FOUND(
              data.parentDepartmentId,
            ),
          );
        }
      }

      // Execute all operations within a transaction
      return await this.transactionScopeService.runInTransaction(
        workspaceId,
        async () => {
          const createdHierarchies: CreatedHierarchyInfo[] = [];

          // 1. Create department
          const department = await this.createDepartmentEntity(
            workspaceId,
            data,
            departmentCode,
          );

          this.logger.log(
            DEPARTMENT_MESSAGES.LOG.CREATE_SUCCESS(department.id),
          );

          // 2. Create sub-managers if provided
          const createdSubManagers = await this.createSubManagers(
            workspaceId,
            department.id,
            data.subManagers,
          );

          // 3. Create hierarchy with parent if parentDepartmentId is provided
          if (data.parentDepartmentId && parentDepartment) {
            const hierarchy = await this.createHierarchy(
              workspaceId,
              data.parentDepartmentId,
              department.id,
              relationshipType,
            );

            createdHierarchies.push({
              id: hierarchy.id,
              parentDepartmentId: data.parentDepartmentId,
              parentDepartmentCode: parentDepartment.departmentCode,
              parentDepartmentName: parentDepartment.departmentName,
              childDepartmentId: department.id,
              childDepartmentCode: department.departmentCode,
              childDepartmentName: department.departmentName,
              relationshipType,
              hierarchyLevel: 1,
            });

            this.logger.log(
              DEPARTMENT_MESSAGES.LOG.HIERARCHY_CREATED(
                department.id,
                data.parentDepartmentId,
              ),
            );
          }

          // 4. Create hierarchies with existing child departments
          if (data.childDepartmentIds && data.childDepartmentIds.length > 0) {
            const childHierarchies =
              await this.createHierarchiesWithChildDepartments(
                workspaceId,
                department.id,
                department.departmentCode,
                department.departmentName,
                data.childDepartmentIds,
                relationshipType,
              );

            createdHierarchies.push(...childHierarchies);
          }

          return this.buildSuccessResult(
            department,
            createdSubManagers,
            createdHierarchies,
          );
        },
      );
    } catch (error) {
      return this.handleError(error, 'create');
    }
  }

  /**
   * Update an existing department
   *
   * Note: Uses workspace repositories instead of TypeORM native transactions
   * because WorkspaceEntities require workspace-specific data source.
   * departmentCode cannot be updated.
   */
  async update(
    workspaceId: string,
    departmentId: string,
    data: UpdateDepartmentData,
  ): Promise<DepartmentCrudResult> {
    this.logger.log(DEPARTMENT_MESSAGES.LOG.UPDATE_START(departmentId));

    // Validate department exists
    const validationError = await this.validateDepartmentExists(
      workspaceId,
      departmentId,
    );

    if (validationError) {
      return validationError;
    }

    try {
      const updateData = this.buildUpdateData(data);
      const updatedDepartment = await this.updateDepartmentEntity(
        workspaceId,
        departmentId,
        updateData,
      );

      if (!updatedDepartment) {
        return this.buildErrorResult(
          DEPARTMENT_MESSAGES.ERROR.DEPARTMENT_NOT_FOUND(departmentId),
        );
      }

      this.logger.log(DEPARTMENT_MESSAGES.LOG.UPDATE_SUCCESS(departmentId));

      // Replace sub-managers if provided (REPLACE mode)
      const replacedSubManagers = await this.replaceSubManagers(
        workspaceId,
        departmentId,
        data.subManagers,
      );

      return this.buildSuccessResult(updatedDepartment, replacedSubManagers);
    } catch (error) {
      return this.handleError(error, 'update');
    }
  }

  /**
   * Delete a department (soft delete)
   */
  async delete(
    workspaceId: string,
    departmentId: string,
  ): Promise<DeleteDepartmentResult> {
    this.logger.log(`Deleting department: ${departmentId}`);

    const existingDepartment =
      await this.departmentRepository.findByIdInWorkspace(
        departmentId,
        workspaceId,
      );

    if (!existingDepartment) {
      return {
        success: false,
        error: DEPARTMENT_MESSAGES.ERROR.DEPARTMENT_NOT_FOUND(departmentId),
      };
    }

    try {
      await this.departmentRepository.softDeleteInWorkspace(
        departmentId,
        workspaceId,
      );
      this.logger.log(`Successfully deleted department: ${departmentId}`);

      return { success: true, deletedId: departmentId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Failed to delete department: ${errorMessage}`);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Find department by ID with full relations (manager, subManagers)
   */
  async findById(
    workspaceId: string,
    departmentId: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    return this.departmentRepository.findByIdWithRelations(
      workspaceId,
      departmentId,
    );
  }

  /**
   * Find department by code with full relations (manager, subManagers)
   */
  async findByCode(
    workspaceId: string,
    departmentCode: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    return this.departmentRepository.findByCodeWithRelations(
      workspaceId,
      departmentCode,
    );
  }

  /**
   * Search departments với filters và pagination
   * Validation được thực hiện ở service layer để đảm bảo limit không vượt quá MAX_LIMIT
   */
  async search(
    workspaceId: string,
    input: SearchDepartmentInput,
  ): Promise<DepartmentListOutput> {
    // Validate và normalize pagination params
    const page = Math.max(input.page ?? DEFAULT_PAGE, MIN_PAGE);
    const limit = Math.min(
      Math.max(input.limit ?? DEFAULT_LIMIT, MIN_LIMIT),
      MAX_LIMIT,
    );

    const { items, total } = await this.departmentRepository.searchInWorkspace(
      workspaceId,
      {
        keyword: input.keyword,
        departmentCode: input.departmentCode,
        departmentType: input.departmentType,
        managerId: input.managerId,
        isActive: input.isActive,
        requiresKpiTracking: input.requiresKpiTracking,
        page,
        limit,
      },
    );

    const totalPages = Math.ceil(total / limit);

    this.logger.log(
      `[SEARCH DEPARTMENTS] Found ${total} departments in workspace ${workspaceId}, page ${page}/${totalPages}`,
    );

    return {
      items: items.map((department) => this.mapToOutput(department)),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  // ============================================
  // PUBLIC MAPPING METHODS
  // ============================================

  /**
   * Map Department entity to DepartmentOutput
   */
  mapToOutput(entity: MktDepartmentWorkspaceEntity): DepartmentOutput {
    return {
      id: entity.id,
      departmentCode: entity.departmentCode,
      departmentName: entity.departmentName,
      departmentNameEn: entity.departmentNameEn,
      departmentType: entity.departmentType ?? undefined,
      description: entity.description,
      budgetCode: entity.budgetCode,
      costCenter: entity.costCenter,
      requiresKpiTracking: entity.requiresKpiTracking,
      allowsCrossDepartmentAccess: entity.allowsCrossDepartmentAccess,
      defaultKpiCategory: entity.defaultKpiCategory,
      displayOrder: entity.displayOrder,
      colorCode: entity.colorCode,
      iconName: entity.iconName,
      address: entity.address,
      isActive: entity.isActive,
      managerId: entity.managerId ?? undefined,
      manager: entity.manager
        ? this.mapManagerToOutput(entity.manager)
        : undefined,
      subManagers: entity.subManagers?.map((sm) =>
        this.mapSubManagerInfoToOutput(sm),
      ),
      createdAt: new Date(entity.createdAt ?? Date.now()),
      updatedAt: new Date(entity.updatedAt ?? Date.now()),
    };
  }

  /**
   * Map WorkspaceMember to ManagerInfo output
   */
  mapManagerToOutput(member: WorkspaceMemberWorkspaceEntity): ManagerInfo {
    const name = member.name as
      | { firstName?: string; lastName?: string }
      | undefined;

    return {
      id: member.id,
      firstName: name?.firstName,
      lastName: name?.lastName,
      fullName: this.buildFullName(name?.firstName, name?.lastName),
      email: member.userEmail,
      avatarUrl: member.avatarUrl,
    };
  }

  /**
   * Map SubManager entity to SubManagerInfo output (with member details)
   */
  mapSubManagerInfoToOutput(
    entity: MktDepartmentSubManagerWorkspaceEntity,
  ): SubManagerInfo {
    const member = entity.workspaceMember as
      | WorkspaceMemberWorkspaceEntity
      | undefined;
    const name = member?.name as
      | { firstName?: string; lastName?: string }
      | undefined;

    return {
      id: entity.id,
      workspaceMemberId: entity.workspaceMemberId ?? '',
      firstName: name?.firstName,
      lastName: name?.lastName,
      fullName: this.buildFullName(name?.firstName, name?.lastName),
      email: member?.userEmail,
      avatarUrl: member?.avatarUrl,
      isPrimary: entity.isPrimary ?? false,
      isActive: entity.isActive ?? true,
      note: entity.note,
      assignedAt: entity.assignedAt,
    };
  }

  /**
   * Map SubManager entity to SubManagerOutput (basic)
   */
  mapSubManagerToOutput(
    entity: MktDepartmentSubManagerWorkspaceEntity,
  ): SubManagerOutput {
    return {
      id: entity.id,
      departmentId: entity.departmentId ?? '',
      workspaceMemberId: entity.workspaceMemberId ?? '',
      isPrimary: entity.isPrimary,
      assignedAt: entity.assignedAt,
      note: entity.note,
      isActive: entity.isActive,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
    };
  }

  /**
   * Build full name from first and last name
   */
  buildFullName(firstName?: string, lastName?: string): string {
    return [firstName, lastName].filter(Boolean).join(' ') || '';
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Generate unique department code from department name
   * Format: {kebab-case-name}-{short-uuid}
   * Example: "Phòng Kinh Doanh" → "phong-kinh-doanh-a1b2c3d4"
   */
  private generateDepartmentCode(departmentName: string): string {
    const nameSlug = kebabCase(departmentName);
    const shortUuid = uuidv4().split('-')[0]; // First segment of UUID (8 chars)

    return `${nameSlug}-${shortUuid}`;
  }

  /**
   * Validate department exists
   */
  private async validateDepartmentExists(
    workspaceId: string,
    departmentId: string,
  ): Promise<DepartmentCrudResult | null> {
    const existingDepartment =
      await this.departmentRepository.findByIdInWorkspace(
        departmentId,
        workspaceId,
      );

    if (!existingDepartment) {
      return this.buildErrorResult(
        DEPARTMENT_MESSAGES.ERROR.DEPARTMENT_NOT_FOUND(departmentId),
      );
    }

    return null;
  }

  /**
   * Create department entity using workspace repository
   */
  private async createDepartmentEntity(
    workspaceId: string,
    data: CreateDepartmentData,
    departmentCode: string,
  ): Promise<MktDepartmentWorkspaceEntity> {
    return this.departmentRepository.createInWorkspace(
      {
        departmentCode,
        departmentName: data.departmentName,
        departmentNameEn: data.departmentNameEn,
        departmentType: data.departmentType as never,
        description: data.description,
        budgetCode: data.budgetCode,
        costCenter: data.costCenter,
        requiresKpiTracking: data.requiresKpiTracking ?? false,
        allowsCrossDepartmentAccess: data.allowsCrossDepartmentAccess ?? false,
        defaultKpiCategory: data.defaultKpiCategory,
        displayOrder: data.displayOrder ?? 0,
        colorCode: data.colorCode,
        iconName: data.iconName,
        address: data.address,
        isActive: data.isActive ?? true,
        managerId: data.managerId ?? null,
      },
      workspaceId,
    );
  }

  /**
   * Update department entity using workspace repository
   */
  private async updateDepartmentEntity(
    workspaceId: string,
    departmentId: string,
    updateData: Partial<MktDepartmentWorkspaceEntity>,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    return this.departmentRepository.updateAndReturnInWorkspace(
      departmentId,
      updateData,
      workspaceId,
    );
  }

  /**
   * Build update data, filtering out undefined values
   * Note: departmentCode is excluded as it cannot be updated
   */
  private buildUpdateData(
    data: UpdateDepartmentData,
  ): Partial<MktDepartmentWorkspaceEntity> {
    return pickBy(
      {
        departmentName: data.departmentName,
        departmentNameEn: data.departmentNameEn,
        departmentType: data.departmentType as never,
        description: data.description,
        budgetCode: data.budgetCode,
        costCenter: data.costCenter,
        requiresKpiTracking: data.requiresKpiTracking,
        allowsCrossDepartmentAccess: data.allowsCrossDepartmentAccess,
        defaultKpiCategory: data.defaultKpiCategory,
        displayOrder: data.displayOrder,
        colorCode: data.colorCode,
        iconName: data.iconName,
        address: data.address,
        isActive: data.isActive,
        managerId: data.managerId,
      },
      (value) => value !== undefined,
    ) as Partial<MktDepartmentWorkspaceEntity>;
  }

  /**
   * Create sub-managers using workspace repository
   */
  private async createSubManagers(
    workspaceId: string,
    departmentId: string,
    subManagers?: SubManagerData[],
  ): Promise<MktDepartmentSubManagerWorkspaceEntity[]> {
    if (!subManagers || subManagers.length === 0) {
      return [];
    }

    this.logger.log(
      `Creating ${subManagers.length} sub-managers for department: ${departmentId}`,
    );

    const entities = subManagers.map((sm) => ({
      departmentId,
      workspaceMemberId: sm.workspaceMemberId,
      isPrimary: sm.isPrimary ?? false,
      note: sm.note,
      isActive: sm.isActive ?? true,
      assignedAt: new Date(),
    }));

    const savedEntities = await this.subManagerRepository.bulkCreateInWorkspace(
      entities,
      workspaceId,
    );

    this.logger.log(`Created ${savedEntities.length} sub-managers`);

    return savedEntities;
  }

  /**
   * Replace sub-managers (delete all existing, create new)
   */
  private async replaceSubManagers(
    workspaceId: string,
    departmentId: string,
    subManagers?: SubManagerData[],
  ): Promise<MktDepartmentSubManagerWorkspaceEntity[]> {
    if (subManagers === undefined) {
      return [];
    }

    this.logger.log(`Replacing sub-managers for department: ${departmentId}`);

    // Delete all existing sub-managers for this department
    const deletedCount = await this.subManagerRepository.deleteByDepartmentId(
      departmentId,
      workspaceId,
    );

    this.logger.log(`Deleted ${deletedCount} existing sub-managers`);

    // Create new sub-managers
    return this.createSubManagers(workspaceId, departmentId, subManagers);
  }

  /**
   * Build success result
   */
  private buildSuccessResult(
    department: MktDepartmentWorkspaceEntity,
    subManagers?: MktDepartmentSubManagerWorkspaceEntity[],
    hierarchies?: CreatedHierarchyInfo[],
  ): DepartmentCrudResult {
    return {
      success: true,
      department,
      createdSubManagers:
        subManagers && subManagers.length > 0 ? subManagers : undefined,
      createdHierarchies:
        hierarchies && hierarchies.length > 0 ? hierarchies : undefined,
    };
  }

  /**
   * Build error result
   */
  private buildErrorResult(errorMessage: string): DepartmentCrudResult {
    this.logger.error(errorMessage);

    return { success: false, error: errorMessage };
  }

  /**
   * Handle error and build error result
   */
  private handleError(
    error: unknown,
    operation: 'create' | 'update',
  ): DepartmentCrudResult {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    const logMessage =
      operation === 'create'
        ? DEPARTMENT_MESSAGES.ERROR.HIERARCHY_CREATE_FAILED(errorMessage)
        : DEPARTMENT_MESSAGES.ERROR.HIERARCHY_UPDATE_FAILED(errorMessage);

    this.logger.error(logMessage);

    return { success: false, error: errorMessage };
  }

  // ============================================
  // HIERARCHY METHODS
  // ============================================

  /**
   * Create a hierarchy relationship between parent and child departments
   */
  private async createHierarchy(
    workspaceId: string,
    parentDepartmentId: string,
    childDepartmentId: string,
    relationshipType: string,
    hierarchyLevel = 1,
  ): Promise<MktDepartmentHierarchyWorkspaceEntity> {
    return this.hierarchyRepository.createInWorkspace(
      {
        parentDepartmentId,
        childDepartmentId,
        hierarchyLevel,
        relationshipType,
        isActive: true,
        inheritsPermissions: true,
        canEscalateToParent: true,
      },
      workspaceId,
    );
  }

  /**
   * Create hierarchies with existing child departments
   * Validates that all child departments exist before creating hierarchies
   * Returns created hierarchy info for response
   */
  private async createHierarchiesWithChildDepartments(
    workspaceId: string,
    parentDepartmentId: string,
    parentDepartmentCode: string,
    parentDepartmentName: string,
    childDepartmentIds: string[],
    relationshipType: string,
  ): Promise<CreatedHierarchyInfo[]> {
    const createdHierarchies: CreatedHierarchyInfo[] = [];

    for (const childDepartmentId of childDepartmentIds) {
      // Validate child department exists
      const childDepartment =
        await this.departmentRepository.findByIdInWorkspace(
          childDepartmentId,
          workspaceId,
        );

      if (!childDepartment) {
        this.logger.warn(
          `Child department not found: ${childDepartmentId}, skipping hierarchy creation`,
        );
        continue;
      }

      // Create hierarchy relationship
      const hierarchy = await this.createHierarchy(
        workspaceId,
        parentDepartmentId,
        childDepartmentId,
        relationshipType,
      );

      createdHierarchies.push({
        id: hierarchy.id,
        parentDepartmentId,
        parentDepartmentCode,
        parentDepartmentName,
        childDepartmentId,
        childDepartmentCode: childDepartment.departmentCode,
        childDepartmentName: childDepartment.departmentName,
        relationshipType,
        hierarchyLevel: 1,
      });

      this.logger.log(
        DEPARTMENT_MESSAGES.LOG.HIERARCHY_CREATED(
          childDepartmentId,
          parentDepartmentId,
        ),
      );
    }

    return createdHierarchies;
  }
}
