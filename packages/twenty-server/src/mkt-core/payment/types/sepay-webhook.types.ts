/**
 * SePay Webhook Types
 *
 * Types cho SePay payment gateway webhook integration.
 * Tham khảo: docs/designs/payment/SePay_Integration_Guide_CRM.md
 */

/**
 * Loại giao dịch: in (tiền vào) / out (tiền ra)
 */
export type SepayTransferType = 'in' | 'out';

/**
 * SePay Webhook Payload
 *
 * Payload nhận được từ SePay webhook khi có giao dịch.
 * ID là unique và được dùng cho idempotency check.
 *
 * Note: Một số field có thể undefined do DTO validation với @IsOptional
 */
export type SepayWebhookPayload = {
  /** ID giao dịch trên SePay (unique - dùng để chống trùng) */
  id: number;

  /** Tên ngân hàng (Vietcombank, BIDV, VietinBank...) */
  gateway: string;

  /** Thời gian giao dịch (YYYY-MM-DD HH:mm:ss) */
  transactionDate: string;

  /** Số tài khoản ngân hàng nhận tiền */
  accountNumber: string;

  /** Tài khoản phụ / Tài khoản định danh (VA) - nullable/optional */
  subAccount?: string | null;

  /** Mã thanh toán được SePay nhận diện từ nội dung */
  code?: string | null;

  /** Nội dung chuyển khoản gốc */
  content: string;

  /** Loại giao dịch: in (tiền vào) / out (tiền ra) */
  transferType: SepayTransferType;

  /** Mô tả đầy đủ từ ngân hàng */
  description: string;

  /** Số tiền giao dịch (VND) */
  transferAmount: number;

  /** Mã tham chiếu từ ngân hàng - optional */
  referenceCode?: string;

  /** Số dư tài khoản sau giao dịch */
  accumulated: number;
};

/**
 * SePay Webhook Response Status
 *
 * Status trả về trong response của webhook handler.
 */
export type SepayWebhookResponseStatus =
  | 'MATCHED' // Khớp với order, xử lý thành công
  | 'UNMATCHED' // Không tìm thấy order
  | 'PARTIAL' // Thanh toán một phần
  | 'OVERPAID' // Thanh toán vượt quá
  | 'ALREADY_PROCESSED' // Đã xử lý trước đó (idempotency)
  | 'NO_PAYMENT'; // Không có payment record

/**
 * Payment details for partial payment support
 */
export type SepayPaymentDetails = {
  expectedAmount: number;
  receivedAmount: number;
  totalPaid: number;
  remainingAmount: number;
  percentagePaid: number;
};

/**
 * SePay Webhook Response
 *
 * Response trả về cho SePay webhook caller.
 */
export type SepayWebhookResponse = {
  /** Luôn trả về true để SePay không retry */
  success: boolean;

  /** Message mô tả kết quả */
  message?: string;

  /** Data chi tiết (optional) */
  data?: {
    transactionId: number;
    matchedOrder?: string;
    status: SepayWebhookResponseStatus;
    /** Payment details for partial payment scenarios */
    paymentDetails?: SepayPaymentDetails;
  };
};
