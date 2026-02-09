import { Field, InputType, Int } from '@nestjs/graphql';

import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class CreateDashboardWidgetInput {
  @Field(() => String)
  @IsString()
  widgetName: string;

  @Field(() => String)
  @IsString()
  widgetCode: string;

  @Field(() => String, { defaultValue: 'STAT_CARD' })
  @IsEnum([
    'STAT_CARD',
    'LINE_CHART',
    'BAR_CHART',
    'PIE_CHART',
    'TABLE',
    'KPI_SCORECARD',
    'LEADERBOARD',
    'TREND_CHART',
  ])
  widgetType: string;

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

  @Field(() => Int, { defaultValue: 3 })
  @IsNumber()
  @Min(1)
  @Max(12)
  defaultColSpan: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsNumber()
  @Min(1)
  @Max(4)
  defaultRowSpan: number;

  @Field(() => String, { defaultValue: 'THIS_MONTH' })
  @IsEnum([
    'TODAY',
    'THIS_WEEK',
    'THIS_MONTH',
    'THIS_QUARTER',
    'THIS_YEAR',
    'CUSTOM',
  ])
  defaultPeriod: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  filterConfig?: Record<string, unknown>;

  @Field(() => String, { defaultValue: 'ALL' })
  @IsEnum(['ALL', 'ROLE_BASED', 'PERSONAL'])
  visibility: string;

  @Field(() => Boolean, { defaultValue: true })
  @IsBoolean()
  isActive: boolean;

  @Field(() => Int, { defaultValue: 0 })
  @IsNumber()
  displayOrder: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  cacheTtlSeconds?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  widgetConfig?: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}
