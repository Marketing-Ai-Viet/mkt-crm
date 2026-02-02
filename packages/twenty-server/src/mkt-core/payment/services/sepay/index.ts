/**
 * SEPay-Specific Services
 *
 * Services dedicated to SEPay payment gateway integration.
 * - SepayAuthService: API key validation for webhook authentication
 * - SepayQrPageService: Generate QR payment page HTML
 * - SepayQrService: Unified QR code generation (SEPay direct / BIDV API)
 */

export { SepayAuthService } from 'src/mkt-core/payment/services/sepay/sepay-auth.service';
export { SepayQrPageService } from 'src/mkt-core/payment/services/sepay/sepay-qr-page.service';
export { SepayQrService } from 'src/mkt-core/payment/services/sepay/sepay-qr.service';

// Re-export types from centralized types directory
export type {
  QrCodeGenerationResult,
  QrCodeGenerationInput,
  QrPageResult,
  QrPageTemplateVariables,
} from 'src/mkt-core/payment/types/sepay-qr.types';
