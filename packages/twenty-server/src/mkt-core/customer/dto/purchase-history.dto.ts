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

/**
 * Purchased Product Output
 *
 * Aggregated information about a product purchased by customer
 */
@ObjectType()
export class PurchasedProductOutput {
  @Field(() => String, { description: 'Product name from snapshot' })
  productName: string;

  @Field(() => String, {
    nullable: true,
    description: 'Package name if applicable',
  })
  packageName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'External MKT product ID',
  })
  externalProductId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'External MKT product code',
  })
  externalProductCode?: string;

  @Field(() => String, {
    nullable: true,
    description: 'External MKT package ID',
  })
  externalPackageId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'External MKT package code',
  })
  externalPackageCode?: string;

  @Field(() => String, { nullable: true, description: 'Type of item' })
  itemType?: string;

  @Field(() => Int, { description: 'Number of times purchased' })
  purchaseCount: number;

  @Field(() => Float, { description: 'Total quantity purchased' })
  totalQuantity: number;

  @Field(() => Float, { description: 'Total amount spent on this product' })
  totalSpent: number;

  @Field(() => String, { description: 'First purchase date (ISO 8601)' })
  firstPurchaseDate: string;

  @Field(() => String, { description: 'Last purchase date (ISO 8601)' })
  lastPurchaseDate: string;

  @Field(() => String, {
    description: 'Created at - same as first purchase date (ISO 8601)',
  })
  createdAt: string;
}

@ObjectType()
export class PurchasedProductsOutput {
  @Field(() => [PurchasedProductOutput])
  products: PurchasedProductOutput[];

  @Field(() => Int, { description: 'Total unique products purchased' })
  totalUniqueProducts: number;

  @Field(() => PurchasePaginationOutput)
  pagination: PurchasePaginationOutput;
}
