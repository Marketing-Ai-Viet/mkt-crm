import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { CreateUserInput } from 'src/mkt-core/user-management/dto/create-user.input';
import { UserOutput } from 'src/mkt-core/user-management/dto/user.output';
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
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('input', { type: () => CreateUserInput })
    input: CreateUserInput,
  ) {
    return this.userManagementService.createPersonUser(workspaceId, input);
  }
}
