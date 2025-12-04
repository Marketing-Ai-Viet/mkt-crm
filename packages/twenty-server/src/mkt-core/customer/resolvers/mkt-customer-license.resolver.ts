import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  UserLicenseDto,
  UserLicensesResponseDto,
} from 'src/mkt-core/customer/dto/get-user-licenses.dto';
import { MktCustomerLicenseService } from 'src/mkt-core/customer/services/mkt-customer-license.service';

@Resolver()
export class MktCustomerLicenseResolver {
  constructor(
    private readonly customerLicenseService: MktCustomerLicenseService,
  ) {}

  @UseGuards(UserAuthGuard)
  @Query(() => UserLicensesResponseDto, {
    description: 'Get all licenses for the currently logged-in user',
  })
  async getMyLicenses(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<UserLicensesResponseDto> {
    return this.customerLicenseService.getLicensesForUser(
      user.id,
      workspace.id,
    );
  }

  @UseGuards(WorkspaceAuthGuard)
  @Query(() => UserLicenseDto, {
    nullable: true,
    description: 'Get license information by license key',
  })
  async getLicenseByKey(
    @Args('licenseKey', { type: () => String }) licenseKey: string,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<UserLicenseDto | null> {
    return this.customerLicenseService.getLicenseByKey(
      licenseKey,
      workspace.id,
    );
  }
}
