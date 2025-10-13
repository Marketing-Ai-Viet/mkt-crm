import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { CreateUserInput } from 'src/mkt-core/user-management/dto/create-user.input';
import { UserOutput } from 'src/mkt-core/user-management/dto/user.output';
import { WorkspaceMemberListOutput } from 'src/mkt-core/user-management/dto/workspace-member.output';
import { UserManagementService } from 'src/mkt-core/user-management/user-management.service';

@UseGuards(UserAuthGuard, WorkspaceAuthGuard)
@Resolver(() => UserOutput)
export class UserManagementResolver {
  constructor(
    private readonly userManagementService: UserManagementService,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  @Mutation(() => UserOutput)
  async createPersonUser(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input', { type: () => CreateUserInput })
    input: CreateUserInput,
  ) {
    return this.userManagementService.createPersonUser(workspaceId, input);
  }

  @Query(() => [WorkspaceMemberListOutput])
  async getMemberByDepartmentCode(
    @AuthWorkspace() workspace: Workspace,
    @Args('departmentCode', { type: () => String }) departmentCode: string,
    @Args('page', { type: () => Int }) page: number,
    @Args('limit', { type: () => Int }) limit: number,
  ): Promise<WorkspaceMemberListOutput[]> {
    const { id: workspaceId } = workspace;
    const members = await this.userManagementService.getMemberByDepartmentCode(
      workspaceId,
      departmentCode,
      page,
      limit,
    );
    return members;
  }
}
