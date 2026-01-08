/**
 * Payment Facade Service
 *
 * Main entry point for payment operations.
 * Facade pattern - simplifies interaction with payment subsystem.
 *
 * Responsibilities:
 * - Route requests to appropriate providers
 * - Handle webhook processing flow
 * - Manage payment lifecycle
 */

import { Injectable, Logger } from '@nestjs/common';

import {
  InitializePaymentRequest,
  InitializePaymentResult,
  PaymentStatusResult,
  RefundRequest,
  RefundResult,
} from 'src/mkt-core/payment/types/payment-provider.interface';
import {
  WebhookContext,
  WebhookProcessResult,
  WebhookValidationRequest,
} from 'src/mkt-core/payment/types/webhook-handler.interface';
import { PaymentProviderFactory } from 'src/mkt-core/payment/factory/payment-provider.factory';
import { MktPaymentRepository } from 'src/mkt-core/payment/repositories/mkt-payment.repository';
import { MktWebhookLogRepository } from 'src/mkt-core/payment/repositories/mkt-webhook-log.repository';
import { PaymentCurrency } from 'src/mkt-core/payment/types/payment-currency.type';
import {
  PaymentProviderType,
  ProviderMetadata,
} from 'src/mkt-core/payment/types/provider.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

// ============================================
// FACADE SERVICE
// ============================================

@Injectable()
export class PaymentFacadeService {
  private readonly logger = new Logger(PaymentFacadeService.name);

  constructor(
    private readonly providerFactory: PaymentProviderFactory,
    private readonly paymentRepository: MktPaymentRepository,
    private readonly webhookLogRepository: MktWebhookLogRepository,
  ) {}

  // ============================================
  // PAYMENT OPERATIONS
  // ============================================

  /**
   * Initialize a new payment
   *
   * @param workspaceId - Workspace context
   * @param providerType - Payment provider to use
   * @param request - Payment initialization request
   * @returns Payment initialization result
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
          currency: (request.currency as PaymentCurrency) ?? 'VND',
          mktOrderId: request.orderId,
          qrCodeUrl: result.qrCodeUrl,
          expiredAt: result.expiresAt,
          status: 'PENDING',
        });

        this.logger.log(
          `Payment created successfully for order ${request.orderCode}`,
        );
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

  // ============================================
  // WEBHOOK OPERATIONS
  // ============================================

  /**
   * Process incoming webhook
   *
   * @param providerType - Provider that sent the webhook
   * @param validationRequest - Request with headers for validation
   * @param rawPayload - Raw webhook payload
   * @param context - Webhook processing context
   * @returns Webhook processing result
   */
  async processWebhook(
    providerType: PaymentProviderType,
    validationRequest: WebhookValidationRequest,
    rawPayload: unknown,
    context: WebhookContext,
  ): Promise<WebhookProcessResult> {
    const startTime = DateTimeUtils.now();

    this.logger.log(`Processing webhook from provider: ${providerType}`);

    try {
      const handler = this.providerFactory.getWebhookHandler(providerType);

      // Step 1: Validate webhook
      const validationResult = await handler.validateWebhook(validationRequest);

      if (!validationResult.valid) {
        this.logger.warn(
          `Webhook validation failed: ${validationResult.errorMessage}`,
        );

        return {
          success: false,
          status: 'FAILED',
          message: validationResult.errorMessage,
          processingTimeMs: DateTimeUtils.diffInMillis(
            startTime,
            DateTimeUtils.now(),
          ),
        };
      }

      // Step 2: Parse payload
      const payload = await handler.parseWebhookPayload(rawPayload);

      // Step 3: Process webhook (handler manages its own transaction)
      const result = await handler.processWebhook(payload, context);

      this.logger.log(
        `Webhook processed: ${result.status} - ${result.message}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Webhook processing error:', error);

      return {
        success: false,
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: DateTimeUtils.diffInMillis(
          startTime,
          DateTimeUtils.now(),
        ),
      };
    }
  }

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  /**
   * Get payment status
   *
   * @param workspaceId - Workspace context
   * @param paymentId - Payment ID
   * @param providerType - Optional provider for pull status
   * @returns Payment status result
   */
  async getPaymentStatus(
    workspaceId: string,
    paymentId: string,
    providerType?: PaymentProviderType,
  ): Promise<PaymentStatusResult> {
    const payment = await this.paymentRepository.findById(
      workspaceId,
      paymentId,
    );

    if (!payment) {
      return {
        success: false,
        status: 'PENDING',
        errorMessage: 'Payment not found',
      };
    }

    // If provider supports pull status, query provider
    if (providerType && payment.sepayTransactionId) {
      const provider = this.providerFactory.getProviderOrNull(providerType);

      if (provider?.capabilities?.supportsPullStatus) {
        return provider.queryPaymentStatus(payment.sepayTransactionId);
      }
    }

    // Return status from database
    return {
      success: true,
      status: this.mapPaymentStatus(payment.status),
      paidAmount: payment.amount ?? undefined,
      paidAt: payment.paymentDate ?? undefined,
      providerTransactionId: payment.sepayTransactionId ?? undefined,
    };
  }

  // ============================================
  // REFUND OPERATIONS
  // ============================================

  /**
   * Process refund
   *
   * @param workspaceId - Workspace context
   * @param paymentId - Payment ID to refund
   * @param providerType - Provider to process refund
   * @param request - Refund request details
   * @returns Refund result
   */
  async refundPayment(
    workspaceId: string,
    paymentId: string,
    providerType: PaymentProviderType,
    request: RefundRequest,
  ): Promise<RefundResult> {
    this.logger.log(`Processing refund for payment: ${paymentId}`);

    const provider = this.providerFactory.getProvider(providerType);

    if (!provider.capabilities.supportsRefund) {
      return {
        success: false,
        errorCode: 'REFUND_NOT_SUPPORTED',
        errorMessage: `Provider ${providerType} does not support refunds`,
      };
    }

    const result = await provider.refundPayment(request);

    if (result.success) {
      // Update payment status to refunded
      await this.paymentRepository.updateStatus(
        workspaceId,
        paymentId,
        'REFUNDED',
      );
    }

    return result;
  }

  // ============================================
  // PROVIDER QUERIES
  // ============================================

  /**
   * Get available payment providers
   */
  getAvailableProviders(): PaymentProviderType[] {
    return this.providerFactory.getEnabledProviderTypes();
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(type: PaymentProviderType): boolean {
    return this.providerFactory.isProviderAvailable(type);
  }

  /**
   * Get provider metadata
   */
  getProviderMetadata(type: PaymentProviderType): ProviderMetadata | null {
    return this.providerFactory.getProviderMetadata(type);
  }

  /**
   * Get all provider registrations with enabled status
   */
  getProviderRegistrations() {
    return this.providerFactory.getProviderRegistrations();
  }

  /**
   * Get health status of all providers
   */
  getHealthStatus() {
    return this.providerFactory.getHealthStatus();
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapPaymentStatus(
    status: string | undefined,
  ): PaymentStatusResult['status'] {
    const statusMap: Record<string, PaymentStatusResult['status']> = {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      CANCELLED: 'CANCELLED',
      EXPIRED: 'EXPIRED',
      REFUNDED: 'REFUNDED',
      PARTIAL: 'PARTIAL',
      OVERPAID: 'OVERPAID',
    };

    return statusMap[status ?? 'PENDING'] ?? 'PENDING';
  }
}
