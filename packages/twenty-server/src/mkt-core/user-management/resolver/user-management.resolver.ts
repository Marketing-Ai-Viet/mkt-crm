import { UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  CreateUserInput,
  SearchUserInput,
  UpdateMyProfileInput,
  UpdateUserInput,
  UserListOutput,
  UserOutput,
} from 'src/mkt-core/user-management/dto';
import { UserManagementAuthGuard } from 'src/mkt-core/user-management/guards/user-management-auth.guard';
import { UserService } from 'src/mkt-core/user-management/services/user.service';

@UseGuards(UserManagementAuthGuard, WorkspaceAuthGuard)
@UsePipes(ResolverValidationPipe)
@Resolver(() => UserOutput)
export class UserManagementResolver {
  constructor(private readonly userService: UserService) {}

  // ==================== Mutations ====================

  @Mutation(() => UserOutput, {
    description: 'Tạo user mới trong workspace',
  })
  async createPersonUser(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input', { type: () => CreateUserInput })
    input: CreateUserInput,
  ): Promise<UserOutput> {
    return this.userService.createUser(workspaceId, input);
  }

  @Mutation(() => UserOutput, {
    description: 'Cập nhật thông tin user (workspace member) - Admin only',
  })
  async updatePersonUser(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input', { type: () => UpdateUserInput })
    input: UpdateUserInput,
  ): Promise<UserOutput> {
    return this.userService.updateUser(workspaceId, input);
  }

  @Mutation(() => UserOutput, {
    description:
      'Cập nhật profile của chính user đang đăng nhập (lấy memberId từ token)',
  })
  async updateMyProfile(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @AuthWorkspaceMemberId() memberId: string,
    @Args('input', { type: () => UpdateMyProfileInput })
    input: UpdateMyProfileInput,
  ): Promise<UserOutput> {
    return this.userService.updateMyProfile(workspaceId, memberId, input);
  }

  @Mutation(() => Boolean, {
    description: 'Xóa user (soft delete workspace member)',
  })
  async deletePersonUser(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('memberId', { type: () => String })
    memberId: string,
  ): Promise<boolean> {
    return this.userService.deleteUser(workspaceId, memberId);
  }

  // ==================== Queries ====================

  @Query(() => UserOutput, {
    nullable: true,
    description: 'Lấy thông tin user theo ID',
  })
  async getPersonUser(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('memberId', { type: () => String })
    memberId: string,
  ): Promise<UserOutput | null> {
    return this.userService.getUserById(workspaceId, memberId);
  }

  @Query(() => UserListOutput, {
    description: 'Tìm kiếm users với nhiều tiêu chí và pagination',
  })
  async searchPersonUsers(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input', { type: () => SearchUserInput })
    input: SearchUserInput,
  ): Promise<UserListOutput> {
    return this.userService.searchUsers(workspaceId, input);
  }
}
