import { Module } from '@nestjs/common';

import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { DEPARTMENT_BLOCK_HOOKS } from 'src/mkt-core/mkt-department/hooks/department-block.pre-query.hook';
import {
  MktDepartmentRepository,
  MktDepartmentHierarchyRepository,
  MktDepartmentSubManagerRepository,
  MktDepartmentAncestryRepository,
} from 'src/mkt-core/mkt-department/repositories';
import { DepartmentTreeResolver } from 'src/mkt-core/mkt-department/resolvers/department-tree.resolver';
import { DepartmentCrudResolver } from 'src/mkt-core/mkt-department/resolvers/department-crud.resolver';
import { DepartmentMutationResolver } from 'src/mkt-core/mkt-department/resolvers/department-mutation.resolver';
import { SubManagerResolver } from 'src/mkt-core/mkt-department/resolvers/sub-manager.resolver';
import { DepartmentAncestryService } from 'src/mkt-core/mkt-department/services/department-ancestry.service';
import { DepartmentCrudService } from 'src/mkt-core/mkt-department/services/department-crud.service';
import { DepartmentTreeService } from 'src/mkt-core/mkt-department/services/department-tree.service';
import { DepartmentService } from 'src/mkt-core/mkt-department/services/department.service';
import { MktDepartmentHierarchyService } from 'src/mkt-core/mkt-department/services/mkt-department-hierarchy.service';
import { SubManagerService } from 'src/mkt-core/mkt-department/services/sub-manager.service';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories';

@Module({
  imports: [TwentyORMModule],
  providers: [
    // Repositories
    MktDepartmentRepository,
    MktDepartmentHierarchyRepository,
    MktDepartmentSubManagerRepository,
    MktDepartmentAncestryRepository,
    MktWorkspaceMemberRepository,

    // Services - Core
    DepartmentService,
    DepartmentCrudService,

    // Services - Tree & Ancestry
    DepartmentTreeService,
    DepartmentAncestryService,

    // Services - Hierarchy
    MktDepartmentHierarchyService,

    // Services - Sub-Manager
    SubManagerService,

    // Resolvers
    DepartmentTreeResolver,
    DepartmentCrudResolver,
    DepartmentMutationResolver,
    SubManagerResolver,

    // Block hooks (disable createOne, updateOne auto-generated mutations)
    ...DEPARTMENT_BLOCK_HOOKS,
  ],
  exports: [
    // Repositories
    MktDepartmentRepository,
    MktDepartmentHierarchyRepository,
    MktDepartmentSubManagerRepository,
    MktDepartmentAncestryRepository,

    // Services - Core
    DepartmentService,
    DepartmentCrudService,

    // Services - Tree & Ancestry
    DepartmentTreeService,
    DepartmentAncestryService,

    // Services - Hierarchy
    MktDepartmentHierarchyService,

    // Services - Sub-Manager
    SubManagerService,
  ],
})
export class MktDepartmentModule {}
