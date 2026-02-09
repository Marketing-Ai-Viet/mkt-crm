import { Field, InputType } from '@nestjs/graphql';

import { IsString, IsOptional, IsEnum } from 'class-validator';

@InputType()
export class CreateSnapshotInput {
  @Field(() => String)
  @IsString()
  name: string;

  @Field(() => String, { defaultValue: 'ON_DEMAND' })
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ON_DEMAND'])
  snapshotType: string;

  @Field(() => String, { defaultValue: 'COMBINED' })
  @IsEnum([
    'REVENUE',
    'ORDERS',
    'CUSTOMERS',
    'PAYMENTS',
    'KPIS',
    'CONTRACTS',
    'COMBINED',
  ])
  dataSource: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  widgetId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  snapshotAt?: string;

  @Field(() => String, { defaultValue: 'THIS_MONTH' })
  @IsEnum([
    'TODAY',
    'THIS_WEEK',
    'THIS_MONTH',
    'THIS_QUARTER',
    'THIS_YEAR',
    'CUSTOM',
  ])
  period: string;
}
