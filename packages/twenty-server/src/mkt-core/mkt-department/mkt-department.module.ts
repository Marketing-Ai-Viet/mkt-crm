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
import { DepartmentMutationResolver } from 'src/mkt-core/mkt-department/resolvers/department-mutation.resolver';
import { DepartmentAncestryService } from 'src/mkt-core/mkt-department/services/department-ancestry.service';
import { DepartmentTreeService } from 'src/mkt-core/mkt-department/services/department-tree.service';
import { DepartmentService } from 'src/mkt-core/mkt-department/services/department.service';
import { MktDepartmentHierarchyService } from 'src/mkt-core/mkt-department/services/mkt-department-hierarchy.service';

@Module({
  imports: [TwentyORMModule],
  providers: [
    // Repositories
    MktDepartmentRepository,
    MktDepartmentHierarchyRepository,
    MktDepartmentSubManagerRepository,
    MktDepartmentAncestryRepository,

    // Services - Core
    DepartmentService,

    // Services - Tree & Ancestry
    DepartmentTreeService,
    DepartmentAncestryService,

    // Services - Hierarchy
    MktDepartmentHierarchyService,

    // Resolvers
    DepartmentTreeResolver,
    DepartmentMutationResolver,

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

    // Services - Tree & Ancestry
    DepartmentTreeService,
    DepartmentAncestryService,

    // Services - Hierarchy
    MktDepartmentHierarchyService,
  ],
})
export class MktDepartmentModule {}
