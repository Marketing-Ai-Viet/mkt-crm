import { HttpModule } from '@nestjs/axios';
import { forwardRef, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { RecordPositionModule } from 'src/engine/core-modules/record-position/record-position.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { TransactionModule } from 'src/mkt-core/common/transaction';
import { MktOrderModule } from 'src/mkt-core/order/mkt-order.module';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import {
  orderCodeConfig,
  partialPaymentConfig,
  paymentConfig,
  securityConfig,
} from 'src/mkt-core/payment/config';
import { PaymentProviderFactory } from 'src/mkt-core/payment/factory/payment-provider.factory';
import { IpWhitelistGuard } from 'src/mkt-core/payment/guards/ip-whitelist.guard';
import { PaymentNotificationListener } from 'src/mkt-core/payment/listeners';
import { MktPaymentMethodRepository } from 'src/mkt-core/payment-method/repositories';
import {
  bidvConfig,
  BidvApiClient,
  BidvProvider,
  BIDV_PROVIDER_METADATA,
} from 'src/mkt-core/payment/providers/bidv';
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
// Services - organized by domain
import {
  MktPaymentService,
  MktPaymentPrepareService,
  PaymentFacadeService,
} from 'src/mkt-core/payment/services/core';
import { MktPaymentWebhookService } from 'src/mkt-core/payment/services/webhook';
import {
  SepayAuthService,
  SepayQrPageService,
} from 'src/mkt-core/payment/services/sepay';
import {
  PaymentEventService,
  MktPaymentListenerService,
} from 'src/mkt-core/payment/services/events';
import { PAYMENT_PROVIDER_TYPE } from 'src/mkt-core/payment/types/provider.types';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories';

@Module({
  controllers: [SepayPaymentController],
  imports: [
    ConfigModule.forFeature(paymentConfig),
    ConfigModule.forFeature(sepayConfig),
    ConfigModule.forFeature(bidvConfig),
    ConfigModule.forFeature(securityConfig),
    ConfigModule.forFeature(orderCodeConfig),
    ConfigModule.forFeature(partialPaymentConfig),
    HttpModule,
    RecordPositionModule,
    forwardRef(() => MktOrderModule), // Circular dependency with MktOrderModule
    JwtModule,
    AuthModule,
    WorkspaceCacheStorageModule,
    TransactionModule,
  ],
  providers: [
    // Factory
    PaymentProviderFactory,
    // Guards
    IpWhitelistGuard,
    // Providers - SePay
    SepayProvider,
    SepayQrGenerator,
    SepayWebhookHandler,
    // Providers - BIDV
    BidvProvider,
    BidvApiClient,
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
    MktPaymentListenerService,
    PaymentEventService,
    SepayAuthService,
    SepayQrPageService,
    // Event Listeners
    PaymentNotificationListener,
  ],
  exports: [
    // Factory
    PaymentProviderFactory,
    // Providers
    SepayProvider,
    BidvProvider,
    // Repositories
    MktPaymentRepository,
    MktPaymentHistoryRepository,
    MktWebhookLogRepository,
    MktPaymentMethodRepository,
    // Services
    PaymentFacadeService,
    MktPaymentPrepareService,
    MktPaymentService,
    MktPaymentWebhookService,
  ],
})
export class MktPaymentModule implements OnModuleInit {
  private readonly logger = new Logger(MktPaymentModule.name);

  constructor(
    private readonly providerFactory: PaymentProviderFactory,
    private readonly sepayProvider: SepayProvider,
    private readonly sepayWebhookHandler: SepayWebhookHandler,
    private readonly bidvProvider: BidvProvider,
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

    // Register BIDV provider
    this.providerFactory.registerProvider(
      PAYMENT_PROVIDER_TYPE.BIDV_SEPAY,
      this.bidvProvider,
      {
        type: PAYMENT_PROVIDER_TYPE.BIDV_SEPAY,
        displayName: BIDV_PROVIDER_METADATA.displayName,
        description: BIDV_PROVIDER_METADATA.description,
        icon: BIDV_PROVIDER_METADATA.icon,
        capabilities: this.bidvProvider.capabilities,
        configuredFields: [...BIDV_PROVIDER_METADATA.configuredFields],
      },
    );

    // Note: BIDV uses the same webhook handler as SePay
    // The webhook controller routes BIDV webhooks to the SePay handler

    this.logger.log('Payment providers registered successfully');
  }
}
