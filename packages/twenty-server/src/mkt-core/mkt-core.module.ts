import { Module } from '@nestjs/common';

import { MktInvoiceModule } from 'src/mkt-core/invoice/mkt-invoice.module';
import { MktLicenseModule } from 'src/mkt-core/license/mkt-license.module';
import { MktDepartmentModule } from 'src/mkt-core/mkt-department/mkt-department.module';
import { MktOrderModule } from 'src/mkt-core/order/mkt-order.module';
import { UserManagementModule } from 'src/mkt-core/user-management/user-management.module';

@Module({
  imports: [
    MktOrderModule,
    MktInvoiceModule,
    MktLicenseModule,
    MktDepartmentModule,
    UserManagementModule,
  ],
})
export class MktCoreModule {}
