# Payment Module Refactoring Design

> **Version:** 2.0.0
> **Date:** 2025-12-26
> **Author:** Development Team
> **Status:** Draft

---

## 1. Executive Summary

### 1.1. Mục Tiêu

Refactor lại Payment Module với các mục tiêu:

1. **Extensibility**: Dễ dàng thêm payment provider mới (MoMo, VNPay, ZaloPay, etc.)
2. **Separation of Concerns**: Tách biệt logic của từng provider
3. **Maintainability**: Code dễ đọc, test và bảo trì
4. **Type Safety**: Strongly-typed interfaces và contracts
5. **Testability**: Dễ dàng mock và unit test

### 1.2. Current State Issues

```
Current Problems:
├── Logic rải rác qua nhiều services
│   ├── MktPaymentPrepareService
│   ├── MktOrderCommonConfirmService
│   └── MktPaymentWebhookService
│
├── SePay và BIDV logic lẫn lộn với if/else
│   └── if (isBidvBusiness) { ... } else { ... }
│
├── Không có abstraction cho providers
│   └── Hard-coded provider-specific code
│
├── Configuration tightly coupled
│   └── process.env trực tiếp trong services
│
└── Khó extend cho providers mới
    └── Phải sửa nhiều files
```

### 1.3. Target Architecture

```
Target Design Patterns:
├── Strategy Pattern: PaymentProvider interface
├── Factory Pattern: PaymentProviderFactory
├── Adapter Pattern: Provider-specific adapters
├── Template Method: Webhook processing flow
└── Dependency Injection: Provider registration
```

---

## 2. Architecture Overview

### 2.1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT MODULE v2.0                                │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │   OrderModule   │
                                    └────────┬────────┘
                                             │ uses
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PaymentFacadeService                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  - createPayment(order, providerType)                                   ││
│  │  - processWebhook(providerType, payload)                                ││
│  │  - getPaymentStatus(paymentId)                                          ││
│  │  - cancelPayment(paymentId)                                             ││
│  │  - refundPayment(paymentId, amount)                                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PaymentProviderFactory                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  - getProvider(providerType: PaymentProviderType): IPaymentProvider     ││
│  │  - registerProvider(type, provider): void                               ││
│  │  - getSupportedProviders(): PaymentProviderType[]                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│  SepayProvider    │   │  BidvProvider     │   │  MomoProvider     │
│  (implements      │   │  (implements      │   │  (implements      │
│   IPaymentProvider│   │   IPaymentProvider│   │   IPaymentProvider│
│   IWebhookHandler)│   │   IWebhookHandler)│   │   IWebhookHandler)│
└───────────────────┘   └───────────────────┘   └───────────────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                                 ▼
                    ┌───────────────────────┐
                    │  PaymentRepository    │
                    │  WebhookLogRepository │
                    └───────────────────────┘
                                 │
                                 ▼
                    ┌───────────────────────┐
                    │      PostgreSQL       │
                    └───────────────────────┘
```

### 2.2. Module Structure

```
packages/twenty-server/src/mkt-core/payment/
├── payment.module.ts                    # Main module
│
├── interfaces/                          # Contracts
│   ├── payment-provider.interface.ts    # IPaymentProvider
│   ├── webhook-handler.interface.ts     # IWebhookHandler
│   ├── payment-result.interface.ts      # Result types
│   └── index.ts
│
├── types/                               # Type definitions
│   ├── provider.types.ts                # PaymentProviderType enum
│   ├── payment.types.ts                 # Payment-related types
│   ├── webhook.types.ts                 # Webhook payload types
│   └── index.ts
│
├── factory/                             # Factory pattern
│   ├── payment-provider.factory.ts
│   └── index.ts
│
├── providers/                           # Provider implementations
│   ├── base/
│   │   └── base-payment.provider.ts     # Abstract base class
│   ├── sepay/
│   │   ├── sepay.provider.ts
│   │   ├── sepay.config.ts
│   │   ├── sepay.types.ts
│   │   ├── sepay-qr.generator.ts
│   │   └── sepay-webhook.handler.ts
│   ├── bidv/
│   │   ├── bidv.provider.ts
│   │   ├── bidv.config.ts
│   │   ├── bidv.types.ts
│   │   └── bidv-api.client.ts
│   └── index.ts
│
├── services/                            # Core services
│   ├── payment-facade.service.ts        # Main entry point
│   ├── payment-orchestrator.service.ts  # Payment flow orchestration
│   ├── webhook-dispatcher.service.ts    # Route webhooks to providers
│   └── index.ts
│
├── controllers/                         # HTTP endpoints
│   ├── payment.controller.ts            # REST API
│   └── webhook.controller.ts            # Webhook endpoints
│
├── repositories/                        # Data access
│   ├── payment.repository.ts
│   ├── payment-history.repository.ts
│   └── webhook-log.repository.ts
│
├── objects/                             # Entities
│   ├── payment.workspace-entity.ts
│   ├── payment-history.workspace-entity.ts
│   └── webhook-log.workspace-entity.ts
│
├── dto/                                 # Data Transfer Objects
│   ├── create-payment.input.ts
│   ├── payment-result.output.ts
│   └── webhook-payload.dto.ts
│
├── config/                              # Configuration
│   ├── payment.config.ts                # Main config
│   └── provider-configs/
│       ├── sepay.config.ts
│       └── bidv.config.ts
│
├── constants/                           # Constants
│   ├── provider.constants.ts
│   └── error-codes.constants.ts
│
├── guards/                              # Security
│   ├── webhook-auth.guard.ts
│   └── provider-api-key.guard.ts
│
├── decorators/                          # Custom decorators
│   └── payment-provider.decorator.ts
│
└── utils/                               # Utilities
    ├── qr-code.util.ts
    └── amount.util.ts
```

---

## 3. Core Interfaces

### 3.1. Payment Provider Interface

```typescript
// interfaces/payment-provider.interface.ts

import { PaymentProviderType } from '../types/provider.types';

/**
 * Core interface that all payment providers must implement
 */
export interface IPaymentProvider {
  /**
   * Provider type identifier
   */
  readonly providerType: PaymentProviderType;

  /**
   * Human-readable provider name
   */
  readonly displayName: string;

  /**
   * Check if provider is enabled and configured
   */
  isEnabled(): boolean;

  /**
   * Initialize payment and return payment details
   */
  initializePayment(request: InitializePaymentRequest): Promise<InitializePaymentResult>;

  /**
   * Generate QR code URL if supported
   */
  generateQrCode(request: QrCodeRequest): Promise<QrCodeResult>;

  /**
   * Query payment status from provider
   */
  queryPaymentStatus(transactionId: string): Promise<PaymentStatusResult>;

  /**
   * Cancel/void a pending payment
   */
  cancelPayment(transactionId: string): Promise<CancelPaymentResult>;

  /**
   * Process refund if supported
   */
  refundPayment(request: RefundRequest): Promise<RefundResult>;

  /**
   * Validate provider-specific configuration
   */
  validateConfiguration(): ValidationResult;
}

/**
 * Request to initialize a new payment
 */
export type InitializePaymentRequest = {
  orderId: string;
  orderCode: string;
  amount: number;
  currency: string;
  description?: string;
  customerInfo?: CustomerInfo;
  metadata?: Record<string, unknown>;
  /** Duration in seconds before payment expires */
  expiresIn?: number;
};

/**
 * Result of payment initialization
 */
export type InitializePaymentResult = {
  success: boolean;
  providerTransactionId?: string;
  qrCodeUrl?: string;
  paymentUrl?: string;
  expiresAt?: string;
  rawResponse?: unknown;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * Request to generate QR code
 */
export type QrCodeRequest = {
  amount: number;
  orderCode: string;
  description?: string;
  expiresIn?: number;
};

/**
 * Result of QR code generation
 */
export type QrCodeResult = {
  success: boolean;
  qrCodeUrl?: string;
  qrCodeBase64?: string;
  expiresAt?: string;
  errorMessage?: string;
};

/**
 * Payment status query result
 */
export type PaymentStatusResult = {
  success: boolean;
  status: PaymentStatus;
  paidAmount?: number;
  paidAt?: string;
  providerTransactionId?: string;
  rawResponse?: unknown;
  errorMessage?: string;
};

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'PARTIAL';

/**
 * Refund request
 */
export type RefundRequest = {
  transactionId: string;
  amount: number;
  reason?: string;
};

/**
 * Refund result
 */
export type RefundResult = {
  success: boolean;
  refundTransactionId?: string;
  refundedAmount?: number;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * Cancel payment result
 */
export type CancelPaymentResult = {
  success: boolean;
  errorMessage?: string;
};

/**
 * Customer information
 */
export type CustomerInfo = {
  name?: string;
  email?: string;
  phone?: string;
};

/**
 * Configuration validation result
 */
export type ValidationResult = {
  valid: boolean;
  errors: string[];
};
```

### 3.2. Webhook Handler Interface

```typescript
// interfaces/webhook-handler.interface.ts

import { PaymentProviderType } from '../types/provider.types';

/**
 * Interface for handling webhooks from payment providers
 */
export interface IWebhookHandler {
  /**
   * Provider type this handler is for
   */
  readonly providerType: PaymentProviderType;

  /**
   * Validate webhook authenticity (signature, API key, etc.)
   */
  validateWebhook(request: WebhookValidationRequest): Promise<WebhookValidationResult>;

  /**
   * Parse and normalize webhook payload
   */
  parseWebhookPayload(rawPayload: unknown): Promise<NormalizedWebhookPayload>;

  /**
   * Process the webhook and update payment status
   */
  processWebhook(payload: NormalizedWebhookPayload, context: WebhookContext): Promise<WebhookProcessResult>;

  /**
   * Check if this is a duplicate webhook (idempotency)
   */
  isDuplicateWebhook(transactionId: string): Promise<boolean>;
}

/**
 * Webhook validation request
 */
export type WebhookValidationRequest = {
  headers: Record<string, string>;
  body: unknown;
  signature?: string;
  apiKey?: string;
  ipAddress?: string;
};

/**
 * Webhook validation result
 */
export type WebhookValidationResult = {
  valid: boolean;
  errorMessage?: string;
};

/**
 * Normalized webhook payload (provider-agnostic)
 */
export type NormalizedWebhookPayload = {
  /** Provider's transaction ID (for idempotency) */
  providerTransactionId: string;
  /** Order code/reference from our system */
  orderCode: string | null;
  /** Transaction amount */
  amount: number;
  /** Transaction type: credit or debit */
  transactionType: 'CREDIT' | 'DEBIT';
  /** Transaction status */
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  /** Transaction timestamp */
  transactionDate: string;
  /** Provider/gateway name */
  gateway: string;
  /** Bank account number */
  accountNumber?: string;
  /** Transaction description/content */
  content?: string;
  /** Bank reference code */
  referenceCode?: string;
  /** Raw payload for logging */
  rawPayload: unknown;
};

/**
 * Context for webhook processing
 */
export type WebhookContext = {
  workspaceId: string;
  ipAddress?: string;
  receivedAt: string;
};

/**
 * Webhook processing result
 */
export type WebhookProcessResult = {
  success: boolean;
  status: WebhookStatus;
  matchedOrderId?: string;
  matchedOrderCode?: string;
  paymentId?: string;
  message?: string;
  processingTimeMs?: number;
};

export type WebhookStatus =
  | 'MATCHED'
  | 'UNMATCHED'
  | 'PARTIAL'
  | 'ALREADY_PROCESSED'
  | 'AMOUNT_MISMATCH'
  | 'ORDER_NOT_FOUND'
  | 'FAILED';
```

### 3.3. Provider Type Enum

```typescript
// types/provider.types.ts

/**
 * Supported payment provider types
 * Add new providers here when extending
 */
export const PAYMENT_PROVIDER_TYPE = {
  SEPAY_QR: 'SEPAY_QR',
  BIDV_SEPAY: 'BIDV_SEPAY',
  MOMO: 'MOMO',
  VNPAY: 'VNPAY',
  ZALOPAY: 'ZALOPAY',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH: 'CASH',
} as const;

export type PaymentProviderType = typeof PAYMENT_PROVIDER_TYPE[keyof typeof PAYMENT_PROVIDER_TYPE];

/**
 * Provider capabilities
 */
export type ProviderCapabilities = {
  supportsQrCode: boolean;
  supportsRefund: boolean;
  supportsRecurring: boolean;
  supportsPartialPayment: boolean;
  supportsWebhook: boolean;
  supportsPullStatus: boolean;
};

/**
 * Provider metadata
 */
export type ProviderMetadata = {
  type: PaymentProviderType;
  displayName: string;
  description: string;
  icon: string;
  capabilities: ProviderCapabilities;
  configuredFields: string[];
};
```

---

## 4. Provider Factory

### 4.1. Factory Implementation

```typescript
// factory/payment-provider.factory.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { IPaymentProvider } from '../interfaces/payment-provider.interface';
import { IWebhookHandler } from '../interfaces/webhook-handler.interface';
import { PaymentProviderType, ProviderMetadata } from '../types/provider.types';

/**
 * Factory for creating and managing payment providers
 * Uses NestJS ModuleRef for lazy loading providers
 */
@Injectable()
export class PaymentProviderFactory implements OnModuleInit {
  private readonly logger = new Logger(PaymentProviderFactory.name);
  private readonly providers = new Map<PaymentProviderType, IPaymentProvider>();
  private readonly webhookHandlers = new Map<PaymentProviderType, IWebhookHandler>();
  private readonly metadata = new Map<PaymentProviderType, ProviderMetadata>();

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit(): Promise<void> {
    await this.registerDefaultProviders();
  }

  /**
   * Register default providers on module init
   */
  private async registerDefaultProviders(): Promise<void> {
    // Providers will be registered via dependency injection
    // Each provider should be decorated with @PaymentProvider decorator
    this.logger.log('Payment provider factory initialized');
  }

  /**
   * Register a payment provider
   */
  registerProvider(
    type: PaymentProviderType,
    provider: IPaymentProvider,
    metadata: ProviderMetadata,
  ): void {
    if (this.providers.has(type)) {
      this.logger.warn(`Provider ${type} already registered, overwriting`);
    }

    this.providers.set(type, provider);
    this.metadata.set(type, metadata);
    this.logger.log(`Registered payment provider: ${type}`);
  }

  /**
   * Register a webhook handler
   */
  registerWebhookHandler(type: PaymentProviderType, handler: IWebhookHandler): void {
    this.webhookHandlers.set(type, handler);
    this.logger.log(`Registered webhook handler: ${type}`);
  }

  /**
   * Get provider by type
   */
  getProvider(type: PaymentProviderType): IPaymentProvider {
    const provider = this.providers.get(type);

    if (!provider) {
      throw new Error(`Payment provider not found: ${type}`);
    }

    if (!provider.isEnabled()) {
      throw new Error(`Payment provider not enabled: ${type}`);
    }

    return provider;
  }

  /**
   * Get webhook handler by type
   */
  getWebhookHandler(type: PaymentProviderType): IWebhookHandler {
    const handler = this.webhookHandlers.get(type);

    if (!handler) {
      throw new Error(`Webhook handler not found: ${type}`);
    }

    return handler;
  }

  /**
   * Get all enabled providers
   */
  getEnabledProviders(): IPaymentProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.isEnabled());
  }

  /**
   * Get provider metadata
   */
  getProviderMetadata(type: PaymentProviderType): ProviderMetadata | undefined {
    return this.metadata.get(type);
  }

  /**
   * Get all supported provider types
   */
  getSupportedProviderTypes(): PaymentProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider exists and is enabled
   */
  isProviderAvailable(type: PaymentProviderType): boolean {
    const provider = this.providers.get(type);

    return provider ? provider.isEnabled() : false;
  }
}
```

---

## 5. Base Provider Implementation

### 5.1. Abstract Base Provider

```typescript
// providers/base/base-payment.provider.ts

import { Logger } from '@nestjs/common';

import {
  CancelPaymentResult,
  IPaymentProvider,
  InitializePaymentRequest,
  InitializePaymentResult,
  QrCodeRequest,
  QrCodeResult,
  PaymentStatusResult,
  RefundRequest,
  RefundResult,
  ValidationResult,
} from '../../interfaces/payment-provider.interface';
import { PaymentProviderType, ProviderCapabilities } from '../../types/provider.types';

/**
 * Abstract base class for payment providers
 * Provides common functionality and enforces contract
 */
export abstract class BasePaymentProvider implements IPaymentProvider {
  protected readonly logger: Logger;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  // ============================================
  // ABSTRACT PROPERTIES (must implement)
  // ============================================

  abstract readonly providerType: PaymentProviderType;
  abstract readonly displayName: string;
  abstract readonly capabilities: ProviderCapabilities;

  // ============================================
  // ABSTRACT METHODS (must implement)
  // ============================================

  abstract isEnabled(): boolean;
  abstract validateConfiguration(): ValidationResult;
  abstract initializePayment(request: InitializePaymentRequest): Promise<InitializePaymentResult>;

  // ============================================
  // OPTIONAL METHODS (override if supported)
  // ============================================

  /**
   * Default QR code generation - override if provider supports QR
   */
  async generateQrCode(request: QrCodeRequest): Promise<QrCodeResult> {
    if (!this.capabilities.supportsQrCode) {
      return {
        success: false,
        errorMessage: `Provider ${this.providerType} does not support QR codes`,
      };
    }

    return this.doGenerateQrCode(request);
  }

  protected async doGenerateQrCode(_request: QrCodeRequest): Promise<QrCodeResult> {
    return {
      success: false,
      errorMessage: 'Not implemented',
    };
  }

  /**
   * Default payment status query - override if provider supports pull status
   */
  async queryPaymentStatus(transactionId: string): Promise<PaymentStatusResult> {
    if (!this.capabilities.supportsPullStatus) {
      return {
        success: false,
        status: 'PENDING',
        errorMessage: `Provider ${this.providerType} does not support status query`,
      };
    }

    return this.doQueryPaymentStatus(transactionId);
  }

  protected async doQueryPaymentStatus(_transactionId: string): Promise<PaymentStatusResult> {
    return {
      success: false,
      status: 'PENDING',
      errorMessage: 'Not implemented',
    };
  }

  /**
   * Default cancel payment - override if provider supports cancellation
   */
  async cancelPayment(transactionId: string): Promise<CancelPaymentResult> {
    this.logger.warn(`Cancel not supported for ${this.providerType}: ${transactionId}`);

    return {
      success: false,
      errorMessage: 'Cancel not supported',
    };
  }

  /**
   * Default refund - override if provider supports refund
   */
  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    if (!this.capabilities.supportsRefund) {
      return {
        success: false,
        errorCode: 'REFUND_NOT_SUPPORTED',
        errorMessage: `Provider ${this.providerType} does not support refunds`,
      };
    }

    return this.doRefundPayment(request);
  }

  protected async doRefundPayment(_request: RefundRequest): Promise<RefundResult> {
    return {
      success: false,
      errorMessage: 'Not implemented',
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Validate required config fields
   */
  protected validateRequiredFields(
    config: Record<string, unknown>,
    requiredFields: string[],
  ): ValidationResult {
    const errors: string[] = [];

    for (const field of requiredFields) {
      if (!config[field]) {
        errors.push(`Missing required configuration: ${field}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Log provider action
   */
  protected logAction(action: string, details?: Record<string, unknown>): void {
    this.logger.log(`[${this.providerType}] ${action}`, details);
  }

  /**
   * Log provider error
   */
  protected logError(action: string, error: unknown): void {
    this.logger.error(`[${this.providerType}] ${action} failed`, error);
  }
}
```

---

## 6. SePay Provider Implementation

### 6.1. SePay Provider

```typescript
// providers/sepay/sepay.provider.ts

import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { BasePaymentProvider } from '../base/base-payment.provider';
import {
  InitializePaymentRequest,
  InitializePaymentResult,
  QrCodeRequest,
  QrCodeResult,
  ValidationResult,
} from '../../interfaces/payment-provider.interface';
import { PAYMENT_PROVIDER_TYPE, ProviderCapabilities } from '../../types/provider.types';
import { sepayConfig } from './sepay.config';
import { SepayQrGenerator } from './sepay-qr.generator';

@Injectable()
export class SepayProvider extends BasePaymentProvider {
  readonly providerType = PAYMENT_PROVIDER_TYPE.SEPAY_QR;
  readonly displayName = 'SePay QR (VietQR)';
  readonly capabilities: ProviderCapabilities = {
    supportsQrCode: true,
    supportsRefund: false,
    supportsRecurring: false,
    supportsPartialPayment: false,
    supportsWebhook: true,
    supportsPullStatus: false, // SePay uses push via webhook
  };

  constructor(
    @Inject(sepayConfig.KEY)
    private readonly config: ConfigType<typeof sepayConfig>,
    private readonly qrGenerator: SepayQrGenerator,
  ) {
    super('SepayProvider');
  }

  isEnabled(): boolean {
    const validation = this.validateConfiguration();

    return validation.valid;
  }

  validateConfiguration(): ValidationResult {
    const requiredFields = ['account', 'bank'];

    return this.validateRequiredFields(
      {
        account: this.config.account,
        bank: this.config.bank,
      },
      requiredFields,
    );
  }

  async initializePayment(request: InitializePaymentRequest): Promise<InitializePaymentResult> {
    this.logAction('Initialize payment', {
      orderCode: request.orderCode,
      amount: request.amount,
    });

    try {
      const qrResult = await this.generateQrCode({
        amount: request.amount,
        orderCode: request.orderCode,
        description: request.description,
        expiresIn: request.expiresIn,
      });

      if (!qrResult.success) {
        return {
          success: false,
          errorMessage: qrResult.errorMessage,
        };
      }

      return {
        success: true,
        qrCodeUrl: qrResult.qrCodeUrl,
        expiresAt: qrResult.expiresAt,
      };
    } catch (error) {
      this.logError('Initialize payment', error);

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  protected async doGenerateQrCode(request: QrCodeRequest): Promise<QrCodeResult> {
    return this.qrGenerator.generate({
      account: this.config.account,
      bank: this.config.bank,
      virtualAccount: this.config.virtualAccount,
      amount: request.amount,
      orderCode: request.orderCode,
      description: request.description,
    });
  }
}
```

### 6.2. SePay QR Generator

```typescript
// providers/sepay/sepay-qr.generator.ts

import { Injectable, Logger } from '@nestjs/common';

import { QrCodeResult } from '../../interfaces/payment-provider.interface';

export type SepayQrParams = {
  account: string;
  bank: string;
  virtualAccount?: string;
  amount: number;
  orderCode: string;
  description?: string;
  template?: 'qronly' | 'compact' | 'full';
};

const SEPAY_QR_BASE_URL = 'https://qr.sepay.vn/img';
const DEFAULT_TEMPLATE = 'qronly';

@Injectable()
export class SepayQrGenerator {
  private readonly logger = new Logger(SepayQrGenerator.name);

  /**
   * Generate SePay VietQR URL
   */
  generate(params: SepayQrParams): QrCodeResult {
    try {
      const { account, bank, virtualAccount, amount, orderCode, description, template } = params;

      if (!account || !bank) {
        return {
          success: false,
          errorMessage: 'Missing required parameters: account, bank',
        };
      }

      if (!amount || amount <= 0) {
        return {
          success: false,
          errorMessage: 'Invalid amount',
        };
      }

      if (!orderCode) {
        return {
          success: false,
          errorMessage: 'Missing order code',
        };
      }

      // Build description with VA prefix if provided
      const des = virtualAccount
        ? `${virtualAccount} ${orderCode}`
        : description ?? orderCode;

      // Build QR URL
      const urlParams = new URLSearchParams({
        acc: account,
        bank: bank,
        amount: String(amount),
        des: des,
        template: template ?? DEFAULT_TEMPLATE,
        download: 'false',
      });

      const qrCodeUrl = `${SEPAY_QR_BASE_URL}?${urlParams.toString()}`;

      this.logger.log(`Generated SePay QR URL for order ${orderCode}`);

      return {
        success: true,
        qrCodeUrl,
      };
    } catch (error) {
      this.logger.error('Error generating SePay QR code:', error);

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
```

### 6.3. SePay Webhook Handler

```typescript
// providers/sepay/sepay-webhook.handler.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Inject } from '@nestjs/common';

import {
  IWebhookHandler,
  NormalizedWebhookPayload,
  WebhookContext,
  WebhookProcessResult,
  WebhookValidationRequest,
  WebhookValidationResult,
} from '../../interfaces/webhook-handler.interface';
import { PAYMENT_PROVIDER_TYPE } from '../../types/provider.types';
import { sepayConfig } from './sepay.config';
import { SepayWebhookPayload } from './sepay.types';
import { MktPaymentRepository } from '../../repositories/mkt-payment.repository';
import { MktWebhookLogRepository } from '../../repositories/mkt-webhook-log.repository';
import { MktOrderRepository } from '../../../order/repositories';

@Injectable()
export class SepayWebhookHandler implements IWebhookHandler {
  readonly providerType = PAYMENT_PROVIDER_TYPE.SEPAY_QR;
  private readonly logger = new Logger(SepayWebhookHandler.name);

  constructor(
    @Inject(sepayConfig.KEY)
    private readonly config: ConfigType<typeof sepayConfig>,
    private readonly paymentRepository: MktPaymentRepository,
    private readonly webhookLogRepository: MktWebhookLogRepository,
    private readonly orderRepository: MktOrderRepository,
  ) {}

  /**
   * Validate SePay webhook API key
   */
  async validateWebhook(request: WebhookValidationRequest): Promise<WebhookValidationResult> {
    const authorization = request.headers['authorization'];

    if (!authorization) {
      return { valid: false, errorMessage: 'Missing Authorization header' };
    }

    // SePay uses "Apikey {key}" format
    if (!authorization.startsWith('Apikey ')) {
      return { valid: false, errorMessage: 'Invalid Authorization format' };
    }

    const apiKey = authorization.substring('Apikey '.length).trim();

    if (apiKey !== this.config.webhookApiKey) {
      return { valid: false, errorMessage: 'Invalid API key' };
    }

    return { valid: true };
  }

  /**
   * Parse and normalize SePay webhook payload
   */
  async parseWebhookPayload(rawPayload: unknown): Promise<NormalizedWebhookPayload> {
    const payload = rawPayload as SepayWebhookPayload;

    return {
      providerTransactionId: String(payload.id),
      orderCode: payload.code ?? null,
      amount: payload.transferAmount,
      transactionType: payload.transferType === 'in' ? 'CREDIT' : 'DEBIT',
      status: 'SUCCESS', // SePay only sends successful transactions
      transactionDate: payload.transactionDate,
      gateway: payload.gateway,
      accountNumber: payload.accountNumber,
      content: payload.content,
      referenceCode: payload.referenceCode,
      rawPayload: payload,
    };
  }

  /**
   * Check for duplicate webhook using transaction ID
   */
  async isDuplicateWebhook(transactionId: string): Promise<boolean> {
    // Check in payments table
    const existingPayment = await this.paymentRepository.findBySepayTransactionId(
      this.config.workspaceId,
      transactionId,
    );

    return existingPayment !== null;
  }

  /**
   * Process SePay webhook
   */
  async processWebhook(
    payload: NormalizedWebhookPayload,
    context: WebhookContext,
  ): Promise<WebhookProcessResult> {
    const startTime = Date.now();

    this.logger.log(`Processing SePay webhook: ${payload.providerTransactionId}`);

    try {
      // 1. Check idempotency
      if (await this.isDuplicateWebhook(payload.providerTransactionId)) {
        return {
          success: true,
          status: 'ALREADY_PROCESSED',
          message: 'Transaction already processed',
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 2. Find order by code
      if (!payload.orderCode) {
        return {
          success: true,
          status: 'UNMATCHED',
          message: 'No order code in webhook',
          processingTimeMs: Date.now() - startTime,
        };
      }

      const order = await this.orderRepository.findByOrderCode(
        context.workspaceId,
        payload.orderCode,
      );

      if (!order) {
        return {
          success: true,
          status: 'ORDER_NOT_FOUND',
          message: `Order not found: ${payload.orderCode}`,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 3. Find and update payment
      const payments = await this.paymentRepository.findByOrderId(
        context.workspaceId,
        order.id,
      );

      if (payments.length === 0) {
        return {
          success: true,
          status: 'UNMATCHED',
          matchedOrderCode: payload.orderCode,
          message: 'No payment found for order',
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 4. Update payment status
      const payment = payments[0];

      await this.paymentRepository.update(context.workspaceId, payment.id, {
        status: 'COMPLETED',
        paymentDate: payload.transactionDate,
        amount: payload.amount,
        sepayTransactionId: payload.providerTransactionId,
        description: payload.content,
      });

      // 5. Update order status
      await this.orderRepository.update(context.workspaceId, order.id, {
        status: 'CONFIRMED',
        accountingConfirmed: true,
      });

      return {
        success: true,
        status: 'MATCHED',
        matchedOrderId: order.id,
        matchedOrderCode: payload.orderCode,
        paymentId: payment.id,
        message: 'Payment processed successfully',
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);

      return {
        success: false,
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }
}
```

---

## 7. Payment Facade Service

### 7.1. Facade Implementation

```typescript
// services/payment-facade.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { PaymentProviderFactory } from '../factory/payment-provider.factory';
import { PaymentProviderType } from '../types/provider.types';
import {
  InitializePaymentRequest,
  InitializePaymentResult,
  PaymentStatusResult,
  RefundRequest,
  RefundResult,
} from '../interfaces/payment-provider.interface';
import {
  WebhookContext,
  WebhookProcessResult,
  WebhookValidationRequest,
} from '../interfaces/webhook-handler.interface';
import { MktPaymentRepository } from '../repositories/mkt-payment.repository';
import { MktWebhookLogRepository } from '../repositories/mkt-webhook-log.repository';

/**
 * Main entry point for payment operations
 * Facade pattern - simplifies interaction with payment subsystem
 */
@Injectable()
export class PaymentFacadeService {
  private readonly logger = new Logger(PaymentFacadeService.name);

  constructor(
    private readonly providerFactory: PaymentProviderFactory,
    private readonly paymentRepository: MktPaymentRepository,
    private readonly webhookLogRepository: MktWebhookLogRepository,
  ) {}

  /**
   * Initialize a new payment
   */
  async createPayment(
    workspaceId: string,
    providerType: PaymentProviderType,
    request: InitializePaymentRequest,
  ): Promise<InitializePaymentResult> {
    this.logger.log(`Creating payment with provider: ${providerType}`);

    try {
      const provider = this.providerFactory.getProvider(providerType);

      const result = await provider.initializePayment(request);

      if (result.success) {
        // Create payment record in database
        await this.paymentRepository.create(workspaceId, {
          name: `Payment - ${request.orderCode}`,
          amount: request.amount,
          currency: request.currency,
          mktOrderId: request.orderId,
          qrCodeUrl: result.qrCodeUrl,
          expiredAt: result.expiresAt,
          status: 'PENDING',
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to create payment:`, error);

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(
    providerType: PaymentProviderType,
    validationRequest: WebhookValidationRequest,
    rawPayload: unknown,
    context: WebhookContext,
  ): Promise<WebhookProcessResult> {
    const startTime = Date.now();
    let webhookLogId: string | null = null;

    try {
      const handler = this.providerFactory.getWebhookHandler(providerType);

      // 1. Validate webhook
      const validationResult = await handler.validateWebhook(validationRequest);

      if (!validationResult.valid) {
        this.logger.warn(`Webhook validation failed: ${validationResult.errorMessage}`);

        return {
          success: false,
          status: 'FAILED',
          message: validationResult.errorMessage,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 2. Parse payload
      const payload = await handler.parseWebhookPayload(rawPayload);

      // 3. Create webhook log
      const webhookLog = await this.webhookLogRepository.create(context.workspaceId, {
        sepayTransactionId: Number(payload.providerTransactionId),
        gateway: payload.gateway,
        requestBody: payload.rawPayload as object,
        ipAddress: context.ipAddress,
        status: 'PROCESSING',
      });

      webhookLogId = webhookLog.id;

      // 4. Process webhook
      const result = await handler.processWebhook(payload, context);

      // 5. Update webhook log
      await this.webhookLogRepository.update(context.workspaceId, webhookLogId, {
        status: result.success ? 'SUCCESS' : 'FAILED',
        responseStatus: result.success ? 200 : 500,
        matchedOrderCode: result.matchedOrderCode,
        processingTimeMs: result.processingTimeMs,
        errorMessage: result.success ? undefined : result.message,
      });

      return result;
    } catch (error) {
      this.logger.error('Webhook processing error:', error);

      // Update log on error
      if (webhookLogId) {
        await this.webhookLogRepository.update(context.workspaceId, webhookLogId, {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: Date.now() - startTime,
        });
      }

      return {
        success: false,
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(
    workspaceId: string,
    paymentId: string,
    providerType?: PaymentProviderType,
  ): Promise<PaymentStatusResult> {
    const payment = await this.paymentRepository.findById(workspaceId, paymentId);

    if (!payment) {
      return {
        success: false,
        status: 'PENDING',
        errorMessage: 'Payment not found',
      };
    }

    // If provider supports pull status, query provider
    if (providerType && payment.sepayTransactionId) {
      const provider = this.providerFactory.getProvider(providerType);

      if (provider.capabilities?.supportsPullStatus) {
        return provider.queryPaymentStatus(payment.sepayTransactionId);
      }
    }

    // Return status from database
    return {
      success: true,
      status: payment.status as any,
      paidAmount: payment.amount ?? undefined,
      paidAt: payment.paymentDate ?? undefined,
      providerTransactionId: payment.sepayTransactionId ?? undefined,
    };
  }

  /**
   * Process refund
   */
  async refundPayment(
    workspaceId: string,
    paymentId: string,
    providerType: PaymentProviderType,
    request: RefundRequest,
  ): Promise<RefundResult> {
    this.logger.log(`Processing refund for payment: ${paymentId}`);

    const provider = this.providerFactory.getProvider(providerType);

    return provider.refundPayment(request);
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): PaymentProviderType[] {
    return this.providerFactory.getSupportedProviderTypes();
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(type: PaymentProviderType): boolean {
    return this.providerFactory.isProviderAvailable(type);
  }
}
```

---

## 8. Webhook Controller

### 8.1. Unified Webhook Controller

```typescript
// controllers/webhook.controller.ts

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import { PaymentFacadeService } from '../services/payment-facade.service';
import { PaymentProviderType, PAYMENT_PROVIDER_TYPE } from '../types/provider.types';
import { WebhookProcessResult } from '../interfaces/webhook-handler.interface';

/**
 * Unified webhook controller
 * Routes webhooks to appropriate provider handlers
 */
@Controller('hooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly paymentFacade: PaymentFacadeService) {}

  /**
   * SePay webhook endpoint
   * POST /hooks/sepay
   */
  @Post('sepay')
  @HttpCode(HttpStatus.OK)
  async handleSepayWebhook(
    @Body() payload: unknown,
    @Headers() headers: Record<string, string>,
    @Req() request: Request,
  ): Promise<WebhookProcessResult> {
    return this.processWebhook(PAYMENT_PROVIDER_TYPE.SEPAY_QR, payload, headers, request);
  }

  /**
   * BIDV webhook endpoint
   * POST /hooks/bidv
   */
  @Post('bidv')
  @HttpCode(HttpStatus.OK)
  async handleBidvWebhook(
    @Body() payload: unknown,
    @Headers() headers: Record<string, string>,
    @Req() request: Request,
  ): Promise<WebhookProcessResult> {
    return this.processWebhook(PAYMENT_PROVIDER_TYPE.BIDV_SEPAY, payload, headers, request);
  }

  /**
   * Generic webhook endpoint
   * POST /hooks/:provider
   */
  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  async handleGenericWebhook(
    @Param('provider') provider: string,
    @Body() payload: unknown,
    @Headers() headers: Record<string, string>,
    @Req() request: Request,
  ): Promise<WebhookProcessResult> {
    const providerType = this.mapProviderParam(provider);

    if (!providerType) {
      return {
        success: false,
        status: 'FAILED',
        message: `Unknown provider: ${provider}`,
      };
    }

    return this.processWebhook(providerType, payload, headers, request);
  }

  /**
   * Common webhook processing logic
   */
  private async processWebhook(
    providerType: PaymentProviderType,
    payload: unknown,
    headers: Record<string, string>,
    request: Request,
  ): Promise<WebhookProcessResult> {
    this.logger.log(`Received webhook from ${providerType}`);

    const ipAddress = this.extractIpAddress(request);
    const workspaceId = this.getWorkspaceId(providerType);

    if (!workspaceId) {
      return {
        success: false,
        status: 'FAILED',
        message: 'Workspace not configured for provider',
      };
    }

    return this.paymentFacade.processWebhook(
      providerType,
      {
        headers,
        body: payload,
        ipAddress,
      },
      payload,
      {
        workspaceId,
        ipAddress,
        receivedAt: new Date().toISOString(),
      },
    );
  }

  /**
   * Map URL param to provider type
   */
  private mapProviderParam(param: string): PaymentProviderType | null {
    const mapping: Record<string, PaymentProviderType> = {
      sepay: PAYMENT_PROVIDER_TYPE.SEPAY_QR,
      bidv: PAYMENT_PROVIDER_TYPE.BIDV_SEPAY,
      momo: PAYMENT_PROVIDER_TYPE.MOMO,
      vnpay: PAYMENT_PROVIDER_TYPE.VNPAY,
      zalopay: PAYMENT_PROVIDER_TYPE.ZALOPAY,
    };

    return mapping[param.toLowerCase()] ?? null;
  }

  /**
   * Extract client IP address
   */
  private extractIpAddress(request: Request): string | undefined {
    const forwarded = request.headers['x-forwarded-for'];

    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    return request.ip;
  }

  /**
   * Get workspace ID for provider
   * TODO: This should be dynamic based on provider config
   */
  private getWorkspaceId(_providerType: PaymentProviderType): string | null {
    return process.env.MKT_WORKSPACE_ID ?? null;
  }
}
```

---

## 9. Adding New Provider Guide

### 9.1. Step-by-Step Guide

Để thêm payment provider mới (ví dụ: MoMo), follow các bước sau:

#### Step 1: Create Provider Directory

```bash
mkdir -p packages/twenty-server/src/mkt-core/payment/providers/momo
```

#### Step 2: Define Provider Types

```typescript
// providers/momo/momo.types.ts

export type MomoPaymentRequest = {
  partnerCode: string;
  orderId: string;
  orderInfo: string;
  amount: number;
  lang: string;
  redirectUrl: string;
  ipnUrl: string;
  requestType: 'captureWallet' | 'payWithATM' | 'payWithCC';
  signature: string;
};

export type MomoPaymentResponse = {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl: string;
  qrCodeUrl: string;
};

export type MomoWebhookPayload = {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  signature: string;
};
```

#### Step 3: Create Provider Config

```typescript
// providers/momo/momo.config.ts

import { registerAs } from '@nestjs/config';

export const momoConfig = registerAs('momo', () => ({
  partnerCode: process.env.MOMO_PARTNER_CODE ?? '',
  accessKey: process.env.MOMO_ACCESS_KEY ?? '',
  secretKey: process.env.MOMO_SECRET_KEY ?? '',
  apiUrl: process.env.MOMO_API_URL ?? 'https://test-payment.momo.vn/v2/gateway/api',
  redirectUrl: process.env.MOMO_REDIRECT_URL ?? '',
  ipnUrl: process.env.MOMO_IPN_URL ?? '',
  enabled: process.env.MOMO_ENABLED === 'true',
}));
```

#### Step 4: Implement Provider

```typescript
// providers/momo/momo.provider.ts

import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigType } from '@nestjs/config';
import * as crypto from 'crypto';

import { BasePaymentProvider } from '../base/base-payment.provider';
import { PAYMENT_PROVIDER_TYPE, ProviderCapabilities } from '../../types/provider.types';
import { momoConfig } from './momo.config';
import {
  InitializePaymentRequest,
  InitializePaymentResult,
  QrCodeRequest,
  QrCodeResult,
  ValidationResult,
} from '../../interfaces/payment-provider.interface';

@Injectable()
export class MomoProvider extends BasePaymentProvider {
  readonly providerType = PAYMENT_PROVIDER_TYPE.MOMO;
  readonly displayName = 'MoMo Wallet';
  readonly capabilities: ProviderCapabilities = {
    supportsQrCode: true,
    supportsRefund: true,
    supportsRecurring: false,
    supportsPartialPayment: false,
    supportsWebhook: true,
    supportsPullStatus: true,
  };

  constructor(
    @Inject(momoConfig.KEY)
    private readonly config: ConfigType<typeof momoConfig>,
    private readonly httpService: HttpService,
  ) {
    super('MomoProvider');
  }

  isEnabled(): boolean {
    return this.config.enabled && this.validateConfiguration().valid;
  }

  validateConfiguration(): ValidationResult {
    return this.validateRequiredFields(
      {
        partnerCode: this.config.partnerCode,
        accessKey: this.config.accessKey,
        secretKey: this.config.secretKey,
      },
      ['partnerCode', 'accessKey', 'secretKey'],
    );
  }

  async initializePayment(request: InitializePaymentRequest): Promise<InitializePaymentResult> {
    // Implementation here
    // 1. Create MoMo payment request
    // 2. Sign request with HMAC
    // 3. Call MoMo API
    // 4. Return result
    throw new Error('Not implemented');
  }

  protected async doGenerateQrCode(request: QrCodeRequest): Promise<QrCodeResult> {
    // Implementation here
    throw new Error('Not implemented');
  }

  /**
   * Generate MoMo signature
   */
  private generateSignature(data: string): string {
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(data)
      .digest('hex');
  }
}
```

#### Step 5: Implement Webhook Handler

```typescript
// providers/momo/momo-webhook.handler.ts

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

import { IWebhookHandler, /* ... */ } from '../../interfaces/webhook-handler.interface';
import { PAYMENT_PROVIDER_TYPE } from '../../types/provider.types';
import { MomoWebhookPayload } from './momo.types';

@Injectable()
export class MomoWebhookHandler implements IWebhookHandler {
  readonly providerType = PAYMENT_PROVIDER_TYPE.MOMO;

  // Implement all interface methods...
}
```

#### Step 6: Register Provider in Module

```typescript
// payment.module.ts

@Module({
  imports: [
    ConfigModule.forFeature(momoConfig),
    // ...
  ],
  providers: [
    // Add new provider
    MomoProvider,
    MomoWebhookHandler,
    // ...
  ],
})
export class MktPaymentModule implements OnModuleInit {
  constructor(
    private readonly providerFactory: PaymentProviderFactory,
    private readonly momoProvider: MomoProvider,
    private readonly momoWebhookHandler: MomoWebhookHandler,
  ) {}

  onModuleInit() {
    // Register MoMo provider
    this.providerFactory.registerProvider(
      PAYMENT_PROVIDER_TYPE.MOMO,
      this.momoProvider,
      {
        type: PAYMENT_PROVIDER_TYPE.MOMO,
        displayName: 'MoMo Wallet',
        description: 'MoMo e-wallet payment',
        icon: 'IconWallet',
        capabilities: this.momoProvider.capabilities,
        configuredFields: ['partnerCode', 'accessKey', 'secretKey'],
      },
    );

    this.providerFactory.registerWebhookHandler(
      PAYMENT_PROVIDER_TYPE.MOMO,
      this.momoWebhookHandler,
    );
  }
}
```

#### Step 7: Add Environment Variables

```env
# .env
MOMO_ENABLED=true
MOMO_PARTNER_CODE=your_partner_code
MOMO_ACCESS_KEY=your_access_key
MOMO_SECRET_KEY=your_secret_key
MOMO_API_URL=https://test-payment.momo.vn/v2/gateway/api
MOMO_REDIRECT_URL=https://your-domain.com/payment/callback
MOMO_IPN_URL=https://your-domain.com/hooks/momo
```

---

## 10. Migration Plan

### 10.1. Phase 1: Foundation (Week 1-2)

```
Phase 1: Core Infrastructure
├── Create interfaces and types
├── Implement PaymentProviderFactory
├── Create BasePaymentProvider
├── Setup module structure
└── Write unit tests for interfaces
```

### 10.2. Phase 2: SePay Migration (Week 2-3)

```
Phase 2: SePay Provider
├── Create SepayProvider
├── Create SepayWebhookHandler
├── Migrate QR generation logic
├── Migrate webhook processing
├── Integration testing
└── Deprecate old services (soft)
```

### 10.3. Phase 3: BIDV Migration (Week 3-4)

```
Phase 3: BIDV Provider
├── Create BidvProvider
├── Create BidvWebhookHandler
├── Migrate BIDV API client
├── Integration testing
└── Remove if/else branches
```

### 10.4. Phase 4: Cleanup & Documentation (Week 4-5)

```
Phase 4: Finalization
├── Remove deprecated code
├── Update API documentation
├── Performance optimization
├── Add monitoring/metrics
└── Final testing
```

---

## 11. Testing Strategy

### 11.1. Unit Tests

```typescript
// providers/sepay/sepay.provider.spec.ts

describe('SepayProvider', () => {
  let provider: SepayProvider;
  let mockQrGenerator: jest.Mocked<SepayQrGenerator>;

  beforeEach(async () => {
    // Setup...
  });

  describe('isEnabled', () => {
    it('should return true when config is valid', () => {
      expect(provider.isEnabled()).toBe(true);
    });

    it('should return false when account is missing', () => {
      // Test...
    });
  });

  describe('initializePayment', () => {
    it('should return QR code URL on success', async () => {
      const result = await provider.initializePayment({
        orderId: 'order-123',
        orderCode: 'MKT20251226001',
        amount: 100000,
        currency: 'VND',
      });

      expect(result.success).toBe(true);
      expect(result.qrCodeUrl).toBeDefined();
    });
  });
});
```

### 11.2. Integration Tests

```typescript
// test/payment-integration.spec.ts

describe('Payment Integration', () => {
  describe('Webhook Processing', () => {
    it('should process SePay webhook and update payment', async () => {
      // 1. Create order and payment
      // 2. Send mock webhook
      // 3. Verify payment status updated
      // 4. Verify order status updated
    });
  });
});
```

---

## 12. Appendix

### 12.1. Provider Comparison Matrix

| Feature | SePay QR | BIDV SePay | MoMo | VNPay | ZaloPay |
|---------|----------|------------|------|-------|---------|
| QR Code | ✅ | ✅ | ✅ | ✅ | ✅ |
| Webhook | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pull Status | ❌ | ❌ | ✅ | ✅ | ✅ |
| Refund | ❌ | ❌ | ✅ | ✅ | ✅ |
| Recurring | ❌ | ❌ | ✅ | ❌ | ❌ |

### 12.2. Error Codes

```typescript
export const PAYMENT_ERROR_CODES = {
  // Provider errors
  PROVIDER_NOT_FOUND: 'PAY001',
  PROVIDER_NOT_ENABLED: 'PAY002',
  PROVIDER_CONFIG_INVALID: 'PAY003',

  // Payment errors
  PAYMENT_NOT_FOUND: 'PAY101',
  PAYMENT_ALREADY_COMPLETED: 'PAY102',
  PAYMENT_EXPIRED: 'PAY103',
  PAYMENT_CANCELLED: 'PAY104',

  // Webhook errors
  WEBHOOK_VALIDATION_FAILED: 'PAY201',
  WEBHOOK_DUPLICATE: 'PAY202',
  WEBHOOK_ORDER_NOT_FOUND: 'PAY203',
  WEBHOOK_AMOUNT_MISMATCH: 'PAY204',

  // Refund errors
  REFUND_NOT_SUPPORTED: 'PAY301',
  REFUND_FAILED: 'PAY302',
} as const;
```

---

*Document Version: 2.0.0 | Last Updated: 2025-12-26*
