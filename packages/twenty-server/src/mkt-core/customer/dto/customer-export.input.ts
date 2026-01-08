import { Field, InputType, Int } from '@nestjs/graphql';

import { IsDateString, IsOptional, IsString, Max, Min } from 'class-validator';

@InputType()
export class CustomerExportInput {
  @Field(() => String, {
    nullable: true,
    description: 'Filter by customer status',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by customer tier',
  })
  @IsOptional()
  @IsString()
  tier?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by customer type',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter from date (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter to date (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @Field(() => Int, {
    nullable: true,
    defaultValue: 1000,
    description: 'Batch size for streaming export',
  })
  @IsOptional()
  @Min(100)
  @Max(10000)
  batchSize?: number;
}

@InputType()
export class CustomerExportStatisticsInput {
  @Field(() => String, {
    nullable: true,
    description: 'Filter by customer status',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by customer tier',
  })
  @IsOptional()
  @IsString()
  tier?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by customer type',
  })
  @IsOptional()
  @IsString()
  type?: string;
}
