import { Injectable, Logger } from '@nestjs/common';

import { IPaymentProvider } from 'src/mkt-core/payment/interfaces/payment-provider.interface';
import { IWebhookHandler } from 'src/mkt-core/payment/interfaces/webhook-handler.interface';

import {
  PaymentProviderType,
  ProviderMetadata,
  ProviderRegistration,
} from 'src/mkt-core/payment/types/provider.types';

/**
 * PaymentProviderFactory
 *
 * Factory for creating and managing payment providers.
 * Implements the Factory pattern for provider instantiation.
 *
 * Usage:
 * 1. Register providers on module init
 * 2. Get provider by type when needed
 * 3. Get webhook handler for processing webhooks
 */
@Injectable()
export class PaymentProviderFactory {
  private readonly logger = new Logger(PaymentProviderFactory.name);
  private readonly providers = new Map<PaymentProviderType, IPaymentProvider>();
  private readonly webhookHandlers = new Map<
    PaymentProviderType,
    IWebhookHandler
  >();
  private readonly metadata = new Map<PaymentProviderType, ProviderMetadata>();

  /**
   * Register a payment provider
   */
  registerProvider(
    type: PaymentProviderType,
    provider: IPaymentProvider,
    providerMetadata: ProviderMetadata,
  ): void {
    if (this.providers.has(type)) {
      this.logger.warn(`Provider ${type} already registered, overwriting`);
    }

    this.providers.set(type, provider);
    this.metadata.set(type, providerMetadata);
    this.logger.log(`Registered payment provider: ${type}`);
  }

  /**
   * Register a webhook handler for a provider
   */
  registerWebhookHandler(
    type: PaymentProviderType,
    handler: IWebhookHandler,
  ): void {
    if (this.webhookHandlers.has(type)) {
      this.logger.warn(
        `Webhook handler for ${type} already registered, overwriting`,
      );
    }

    this.webhookHandlers.set(type, handler);
    this.logger.log(`Registered webhook handler: ${type}`);
  }

  /**
   * Get provider by type
   * @throws Error if provider not found or not enabled
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
   * Get provider by type without throwing (returns null if not found/enabled)
   */
  getProviderOrNull(type: PaymentProviderType): IPaymentProvider | null {
    const provider = this.providers.get(type);

    if (!provider || !provider.isEnabled()) {
      return null;
    }

    return provider;
  }

  /**
   * Get webhook handler by type
   * @throws Error if handler not found
   */
  getWebhookHandler(type: PaymentProviderType): IWebhookHandler {
    const handler = this.webhookHandlers.get(type);

    if (!handler) {
      throw new Error(`Webhook handler not found: ${type}`);
    }

    return handler;
  }

  /**
   * Get webhook handler by type without throwing
   */
  getWebhookHandlerOrNull(type: PaymentProviderType): IWebhookHandler | null {
    return this.webhookHandlers.get(type) ?? null;
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): IPaymentProvider[] {
    return Array.from(this.providers.values());
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
  getProviderMetadata(type: PaymentProviderType): ProviderMetadata | null {
    return this.metadata.get(type) ?? null;
  }

  /**
   * Get all provider metadata
   */
  getAllProviderMetadata(): ProviderMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Get all supported provider types
   */
  getSupportedProviderTypes(): PaymentProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get enabled provider types
   */
  getEnabledProviderTypes(): PaymentProviderType[] {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isEnabled())
      .map(([type]) => type);
  }

  /**
   * Check if provider exists and is enabled
   */
  isProviderAvailable(type: PaymentProviderType): boolean {
    const provider = this.providers.get(type);

    return provider ? provider.isEnabled() : false;
  }

  /**
   * Check if provider is registered (may or may not be enabled)
   */
  isProviderRegistered(type: PaymentProviderType): boolean {
    return this.providers.has(type);
  }

  /**
   * Get provider registrations with enabled status
   */
  getProviderRegistrations(): ProviderRegistration[] {
    return Array.from(this.providers.entries())
      .filter(([type]) => this.metadata.has(type))
      .map(([type, provider]) => ({
        type,
        metadata: this.metadata.get(type) as ProviderMetadata,
        enabled: provider.isEnabled(),
      }));
  }

  /**
   * Validate all provider configurations
   */
  validateAllConfigurations(): Map<
    PaymentProviderType,
    { valid: boolean; errors: string[] }
  > {
    const results = new Map<
      PaymentProviderType,
      { valid: boolean; errors: string[] }
    >();

    for (const [type, provider] of this.providers) {
      const validation = provider.validateConfiguration();

      results.set(type, validation);

      if (!validation.valid) {
        this.logger.warn(
          `Provider ${type} configuration invalid: ${validation.errors.join(', ')}`,
        );
      }
    }

    return results;
  }

  /**
   * Get health status of all providers
   */
  getHealthStatus(): Record<
    string,
    { registered: boolean; enabled: boolean; configValid: boolean }
  > {
    const status: Record<
      string,
      { registered: boolean; enabled: boolean; configValid: boolean }
    > = {};

    for (const [type, provider] of this.providers) {
      const validation = provider.validateConfiguration();

      status[type] = {
        registered: true,
        enabled: provider.isEnabled(),
        configValid: validation.valid,
      };
    }

    return status;
  }
}
