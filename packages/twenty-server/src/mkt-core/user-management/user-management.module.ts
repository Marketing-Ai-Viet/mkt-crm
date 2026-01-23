import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { TwentyConfigModule } from 'src/engine/core-modules/twenty-config/twenty-config.module';
import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { UserWorkspaceModule } from 'src/engine/core-modules/user-workspace/user-workspace.module';
import { User } from 'src/engine/core-modules/user/user.entity';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { RoleTargetsEntity } from 'src/engine/metadata-modules/role/role-targets.entity';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { WorkspaceDataSourceModule } from 'src/engine/workspace-datasource/workspace-datasource.module';
import { MktDepartmentModule } from 'src/mkt-core/mkt-department/mkt-department.module';
import { MktEmailModule } from 'src/mkt-core/mkt-email/mkt-email.module';
import { UserManagementResolver } from 'src/mkt-core/user-management/resolver/user-management.resolver';
import { DepartmentLookupService } from 'src/mkt-core/user-management/services/department-lookup.service';
import { EmailNotificationService } from 'src/mkt-core/user-management/services/email-notification.service';
import { RoleService } from 'src/mkt-core/user-management/services/role.service';
import { UserService } from 'src/mkt-core/user-management/services/user.service';
import { WorkspaceMemberService } from 'src/mkt-core/user-management/services/workspace-member.service';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories';
import { MktMemberCodeGenerationService } from 'src/mkt-core/workspace-member/services/mkt-member-code-generation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserWorkspace, Workspace], 'core'),
    TypeOrmModule.forFeature([RoleEntity, RoleTargetsEntity], 'core'),
    UserWorkspaceModule,
    UserRoleModule,
    WorkspaceDataSourceModule,
    EmailModule,
    TwentyConfigModule,
    MktDepartmentModule,
    MktEmailModule,
  ],
  providers: [
    // Repositories
    MktWorkspaceMemberRepository,

    // Resolvers
    UserManagementResolver,

    // Services
    UserService,
    WorkspaceMemberService,
    RoleService,
    EmailNotificationService,
    DepartmentLookupService,
    MktMemberCodeGenerationService,
  ],
  exports: [
    UserService,
    WorkspaceMemberService,
    RoleService,
    EmailNotificationService,
    MktWorkspaceMemberRepository,
  ],
})
export class UserManagementModule {}
