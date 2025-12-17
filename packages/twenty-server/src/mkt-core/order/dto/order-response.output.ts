import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';

// Register enum for GraphQL
registerEnumType(ORDER_STATUS, {
  name: 'OrderStatus',
  description: 'Order status values',
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

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
export class ConfirmOrderResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  orderId?: string;

  @Field(() => ORDER_STATUS, { nullable: true })
  newStatus?: ORDER_STATUS;

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
