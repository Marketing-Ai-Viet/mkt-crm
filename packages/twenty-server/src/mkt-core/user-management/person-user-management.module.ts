import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { User } from 'src/engine/core-modules/user/user.entity';

import { PersonUserManagementResolver } from './person-user-management.resolver';
import { PersonUserManagementService } from './person-user-management.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserWorkspace], 'core')],
  providers: [PersonUserManagementResolver, PersonUserManagementService],
  exports: [PersonUserManagementService],
})
export class PersonUserManagementModule {}
