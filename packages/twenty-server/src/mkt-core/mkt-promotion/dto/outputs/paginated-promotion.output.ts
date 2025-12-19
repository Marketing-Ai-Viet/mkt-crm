import { Field, ObjectType, Int } from '@nestjs/graphql';

import { PromotionOutput } from './promotion.output';

/**
 * Output for paginated promotions list
 */
@ObjectType()
export class PaginatedPromotionsOutput {
  @Field(() => [PromotionOutput])
  items: PromotionOutput[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  offset: number;

  @Field(() => Boolean)
  hasMore: boolean;
}
