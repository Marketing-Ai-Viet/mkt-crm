import { HttpModule } from '@nestjs/axios';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { MktCommonModule } from 'src/mkt-core/common/service/mkt-common.module';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { paymentConfig } from 'src/mkt-core/payment/config';
import { PaymentProviderFactory } from 'src/mkt-core/payment/factory/payment-provider.factory';
import { MktPaymentMethodRepository } from 'src/mkt-core/payment-method/repositories';
import { FireBaseIntegrationService } from 'src/mkt-core/payment/integration/firebase-integration.service';
import {
  sepayConfig,
  SepayProvider,
  SepayQrGenerator,
  SepayWebhookHandler,
  SEPAY_PROVIDER_METADATA,
} from 'src/mkt-core/payment/providers/sepay';
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
import { PaymentFacadeService } from 'src/mkt-core/payment/services/payment-facade.service';
import { PAYMENT_PROVIDER_TYPE } from 'src/mkt-core/payment/types/provider.types';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories';

@Module({
  controllers: [SepayPaymentController],
  imports: [
    ConfigModule.forFeature(paymentConfig),
    ConfigModule.forFeature(sepayConfig),
    HttpModule,
    RecordPositionModule,
    MktCommonModule,
    JwtModule,
    AuthModule,
    WorkspaceCacheStorageModule,
  ],
  providers: [
    // Factory
    PaymentProviderFactory,
    // Providers
    SepayProvider,
    SepayQrGenerator,
    SepayWebhookHandler,
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
    PaymentFacadeService,
    MktPaymentPrepareService,
    MktPaymentService,
    MktPaymentWebhookService,
    FireBaseIntegrationService,
    MktPaymentListenerService,
  ],
  exports: [
    // Factory
    PaymentProviderFactory,
    // Providers
    SepayProvider,
    // Repositories
    MktPaymentRepository,
    MktPaymentHistoryRepository,
    MktWebhookLogRepository,
    // Services
    PaymentFacadeService,
    MktPaymentPrepareService,
    MktPaymentService,
    MktPaymentWebhookService,
    FireBaseIntegrationService,
  ],
})
export class MktPaymentModule implements OnModuleInit {
  private readonly logger = new Logger(MktPaymentModule.name);

  constructor(
    private readonly providerFactory: PaymentProviderFactory,
    private readonly sepayProvider: SepayProvider,
    private readonly sepayWebhookHandler: SepayWebhookHandler,
  ) {}

  onModuleInit() {
    this.registerProviders();
  }

  private registerProviders(): void {
    // Register SePay provider
    this.providerFactory.registerProvider(
      PAYMENT_PROVIDER_TYPE.SEPAY_QR,
      this.sepayProvider,
      {
        type: PAYMENT_PROVIDER_TYPE.SEPAY_QR,
        displayName: SEPAY_PROVIDER_METADATA.displayName,
        description: SEPAY_PROVIDER_METADATA.description,
        icon: SEPAY_PROVIDER_METADATA.icon,
        capabilities: this.sepayProvider.capabilities,
        configuredFields: [...SEPAY_PROVIDER_METADATA.configuredFields],
      },
    );

    // Register SePay webhook handler
    this.providerFactory.registerWebhookHandler(
      PAYMENT_PROVIDER_TYPE.SEPAY_QR,
      this.sepayWebhookHandler,
    );

    this.logger.log('Payment providers registered successfully');
  }
}
