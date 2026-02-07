import { Field, ObjectType, Int, ID } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class WidgetOutput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  widgetName: string;

  @Field(() => String)
  widgetCode: string;

  @Field(() => String)
  widgetType: string;

  @Field(() => String)
  dataSource: string;

  @Field(() => Int)
  defaultColSpan: number;

  @Field(() => Int)
  defaultRowSpan: number;

  @Field(() => String)
  defaultPeriod: string;

  @Field(() => GraphQLJSON, { nullable: true })
  filterConfig: Record<string, unknown> | null;

  @Field(() => String)
  visibility: string;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Boolean)
  isSystemDefault: boolean;

  @Field(() => Int)
  displayOrder: number;

  @Field(() => Int, { nullable: true })
  cacheTtlSeconds: number | null;

  @Field(() => GraphQLJSON, { nullable: true })
  widgetConfig: Record<string, unknown> | null;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
