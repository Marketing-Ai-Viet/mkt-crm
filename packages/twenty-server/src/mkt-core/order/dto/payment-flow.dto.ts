import { Field, InputType, ObjectType, Int, Float, ID } from '@nestjs/graphql';

import {
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
  Min,
  Max,
  IsNumber,
} from 'class-validator';

import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';

// ============================================
// INPUT DTOS
// ============================================

/**
 * Input cho mutation confirmOrderWithLicense
 *
 * Flow mới: DRAFT → CONFIRMED → PROCESSING
 * - Tạo Invoice
 * - Cấp License ngay (status: PENDING_PAYMENT)
 * - Tính payment deadline
 * - Schedule reminders
 */
@InputType()
export class ConfirmOrderWithLicenseInputDto {
  @Field(() => ID, { description: 'Order ID to confirm' })
  @IsUUID()
  orderId: string;

  @Field(() => Int, {
    nullable: true,
    description:
      'Manual override for payment deadline (hours). Priority: MANUAL > RESELLER_TIER > CUSTOMER_TYPE > PRODUCT > GLOBAL',
  })
  @IsOptional()
  @Min(1)
  @Max(720) // Max 30 days
  paymentDeadlineHours?: number;

  @Field(() => String, { nullable: true, description: 'Optional note' })
  @IsOptional()
  @IsString()
  note?: string;

  @Field(() => Int, {
    nullable: true,
    description:
      'Expected version for optimistic locking. If provided, update will fail if version mismatch.',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  expectedVersion?: number;
}

/**
 * Input cho mutation confirmOrderPayment
 *
 * Xác nhận thanh toán từ nhiều nguồn:
 * - SEPAY webhook
 * - Bank transfer (manual confirm)
 * - Cash (accounting confirm)
 */
@InputType()
export class ConfirmPaymentInputDto {
  @Field(() => ID, { description: 'Order ID to confirm payment' })
  @IsUUID()
  orderId: string;

  @Field(() => String, {
    description: 'Payment method: SEPAY, BANK_TRANSFER, CASH, OTHER',
  })
  @IsIn(['SEPAY', 'BANK_TRANSFER', 'CASH', 'OTHER'])
  paymentMethod: string;

  @Field(() => Float, { description: 'Payment amount' })
  @Min(0)
  amount: number;

  @Field(() => String, {
    nullable: true,
    description: 'Transaction ID from payment gateway',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @Field(() => String, { nullable: true, description: 'Payment note' })
  @IsOptional()
  @IsString()
  note?: string;

  @Field(() => Int, {
    nullable: true,
    description:
      'Expected version for optimistic locking. If provided, update will fail if version mismatch.',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  expectedVersion?: number;
}

/**
 * Input cho mutation unlockOrderAfterPayment
 *
 * Mở khóa đơn hàng bị LOCKED sau khi thanh toán muộn
 * Chỉ ACCOUNTING department mới có quyền
 */
@InputType()
export class UnlockOrderInputDto {
  @Field(() => ID, { description: 'Order ID to unlock' })
  @IsUUID()
  orderId: string;

  @Field(() => Float, { description: 'Payment amount confirmed' })
  @Min(0)
  amount: number;

  @Field(() => String, {
    nullable: true,
    description: 'Transaction ID from payment',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Note for unlock action',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @Field(() => Int, {
    nullable: true,
    description:
      'Expected version for optimistic locking. If provided, update will fail if version mismatch.',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  expectedVersion?: number;
}

// ============================================
// OUTPUT DTOS
// ============================================

/**
 * License info trong output response
 */
@ObjectType()
export class LicenseInfoOutput {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  licenseCode?: string;

  @Field(() => String, {
    description: 'License status (PENDING_PAYMENT, ACTIVE, LOCKED, etc.)',
  })
  status: string;

  @Field(() => String, { nullable: true })
  productName?: string;

  @Field(() => String, { nullable: true })
  packageName?: string;
}

/**
 * Invoice info trong output response
 */
@ObjectType()
export class InvoiceInfoOutput {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  invoiceNumber?: string;

  @Field(() => Float, { nullable: true })
  totalAmount?: number;

  @Field(() => String, { nullable: true })
  status?: string;
}

/**
 * Output cho mutation confirmOrderWithLicense
 *
 * Trả về thông tin order sau khi confirm:
 * - Order (status: PROCESSING)
 * - Invoice đã tạo
 * - Licenses đã cấp (status: PENDING_PAYMENT)
 * - Payment deadline info
 */
@ObjectType()
export class ConfirmOrderWithLicenseOutputDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  orderId?: string;

  @Field(() => String, { nullable: true })
  orderCode?: string;

  @Field(() => ORDER_STATUS, { nullable: true })
  newStatus?: ORDER_STATUS;

  @Field(() => InvoiceInfoOutput, {
    nullable: true,
    description: 'Invoice created',
  })
  invoice?: InvoiceInfoOutput;

  @Field(() => [LicenseInfoOutput], {
    nullable: true,
    description: 'Licenses created with PENDING_PAYMENT status',
  })
  licenses?: LicenseInfoOutput[];

  @Field(() => Date, {
    nullable: true,
    description: 'Payment deadline',
  })
  paymentDeadline?: Date;

  @Field(() => String, {
    nullable: true,
    description:
      'Source of payment deadline (GLOBAL, PRODUCT, CUSTOMER_TYPE, RESELLER_TIER, MANUAL)',
  })
  paymentDeadlineSource?: string;

  @Field(() => Int, {
    nullable: true,
    description: 'Payment deadline in hours from confirmation',
  })
  paymentDeadlineHours?: number;

  @Field(() => Float, { nullable: true, description: 'Total order amount' })
  totalAmount?: number;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Payment summary output
 */
@ObjectType()
export class PaymentSummaryOutput {
  @Field(() => Float, { description: 'Total order amount' })
  totalAmount: number;

  @Field(() => Float, { description: 'Total paid amount' })
  paidAmount: number;

  @Field(() => Float, { description: 'Remaining amount to pay' })
  remainingAmount: number;

  @Field(() => String, { description: 'Payment status' })
  paymentStatus: string;

  @Field(() => Float, { description: 'Percentage paid (0-100)' })
  paidPercent: number;
}

/**
 * Output cho mutation confirmOrderPayment
 *
 * Trả về thông tin sau khi xác nhận thanh toán:
 * - Order (status: COMPLETED nếu thanh toán đủ)
 * - Payment summary
 * - New status
 */
@ObjectType()
export class PaymentConfirmOutputDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  orderId?: string;

  @Field(() => String, { nullable: true })
  orderCode?: string;

  @Field(() => ORDER_STATUS, { nullable: true })
  previousStatus?: ORDER_STATUS;

  @Field(() => ORDER_STATUS, { nullable: true })
  newStatus?: ORDER_STATUS;

  @Field(() => PaymentSummaryOutput, {
    nullable: true,
    description: 'Updated payment summary',
  })
  paymentSummary?: PaymentSummaryOutput;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Whether licenses were activated',
  })
  licensesActivated?: boolean;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Output cho mutation unlockOrderAfterPayment
 *
 * Trả về thông tin sau khi mở khóa order:
 * - Order (status: COMPLETED)
 * - Licenses đã được activate
 */
@ObjectType()
export class UnlockOrderOutputDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  orderId?: string;

  @Field(() => String, { nullable: true })
  orderCode?: string;

  @Field(() => ORDER_STATUS, { nullable: true })
  previousStatus?: ORDER_STATUS;

  @Field(() => ORDER_STATUS, { nullable: true })
  newStatus?: ORDER_STATUS;

  @Field(() => [LicenseInfoOutput], {
    nullable: true,
    description: 'Licenses unlocked and activated',
  })
  unlockedLicenses?: LicenseInfoOutput[];

  @Field(() => Date, {
    nullable: true,
    description: 'When the order was unlocked',
  })
  unlockedAt?: Date;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

// ============================================
// ENUM REGISTRATION
// ============================================

// Payment deadline source đã là const, không cần register
// Vì GraphQL Field sử dụng String type
