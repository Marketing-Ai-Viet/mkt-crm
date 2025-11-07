import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { FireBaseIntegrationService } from 'src/mkt-core/payment/integration/firebase-integration.service';
import { SepayPaymentController } from 'src/mkt-core/payment/sepay-payment/sepay-payment.controller';

import { MktPaymentCreateOnePreQueryHook } from './hooks/mkt-payment-create-one.pre-query.hook';
import { MktPaymentUpdateOnePreQueryHook } from './hooks/mkt-payment-update-one.pre-query.hook';
import { MktPaymentListenerService } from './services/mkt-payment-listener.service';
import { MktPaymentPrepareService } from './services/mkt-payment-prepare.service';
import { MktPaymentService } from './services/mkt-payment.service';
@Module({
  controllers: [SepayPaymentController],
  imports: [
    HttpModule,
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
    FireBaseIntegrationService,
    MktPaymentListenerService,
  ],
  exports: [
    MktPaymentPrepareService,
    MktPaymentService,
    FireBaseIntegrationService,
  ],
})
export class MktPaymentModule {}
