import { Module } from '@nestjs/common';

import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { MktDepartmentCreateOnePostQueryHook } from 'src/mkt-core/mkt-department/hooks/mkt-department-create-one.post-query.hook';
import { MktDepartmentUpdateOnePostQueryHook } from 'src/mkt-core/mkt-department/hooks/mkt-department-update-one.post-query.hook';
import {
  MktDepartmentRepository,
  MktDepartmentHierarchyRepository,
  MktDepartmentSubManagerRepository,
  MktDepartmentAncestryRepository,
} from 'src/mkt-core/mkt-department/repositories';
import { DepartmentTreeResolver } from 'src/mkt-core/mkt-department/resolvers/department-tree.resolver';
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
    // Hooks
    MktDepartmentCreateOnePostQueryHook,
    MktDepartmentUpdateOnePostQueryHook,
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
