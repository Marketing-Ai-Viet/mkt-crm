import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';

import { MktInvoiceModule } from 'src/mkt-core/invoice/mkt-invoice.module';
import { MktLicenseModule } from 'src/mkt-core/license/mkt-license.module';
import { MktDepartmentModule } from 'src/mkt-core/mkt-department/mkt-department.module';
<<<<<<< HEAD
import { MktOrderModule } from 'src/mkt-core/order/mkt-order.module';
import { UserManagementModule } from 'src/mkt-core/user-management/user-management.module';
=======
import { MktOrganizationLevelModule } from 'src/mkt-core/mkt-organization-level/mkt-organization-level.module';
import { MktOrderModule } from 'src/mkt-core/order/mkt-order.module';
import { MktPaymentModule } from 'src/mkt-core/payment/mkt-payment.module';
import { MktProductModule } from 'src/mkt-core/product/mkt-product.module';
import { TimelineActivityMiddleware } from 'src/mkt-core/timeline/timeline-activity.middleware';
>>>>>>> 8e4f3f428200a26b8bbd48f9ebf35cb9d08a908d

@Module({
  imports: [
    MktOrderModule,
    MktInvoiceModule,
    MktLicenseModule,
    MktPaymentModule,
    MktDepartmentModule,
<<<<<<< HEAD
    UserManagementModule,
=======
    MktOrganizationLevelModule,
    MktProductModule,
>>>>>>> 8e4f3f428200a26b8bbd48f9ebf35cb9d08a908d
  ],
})
export class MktCoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TimelineActivityMiddleware)
      .forRoutes({ path: 'graphql', method: RequestMethod.POST });
  }
}
