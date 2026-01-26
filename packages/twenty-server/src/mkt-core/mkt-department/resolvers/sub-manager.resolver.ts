/**
 * SubManagerResolver - GraphQL resolver for Department Sub-Manager CRUD operations
 *
 * Provides custom mutations and queries for managing sub-manager assignments.
 * Replaces auto-generated operations that are blocked by hooks.
 *
 * Operations:
 * - Queries: getSubManagersByDepartment, getSubManagersByMember, getSubManager
 * - Mutations: createSubManager, updateSubManager, deleteSubManager, setPrimarySubManager
 */

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  CreateSubManagerInput,
  UpdateSubManagerInput,
  SetPrimarySubManagerInput,
  CreateSubManagerResponse,
  UpdateSubManagerResponse,
  DeleteSubManagerResponse,
  SubManagerListResponse,
  SubManagerOutput,
  SetPrimarySubManagerResponse,
} from 'src/mkt-core/mkt-department/dto/sub-manager';
import { MktDepartmentSubManagerWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department-sub-manager.workspace-entity';
import { SubManagerService } from 'src/mkt-core/mkt-department/services/sub-manager.service';

@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class SubManagerResolver {
  constructor(private readonly subManagerService: SubManagerService) {}

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get all sub-managers for a department
   */
  @Query(() => SubManagerListResponse, {
    description: 'Get all sub-managers for a department',
  })
  async getSubManagersByDepartment(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('departmentId') departmentId: string,
    @Args('activeOnly', { nullable: true, defaultValue: false })
    activeOnly: boolean,
  ): Promise<SubManagerListResponse> {
    const items = await this.subManagerService.findByDepartmentId(
      workspaceId,
      departmentId,
      { activeOnly },
    );

    return {
      items: items.map((item) => this.mapToOutput(item)),
      totalCount: items.length,
    };
  }

  /**
   * Get all department assignments for a workspace member
   */
  @Query(() => SubManagerListResponse, {
    description: 'Get all department assignments for a workspace member',
  })
  async getSubManagersByMember(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('workspaceMemberId') workspaceMemberId: string,
    @Args('activeOnly', { nullable: true, defaultValue: false })
    activeOnly: boolean,
  ): Promise<SubManagerListResponse> {
    const items = await this.subManagerService.findByWorkspaceMemberId(
      workspaceId,
      workspaceMemberId,
      { activeOnly },
    );

    return {
      items: items.map((item) => this.mapToOutput(item)),
      totalCount: items.length,
    };
  }

  /**
   * Get a specific sub-manager assignment by ID
   */
  @Query(() => SubManagerOutput, {
    nullable: true,
    description: 'Get a sub-manager assignment by ID',
  })
  async getSubManager(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('id') id: string,
  ): Promise<SubManagerOutput | null> {
    const subManager = await this.subManagerService.findById(workspaceId, id);

    if (!subManager) {
      return null;
    }

    return this.mapToOutput(subManager);
  }

  /**
   * Get primary sub-manager for a department
   */
  @Query(() => SubManagerOutput, {
    nullable: true,
    description: 'Get the primary sub-manager for a department',
  })
  async getPrimarySubManager(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('departmentId') departmentId: string,
  ): Promise<SubManagerOutput | null> {
    const subManager = await this.subManagerService.findPrimaryByDepartmentId(
      workspaceId,
      departmentId,
    );

    if (!subManager) {
      return null;
    }

    return this.mapToOutput(subManager);
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Create a new sub-manager assignment
   */
  @Mutation(() => CreateSubManagerResponse, {
    description: 'Create a new sub-manager assignment',
  })
  async createSubManager(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input') input: CreateSubManagerInput,
  ): Promise<CreateSubManagerResponse> {
    const result = await this.subManagerService.create(workspaceId, {
      departmentId: input.departmentId,
      workspaceMemberId: input.workspaceMemberId,
      isPrimary: input.isPrimary,
      note: input.note,
      isActive: input.isActive,
    });

    return {
      success: result.success,
      subManager: result.subManager
        ? this.mapToOutput(result.subManager)
        : undefined,
      error: result.error,
    };
  }

  /**
   * Update a sub-manager assignment
   */
  @Mutation(() => UpdateSubManagerResponse, {
    description: 'Update a sub-manager assignment',
  })
  async updateSubManager(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input') input: UpdateSubManagerInput,
  ): Promise<UpdateSubManagerResponse> {
    const result = await this.subManagerService.update(workspaceId, input.id, {
      isPrimary: input.isPrimary,
      note: input.note,
      isActive: input.isActive,
    });

    return {
      success: result.success,
      subManager: result.subManager
        ? this.mapToOutput(result.subManager)
        : undefined,
      error: result.error,
    };
  }

  /**
   * Delete a sub-manager assignment (soft delete)
   */
  @Mutation(() => DeleteSubManagerResponse, {
    description: 'Delete a sub-manager assignment',
  })
  async deleteSubManager(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('id') id: string,
  ): Promise<DeleteSubManagerResponse> {
    const result = await this.subManagerService.delete(workspaceId, id);

    return {
      success: result.success,
      deletedId: result.deletedId,
      error: result.error,
    };
  }

  /**
   * Set primary sub-manager for a department
   */
  @Mutation(() => SetPrimarySubManagerResponse, {
    description: 'Set the primary sub-manager for a department',
  })
  async setPrimarySubManager(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input') input: SetPrimarySubManagerInput,
  ): Promise<SetPrimarySubManagerResponse> {
    const result = await this.subManagerService.setPrimary(
      workspaceId,
      input.departmentId,
      input.subManagerId,
    );

    return {
      success: result.success,
      error: result.error,
    };
  }

  /**
   * Deactivate a sub-manager assignment
   */
  @Mutation(() => UpdateSubManagerResponse, {
    description: 'Deactivate a sub-manager assignment',
  })
  async deactivateSubManager(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('id') id: string,
  ): Promise<UpdateSubManagerResponse> {
    const result = await this.subManagerService.deactivate(workspaceId, id);

    return {
      success: result.success,
      subManager: result.subManager
        ? this.mapToOutput(result.subManager)
        : undefined,
      error: result.error,
    };
  }

  /**
   * Activate a sub-manager assignment
   */
  @Mutation(() => UpdateSubManagerResponse, {
    description: 'Activate a sub-manager assignment',
  })
  async activateSubManager(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('id') id: string,
  ): Promise<UpdateSubManagerResponse> {
    const result = await this.subManagerService.activate(workspaceId, id);

    return {
      success: result.success,
      subManager: result.subManager
        ? this.mapToOutput(result.subManager)
        : undefined,
      error: result.error,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToOutput(
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
}
