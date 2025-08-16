import { gql } from '@apollo/client';

export const GET_HIDDEN_NAVIGATION_ITEMS = gql`
  query GetHiddenNavigationItems {
    getHiddenNavigationItems
  }
`;
