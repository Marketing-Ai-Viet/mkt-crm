import { useQuery } from '@apollo/client';

import { GET_HIDDEN_NAVIGATION_OBJECTS } from '../graphql/queries/getHiddenNavigationObjects';

export const useHiddenNavigationObjects = () => {
  const { data, loading, error } = useQuery(GET_HIDDEN_NAVIGATION_OBJECTS, {
    fetchPolicy: 'cache-first',
  });

  return {
    hiddenObjects: data?.getHiddenNavigationObjects || [],
    loading,
    error,
  };
};
