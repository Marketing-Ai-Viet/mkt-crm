import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';

// Register enums for GraphQL
registerEnumType(ORDER_STATUS, {
  name: 'OrderStatus',
  description: 'Order status values',
});

registerEnumType(PAYMENT_STATUS, {
  name: 'PaymentStatus',
  description: 'Payment status values for multi-payment orders',
});

@ObjectType()
export class CreateOrderResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  orderId?: string;

  @Field(() => String, { nullable: true })
  orderCode?: string;

  @Field(() => String, { nullable: true })
  paymentQrCode?: string;

  @Field(() => Number, { nullable: true, description: 'Total order amount' })
  totalAmount?: number;

  @Field(() => Number, { nullable: true, description: 'Amount already paid' })
  paidAmount?: number;

  @Field(() => Number, {
    nullable: true,
    description: 'Remaining amount to pay',
  })
  remainingAmount?: number;

  @Field(() => PAYMENT_STATUS, {
    nullable: true,
    description: 'Payment status',
  })
  paymentStatus?: PAYMENT_STATUS;

  @Field(() => String, { nullable: true })
  error?: string;
}

// Note: Trial license creation moved to MktLicenseResolver.mktCreateTrialLicense

@ObjectType()
export class ConfirmOrderResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  orderId?: string;

  @Field(() => ORDER_STATUS, { nullable: true })
  newStatus?: ORDER_STATUS;

  @Field(() => Number, { nullable: true, description: 'Total order amount' })
  totalAmount?: number;

  @Field(() => Number, { nullable: true, description: 'Amount already paid' })
  paidAmount?: number;

  @Field(() => Number, {
    nullable: true,
    description: 'Remaining amount to pay',
  })
  remainingAmount?: number;

  @Field(() => PAYMENT_STATUS, {
    nullable: true,
    description: 'Payment status',
  })
  paymentStatus?: PAYMENT_STATUS;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
export class RefundOrderResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  orderId?: string;

  @Field(() => Number, { nullable: true })
  refundedAmount?: number;

  @Field(() => ORDER_STATUS, { nullable: true })
  newStatus?: ORDER_STATUS;

  @Field(() => Number, { nullable: true, description: 'Total order amount' })
  totalAmount?: number;

  @Field(() => Number, { nullable: true, description: 'Amount already paid' })
  paidAmount?: number;

  @Field(() => Number, {
    nullable: true,
    description: 'Remaining amount to pay',
  })
  remainingAmount?: number;

  @Field(() => PAYMENT_STATUS, {
    nullable: true,
    description: 'Payment status',
  })
  paymentStatus?: PAYMENT_STATUS;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
export class ValidationErrorDto {
  @Field(() => String)
  field: string;

  @Field(() => String)
  message: string;

  @Field(() => String)
  code: string;
}

@ObjectType()
export class ValidationResultDto {
  @Field(() => Boolean)
  valid: boolean;

  @Field(() => [ValidationErrorDto])
  errors: ValidationErrorDto[];
}

@ObjectType()
export class UpdateOrderStatusResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  orderId?: string;

  @Field(() => ORDER_STATUS, { nullable: true })
  previousStatus?: ORDER_STATUS;

  @Field(() => ORDER_STATUS, { nullable: true })
  newStatus?: ORDER_STATUS;

  @Field(() => Number, { nullable: true, description: 'Total order amount' })
  totalAmount?: number;

  @Field(() => Number, { nullable: true, description: 'Amount already paid' })
  paidAmount?: number;

  @Field(() => Number, {
    nullable: true,
    description: 'Remaining amount to pay',
  })
  remainingAmount?: number;

  @Field(() => PAYMENT_STATUS, {
    nullable: true,
    description: 'Payment status',
  })
  paymentStatus?: PAYMENT_STATUS;

  @Field(() => String, {
    nullable: true,
    description: 'User-friendly message for the client',
  })
  message?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
export class UpdateOrderItemResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  orderItemId?: string;

  @Field(() => String, { nullable: true })
  orderId?: string;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Payment summary for an order
 * Calculated from confirmed payments
 */
@ObjectType()
export class OrderPaymentSummaryOutput {
  @Field(() => Number, { description: 'Total order amount' })
  totalAmount: number;

  @Field(() => Number, {
    description: 'Total paid amount (confirmed payments only)',
  })
  paidAmount: number;

  @Field(() => Number, { description: 'Remaining amount to be paid' })
  remainingAmount: number;

  @Field(() => PAYMENT_STATUS, { description: 'Payment status' })
  paymentStatus: PAYMENT_STATUS;

  @Field(() => Number, {
    description: 'Percentage of total amount paid (0-100)',
  })
  paidPercent: number;
}

/**
 * Order Overdue Queue Statistics
 *
 * Provides observability for the order overdue delayed job queue.
 * Used for monitoring and debugging.
 */
@ObjectType()
export class OrderOverdueQueueStatsOutput {
  @Field(() => Number, { description: 'Jobs waiting to be processed' })
  waiting: number;

  @Field(() => Number, {
    description: 'Jobs delayed (scheduled for future execution)',
  })
  delayed: number;

  @Field(() => Number, { description: 'Jobs currently being processed' })
  active: number;

  @Field(() => Number, { description: 'Jobs completed successfully' })
  completed: number;

  @Field(() => Number, { description: 'Jobs that failed' })
  failed: number;

  @Field(() => Number, {
    description: 'Total jobs in queue (waiting + delayed + active)',
  })
  total: number;
}

/**
 * Response for publishing a draft order
 */
@ObjectType()
export class PublishDraftOrderResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  orderId?: string;

  @Field(() => String, { nullable: true })
  orderCode?: string;

  @Field(() => String, { nullable: true })
  paymentQrCode?: string;

  @Field(() => ORDER_STATUS, { nullable: true })
  newStatus?: ORDER_STATUS;

  @Field(() => String, { nullable: true })
  error?: string;
}
