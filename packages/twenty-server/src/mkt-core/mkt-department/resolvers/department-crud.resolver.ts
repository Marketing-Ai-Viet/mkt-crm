/**
 * DepartmentCrudResolver - GraphQL resolver for Department CRUD operations
 *
 * Provides custom mutations for creating, updating, and deleting departments.
 * These replace the blocked auto-generated mutations (createMktDepartment, updateMktDepartment).
 *
 * Operations:
 * - Queries: getMktDepartment, getMktDepartmentByCode
 * - Mutations: createMktDepartment, updateMktDepartment, deleteMktDepartment
 */

import { UseGuards, Logger } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  CreateDepartmentInput,
  UpdateDepartmentInput,
  CreateDepartmentResponse,
  UpdateDepartmentResponse,
  DeleteDepartmentResponse,
  DepartmentOutput,
} from 'src/mkt-core/mkt-department/dto';
import { DepartmentCrudService } from 'src/mkt-core/mkt-department/services/department-crud.service';
import { MKT_DEPARTMENT_LOG_CONTEXT } from 'src/mkt-core/mkt-department/messages';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department.workspace-entity';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class DepartmentCrudResolver {
  private readonly logger = new Logger(
    `${MKT_DEPARTMENT_LOG_CONTEXT}:CrudResolver`,
  );

  constructor(private readonly crudService: DepartmentCrudService) {}

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get a department by ID with full details
   */
  @Query(() => DepartmentOutput, {
    nullable: true,
    description: 'Get a department by ID with full details',
  })
  async getDepartmentById(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('id') id: string,
  ): Promise<DepartmentOutput | null> {
    const department = await this.crudService.findById(workspaceId, id);

    if (!department) {
      return null;
    }

    return this.mapToOutput(department);
  }

  /**
   * Get a department by code
   */
  @Query(() => DepartmentOutput, {
    nullable: true,
    description: 'Get a department by code',
  })
  async getDepartmentByCode(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('code') code: string,
  ): Promise<DepartmentOutput | null> {
    const department = await this.crudService.findByCode(workspaceId, code);

    if (!department) {
      return null;
    }

    return this.mapToOutput(department);
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Create a new department
   * Note: Named 'createDepartment' to avoid conflict with auto-generated 'createMktDepartment'
   */
  @Mutation(() => CreateDepartmentResponse, {
    description: 'Create a new department with custom logic',
  })
  async createDepartment(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input') input: CreateDepartmentInput,
  ): Promise<CreateDepartmentResponse> {
    this.logger.log(`Creating department: ${input.departmentCode}`);

    const result = await this.crudService.create(workspaceId, {
      departmentCode: input.departmentCode,
      departmentName: input.departmentName,
      departmentNameEn: input.departmentNameEn,
      departmentType: input.departmentType,
      description: input.description,
      budgetCode: input.budgetCode,
      costCenter: input.costCenter,
      requiresKpiTracking: input.requiresKpiTracking,
      allowsCrossDepartmentAccess: input.allowsCrossDepartmentAccess,
      defaultKpiCategory: input.defaultKpiCategory,
      displayOrder: input.displayOrder,
      colorCode: input.colorCode,
      iconName: input.iconName,
      address: input.address,
      isActive: input.isActive,
      managerId: input.managerId,
    });

    return {
      success: result.success,
      department: result.department
        ? this.mapToOutput(result.department)
        : undefined,
      error: result.error,
    };
  }

  /**
   * Update an existing department
   * Note: Named 'updateDepartment' to avoid conflict with auto-generated 'updateMktDepartment'
   */
  @Mutation(() => UpdateDepartmentResponse, {
    description: 'Update an existing department with custom logic',
  })
  async updateDepartment(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input') input: UpdateDepartmentInput,
  ): Promise<UpdateDepartmentResponse> {
    this.logger.log(`Updating department: ${input.id}`);

    const result = await this.crudService.update(workspaceId, input.id, {
      departmentCode: input.departmentCode,
      departmentName: input.departmentName,
      departmentNameEn: input.departmentNameEn,
      departmentType: input.departmentType,
      description: input.description,
      budgetCode: input.budgetCode,
      costCenter: input.costCenter,
      requiresKpiTracking: input.requiresKpiTracking,
      allowsCrossDepartmentAccess: input.allowsCrossDepartmentAccess,
      defaultKpiCategory: input.defaultKpiCategory,
      displayOrder: input.displayOrder,
      colorCode: input.colorCode,
      iconName: input.iconName,
      address: input.address,
      isActive: input.isActive,
      managerId: input.managerId,
    });

    return {
      success: result.success,
      department: result.department
        ? this.mapToOutput(result.department)
        : undefined,
      error: result.error,
    };
  }

  /**
   * Delete a department (soft delete)
   * Note: Named 'deleteDepartment' to avoid conflict with auto-generated 'deleteMktDepartment'
   */
  @Mutation(() => DeleteDepartmentResponse, {
    description: 'Delete a department (soft delete) with custom logic',
  })
  async deleteDepartment(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('id') id: string,
  ): Promise<DeleteDepartmentResponse> {
    this.logger.log(`Deleting department: ${id}`);

    const result = await this.crudService.delete(workspaceId, id);

    return {
      success: result.success,
      deletedId: result.deletedId,
      error: result.error,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToOutput(entity: MktDepartmentWorkspaceEntity): DepartmentOutput {
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
      createdAt: new Date(entity.createdAt ?? Date.now()),
      updatedAt: new Date(entity.updatedAt ?? Date.now()),
    };
  }
}
