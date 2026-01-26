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
export {
  SepayQrService,
  type QrCodeGenerationResult,
  type QrCodeGenerationInput,
} from 'src/mkt-core/payment/services/sepay/sepay-qr.service';
