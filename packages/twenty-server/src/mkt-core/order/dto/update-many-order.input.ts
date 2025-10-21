import { Field, Float, InputType } from '@nestjs/graphql';

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

import { CreateOrderItemInput } from 'src/mkt-core/order/dto/create-order-item.input';
import { OrderStatusGraphQL } from 'src/mkt-core/order/graphql/order-status.enum';

@InputType()
export class UpdateOrderDataInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  accountingConfirmed?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  position?: number;

  @Field(() => OrderStatusGraphQL, { nullable: true })
  @IsOptional()
  status?: OrderStatusGraphQL;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  requireContract?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  accountOwnerId?: string;

  @Field(() => [CreateOrderItemInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemInput)
  items?: CreateOrderItemInput[];
}

@InputType()
export class UpdateOrderBulkItemInput {
  @Field()
  @IsUUID()
  id: string;

  @Field(() => UpdateOrderDataInput)
  @ValidateNested()
  @Type(() => UpdateOrderDataInput)
  data: UpdateOrderDataInput;
}

@InputType()
export class UpdateManyOrderInput {
  @Field(() => [UpdateOrderBulkItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderBulkItemInput)
  updates: UpdateOrderBulkItemInput[];
}
