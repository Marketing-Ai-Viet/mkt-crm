import { useQuery } from '@apollo/client';

import { GET_HIDDEN_DATA_MODEL_OBJECTS } from '../graphql/queries/getHiddenDataModelObjects';

export const useHiddenDataModelObjects = () => {
  const { data, loading, error } = useQuery(GET_HIDDEN_DATA_MODEL_OBJECTS, {
    fetchPolicy: 'cache-first',
  });

  return {
    hiddenDataModelObjects: data?.getHiddenDataModelObjects || [],
    loading,
    error,
  };
};
