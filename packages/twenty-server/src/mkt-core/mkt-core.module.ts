import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';

import { TransactionModule } from 'src/mkt-core/common/transaction';
import { CustomerModule } from 'src/mkt-core/customer/customer.module';
import { MktLicenseIntegrationModule } from 'src/mkt-core/mkt-license-integration/mkt-license-integration.module';
import { MktComboModule } from 'src/mkt-core/mkt-combo/mkt-combo.module';
import { MktDepartmentModule } from 'src/mkt-core/mkt-department/mkt-department.module';
import { MktPromotionModule } from 'src/mkt-core/mkt-promotion/mkt-promotion.module';
import { MktOrganizationLevelModule } from 'src/mkt-core/mkt-organization-level/mkt-organization-level.module';
import { MktProductIntegrationModule } from 'src/mkt-core/mkt-product-integration/mkt-product-integration.module';
import { MktEmailModule } from 'src/mkt-core/mkt-email/mkt-email.module';
import { MktSettingModule } from 'src/mkt-core/setting/mkt-setting.module';
import { MktAuthClientModule } from 'src/mkt-core/mkt-auth-client/mkt-auth-client.module';
import { OAuth2ClientModule } from 'src/mkt-core/oauth2-client/oauth2-client.module';
import { MktOrderModule } from 'src/mkt-core/order/mkt-order.module';
import { MktPaymentModule } from 'src/mkt-core/payment/mkt-payment.module';
import { TimelineActivityMiddleware } from 'src/mkt-core/timeline/timeline-activity.middleware';
import { UserManagementModule } from 'src/mkt-core/user-management/user-management.module';
import { MktUserIntegrationModule } from 'src/mkt-core/mkt-user-integration/mkt-user-integration.module';

@Module({
  imports: [
    // Global infrastructure modules (must be first)
    TransactionModule,
    MktAuthClientModule, // MKT Server authentication

    // Feature modules
    MktOrderModule,
    MktPaymentModule,
    MktDepartmentModule,
    UserManagementModule,
    MktOrganizationLevelModule,
    CustomerModule,
    OAuth2ClientModule,
    MktProductIntegrationModule,
    MktLicenseIntegrationModule, // License API + Queue processing
    MktUserIntegrationModule,
    MktComboModule,
    MktPromotionModule,
    MktEmailModule,
    MktSettingModule,
  ],
})
export class MktCoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TimelineActivityMiddleware)
      .forRoutes({ path: 'graphql', method: RequestMethod.POST });
  }
}
