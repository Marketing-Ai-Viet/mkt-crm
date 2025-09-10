import { Module } from '@nestjs/common';

import { MktInvoiceModule } from 'src/mkt-core/invoice/mkt-invoice.module';
import { MktLicenseModule } from 'src/mkt-core/license/mkt-license.module';
import { MktOrderModule } from 'src/mkt-core/order/mkt-order.module';
import { MktRbacModule } from 'src/mkt-core/mkt-rbac/mkt-rbac.module';
import { MktDepartmentModule } from 'src/mkt-core/mkt-department/mkt-department.module';

@Module({
  imports: [
    MktOrderModule,
    MktInvoiceModule,
    MktLicenseModule,
    MktDepartmentModule,
    // RBAC module last - with proper dependency injection
    MktRbacModule.forRoot(),
  ],
})
export class MktCoreModule {}
