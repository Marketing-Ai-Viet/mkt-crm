/**
 * DepartmentMutationResolver - GraphQL resolver for Department hierarchy mutations
 *
 * Thay thế các post-query hooks cho department:
 * - createDepartmentHierarchy: Tạo hierarchy cho department (thay cho createOne hook)
 * - updateDepartmentHierarchy: Cập nhật hierarchy của department (thay cho updateOne hook)
 *
 * Lưu ý: Resolver này CHỈ quản lý hierarchy relationships.
 * Các operations khác (findMany, findOne, deleteOne, etc.) vẫn dùng auto-generated.
 */

import { UseGuards, Logger } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  CreateDepartmentHierarchyInput,
  UpdateDepartmentHierarchyInput,
  CreateDepartmentHierarchyResponse,
  UpdateDepartmentHierarchyResponse,
} from 'src/mkt-core/mkt-department/dto';
import { MktDepartmentHierarchyService } from 'src/mkt-core/mkt-department/services/mkt-department-hierarchy.service';
import {
  DEPARTMENT_MESSAGES,
  MKT_DEPARTMENT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-department/messages';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class DepartmentMutationResolver {
  private readonly logger = new Logger(
    `${MKT_DEPARTMENT_LOG_CONTEXT}:MutationResolver`,
  );

  constructor(
    private readonly hierarchyService: MktDepartmentHierarchyService,
  ) {}

  /**
   * Tạo hierarchy cho team department
   *
   * Sử dụng khi cần thiết lập parent-child relationship cho department.
   * Thường dùng sau khi tạo department type TEAM qua auto-generated mutation.
   */
  @Mutation(() => CreateDepartmentHierarchyResponse, {
    description: 'Create hierarchy relationship for a department',
  })
  async createDepartmentHierarchy(
    @Args('input') input: CreateDepartmentHierarchyInput,
  ): Promise<CreateDepartmentHierarchyResponse> {
    try {
      const hierarchy =
        await this.hierarchyService.createTeamDepartmentHierarchy({
          parentDepartmentId: input.parentDepartmentId,
          childDepartmentId: input.childDepartmentId,
          name: input.name,
          relationshipType: input.relationshipType,
          hierarchyLevel: input.hierarchyLevel,
          inheritsPermissions: input.inheritsPermissions ?? true,
          canEscalateToParent: input.canEscalateToParent ?? false,
          allowsCrossBranchAccess: input.allowsCrossBranchAccess ?? false,
          displayOrder: input.displayOrder ?? 0,
          notes: input.notes,
          isActive: input.isActive ?? true,
        });

      this.logger.log(
        DEPARTMENT_MESSAGES.LOG.HIERARCHY_CREATED(
          input.childDepartmentId,
          input.parentDepartmentId,
        ),
      );

      return {
        success: true,
        departmentId: input.childDepartmentId,
        hierarchyId: hierarchy?.id,
      };
    } catch (error) {
      this.logger.error(
        DEPARTMENT_MESSAGES.ERROR.HIERARCHY_CREATE_FAILED(
          (error as Error).message,
        ),
      );

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Cập nhật hierarchy của department
   *
   * Sử dụng khi cần thay đổi parent hoặc các thuộc tính hierarchy khác.
   */
  @Mutation(() => UpdateDepartmentHierarchyResponse, {
    description: 'Update hierarchy relationship for a department',
  })
  async updateDepartmentHierarchy(
    @Args('input') input: UpdateDepartmentHierarchyInput,
  ): Promise<UpdateDepartmentHierarchyResponse> {
    try {
      await this.hierarchyService.updateTeamDepartmentHierarchy({
        childDepartmentId: input.childDepartmentId,
        parentDepartmentId: input.parentDepartmentId,
        name: input.name,
        relationshipType: input.relationshipType,
        hierarchyLevel: input.hierarchyLevel,
        inheritsPermissions: input.inheritsPermissions,
        canEscalateToParent: input.canEscalateToParent,
        allowsCrossBranchAccess: input.allowsCrossBranchAccess,
        displayOrder: input.displayOrder,
        notes: input.notes,
        isActive: input.isActive,
      });

      this.logger.log(
        DEPARTMENT_MESSAGES.LOG.HIERARCHY_UPDATED(input.childDepartmentId),
      );

      return {
        success: true,
        departmentId: input.childDepartmentId,
      };
    } catch (error) {
      this.logger.error(
        DEPARTMENT_MESSAGES.ERROR.HIERARCHY_UPDATE_FAILED(
          (error as Error).message,
        ),
      );

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
