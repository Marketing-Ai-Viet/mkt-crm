import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { WorkspaceMember } from 'src/engine/core-modules/user/dtos/workspace-member.dto';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { CreateUserInput } from 'src/mkt-core/user-management/dto/create-user.input';
import { UserOutput } from 'src/mkt-core/user-management/dto/user.output';
import { UserManagementService } from 'src/mkt-core/user-management/user-management.service';

@UseGuards(UserAuthGuard, WorkspaceAuthGuard)
@Resolver(() => UserOutput)
export class UserManagementResolver {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Mutation(() => UserOutput)
  async createPersonUser(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input', { type: () => CreateUserInput })
    input: CreateUserInput,
  ) {
    return this.userManagementService.createPersonUser(workspaceId, input);
  }

  @Query(() => [WorkspaceMember])
  async getMemberByDepartmentCode(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('departmentCode', { type: () => String }) departmentCode: string,
  ) {
    return this.userManagementService.getMemberByDepartmentCode(
      workspaceId,
      departmentCode,
    );
  }
}
