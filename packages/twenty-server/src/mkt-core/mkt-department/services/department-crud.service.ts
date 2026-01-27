import { Injectable, Logger } from '@nestjs/common';

import kebabCase from 'lodash.kebabcase';
import pickBy from 'lodash.pickby';
import { v4 as uuidv4 } from 'uuid';

import {
  MktDepartmentRepository,
  MktDepartmentSubManagerRepository,
} from 'src/mkt-core/mkt-department/repositories';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department.workspace-entity';
import { MktDepartmentSubManagerWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department-sub-manager.workspace-entity';
import {
  DEPARTMENT_MESSAGES,
  MKT_DEPARTMENT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-department/messages';
import {
  CreateDepartmentData,
  DeleteDepartmentResult,
  DepartmentCrudResult,
  SubManagerData,
  UpdateDepartmentData,
} from 'src/mkt-core/mkt-department/types';

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
  ) {}

  /**
   * Create a new department
   *
   * Note: Uses workspace repositories instead of TypeORM native transactions
   * because WorkspaceEntities require workspace-specific data source.
   * departmentCode is auto-generated from departmentName + UUID suffix.
   */
  async create(
    workspaceId: string,
    data: CreateDepartmentData,
  ): Promise<DepartmentCrudResult> {
    // Auto-generate departmentCode
    const departmentCode = this.generateDepartmentCode(data.departmentName);

    this.logger.log(DEPARTMENT_MESSAGES.LOG.CREATE_START(data.departmentName));

    try {
      // Create department using workspace repository
      const department = await this.createDepartmentEntity(
        workspaceId,
        data,
        departmentCode,
      );

      this.logger.log(DEPARTMENT_MESSAGES.LOG.CREATE_SUCCESS(department.id));

      // Create sub-managers if provided
      const createdSubManagers = await this.createSubManagers(
        workspaceId,
        department.id,
        data.subManagers,
      );

      return this.buildSuccessResult(department, createdSubManagers);
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
  ): DepartmentCrudResult {
    return {
      success: true,
      department,
      createdSubManagers:
        subManagers && subManagers.length > 0 ? subManagers : undefined,
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
}
