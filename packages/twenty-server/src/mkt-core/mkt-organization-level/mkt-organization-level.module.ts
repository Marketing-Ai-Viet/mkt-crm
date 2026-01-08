import { Module } from '@nestjs/common';

import { OrganizationLevelService } from 'src/mkt-core/mkt-organization-level/services/organization-level.service';
import { OrganizationLevelResolver } from 'src/mkt-core/mkt-organization-level/resolvers/organization-level.resolver';
import { OrganizationLevelHierarchyValidator } from 'src/mkt-core/mkt-organization-level/validators/hierarchy-validator';
import { OrganizationLevelValidationService } from 'src/mkt-core/mkt-organization-level/services/organization-level-validation.service';
import { MktOrganizationLevelCreateOnePreQueryHook } from 'src/mkt-core/mkt-organization-level/hooks/mkt-organization-level-create-one.pre-query.hook';
import { MktOrganizationLevelUpdateOnePreQueryHook } from 'src/mkt-core/mkt-organization-level/hooks/mkt-organization-level-update-one.pre-query.hook';
import { MktOrganizationLevelDeleteOnePreQueryHook } from 'src/mkt-core/mkt-organization-level/hooks/mkt-organization-level-delete-one.pre-query.hook';
import { MktOrganizationLevelRepository } from 'src/mkt-core/mkt-organization-level/repositories/mkt-organization-level.repository';

@Module({
  imports: [],
  providers: [
    // Repository
    MktOrganizationLevelRepository,

    // Services
    OrganizationLevelService,
    OrganizationLevelValidationService,

    // Validators
    OrganizationLevelHierarchyValidator,

    // Resolver
    OrganizationLevelResolver,

    // Pre-Query Hooks
    MktOrganizationLevelCreateOnePreQueryHook,
    MktOrganizationLevelUpdateOnePreQueryHook,
    MktOrganizationLevelDeleteOnePreQueryHook,
  ],
  exports: [
    MktOrganizationLevelRepository,
    OrganizationLevelService,
    OrganizationLevelHierarchyValidator,
  ],
})
export class MktOrganizationLevelModule {}
