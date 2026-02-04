import { Field, ObjectType, registerEnumType, Int } from '@nestjs/graphql';

import { OffsetPageInfo } from 'src/mkt-core/common/dto/pagination.output';
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

// ============================================
// QUERY OUTPUT TYPES
// ============================================

/**
 * Basic customer info for order display
 */
@ObjectType({ description: 'Customer basic info' })
export class OrderCustomerInfo {
  @Field(() => String, { nullable: true, description: 'Customer ID' })
  id?: string;

  @Field(() => String, { nullable: true, description: 'Customer name' })
  name?: string;

  @Field(() => String, { nullable: true, description: 'Customer email' })
  email?: string;

  @Field(() => String, { nullable: true, description: 'Customer phone' })
  phone?: string;
}

/**
 * Basic sales staff info for order display
 */
@ObjectType({ description: 'Sales staff basic info' })
export class OrderSalesStaffInfo {
  @Field(() => String, { nullable: true, description: 'Sales staff ID' })
  id?: string;

  @Field(() => String, { nullable: true, description: 'Sales staff full name' })
  name?: string;

  @Field(() => String, { nullable: true, description: 'Sales staff email' })
  email?: string;
}

/**
 * Payment method info for order display
 * Extracted from the latest confirmed payment
 */
@ObjectType({ description: 'Payment method info' })
export class OrderPaymentMethodInfo {
  @Field(() => String, { nullable: true, description: 'Payment method ID' })
  id?: string;

  @Field(() => String, { nullable: true, description: 'Payment method name' })
  name?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Payment method type (e.g., BANK_TRANSFER, QR_CODE, CASH)',
  })
  type?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Payment method description',
  })
  description?: string;
}

/**
 * Order item output for query responses
 */
@ObjectType({ description: 'Order item details' })
export class OrderItemOutput {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Product name from snapshot',
  })
  productName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Package name from snapshot',
  })
  packageName?: string;

  @Field(() => Number, { nullable: true })
  quantity?: number;

  @Field(() => Number, { nullable: true })
  unitPrice?: number;

  @Field(() => Number, { nullable: true })
  totalPrice?: number;

  @Field(() => Number, { nullable: true, description: 'Item discount amount' })
  discount?: number;
}

/**
 * Order output for query responses
 */
@ObjectType()
export class OrderOutput {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  orderCode?: string;

  @Field(() => ORDER_STATUS, { nullable: true })
  status?: ORDER_STATUS;

  @Field(() => Number, { nullable: true })
  totalAmount?: number;

  @Field(() => Number, { nullable: true })
  subtotal?: number;

  @Field(() => Number, { nullable: true })
  tax?: number;

  @Field(() => Number, { nullable: true })
  discount?: number;

  @Field(() => Number, { nullable: true })
  promotionDiscount?: number;

  @Field(() => Number, { nullable: true })
  comboDiscount?: number;

  @Field(() => String, { nullable: true })
  currency?: string;

  @Field(() => String, { nullable: true })
  note?: string;

  @Field(() => Number, { nullable: true })
  paidAmount?: number;

  @Field(() => Number, { nullable: true })
  remainingAmount?: number;

  @Field(() => PAYMENT_STATUS, { nullable: true })
  paymentStatus?: PAYMENT_STATUS;

  @Field(() => Boolean, { nullable: true })
  accountingConfirmed?: boolean;

  @Field(() => String, { nullable: true })
  mktCustomerId?: string;

  @Field(() => String, { nullable: true })
  accountOwnerId?: string;

  @Field(() => String, { nullable: true })
  createdById?: string;

  @Field(() => String, { nullable: true })
  createdAt?: string;

  @Field(() => String, { nullable: true })
  updatedAt?: string;

  // ============================================
  // CUSTOMER INFO (from mktCustomer relation)
  // ============================================

  @Field(() => OrderCustomerInfo, {
    nullable: true,
    description: 'Customer basic info',
  })
  customer?: OrderCustomerInfo;

  // ============================================
  // ORDER ITEMS
  // ============================================

  @Field(() => [OrderItemOutput], {
    nullable: true,
    description: 'Order items list',
  })
  orderItems?: OrderItemOutput[];

  // ============================================
  // SALES STAFF INFO (from createdBy relation)
  // ============================================

  @Field(() => OrderSalesStaffInfo, {
    nullable: true,
    description: 'Sales staff basic info',
  })
  salesStaff?: OrderSalesStaffInfo;

  // ============================================
  // PAYMENT INFO (from mktPayments relation)
  // ============================================

  @Field(() => OrderPaymentMethodInfo, {
    nullable: true,
    description: 'Payment method info from latest confirmed payment',
  })
  paymentMethod?: OrderPaymentMethodInfo;

  @Field(() => String, {
    nullable: true,
    description: 'Last payment date (ISO format)',
  })
  lastPaymentDate?: string;

  // ============================================
  // DIRECT FIELDS FROM ENTITY
  // ============================================

  @Field(() => String, { nullable: true, description: 'S-Invoice status' })
  sInvoiceStatus?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Payment deadline (ISO format)',
  })
  paymentDeadline?: string;
}

/**
 * Paginated orders list response (simple)
 */
@ObjectType()
export class OrderListOutput {
  @Field(() => [OrderOutput])
  orders: OrderOutput[];

  @Field(() => Number)
  totalCount: number;
}

/**
 * Paginated orders response with full pagination info
 */
@ObjectType({ description: 'Paginated orders response' })
export class PaginatedOrdersOutput {
  @Field(() => [OrderOutput], { description: 'List of orders' })
  orders: OrderOutput[];

  @Field(() => Int, { description: 'Total number of orders matching filter' })
  totalCount: number;

  @Field(() => OffsetPageInfo, { description: 'Pagination info' })
  pageInfo: OffsetPageInfo;
}

/**
 * Customer order statistics output
 */
@ObjectType()
export class CustomerOrderStatsOutput {
  @Field(() => Number, { description: 'Total number of orders' })
  orderCount: number;

  @Field(() => Number, { description: 'Total order value' })
  totalValue: number;

  @Field(() => String, { nullable: true, description: 'Date of first order' })
  firstOrderDate?: string;

  @Field(() => String, { nullable: true, description: 'Date of last order' })
  lastOrderDate?: string;

  @Field(() => Number, {
    description: 'Average days between orders',
  })
  averageOrderInterval: number;
}
