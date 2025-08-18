import { gql } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing';
import { render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';

import { variantGroupByState } from '../../states/variantGroupByState';
import { VariantGroupByDisplay } from '../VariantGroupByDisplay';

const VARIANT_GROUP_BY_QUERY = gql`
  query VariantsGroupByProduct {
    variantsGroupByProduct {
      productId
      productName
      totalPrice
      variantCount
      variants {
        id
        name
        price
        sku
      }
    }
  }
`;

const mockData = {
  variantsGroupByProduct: [
    {
      productId: 'product1',
      productName: 'Product 1',
      totalPrice: 300,
      variantCount: 2,
      variants: [
        { id: '1', name: 'Variant 1', price: 100, sku: 'SKU1' },
        { id: '2', name: 'Variant 2', price: 200, sku: 'SKU2' },
      ],
    },
  ],
};

const mocks = [
  {
    request: {
      query: VARIANT_GROUP_BY_QUERY,
    },
    result: {
      data: mockData,
    },
  },
];

const renderWithProviders = (component: React.ReactElement, initialState = {}) => {
  return render(
    <RecoilRoot
      initializeState={({ set }) => {
        Object.entries(initialState).forEach(([key, value]) => {
          if (key === 'variantGroupByState') {
            set(variantGroupByState, value as string | null);
          }
        });
      }}
    >
      <MockedProvider mocks={mocks} addTypename={false}>
        {component}
      </MockedProvider>
    </RecoilRoot>
  );
};

describe('VariantGroupByDisplay', () => {
  it('should render nothing when no group is selected', () => {
    renderWithProviders(<VariantGroupByDisplay />);
    expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
  });

  it('should render product information when group is selected', async () => {
    renderWithProviders(<VariantGroupByDisplay />, { variantGroupByState: 'product1' });

    // Wait for the query to resolve
    await screen.findByText('Product 1');

    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('$300.00')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Variant 1')).toBeInTheDocument();
    expect(screen.getByText('Variant 2')).toBeInTheDocument();
    expect(screen.getByText('SKU: SKU1')).toBeInTheDocument();
    expect(screen.getByText('SKU: SKU2')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    renderWithProviders(<VariantGroupByDisplay />, { variantGroupByState: 'product1' });
    // Component should not render anything while loading
    expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
  });
});
