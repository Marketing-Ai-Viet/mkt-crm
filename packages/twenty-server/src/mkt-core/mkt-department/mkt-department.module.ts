import { Module } from '@nestjs/common';

import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktDepartmentCreateOnePostQueryHook } from 'src/mkt-core/mkt-department/hooks/mkt-department-create-one.post-query.hook';
import { MktDepartmentUpdateOnePostQueryHook } from 'src/mkt-core/mkt-department/hooks/mkt-department-update-one.post-query.hook';
import { DepartmentTreeResolver } from 'src/mkt-core/mkt-department/resolvers/department-tree.resolver';
import { DepartmentService } from 'src/mkt-core/mkt-department/services/department.service';
import { MktDepartmentHierarchyService } from 'src/mkt-core/mkt-department/services/mkt-department-hierarchy.service';

@Module({
  imports: [MktCommonModule],
  providers: [
    DepartmentService,
    MktDepartmentHierarchyService,
    DepartmentTreeResolver,
    MktDepartmentCreateOnePostQueryHook,
    MktDepartmentUpdateOnePostQueryHook,
  ],
  exports: [],
})
export class MktDepartmentModule {}
