import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { OrganizationLevelService } from 'src/mkt-core/mkt-organization-level/services/organization-level.service';
import { OrganizationLevelResolver } from 'src/mkt-core/mkt-organization-level/resolvers/organization-level.resolver';
import { OrganizationLevelHierarchyValidator } from 'src/mkt-core/mkt-organization-level/validators/hierarchy-validator';
import { OrganizationLevelValidationService } from 'src/mkt-core/mkt-organization-level/services/organization-level-validation.service';
import { OrganizationLevelPolicyService } from 'src/mkt-core/mkt-organization-level/services/organization-level-policy.service';
import { DefaultPolicyCreationService } from 'src/mkt-core/mkt-organization-level/services/default-policy-creation.service';
import { OrganizationLevelPolicyResolver } from 'src/mkt-core/mkt-organization-level/resolvers/organization-level-policy.resolver';
import { MktOrganizationLevelCreateOnePreQueryHook } from 'src/mkt-core/mkt-organization-level/hooks/mkt-organization-level-create-one.pre-query.hook';
import { MktOrganizationLevelUpdateOnePreQueryHook } from 'src/mkt-core/mkt-organization-level/hooks/mkt-organization-level-update-one.pre-query.hook';
import { MktOrganizationLevelDeleteOnePreQueryHook } from 'src/mkt-core/mkt-organization-level/hooks/mkt-organization-level-delete-one.pre-query.hook';

@Module({
  imports: [TokenModule, WorkspaceCacheStorageModule],
  providers: [
    OrganizationLevelService,
    OrganizationLevelResolver,
    OrganizationLevelHierarchyValidator,
    OrganizationLevelValidationService,
    OrganizationLevelPolicyService,
    DefaultPolicyCreationService,
    OrganizationLevelPolicyResolver,
    MktOrganizationLevelCreateOnePreQueryHook,
    MktOrganizationLevelUpdateOnePreQueryHook,
    MktOrganizationLevelDeleteOnePreQueryHook,
  ],
  exports: [OrganizationLevelService, OrganizationLevelHierarchyValidator],
})
export class MktOrganizationLevelModule {}
