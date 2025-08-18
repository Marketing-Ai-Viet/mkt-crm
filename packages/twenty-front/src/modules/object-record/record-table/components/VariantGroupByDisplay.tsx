import styled from '@emotion/styled';
import { useRecoilValue } from 'recoil';

import { useVariantGroupByQuery } from '@/object-record/record-table/hooks/useVariantGroupByQuery';
import { variantGroupByState } from '@/object-record/record-table/states/variantGroupByState';

const StyledGroupByContainer = styled.div`
  padding: ${({ theme }) => theme.spacing(2)};
  background-color: ${({ theme }) => theme.background.secondary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  margin: ${({ theme }) => theme.spacing(2)} 0;
`;

const StyledProductHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing(2)};
  background-color: ${({ theme }) => theme.background.primary};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  margin-bottom: ${({ theme }) => theme.spacing(1)};
`;

const StyledProductName = styled.h3`
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semiBold};
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0;
`;

const StyledProductStats = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
`;

const StyledStat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StyledStatLabel = styled.span`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.font.color.light};
`;

const StyledStatValue = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.font.color.primary};
`;

const StyledVariantList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`;

const StyledVariantItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing(1)} ${({ theme }) => theme.spacing(2)};
  background-color: ${({ theme }) => theme.background.primary};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  border: 1px solid ${({ theme }) => theme.border.color.light};
`;

const StyledVariantInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(0.5)};
`;

const StyledVariantName = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.font.color.primary};
`;

const StyledVariantSku = styled.span`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.font.color.light};
`;

const StyledVariantPrice = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.semiBold};
  color: ${({ theme }) => theme.font.color.primary};
`;

export const VariantGroupByDisplay = () => {
  const selectedGroup = useRecoilValue(variantGroupByState);
  const { data: groupedVariants, loading } = useVariantGroupByQuery();

  if (!selectedGroup || loading) {
    return null;
  }

  const selectedProduct = groupedVariants?.variantsGroupByProduct?.find(
    (group: any) => group.productId === selectedGroup
  );

  if (!selectedProduct) {
    return null;
  }

  return (
    <StyledGroupByContainer>
      <StyledProductHeader>
        <StyledProductName>{selectedProduct.productName}</StyledProductName>
        <StyledProductStats>
          <StyledStat>
            <StyledStatLabel>Total Price</StyledStatLabel>
            <StyledStatValue>${selectedProduct.totalPrice.toFixed(2)}</StyledStatValue>
          </StyledStat>
          <StyledStat>
            <StyledStatLabel>Variants</StyledStatLabel>
            <StyledStatValue>{selectedProduct.variantCount}</StyledStatValue>
          </StyledStat>
        </StyledProductStats>
      </StyledProductHeader>
      
      <StyledVariantList>
        {selectedProduct.variants.map((variant: any) => (
          <StyledVariantItem key={variant.id}>
            <StyledVariantInfo>
              <StyledVariantName>{variant.name}</StyledVariantName>
              <StyledVariantSku>SKU: {variant.sku}</StyledVariantSku>
            </StyledVariantInfo>
            <StyledVariantPrice>
              ${variant.price?.toFixed(2) || '0.00'}
            </StyledVariantPrice>
          </StyledVariantItem>
        ))}
      </StyledVariantList>
    </StyledGroupByContainer>
  );
};
