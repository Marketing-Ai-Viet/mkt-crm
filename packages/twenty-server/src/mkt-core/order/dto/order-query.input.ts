import { Field, InputType, registerEnumType } from '@nestjs/graphql';

import { IsEnum, IsOptional, IsString } from 'class-validator';

import {
  PaginationInput,
  SortDirection,
} from 'src/mkt-core/common/dto/pagination.input';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { ORDER_PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';

// ============================================
// ORDER SORT FIELD
// ============================================

/**
 * Fields available for sorting orders
 */
export enum OrderSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  ORDER_CODE = 'orderCode',
  TOTAL_AMOUNT = 'totalAmount',
  STATUS = 'status',
  PAYMENT_STATUS = 'paymentStatus',
  PAYMENT_DEADLINE = 'paymentDeadline',
}

registerEnumType(OrderSortField, {
  name: 'OrderSortField',
  description: 'Fields available for sorting orders',
});

// ============================================
// ORDER SORT INPUT
// ============================================

/**
 * Sort parameters for orders
 */
@InputType({ description: 'Sort parameters for orders' })
export class OrderSortInput {
  @Field(() => OrderSortField, {
    nullable: true,
    defaultValue: OrderSortField.CREATED_AT,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(OrderSortField)
  field?: OrderSortField;

  @Field(() => SortDirection, {
    nullable: true,
    defaultValue: SortDirection.DESC,
    description: 'Sort direction',
  })
  @IsOptional()
  @IsEnum(SortDirection)
  direction?: SortDirection;
}

// ============================================
// ORDER FILTER INPUT
// ============================================

/**
 * Filter parameters for orders
 */
@InputType({ description: 'Filter parameters for orders' })
export class OrderFilterInput {
  @Field(() => String, {
    nullable: true,
    description: 'Search by order code, customer name, email or phone',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => ORDER_STATUS, {
    nullable: true,
    description: 'Filter by order status',
  })
  @IsOptional()
  @IsEnum(ORDER_STATUS)
  status?: ORDER_STATUS;

  @Field(() => ORDER_PAYMENT_STATUS, {
    nullable: true,
    description: 'Filter by payment status',
  })
  @IsOptional()
  @IsEnum(ORDER_PAYMENT_STATUS)
  paymentStatus?: ORDER_PAYMENT_STATUS;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by customer ID',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by sales staff ID (createdById)',
  })
  @IsOptional()
  @IsString()
  salesStaffId?: string;
}

// ============================================
// GET ORDERS INPUT
// ============================================

/**
 * Combined input for getOrders query
 */
@InputType({
  description: 'Input for getOrders query with pagination, sort and filter',
})
export class GetOrdersInput {
  @Field(() => PaginationInput, {
    nullable: true,
    description: 'Pagination parameters',
  })
  @IsOptional()
  pagination?: PaginationInput;

  @Field(() => OrderSortInput, {
    nullable: true,
    description: 'Sort parameters',
  })
  @IsOptional()
  sort?: OrderSortInput;

  @Field(() => OrderFilterInput, {
    nullable: true,
    description: 'Filter parameters',
  })
  @IsOptional()
  filter?: OrderFilterInput;
}
