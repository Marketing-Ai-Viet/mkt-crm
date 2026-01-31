import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

/**
 * Output DTO for payment operations
 */
@ObjectType()
export class PaymentResponseDto {
  @Field(() => ID, { description: 'Payment ID' })
  id: string;

  @Field({ description: 'Payment name' })
  name: string;

  @Field(() => Float, { description: 'Payment amount' })
  amount: number;

  @Field({ description: 'Currency code' })
  currency: string;

  @Field({ description: 'Payment status' })
  status: string;

  @Field({ nullable: true, description: 'QR code URL for SEPay' })
  qrCodeUrl?: string;

  @Field({ nullable: true, description: 'Payment page URL' })
  paymentPageUrl?: string;

  @Field({ nullable: true, description: 'Payment expiry date' })
  expiredAt?: string;

  @Field(() => ID, { nullable: true, description: 'Order ID' })
  mktOrderId?: string;

  @Field(() => ID, { nullable: true, description: 'Payment method ID' })
  mktPaymentMethodId?: string;
}

/**
 * Response DTO for create payment mutation
 */
@ObjectType()
export class CreatePaymentResponseDto {
  @Field({ description: 'Operation success status' })
  success: boolean;

  @Field({ nullable: true, description: 'Error or success message' })
  message?: string;

  @Field(() => PaymentResponseDto, {
    nullable: true,
    description: 'Created payment data',
  })
  payment?: PaymentResponseDto;
}

/**
 * Response DTO for update payment mutation
 */
@ObjectType()
export class UpdatePaymentResponseDto {
  @Field({ description: 'Operation success status' })
  success: boolean;

  @Field({ nullable: true, description: 'Error or success message' })
  message?: string;

  @Field(() => PaymentResponseDto, {
    nullable: true,
    description: 'Updated payment data',
  })
  payment?: PaymentResponseDto;
}

/**
 * Response DTO for generate QR code mutation
 */
@ObjectType()
export class GenerateQrCodeResponseDto {
  @Field({ description: 'Operation success status' })
  success: boolean;

  @Field({ nullable: true, description: 'Error or success message' })
  message?: string;

  @Field({ nullable: true, description: 'Generated QR code URL' })
  qrCodeUrl?: string;

  @Field({ nullable: true, description: 'QR code expiry date' })
  expiredAt?: string;
}

// ============================================
// PHASE 2: CONFIRM/REJECT/REFUND RESPONSE DTOs
// ============================================

/**
 * Summary of order payment status
 */
@ObjectType()
export class OrderPaymentSummaryDto {
  @Field(() => ID, { description: 'Order ID' })
  orderId: string;

  @Field({ nullable: true, description: 'Order code' })
  orderCode?: string;

  @Field(() => Float, { description: 'Total paid amount' })
  paidAmount: number;

  @Field(() => Float, { description: 'Remaining amount to be paid' })
  remainingAmount: number;

  @Field({ description: 'Order payment status' })
  paymentStatus: string;

  @Field(() => Float, { description: 'Percentage of order paid (0-100)' })
  paidPercent: number;
}

/**
 * Payment status summary after action
 */
@ObjectType()
export class PaymentActionSummaryDto {
  @Field(() => ID, { description: 'Payment ID' })
  id: string;

  @Field({ description: 'Payment status' })
  status: string;

  @Field(() => Float, { nullable: true, description: 'Refunded amount' })
  refundedAmount?: number;
}

/**
 * Generic response for payment action mutations (confirm/reject/refund)
 */
@ObjectType()
export class PaymentActionResponseDto {
  @Field({ description: 'Operation success status' })
  success: boolean;

  @Field({ nullable: true, description: 'Error or success message' })
  message?: string;

  @Field(() => PaymentActionSummaryDto, {
    nullable: true,
    description: 'Payment summary after action',
  })
  payment?: PaymentActionSummaryDto;

  @Field(() => OrderPaymentSummaryDto, {
    nullable: true,
    description: 'Order payment summary after action',
  })
  order?: OrderPaymentSummaryDto;

  @Field(() => Float, {
    nullable: true,
    description: 'Amount refunded (for refund action)',
  })
  refundedAmount?: number;
}
