import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { SepayTransferType } from 'src/mkt-core/payment/types';

/**
 * SePay Webhook DTO với class-validator validation
 *
 * DTO dùng để validate payload từ SePay webhook.
 * Sử dụng với ValidationPipe trong NestJS controller.
 *
 * @example
 * ```typescript
 * @Post('hooks/sepay-payment')
 * @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
 * async handleSepayPayment(@Body() payload: SepayWebhookDto) { ... }
 * ```
 */
export class SepayWebhookDto {
  /**
   * ID giao dịch từ SePay (unique)
   * Dùng cho idempotency check
   */
  @IsNumber()
  @Min(1)
  id: number;

  /**
   * Tên gateway/ngân hàng
   */
  @IsString()
  @IsNotEmpty()
  gateway: string;

  /**
   * Thời gian giao dịch (format: YYYY-MM-DD HH:mm:ss)
   */
  @IsString()
  @IsNotEmpty()
  transactionDate: string;

  /**
   * Số tài khoản nhận tiền
   */
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  /**
   * Tài khoản phụ / VA (nullable)
   */
  @IsOptional()
  @IsString()
  subAccount?: string | null;

  /**
   * Mã thanh toán được SePay parse từ nội dung
   * Có thể null nếu không parse được
   */
  @IsOptional()
  @IsString()
  code?: string | null;

  /**
   * Nội dung chuyển khoản
   */
  @IsString()
  content: string;

  /**
   * Loại giao dịch: 'in' (tiền vào) hoặc 'out' (tiền ra)
   */
  @IsIn(['in', 'out'])
  transferType: SepayTransferType;

  /**
   * Mô tả đầy đủ từ ngân hàng
   */
  @IsString()
  description: string;

  /**
   * Số tiền giao dịch (VND)
   * Phải >= 0
   */
  @IsNumber()
  @Min(0)
  transferAmount: number;

  /**
   * Mã tham chiếu từ ngân hàng
   */
  @IsOptional()
  @IsString()
  referenceCode?: string;

  /**
   * Số dư tài khoản sau giao dịch
   */
  @IsNumber()
  accumulated: number;
}
