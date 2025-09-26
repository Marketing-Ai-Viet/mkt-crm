import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';

import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { ApikeyToBearerMiddleware } from 'src/mkt-core/payment/middleware/apikey-to-bearer.middleware';
import { SepayPaymentController } from 'src/mkt-core/payment/sepay-payment/sepay-payment.controller';

import { MktPaymentCreateOnePreQueryHook } from './hooks/mkt-payment-create-one.pre-query.hook';
import { MktPaymentUpdateOnePreQueryHook } from './hooks/mkt-payment-update-one.pre-query.hook';
import { MktPaymentPrepareService } from './services/mkt-payment-prepare.service';
import { MktPaymentService } from './services/mkt-payment.service';

@Module({
  controllers: [SepayPaymentController],
  imports: [
    RecordPositionModule,
    MktCommonModule,
    JwtModule,
    AuthModule,
    WorkspaceCacheStorageModule,
  ],
  providers: [
    MktPaymentCreateOnePreQueryHook,
    MktPaymentUpdateOnePreQueryHook,
    MktPaymentPrepareService,
    MktPaymentService,
  ],
  exports: [MktPaymentPrepareService, MktPaymentService],
})
export class MktPaymentModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ApikeyToBearerMiddleware)
      .forRoutes({ path: 'hooks/sepay-payment', method: RequestMethod.POST });
  }
}
