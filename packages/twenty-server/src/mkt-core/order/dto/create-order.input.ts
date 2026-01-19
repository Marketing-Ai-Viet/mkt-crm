import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import { MKT_SUPPORTED_LANGUAGES } from 'src/mkt-core/mkt-product-integration/constants';

// ============================================
// GRAPHQL ENUMS - Restricted action sets
// ============================================

/**
 * Actions cho phép khi TẠO đơn hàng (qua createOrderWithItems mutation)
 *
 * - NEW_ORDER: Tạo đơn hàng mới
 * - LICENSE_RENEWING: Gia hạn license (cần licenseId)
 * - TRIAL_TO_PAID: Tạo license trial với thời hạn ngắn (mặc định 1 ngày) để khách hàng trải nghiệm
 *   trước khi thanh toán. Sử dụng trialDurationDays để tùy chỉnh thời gian trial.
 */
export enum CREATE_ORDER_ACTION {
  NEW_ORDER = 'NEW_ORDER',
  LICENSE_RENEWING = 'LICENSE_RENEWING',
  TRIAL_TO_PAID = 'TRIAL_TO_PAID',
}

/**
 * Actions cho phép khi XÁC NHẬN thanh toán đơn hàng
 *
 * Chỉ dùng cho confirmOrder mutation.
 * Các action khác (COMPLETE, CANCEL, BLOCK) sử dụng updateOrderStatus mutation với ORDER_ACTION enum.
 */
export enum CONFIRM_ORDER_ACTION {
  ACCOUNTING_CONFIRMED = 'ACCOUNTING_CONFIRMED',
}

// Register enums for GraphQL
registerEnumType(ORDER_ACTION, {
  name: 'OrderAction',
  description: 'All order actions (for backward compatibility)',
});

registerEnumType(CREATE_ORDER_ACTION, {
  name: 'CreateOrderAction',
  description: 'Actions allowed when creating an order',
});

registerEnumType(CONFIRM_ORDER_ACTION, {
  name: 'ConfirmOrderAction',
  description:
    'Action for accounting confirmation (use updateOrderStatus for other actions)',
});

/**
 * Input for external MKT Server product
 */
@InputType()
export class ExternalMktProductInputDto {
  @Field(() => String, { description: 'Product ID from MKT Server (UUIDv7)' })
  @IsString()
  productId: string;

  @Field(() => String, {
    nullable: true,
    description: 'Package ID from MKT Server',
  })
  @IsOptional()
  @IsString()
  packageId: string;

  @Field(() => Int, {
    nullable: true,
    defaultValue: 1,
    description: 'Maximum devices allowed for license',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDevices?: number;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description:
      'Split into multiple licenses (e.g., maxDevices=3 with splitLicenses=true creates 3 licenses with 1 device each)',
  })
  @IsOptional()
  @IsBoolean()
  splitLicenses?: boolean;
}

/**
 * Input for ordering a combo
 */
@InputType()
export class ComboOrderInputDto {
  @Field(() => String, { description: 'Combo ID' })
  @IsUUID()
  comboId: string;

  @Field(() => Int, {
    defaultValue: 1,
    description: 'Number of this combo to order',
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @Field(() => Int, {
    nullable: true,
    description:
      'Override maxDevices for all digital items in combo (default: 1)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDevices?: number;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description:
      'Split into multiple licenses for digital items in combo (e.g., maxDevices=3 with splitLicenses=true creates 3 licenses with 1 device each)',
  })
  @IsOptional()
  @IsBoolean()
  splitLicenses?: boolean;
}

@InputType()
export class OrderPaymentMethodInputDto {
  @Field(() => String)
  @IsUUID()
  paymentMethodId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsNumber()
  amount?: number;
}

/**
 * Input DTO for creating order with items
 *
 * Uses external products from MKT Server via OAuth2 API
 */
@InputType()
export class CreateOrderWithItemsInputDto {
  @Field(() => String, { description: 'Customer ID' })
  @IsUUID()
  customerId: string;

  @Field(() => String, { nullable: true, defaultValue: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  note?: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  requireContract?: boolean;

  @Field(() => [ExternalMktProductInputDto], {
    nullable: true,
    description:
      'List of external MKT Server products (optional if combos provided)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalMktProductInputDto)
  externalProducts?: ExternalMktProductInputDto[];

  @Field(() => [ComboOrderInputDto], {
    nullable: true,
    description:
      'List of combos to order (optional if externalProducts provided)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboOrderInputDto)
  combos?: ComboOrderInputDto[];

  @Field(() => String, {
    nullable: true,
    defaultValue: 'vi',
    description: 'Order language for display names from MKT Server (vi/en/ko)',
  })
  @IsOptional()
  @IsString()
  @IsIn(MKT_SUPPORTED_LANGUAGES)
  orderLanguage?: string;

  @Field(() => [OrderPaymentMethodInputDto], {
    nullable: true,
    description:
      'Payment methods (optional). Order starts with paymentStatus = PENDING if not provided.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderPaymentMethodInputDto)
  paymentMethods?: OrderPaymentMethodInputDto[];

  @Field(() => CREATE_ORDER_ACTION, {
    description:
      'Action type (NEW_ORDER, TRIAL, LICENSE_RENEWING, TRIAL_TO_PAID, CHANGE_VARIANT)',
  })
  @IsEnum(CREATE_ORDER_ACTION)
  action: CREATE_ORDER_ACTION;

  @Field(() => String, {
    nullable: true,
    description: 'License ID for LICENSE_RENEWING',
  })
  @IsOptional()
  @IsUUID()
  licenseId?: string;

  @Field(() => Int, {
    nullable: true,
    defaultValue: 1,
    description:
      'Thời hạn trial license (ngày). Mặc định 1 ngày cho TRIAL_TO_PAID action.',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  trialDurationDays?: number;

  // ============================================
  // PROMOTION FIELDS
  // ============================================

  @Field(() => String, {
    nullable: true,
    description: 'Coupon code to apply for discount',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: true,
    description: 'Whether to automatically apply eligible promotions',
  })
  @IsOptional()
  @IsBoolean()
  applyAutoPromotions?: boolean;

  // ============================================
  // DRAFT MODE
  // ============================================

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description:
      'Create as draft order. Draft orders only calculate totals without creating QR code or licenses. Use publishDraftOrder to convert to real order.',
  })
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  // ============================================
  // MKT SERVER EMAIL (Optional override)
  // ============================================

  @Field(() => String, {
    nullable: true,
    description:
      'Email for MKT Server license registration. If not specified, auto-fetches from customer linkedAccounts (isPrimary=true, status=ACTIVE, provider=MKT_SERVER)',
  })
  @IsOptional()
  @IsString()
  mktServerEmail?: string;
}

/**
 * Input cho xác nhận thanh toán đơn hàng
 *
 * Chỉ hỗ trợ ACCOUNTING_CONFIRMED action.
 * Sử dụng updateOrderStatus mutation cho các action khác (COMPLETE, CANCEL, BLOCK).
 */
@InputType()
export class ConfirmOrderInputDto {
  @Field(() => String, { description: 'Order ID to confirm' })
  @IsUUID()
  orderId: string;

  @Field(() => CONFIRM_ORDER_ACTION, {
    description: 'Confirmation action (ACCOUNTING_CONFIRMED only)',
    defaultValue: CONFIRM_ORDER_ACTION.ACCOUNTING_CONFIRMED,
  })
  @IsEnum(CONFIRM_ORDER_ACTION)
  action: CONFIRM_ORDER_ACTION;

  @Field(() => String, { nullable: true, description: 'Optional note' })
  @IsOptional()
  @IsString()
  note?: string;
}

@InputType()
export class UpdateOrderStatusInputDto {
  @Field(() => String, { description: 'Order ID to update' })
  @IsUUID()
  orderId: string;

  @Field(() => ORDER_ACTION, { description: 'Action to perform' })
  @IsEnum(ORDER_ACTION)
  action: ORDER_ACTION;

  @Field(() => String, { nullable: true, description: 'Optional note' })
  @IsOptional()
  @IsString()
  note?: string;
}

@InputType()
export class RefundOrderInputDto {
  @Field(() => String, { description: 'Order ID to refund' })
  @IsUUID()
  orderId: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Specific license IDs to refund (for partial refund)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  licenseIds?: string[];

  @Field(() => Number, {
    nullable: true,
    description: 'Custom refund amount (optional)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @Field(() => String, { nullable: true, description: 'Refund reason' })
  @IsOptional()
  @IsString()
  reason?: string;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description: 'Is partial refund',
  })
  @IsOptional()
  @IsBoolean()
  isPartial?: boolean;
}

@InputType()
export class UpdateOrderItemInputDto {
  @Field(() => String, { description: 'Order item ID to update' })
  @IsUUID()
  orderItemId: string;

  @Field(() => String, { nullable: true, description: 'New variant ID' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @Field(() => Int, { nullable: true, description: 'New quantity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @Field(() => Number, { nullable: true, description: 'Custom unit price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @Field(() => String, { nullable: true, description: 'Note' })
  @IsOptional()
  @IsString()
  note?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Updated at timestamp for optimistic locking',
  })
  @IsOptional()
  @IsString()
  updatedAt?: string;
}

// Note: Trial license creation moved to MktLicenseResolver.mktCreateTrialLicense

/**
 * Input DTO for publishing a draft order
 *
 * Converts a DRAFT order to PENDING_PAYMENT:
 * - Creates payment/QR code
 * - Updates order status
 * - Schedules overdue check
 */
@InputType()
export class PublishDraftOrderInputDto {
  @Field(() => String, { description: 'Draft order ID to publish' })
  @IsUUID()
  orderId: string;

  @Field(() => [OrderPaymentMethodInputDto], {
    nullable: true,
    description: 'Payment methods for the order',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderPaymentMethodInputDto)
  paymentMethods?: OrderPaymentMethodInputDto[];

  @Field(() => String, { nullable: true, description: 'Optional note' })
  @IsOptional()
  @IsString()
  note?: string;
}
