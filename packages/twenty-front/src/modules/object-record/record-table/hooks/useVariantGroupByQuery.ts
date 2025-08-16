import { gql, useQuery } from '@apollo/client';

const VARIANT_GROUP_BY_QUERY = gql`
  query VariantsGroupByProduct($productIds: [String!]) {
    variantsGroupByProduct(productIds: $productIds) {
      productId
      productName
      totalPrice
      variantCount
      variants {
        id
        name
        price
        sku
      }
    }
  }
`;

export interface VariantGroupByProduct {
  productId: string;
  productName: string;
  totalPrice: number;
  variantCount: number;
  variants: {
    id: string;
    name: string;
    price?: number;
    sku: string;
  }[];
}

export const useVariantGroupByQuery = (productIds?: string[]) => {
  return useQuery<{ variantsGroupByProduct: VariantGroupByProduct[] }>(
    VARIANT_GROUP_BY_QUERY,
    {
      variables: { productIds },
      fetchPolicy: 'cache-and-network',
    }
  );
};
