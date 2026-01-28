import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

/**
 * Purchase History DTOs
 *
 * Output types for customer purchase history query
 */

@ObjectType()
export class PurchaseOrderItemOutput {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  snapshotProductName?: string;

  @Field(() => String, { nullable: true })
  snapshotPackageName?: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Float)
  unitPrice: number;

  @Field(() => Float)
  totalPrice: number;

  @Field(() => String, { nullable: true })
  itemType?: string;
}

@ObjectType()
export class PurchaseOrderOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  orderCode: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  paymentStatus?: string;

  @Field(() => Float)
  totalAmount: number;

  @Field(() => Float)
  paidAmount: number;

  @Field(() => Float)
  remainingAmount: number;

  @Field(() => Float, { nullable: true })
  discount?: number;

  @Field(() => Float, { nullable: true })
  tax?: number;

  @Field(() => Float, { nullable: true })
  subtotal?: number;

  @Field(() => String)
  currency: string;

  @Field(() => String, { description: 'ISO 8601 format' })
  createdAt: string;

  @Field(() => String, { nullable: true })
  updatedAt?: string;

  @Field(() => [PurchaseOrderItemOutput])
  items: PurchaseOrderItemOutput[];
}

@ObjectType()
export class PurchaseSummaryOutput {
  @Field(() => Int)
  totalOrders: number;

  @Field(() => Float)
  totalSpent: number;

  @Field(() => Float)
  averageOrderValue: number;

  @Field(() => String, { nullable: true, description: 'ISO 8601 format' })
  firstPurchaseDate?: string;

  @Field(() => String, { nullable: true, description: 'ISO 8601 format' })
  lastPurchaseDate?: string;
}

@ObjectType()
export class PurchasePaginationOutput {
  @Field(() => Int)
  take: number;

  @Field(() => Int)
  skip: number;

  @Field(() => Int)
  totalCount: number;

  @Field(() => Boolean)
  hasMore: boolean;
}

@ObjectType()
export class PurchaseHistoryOutput {
  @Field(() => [PurchaseOrderOutput])
  orders: PurchaseOrderOutput[];

  @Field(() => PurchaseSummaryOutput)
  summary: PurchaseSummaryOutput;

  @Field(() => PurchasePaginationOutput)
  pagination: PurchasePaginationOutput;
}
