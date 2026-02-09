import { Field, ObjectType, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class OrderTrendItem {
  @Field(() => String)
  period: string;

  @Field(() => Int)
  count: number;

  @Field(() => Float)
  amount: number;
}

@ObjectType()
export class TopProductItem {
  @Field(() => String)
  productName: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Float)
  revenue: number;
}

@ObjectType()
export class ProductRevenueTrendItem {
  @Field(() => String)
  period: string;

  @Field(() => String)
  productName: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Float)
  revenue: number;
}

@ObjectType()
export class OrderStatusItem {
  @Field(() => String)
  status: string;

  @Field(() => Int)
  count: number;

  @Field(() => Float)
  totalAmount: number;
}

@ObjectType()
export class OrderStatsOutput {
  @Field(() => [OrderStatusItem])
  ordersByStatus: OrderStatusItem[];

  @Field(() => [OrderTrendItem])
  orderTrend: OrderTrendItem[];

  @Field(() => Float)
  averageOrderValue: number;

  @Field(() => Float)
  averageProcessingTime: number;

  @Field(() => Float)
  conversionRate: number;

  @Field(() => [TopProductItem])
  topProducts: TopProductItem[];

  @Field(() => [ProductRevenueTrendItem])
  productRevenueTrend: ProductRevenueTrendItem[];
}
