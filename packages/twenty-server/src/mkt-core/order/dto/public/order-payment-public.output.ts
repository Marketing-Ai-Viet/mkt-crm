import { Field, Int, ObjectType } from '@nestjs/graphql';

// ============================================
// ERROR DTO
// ============================================

@ObjectType({ description: 'Public order payment error' })
export class MktPublicOrderPaymentErrorDto {
  @Field(() => String)
  code: string;

  @Field(() => String)
  message: string;
}

// ============================================
// ORDER INFO DTO
// ============================================

@ObjectType({
  description:
    'Amounts tính bằng đơn vị nhỏ nhất của currency (VND = đồng, Int tránh floating-point precision loss)',
})
export class MktPublicOrderInfoDto {
  @Field(() => String)
  orderCode: string;

  @Field(() => String)
  status: string;

  @Field(() => String)
  paymentStatus: string;

  @Field(() => Int)
  totalAmount: number;

  @Field(() => Int)
  paidAmount: number;

  @Field(() => Int)
  remainingAmount: number;

  @Field(() => String)
  currency: string;

  @Field(() => String, { nullable: true })
  paymentDeadline: string | null;

  @Field(() => String)
  createdAt: string;
}

// ============================================
// CUSTOMER INFO DTO
// ============================================

@ObjectType({ description: 'Public customer info' })
export class MktPublicCustomerInfoDto {
  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  email: string | null;

  @Field(() => String, { nullable: true })
  phone: string | null;
}

// ============================================
// ORDER ITEM DTO
// ============================================

@ObjectType({ description: 'Public order item info' })
export class MktPublicOrderItemDto {
  @Field(() => String)
  name: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Int)
  unitPrice: number;

  @Field(() => Int)
  totalPrice: number;

  @Field(() => String, { nullable: true })
  productName: string | null;

  @Field(() => String, { nullable: true })
  packageName: string | null;
}

// ============================================
// PAYMENT INFO DTO
// ============================================

@ObjectType({ description: 'Public payment info' })
export class MktPublicPaymentInfoDto {
  @Field(() => String, {
    description:
      'Link QR từ SePay. Lifecycle (hết hạn, renew) do SePay quản lý.',
  })
  qrCodeUrl: string;

  @Field(() => Int)
  amount: number;

  @Field(() => String)
  currency: string;
}

// ============================================
// DATA DTO (aggregates all sub-DTOs)
// ============================================

@ObjectType({ description: 'Public order payment data' })
export class MktPublicOrderPaymentDataDto {
  @Field(() => MktPublicOrderInfoDto)
  order: MktPublicOrderInfoDto;

  @Field(() => MktPublicCustomerInfoDto)
  customer: MktPublicCustomerInfoDto;

  @Field(() => [MktPublicOrderItemDto])
  items: MktPublicOrderItemDto[];

  @Field(() => MktPublicPaymentInfoDto)
  payment: MktPublicPaymentInfoDto;
}

// ============================================
// RESPONSE DTO (top-level)
// ============================================

@ObjectType({ description: 'Public order payment response' })
export class MktPublicOrderPaymentResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => MktPublicOrderPaymentDataDto, { nullable: true })
  data: MktPublicOrderPaymentDataDto | null;

  @Field(() => MktPublicOrderPaymentErrorDto, { nullable: true })
  error: MktPublicOrderPaymentErrorDto | null;
}
