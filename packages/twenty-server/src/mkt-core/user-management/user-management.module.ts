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
import { CustomerModule } from 'src/mkt-core/customer/customer.module';
import { MktPeopleSyncCronJob } from 'src/mkt-core/user-management/commands/mkt-people-sync.cron.job';
import { MktCoreUserCreationService } from 'src/mkt-core/user-management/services/mkt-core-user-creation.service';
import { MktCoreUserUpdateService } from 'src/mkt-core/user-management/services/mkt-core-user-update.service';
import { MktDepartmentLookupService } from 'src/mkt-core/user-management/services/mkt-department-lookup.service';
import { MktEmailNotificationService } from 'src/mkt-core/user-management/services/mkt-email-notification.service';
import { MktPasswordService } from 'src/mkt-core/user-management/services/mkt-password.service';
import { MktPeopleQueryService } from 'src/mkt-core/user-management/services/mkt-people-query.service';
import { MktPeopleSyncCoreService } from 'src/mkt-core/user-management/services/mkt-people-sync-core.service';
import { MktPeopleSyncRegistrationService } from 'src/mkt-core/user-management/services/mkt-people-sync-registration.service';
import { MktPeopleSyncService } from 'src/mkt-core/user-management/services/mkt-people-sync.service';
import { MktPeopleProcessorService } from 'src/mkt-core/user-management/services/mkt-people-processor.service';
import { MktPersonUserCreationService } from 'src/mkt-core/user-management/services/mkt-person-user-creation.service';
import { MktPersonUserUpdateService } from 'src/mkt-core/user-management/services/mkt-person-user-update.service';
import { MktPersonDeletionService } from 'src/mkt-core/user-management/services/mkt-person-deletion.service';
import { MktRoleCacheService } from 'src/mkt-core/user-management/services/mkt-role-cache.service';
import { MktRoleManagementService } from 'src/mkt-core/user-management/services/mkt-role-management.service';
import { MktRoleUpdateService } from 'src/mkt-core/user-management/services/mkt-role-update.service';
import { MktUserCleanupService } from 'src/mkt-core/user-management/services/mkt-user-cleanup.service';
import { MktUserCreationService } from 'src/mkt-core/user-management/services/mkt-user-creation.service';
import { MktUserDeletionService } from 'src/mkt-core/user-management/services/mkt-user-deletion.service';
import { MktUserOrchestratorService } from 'src/mkt-core/user-management/services/mkt-user-orchestrator.service';
import { MktUserOutputBuilderService } from 'src/mkt-core/user-management/services/mkt-user-output-builder.service';
import { MktWorkspaceMemberUpdateService } from 'src/mkt-core/user-management/services/mkt-workspace-member-update.service';
import { MktWorkspaceMemberChangeLoggerService } from 'src/mkt-core/user-management/services/mkt-workspace-member-change-logger.service';
import { MktWorkspaceMemberDataBuilderService } from 'src/mkt-core/user-management/services/mkt-workspace-member-data-builder.service';
import { MktWorkspaceMemberService } from 'src/mkt-core/user-management/services/mkt-workspace-member.service';
import { MktMemberCodeGenerationService } from 'src/mkt-core/workspace-member/services/mkt-member-code-generation.service';
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
    CustomerModule,
  ],
  providers: [
    UserManagementResolver,
    UserManagementService,
    MktPeopleSyncService,
    MktPeopleSyncCoreService,
    MktPeopleSyncCronJob,
    MktPeopleSyncRegistrationService,
    MktPeopleQueryService,
    MktPeopleProcessorService,
    MktPersonUserCreationService,
    MktPersonUserUpdateService,
    MktPersonDeletionService,
    MktCoreUserCreationService,
    MktCoreUserUpdateService,
    MktWorkspaceMemberUpdateService,
    MktWorkspaceMemberChangeLoggerService,
    MktWorkspaceMemberDataBuilderService,
    MktDepartmentLookupService,
    MktRoleCacheService,
    MktUserCreationService,
    MktUserDeletionService,
    MktUserOrchestratorService,
    MktUserCleanupService,
    MktUserOutputBuilderService,
    MktWorkspaceMemberService,
    MktRoleManagementService,
    MktRoleUpdateService,
    MktPasswordService,
    MktEmailNotificationService,
    MktMemberCodeGenerationService,
  ],
  exports: [
    UserManagementService,
    MktPeopleSyncService,
    MktUserCreationService,
    MktUserDeletionService,
    MktUserOrchestratorService,
    MktWorkspaceMemberService,
    MktRoleManagementService,
    MktPasswordService,
    MktEmailNotificationService,
  ],
})
export class UserManagementModule {}
