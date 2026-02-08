import { Field, InputType } from '@nestjs/graphql';

import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class SaveDashboardLayoutInput {
  @Field(() => String)
  @IsString()
  name: string;

  @Field(() => String, { defaultValue: 'PERSONAL' })
  @IsEnum(['PERSONAL', 'ROLE_BASED', 'SYSTEM_DEFAULT'])
  layoutType: string;

  @Field(() => GraphQLJSON)
  widgetOrder: object;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  globalFilters?: Record<string, unknown>;

  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  isDefault: boolean;

  @Field(() => Boolean, { defaultValue: true })
  @IsBoolean()
  isActive: boolean;
}
