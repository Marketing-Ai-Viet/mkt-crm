import { Field,Float,ID,Int,ObjectType } from '@nestjs/graphql';

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

@ObjectType('VariantSummaryConnection')
export class VariantSummaryConnectionDTO {
  @Field(() => [VariantSummaryEdgeDTO])
  edges: VariantSummaryEdgeDTO[];

  @Field(() => Int)
  totalCount: number;
}

@ObjectType('VariantSummaryEdge')
export class VariantSummaryEdgeDTO {
  @Field(() => VariantSummaryDTO)
  node: VariantSummaryDTO;

  @Field(() => String)
  cursor: string;
}

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

  @Field(() => VariantSummaryConnectionDTO)
  mktVariants: VariantSummaryConnectionDTO;
}

@ObjectType('VariantGroupByProductPageInfo')
export class VariantGroupByProductPageInfoDTO {
  @Field(() => Boolean)
  hasNextPage: boolean;

  @Field(() => Boolean)
  hasPreviousPage: boolean;

  @Field(() => String, { nullable: true })
  startCursor: string | null;

  @Field(() => String, { nullable: true })
  endCursor: string | null;
}

@ObjectType('VariantGroupByProductEdge')
export class VariantGroupByProductEdgeDTO {
  @Field(() => VariantGroupByProductDTO)
  node: VariantGroupByProductDTO;

  @Field(() => String)
  cursor: string;
}

@ObjectType('VariantGroupByProductConnection')
export class VariantGroupByProductConnectionDTO {
  @Field(() => [VariantGroupByProductEdgeDTO])
  edges: VariantGroupByProductEdgeDTO[];

  @Field(() => VariantGroupByProductPageInfoDTO)
  pageInfo: VariantGroupByProductPageInfoDTO;

  @Field(() => Int)
  totalCount: number;
}
