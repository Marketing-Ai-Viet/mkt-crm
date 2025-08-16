import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';

import { objectMetadataItemsState } from '@/object-metadata/states/objectMetadataItemsState';
import { useHiddenDataModelObjects } from './useHiddenDataModelObjects';

export const useDataModelObjectMetadataItems = () => {
  const objectMetadataItems = useRecoilValue(objectMetadataItemsState);
  const { hiddenDataModelObjects } = useHiddenDataModelObjects();

  const activeNonSystemObjectMetadataItems = useMemo(
    () =>
      objectMetadataItems.filter(
        ({ isActive, isSystem, namePlural }) => 
          isActive && 
          !isSystem && 
          !hiddenDataModelObjects.includes(namePlural),
      ),
    [objectMetadataItems, hiddenDataModelObjects],
  );

  const inactiveNonSystemObjectMetadataItems = useMemo(
    () =>
      objectMetadataItems.filter(
        ({ isActive, isSystem, namePlural }) => 
          !isActive && 
          !isSystem && 
          !hiddenDataModelObjects.includes(namePlural),
      ),
    [objectMetadataItems, hiddenDataModelObjects],
  );

  return {
    activeNonSystemObjectMetadataItems,
    inactiveNonSystemObjectMetadataItems,
  };
};
