import { Module } from '@nestjs/common';
import { DepartmentTreeResolver } from 'src/mkt-core/mkt-department/resolvers/department-tree.resolver';
import { DepartmentService } from 'src/mkt-core/mkt-department/services/department.service';

@Module({
  imports: [],
  providers: [DepartmentService, DepartmentTreeResolver],
  exports: [],
})
export class MktDepartmentModule {}
