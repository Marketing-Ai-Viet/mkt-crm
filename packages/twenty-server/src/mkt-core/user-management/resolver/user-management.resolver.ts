import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { CreateUserInput } from 'src/mkt-core/user-management/dto/create-user.input';
import { UserOutput } from 'src/mkt-core/user-management/dto/user.output';
import { UserService } from 'src/mkt-core/user-management/services/user.service';

@UseGuards(UserAuthGuard, WorkspaceAuthGuard)
@Resolver(() => UserOutput)
export class UserManagementResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation(() => UserOutput)
  async createPersonUser(
    @AuthWorkspace() { id: workspaceId }: Workspace,
    @Args('input', { type: () => CreateUserInput })
    input: CreateUserInput,
  ) {
    return this.userService.createUser(workspaceId, input);
  }
}
