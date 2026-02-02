/**
 * Virtual Account GraphQL Input DTOs
 *
 * Input types for VA GraphQL mutations.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';

/**
 * Input for creating a Virtual Account
 */
@InputType()
export class CreateVAInputDto {
  @Field(() => ID, { description: 'Order ID to create VA for' })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @Field(() => Int, {
    nullable: true,
    description: 'VA expiry time in hours (default: 24)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  expiryHours?: number;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Force create new VA even if one exists',
  })
  @IsOptional()
  @IsBoolean()
  forceCreate?: boolean;
}

/**
 * Input for deactivating a Virtual Account
 */
@InputType()
export class DeactivateVAInputDto {
  @Field(() => ID, { description: 'VA ID to deactivate' })
  @IsNotEmpty()
  @IsString()
  vaId: string;

  @Field({ nullable: true, description: 'Reason for deactivation' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Input for getting VA status
 */
@InputType()
export class GetVAStatusInputDto {
  @Field(() => ID, { description: 'VA ID to check' })
  @IsNotEmpty()
  @IsString()
  vaId: string;
}
