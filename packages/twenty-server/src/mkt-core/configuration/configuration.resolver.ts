import { UseGuards } from '@nestjs/common';
import { Query,Resolver } from '@nestjs/graphql';

import { User } from 'src/engine/core-modules/user/user.entity';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

import { ConfigurationService,NavigationConfiguration } from './configuration.service';
import { NavigationConfigurationType } from './navigation-configuration.type';

@UseGuards(WorkspaceAuthGuard)
@Resolver()
export class ConfigurationResolver {
  constructor(private readonly configurationService: ConfigurationService) {}

  @Query(() => [String])
  getHiddenNavigationObjects(
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ): string[] {
    const config = this.configurationService.getNavigationConfiguration();
    return config.hiddenObjects;
  }

  @Query(() => [String])
  getHiddenNavigationItems(
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ): string[] {
    const config = this.configurationService.getNavigationConfiguration();
    return config.hiddenItems;
  }

  @Query(() => [String])
  getHiddenDataModelObjects(
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ): string[] {
    const config = this.configurationService.getNavigationConfiguration();
    return config.hiddenDataModelObjects;
  }

  @Query(() => NavigationConfigurationType)
  getNavigationConfiguration(
    @AuthWorkspace() workspace: Workspace,
    @AuthUser() user: User,
  ): NavigationConfiguration {
    return this.configurationService.getNavigationConfiguration();
  }
}
