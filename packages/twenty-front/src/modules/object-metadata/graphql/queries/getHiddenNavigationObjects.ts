import { gql } from '@apollo/client';

export const GET_HIDDEN_NAVIGATION_OBJECTS = gql`
  query GetHiddenNavigationObjects {
    getHiddenNavigationObjects
  }
`;
