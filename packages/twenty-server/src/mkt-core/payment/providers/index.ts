/**
 * Payment Providers Module Exports
 *
 * Re-exports all payment provider implementations.
 */

// Base provider
export { BasePaymentProvider } from 'src/mkt-core/payment/providers/base/base-payment.provider';

// SePay provider
export {
  SepayProvider,
  SepayWebhookHandler,
  SepayQrGenerator,
  sepayConfig,
  SEPAY_CONFIG_KEY,
  SEPAY_PROVIDER_METADATA,
} from 'src/mkt-core/payment/providers/sepay';
export type {
  SepayQrParams,
  SepayQrTemplate,
  SepayProviderConfig,
} from 'src/mkt-core/payment/providers/sepay';

// BIDV provider
export {
  BidvProvider,
  BidvApiClient,
  bidvConfig,
  BIDV_CONFIG_KEY,
  BIDV_PROVIDER_METADATA,
  BIDV_DEFAULT_DURATION,
} from 'src/mkt-core/payment/providers/bidv';
export type { BidvProviderConfig } from 'src/mkt-core/payment/providers/bidv';
