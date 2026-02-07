import { Field, InputType, Int, ID } from '@nestjs/graphql';

import { IsString, IsNumber, Min, Max } from 'class-validator';

@InputType()
export class UpdateWidgetPositionInput {
  @Field(() => ID)
  @IsString()
  widgetId: string;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  @Max(12)
  gridCol: number;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  gridRow: number;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  @Max(12)
  colSpan: number;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  @Max(4)
  rowSpan: number;
}
