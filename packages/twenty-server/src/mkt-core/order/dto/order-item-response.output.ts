/**
 * Response DTO for recalculate order items
 */
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RecalculateOrderItemsResponseDto {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Int, { nullable: true })
  updatedCount?: number;

  @Field(() => String, { nullable: true })
  error?: string;
}
