import { gql } from '@apollo/client';

export const GET_HIDDEN_DATA_MODEL_OBJECTS = gql`
  query GetHiddenDataModelObjects {
    getHiddenDataModelObjects
  }
`;
