import { currentRecordFiltersComponentState } from '@/object-record/record-filter/states/currentRecordFiltersComponentState';
import { RecordFilter } from '@/object-record/record-filter/types/RecordFilter';
import { useRecoilComponentValueV2 } from '@/ui/utilities/state/component-state/hooks/useRecoilComponentValueV2';
import { ViewFilterOperand } from 'twenty-shared/src/types/ViewFilterOperand';

// Field metadata ID for mktProduct relation (from actual filter data)
const MKT_PRODUCT_FIELD_ID = '74541b0a-a1a2-470a-a443-961eb09702c3';

export const useSelectedProductIds = (): string[] | undefined => {
  const currentFilters = useRecoilComponentValueV2(currentRecordFiltersComponentState);
  
  console.log('🔍 Debug useSelectedProductIds - currentFilters:', currentFilters);
  
  // Log all filters to see what field metadata IDs are available
  if (currentFilters && currentFilters.length > 0) {
    console.log('🔍 Debug useSelectedProductIds - All filters:');
    currentFilters.forEach((filter: RecordFilter, index: number) => {
      console.log(`  Filter ${index}:`, {
        fieldMetadataId: filter.fieldMetadataId,
        operand: filter.operand,
        value: filter.value,
        label: filter.label,
        type: filter.type
      });
    });
  }
  
  // Find filter for mktProduct field using the correct field metadata ID
  let productFilter = currentFilters.find(
    (filter: RecordFilter) => filter.fieldMetadataId === MKT_PRODUCT_FIELD_ID
  );
  
  // If not found by ID, try to find by label (fallback)
  if (!productFilter) {
    productFilter = currentFilters.find(
      (filter: RecordFilter) => 
        filter.label?.toLowerCase().includes('product') ||
        filter.type === 'RELATION'
    );
    console.log('🔍 Debug useSelectedProductIds - Found product filter by label/type:', productFilter);
  }
  
  console.log('🔍 Debug useSelectedProductIds - productFilter:', productFilter);
  console.log('🔍 Debug useSelectedProductIds - Looking for field ID:', MKT_PRODUCT_FIELD_ID);
  
  if (!productFilter) {
    console.log('🔍 Debug useSelectedProductIds - No product filter found');
    return undefined;
  }
  
  console.log('🔍 Debug useSelectedProductIds - productFilter.operand:', productFilter.operand);
  console.log('🔍 Debug useSelectedProductIds - productFilter.value:', productFilter.value);
  console.log('🔍 Debug useSelectedProductIds - Array.isArray(productFilter.value):', Array.isArray(productFilter.value));
  
  // Check for various operand types that might contain product IDs
  if ([ViewFilterOperand.Is, ViewFilterOperand.IsNot].includes(productFilter.operand)) {
    // Handle JSON string value (for relation filters)
    if (typeof productFilter.value === 'string') {
      try {
        const parsedValue = JSON.parse(productFilter.value);
        console.log('🔍 Debug useSelectedProductIds - Parsed value:', parsedValue);
        
        if (parsedValue.selectedRecordIds && Array.isArray(parsedValue.selectedRecordIds)) {
          console.log('🔍 Debug useSelectedProductIds - Returning product IDs from selectedRecordIds:', parsedValue.selectedRecordIds);
          return parsedValue.selectedRecordIds;
        }
      } catch (error) {
        console.log('🔍 Debug useSelectedProductIds - Failed to parse JSON value:', error);
      }
    }
    
    // Handle direct array value
    if (Array.isArray(productFilter.value)) {
      console.log('🔍 Debug useSelectedProductIds - Returning product IDs array:', productFilter.value);
      return productFilter.value as string[];
    } 
    
    // Handle direct string value
    else if (typeof productFilter.value === 'string' && productFilter.value) {
      console.log('🔍 Debug useSelectedProductIds - Returning single product ID:', productFilter.value);
      return [productFilter.value];
    }
  }
  
  console.log('🔍 Debug useSelectedProductIds - No matching filter found, returning undefined');
  return undefined;
};
