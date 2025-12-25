import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { paymentConfig } from 'src/mkt-core/payment/config';
import { MktPaymentMethodRepository } from 'src/mkt-core/payment-method/repositories';
import { FireBaseIntegrationService } from 'src/mkt-core/payment/integration/firebase-integration.service';
import {
  MktPaymentHistoryRepository,
  MktPaymentRepository,
  MktWebhookLogRepository,
} from 'src/mkt-core/payment/repositories';
import { PaymentMutationResolver } from 'src/mkt-core/payment/resolvers';
import { SepayPaymentController } from 'src/mkt-core/payment/sepay-payment/sepay-payment.controller';
import { MktPaymentListenerService } from 'src/mkt-core/payment/services/mkt-payment-listener.service';
import { MktPaymentPrepareService } from 'src/mkt-core/payment/services/mkt-payment-prepare.service';
import { MktPaymentWebhookService } from 'src/mkt-core/payment/services/mkt-payment-webhook.service';
import { MktPaymentService } from 'src/mkt-core/payment/services/mkt-payment.service';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories';

@Module({
  controllers: [SepayPaymentController],
  imports: [
    ConfigModule.forFeature(paymentConfig),
    HttpModule,
    RecordPositionModule,
    MktCommonModule,
    JwtModule,
    AuthModule,
    WorkspaceCacheStorageModule,
  ],
  providers: [
    // Repositories
    MktPaymentRepository,
    MktPaymentHistoryRepository,
    MktWebhookLogRepository,
    MktOrderRepository,
    MktPaymentMethodRepository,
    MktWorkspaceMemberRepository,
    // Resolvers
    PaymentMutationResolver,
    // Services
    MktPaymentPrepareService,
    MktPaymentService,
    MktPaymentWebhookService,
    FireBaseIntegrationService,
    MktPaymentListenerService,
  ],
  exports: [
    // Repositories
    MktPaymentRepository,
    MktPaymentHistoryRepository,
    MktWebhookLogRepository,
    // Services
    MktPaymentPrepareService,
    MktPaymentService,
    MktPaymentWebhookService,
    FireBaseIntegrationService,
  ],
})
export class MktPaymentModule {}
