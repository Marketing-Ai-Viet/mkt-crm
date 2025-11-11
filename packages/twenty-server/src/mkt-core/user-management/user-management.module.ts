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
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { WorkspaceDataSourceModule } from 'src/engine/workspace-datasource/workspace-datasource.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktPeopleSyncCronJob } from 'src/mkt-core/user-management/commands/mkt-people-sync.cron.job';
import { MktPeopleSyncService } from 'src/mkt-core/user-management/services/mkt-people-sync.service';
import { UserManagementResolver } from 'src/mkt-core/user-management/user-management.resolver';
import { UserManagementService } from 'src/mkt-core/user-management/user-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserWorkspace, Workspace], 'core'),
    TypeOrmModule.forFeature([RoleEntity, RoleTargetsEntity], 'core'),
    UserWorkspaceModule,
    UserRoleModule,
    WorkspaceDataSourceModule,
    EmailModule,
    TwentyConfigModule,
    MktCommonModule,
    WorkspaceCacheStorageModule,
  ],
  providers: [
    UserManagementResolver,
    UserManagementService,
    MktPeopleSyncService,
    MktPeopleSyncCronJob,
  ],
  exports: [UserManagementService, MktPeopleSyncService],
})
export class UserManagementModule {}
