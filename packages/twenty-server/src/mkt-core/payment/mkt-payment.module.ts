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
  transferModeConfig,
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
  SEPAY_PROVIDER_METADATA,
} from 'src/mkt-core/payment/providers/sepay';
import {
  MktPaymentHistoryRepository,
  MktPaymentRepository,
  MktWebhookLogRepository,
  MktVirtualAccountRepository,
} from 'src/mkt-core/payment/repositories';
import {
  PaymentMutationResolver,
  PaymentConfirmationResolver,
  VAMutationResolver,
} from 'src/mkt-core/payment/resolvers';
import { SepayPaymentController } from 'src/mkt-core/payment/sepay-payment/sepay-payment.controller';
// Services - organized by domain
import {
  MktPaymentService,
  MktPaymentPrepareService,
  PaymentFacadeService,
  PaymentConfirmationService,
  PaymentRefundService,
  PaymentHistoryService,
} from 'src/mkt-core/payment/services/core';
import { OrderPaymentCalculationService } from 'src/mkt-core/order/services/core/order-payment-calculation.service';
import { MktPaymentWebhookService } from 'src/mkt-core/payment/services/webhook';
import {
  SepayAuthService,
  SepayQrPageService,
  SepayQrService,
} from 'src/mkt-core/payment/services/sepay';
import {
  PaymentEventService,
  MktPaymentListenerService,
} from 'src/mkt-core/payment/services/events';
import { PAYMENT_PROVIDER_TYPE } from 'src/mkt-core/payment/types/provider.types';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories';
// Application Layer - Use Cases
import {
  ProcessWebhookUseCase,
  CreateVAUseCase,
} from 'src/mkt-core/payment/application/use-cases';
// Domain Layer - Strategies & Ports
import {
  CompositeMatchingStrategy,
  CodeMatchingStrategy,
  FuzzyMatchingStrategy,
  VAMatchingStrategy,
  DEFAULT_FUZZY_CONFIG,
  FUZZY_CONFIG_TOKEN,
} from 'src/mkt-core/payment/domain/strategies';
import {
  ORDER_REPOSITORY_PORT_TOKEN,
  VA_REPOSITORY_PORT_TOKEN,
  VA_PROVIDER_TOKEN,
} from 'src/mkt-core/payment/domain/ports';
// Infrastructure Layer - Adapters
import {
  OrderRepositoryAdapter,
  VARepositoryAdapter,
  SepayVAProvider,
} from 'src/mkt-core/payment/infrastructure/adapters';
// Jobs
import {
  VAExpirationScanJob,
  WebhookRetryJob,
} from 'src/mkt-core/payment/jobs';

@Module({
  controllers: [SepayPaymentController],
  imports: [
    ConfigModule.forFeature(paymentConfig),
    ConfigModule.forFeature(sepayConfig),
    ConfigModule.forFeature(bidvConfig),
    ConfigModule.forFeature(securityConfig),
    ConfigModule.forFeature(orderCodeConfig),
    ConfigModule.forFeature(partialPaymentConfig),
    ConfigModule.forFeature(transferModeConfig),
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
    // Note: SepayWebhookHandler removed - webhook processing handled by MktPaymentWebhookService
    // Providers - BIDV
    BidvProvider,
    BidvApiClient,
    // Repositories
    MktPaymentRepository,
    MktPaymentHistoryRepository,
    MktWebhookLogRepository,
    MktVirtualAccountRepository,
    MktOrderRepository,
    MktPaymentMethodRepository,
    MktWorkspaceMemberRepository,
    // Resolvers
    PaymentMutationResolver,
    PaymentConfirmationResolver,
    VAMutationResolver,
    // Services - Core
    PaymentFacadeService,
    MktPaymentPrepareService,
    MktPaymentService,
    PaymentConfirmationService,
    PaymentRefundService,
    PaymentHistoryService,
    // Services - Webhook & Events
    MktPaymentWebhookService,
    MktPaymentListenerService,
    PaymentEventService,
    // Services - SEPay
    SepayAuthService,
    SepayQrPageService,
    SepayQrService,
    // Services - Order (for payment calculation)
    OrderPaymentCalculationService,
    // Event Listeners
    PaymentNotificationListener,
    // Infrastructure Layer - Adapters & Configs
    OrderRepositoryAdapter,
    VARepositoryAdapter,
    {
      provide: ORDER_REPOSITORY_PORT_TOKEN,
      useExisting: OrderRepositoryAdapter,
    },
    {
      provide: VA_REPOSITORY_PORT_TOKEN,
      useExisting: VARepositoryAdapter,
    },
    {
      provide: FUZZY_CONFIG_TOKEN,
      useValue: DEFAULT_FUZZY_CONFIG,
    },
    // Domain Layer - Matching Strategies
    CodeMatchingStrategy,
    FuzzyMatchingStrategy,
    VAMatchingStrategy,
    CompositeMatchingStrategy,
    // Use Cases
    ProcessWebhookUseCase,
    CreateVAUseCase,
    // Infrastructure Layer - VA Provider
    SepayVAProvider,
    {
      provide: VA_PROVIDER_TOKEN,
      useExisting: SepayVAProvider,
    },
    // Jobs
    VAExpirationScanJob,
    WebhookRetryJob,
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
    // Services - Core
    PaymentFacadeService,
    MktPaymentPrepareService,
    MktPaymentService,
    PaymentConfirmationService,
    PaymentRefundService,
    PaymentHistoryService,
    // Services - Webhook
    MktPaymentWebhookService,
    // Services - SEPay
    SepayQrService,
    // Repositories - VA
    MktVirtualAccountRepository,
    // Domain Strategies
    CompositeMatchingStrategy,
    // Use Cases
    ProcessWebhookUseCase,
    CreateVAUseCase,
    // VA Provider
    SepayVAProvider,
    // Jobs
    VAExpirationScanJob,
    WebhookRetryJob,
  ],
})
export class MktPaymentModule implements OnModuleInit {
  private readonly logger = new Logger(MktPaymentModule.name);

  constructor(
    private readonly providerFactory: PaymentProviderFactory,
    private readonly sepayProvider: SepayProvider,
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

    // Note: SepayWebhookHandler removed (Phase 0 Critical Fix)
    // Webhook processing is now handled by MktPaymentWebhookService
    // which has full partial payment support and proper amount analysis

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

    this.logger.log('Payment providers registered successfully');
  }
}
