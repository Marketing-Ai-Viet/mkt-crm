import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';

import { MktInvoiceModule } from 'src/mkt-core/invoice/mkt-invoice.module';
import { MktLicenseModule } from 'src/mkt-core/license/mkt-license.module';
import { MktDepartmentModule } from 'src/mkt-core/mkt-department/mkt-department.module';
import { MktOrganizationLevelModule } from 'src/mkt-core/mkt-organization-level/mkt-organization-level.module';
import { MktOrderModule } from 'src/mkt-core/order/mkt-order.module';
import { MktPaymentModule } from 'src/mkt-core/payment/mkt-payment.module';
import { MktProductModule } from 'src/mkt-core/product/mkt-product.module';
import { TimelineActivityMiddleware } from 'src/mkt-core/timeline/timeline-activity.middleware';

@Module({
  imports: [
    MktOrderModule,
    MktInvoiceModule,
    MktLicenseModule,
    MktPaymentModule,
    MktDepartmentModule,
    MktOrganizationLevelModule,
    MktProductModule,
  ],
})
export class MktCoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TimelineActivityMiddleware)
      .forRoutes({ path: 'graphql', method: RequestMethod.POST });
  }
}
