import { Module } from '@nestjs/common';

import { OrganizationLevelService } from 'src/mkt-core/mkt-organization-level/services/organization-level.service';
import { OrganizationLevelResolver } from 'src/mkt-core/mkt-organization-level/resolvers/organization-level.resolver';
import { OrganizationLevelMutationResolver } from 'src/mkt-core/mkt-organization-level/resolvers/organization-level-mutation.resolver';
import { OrganizationLevelHierarchyValidator } from 'src/mkt-core/mkt-organization-level/validators/hierarchy-validator';
import { OrganizationLevelValidationService } from 'src/mkt-core/mkt-organization-level/services/organization-level-validation.service';
import { MktOrganizationLevelRepository } from 'src/mkt-core/mkt-organization-level/repositories/mkt-organization-level.repository';
import { ORGANIZATION_LEVEL_BLOCK_HOOKS } from 'src/mkt-core/mkt-organization-level/hooks/organization-level-block.hook';

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

    // Resolvers
    OrganizationLevelResolver,
    OrganizationLevelMutationResolver,

    // Block Hooks (thay thế Pre-Query Hooks)
    ...ORGANIZATION_LEVEL_BLOCK_HOOKS,
  ],
  exports: [
    MktOrganizationLevelRepository,
    OrganizationLevelService,
    OrganizationLevelHierarchyValidator,
  ],
})
export class MktOrganizationLevelModule {}
