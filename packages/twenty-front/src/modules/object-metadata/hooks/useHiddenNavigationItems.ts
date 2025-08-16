import { useQuery } from '@apollo/client';

import { GET_HIDDEN_NAVIGATION_ITEMS } from '../graphql/queries/getHiddenNavigationItems';

export const useHiddenNavigationItems = () => {
  const { data, loading, error } = useQuery(GET_HIDDEN_NAVIGATION_ITEMS, {
    fetchPolicy: 'cache-first',
  });

  return {
    hiddenItems: data?.getHiddenNavigationItems || [],
    loading,
    error,
  };
};
