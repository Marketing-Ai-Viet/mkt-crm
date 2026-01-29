import { ArgsType, Field, Int } from '@nestjs/graphql';

import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * GetPurchaseHistoryArgs
 *
 * Using @ArgsType() for cleaner resolver signature
 * Instead of 7 separate @Args(), we use single @Args() args: GetPurchaseHistoryArgs
 */
@ArgsType()
export class GetPurchaseHistoryArgs {
  @Field(() => String)
  @IsString()
  customerId: string;

  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  take?: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  skip?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by order status',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by payment status',
  })
  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @Field(() => String, { defaultValue: 'createdAt' })
  @IsIn(['createdAt', 'totalAmount', 'orderCode'])
  @IsOptional()
  sortBy?: string;

  @Field(() => String, { defaultValue: 'DESC' })
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * GetPurchasedProductsArgs
 *
 * Arguments for getting list of purchased products by customer
 */
@ArgsType()
export class GetPurchasedProductsArgs {
  @Field(() => String)
  @IsString()
  customerId: string;

  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  take?: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  skip?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by item type (e.g., DIGITAL_EXTERNAL, PHYSICAL)',
  })
  @IsString()
  @IsOptional()
  itemType?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Search by product name',
  })
  @IsString()
  @IsOptional()
  productNameSearch?: string;

  @Field(() => String, { defaultValue: 'totalSpent' })
  @IsIn([
    'totalSpent',
    'totalQuantity',
    'purchaseCount',
    'lastPurchaseDate',
    'productName',
  ])
  @IsOptional()
  sortBy?: string;

  @Field(() => String, { defaultValue: 'DESC' })
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
