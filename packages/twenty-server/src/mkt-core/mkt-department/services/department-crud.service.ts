import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import pickBy from 'lodash.pickby';

import { MktDepartmentRepository } from 'src/mkt-core/mkt-department/repositories';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department.workspace-entity';
import {
  DEPARTMENT_MESSAGES,
  MKT_DEPARTMENT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-department/messages';

/**
 * Input type for creating a department
 */
export type CreateDepartmentData = {
  departmentCode: string;
  departmentName: string;
  departmentNameEn?: string;
  departmentType?: string | null;
  description?: string;
  budgetCode?: string;
  costCenter?: string;
  requiresKpiTracking?: boolean;
  allowsCrossDepartmentAccess?: boolean;
  defaultKpiCategory?: string;
  displayOrder?: number;
  colorCode?: string;
  iconName?: string;
  address?: string;
  isActive?: boolean;
  managerId?: string | null;
};

/**
 * Input type for updating a department
 */
export type UpdateDepartmentData = Partial<
  Omit<CreateDepartmentData, 'departmentCode'>
> & {
  departmentCode?: string;
};

/**
 * Result type for CRUD operations
 */
export type DepartmentCrudResult = {
  success: boolean;
  department?: MktDepartmentWorkspaceEntity;
  error?: string;
};

/**
 * Result type for delete operation
 */
export type DeleteDepartmentResult = {
  success: boolean;
  deletedId?: string;
  error?: string;
};

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

  constructor(private readonly departmentRepository: MktDepartmentRepository) {}

  /**
   * Create a new department
   */
  async create(
    workspaceId: string,
    data: CreateDepartmentData,
  ): Promise<DepartmentCrudResult> {
    try {
      this.logger.log(
        DEPARTMENT_MESSAGES.LOG.CREATE_START(data.departmentCode),
      );

      // Check if department code already exists
      const existingDepartment = await this.departmentRepository.findByCode(
        data.departmentCode,
      );

      if (existingDepartment) {
        throw new ConflictException(
          `Department with code '${data.departmentCode}' already exists`,
        );
      }

      // Create department
      const department = await this.departmentRepository.create({
        departmentCode: data.departmentCode,
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
      });

      this.logger.log(DEPARTMENT_MESSAGES.LOG.CREATE_SUCCESS(department.id));

      return {
        success: true,
        department,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        DEPARTMENT_MESSAGES.ERROR.HIERARCHY_CREATE_FAILED(errorMessage),
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update an existing department
   */
  async update(
    workspaceId: string,
    departmentId: string,
    data: UpdateDepartmentData,
  ): Promise<DepartmentCrudResult> {
    try {
      this.logger.log(DEPARTMENT_MESSAGES.LOG.UPDATE_START(departmentId));

      // Check if department exists
      const existingDepartment =
        await this.departmentRepository.findById(departmentId);

      if (!existingDepartment) {
        throw new NotFoundException(
          DEPARTMENT_MESSAGES.ERROR.DEPARTMENT_NOT_FOUND(departmentId),
        );
      }

      // If updating department code, check for uniqueness
      if (
        data.departmentCode &&
        data.departmentCode !== existingDepartment.departmentCode
      ) {
        const codeExists = await this.departmentRepository.findByCode(
          data.departmentCode,
        );

        if (codeExists) {
          throw new ConflictException(
            `Department with code '${data.departmentCode}' already exists`,
          );
        }
      }

      // Build update data, removing undefined values
      // Sử dụng pickBy để lọc các giá trị không undefined
      const updateData = pickBy(
        {
          departmentCode: data.departmentCode,
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
      );

      // Update department
      const updatedDepartment = await this.departmentRepository.updateAndReturn(
        departmentId,
        updateData,
      );

      if (!updatedDepartment) {
        throw new NotFoundException(
          DEPARTMENT_MESSAGES.ERROR.DEPARTMENT_NOT_FOUND(departmentId),
        );
      }

      this.logger.log(DEPARTMENT_MESSAGES.LOG.UPDATE_SUCCESS(departmentId));

      return {
        success: true,
        department: updatedDepartment,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        DEPARTMENT_MESSAGES.ERROR.HIERARCHY_UPDATE_FAILED(errorMessage),
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete a department (soft delete)
   */
  async delete(
    workspaceId: string,
    departmentId: string,
  ): Promise<DeleteDepartmentResult> {
    try {
      this.logger.log(`Deleting department: ${departmentId}`);

      // Check if department exists
      const existingDepartment =
        await this.departmentRepository.findById(departmentId);

      if (!existingDepartment) {
        throw new NotFoundException(
          DEPARTMENT_MESSAGES.ERROR.DEPARTMENT_NOT_FOUND(departmentId),
        );
      }

      // Soft delete
      await this.departmentRepository.softDelete(departmentId);

      this.logger.log(`Successfully deleted department: ${departmentId}`);

      return {
        success: true,
        deletedId: departmentId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Failed to delete department: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Find department by ID
   */
  async findById(
    workspaceId: string,
    departmentId: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    return this.departmentRepository.findById(departmentId);
  }

  /**
   * Find department by code
   */
  async findByCode(
    workspaceId: string,
    departmentCode: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    return this.departmentRepository.findByCode(departmentCode);
  }
}
