import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import styled from '@emotion/styled';
import { useRecoilState } from 'recoil';
import { IconChevronDown,IconUsers } from 'twenty-ui/display';

import { useSelectedProductIds } from '@/object-record/record-table/hooks/useSelectedProductIds';
import { useVariantGroupByQuery } from '@/object-record/record-table/hooks/useVariantGroupByQuery';
import { variantGroupByState } from '@/object-record/record-table/states/variantGroupByState';

const StyledDropdownButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(1)} ${({ theme }) => theme.spacing(2)};
  font-size: ${({ theme }) => theme.font.size.sm};
  height: 32px;
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.background.transparent.light};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  color: ${({ theme }) => theme.font.color.secondary};
  cursor: pointer;
  transition: all 0.1s ease;
  
  &:hover {
    background: ${({ theme }) => theme.background.tertiary};
  }
  
  &:active {
    background: ${({ theme }) => theme.background.quaternary};
  }
`;

const StyledDropdownContent = styled.div`
  padding: ${({ theme }) => theme.spacing(2)};
  min-width: 200px;
`;

const StyledGroupOption = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing(1)} ${({ theme }) => theme.spacing(2)};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  
  &:hover {
    background-color: ${({ theme }) => theme.background.transparent.light};
  }
`;

const StyledGroupInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`;

const StyledProductName = styled.span`
  font-weight: ${({ theme }) => theme.font.weight.medium};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

const StyledVariantCount = styled.span`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.font.color.light};
`;

const StyledTotalPrice = styled.span`
  font-weight: ${({ theme }) => theme.font.weight.semiBold};
  color: ${({ theme }) => theme.font.color.primary};
`;

export const VariantGroupByDropdown = () => {
  const [selectedGroup, setSelectedGroup] = useRecoilState(variantGroupByState);
  const selectedProductIds = useSelectedProductIds();
  const { data: groupedVariants, loading } = useVariantGroupByQuery(selectedProductIds);
  const { closeDropdown } = useCloseDropdown();

  console.log('🔍 Debug VariantGroupByDropdown - selectedProductIds:', selectedProductIds);
  console.log('🔍 Debug VariantGroupByDropdown - groupedVariants:', groupedVariants);
  console.log('🔍 Debug VariantGroupByDropdown - loading:', loading);

  const handleGroupSelect = (productId: string) => {
    setSelectedGroup(productId);
    closeDropdown('variant-group-by-dropdown');
  };

  const handleClearGroup = () => {
    setSelectedGroup(null);
    closeDropdown('variant-group-by-dropdown');
  };

  return (
    <Dropdown
      dropdownId="variant-group-by-dropdown"
      clickableComponent={
        <StyledDropdownButton
          title="Group by Product"
        >
          <IconUsers size={16} />
          Group by
          <IconChevronDown size={16} />
        </StyledDropdownButton>
      }
      dropdownComponents={
        <DropdownContent>
          <StyledDropdownContent>
            <div style={{ marginBottom: '8px' }}>
              <strong>Group by Product</strong>
              {selectedProductIds && selectedProductIds.length > 0 && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Filtered by {selectedProductIds.length} selected product(s)
                </div>
              )}
            </div>
            
            {loading ? (
              <div>Loading...</div>
            ) : (
              <>
                {groupedVariants?.variantsGroupByProduct?.map((group: any) => (
                  <StyledGroupOption
                    key={group.productId}
                    onClick={() => handleGroupSelect(group.productId)}
                  >
                    <StyledGroupInfo>
                      <StyledProductName>{group.productName}</StyledProductName>
                      <StyledVariantCount>
                        {group.variantCount} variants
                      </StyledVariantCount>
                    </StyledGroupInfo>
                    <StyledTotalPrice>
                      ${group.totalPrice.toFixed(2)}
                    </StyledTotalPrice>
                  </StyledGroupOption>
                ))}
                
                {selectedGroup && (
                  <StyledGroupOption onClick={handleClearGroup}>
                    <span>Clear grouping</span>
                  </StyledGroupOption>
                )}
              </>
            )}
          </StyledDropdownContent>
        </DropdownContent>
      }
      dropdownPlacement="bottom-start"
      dropdownOffset={{ x: 0, y: 4 }}
    />
  );
};
