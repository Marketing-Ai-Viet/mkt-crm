
export const ORDER_DATA_SEED_COLUMNS = [
  'id',
  'orderCode',
  'customerId',
  'status',
  'totalAmount',
  'currency',
  'note',
  'requireContract'
];

export const ORDER_DATA_SEEDS = [
  {
    id: '20202020-aaaa-4aaa-aaaa-000000000001',
    orderCode: 'ORD-001',
    customerId: '20202020-cust-4001-a001-000000000001',
    status: 'pending',
    totalAmount: 1990000,
    currency: 'VND',
    note: 'First order for customer A',
    requireContract: true,
  },
  {
    id: '20202020-aaaa-4aaa-aaaa-000000000002',
    orderCode: 'ORD-002',
    customerId: '20202020-cust-4001-a001-000000000002',
    status: 'paid',
    totalAmount: 4990000,
    currency: 'VND',
    note: 'Second order for customer B',
    requireContract: false,
  },
];


export const ORDER_SEEDS_CONSTANT = {
  tableName: 'order',
  pgColumns: ORDER_DATA_SEED_COLUMNS,
  recordSeeds: ORDER_DATA_SEEDS,
};
