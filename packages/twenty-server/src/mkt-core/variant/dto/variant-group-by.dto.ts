import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('VariantGroupByProduct')
export class VariantGroupByProductDTO {
  @Field(() => ID)
  productId: string;

  @Field()
  productName: string;

  @Field(() => Float)
  totalPrice: number;

  @Field()
  variantCount: number;

  @Field(() => [VariantSummaryDTO])
  variants: VariantSummaryDTO[];
}

@ObjectType('VariantSummary')
export class VariantSummaryDTO {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field()
  sku: string;
}
