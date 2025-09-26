import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { UserWorkspaceModule } from 'src/engine/core-modules/user-workspace/user-workspace.module';
import { User } from 'src/engine/core-modules/user/user.entity';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { UserManagementResolver } from 'src/mkt-core/user-management/user-management.resolver';
import { UserManagementService } from 'src/mkt-core/user-management/user-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserWorkspace], 'core'),
    UserWorkspaceModule,
    UserRoleModule,
  ],
  providers: [UserManagementResolver, UserManagementService],
  exports: [UserManagementService],
})
export class UserManagementModule {}
