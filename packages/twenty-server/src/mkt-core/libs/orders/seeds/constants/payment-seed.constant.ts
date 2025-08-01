export const PAYMENT_DATA_SEED_COLUMNS = [
  'id',
  'order',
  'method',
  'provider',
  'amount',
  'transactionId',
  'paidAt',
  'status',
  'rawResponse',
];

export const PAYMENT_DATA_SEEDS = [
  {
    id: '20202020-1111-4444-aaaa-000000000001',
    order: '20202020-aaaa-4aaa-aaaa-000000000001', // phải khớp với seed Order
    method: 'Credit Card',
    provider: 'VNPAY',
    amount: 1990000,
    transactionId: 'txn-001',
    paidAt: '2025-07-28T09:15:00Z',
    status: 'paid',
    rawResponse: 'VNPAY'
  },
  {
    id: '20202020-1111-4444-aaaa-000000000002',
    order: '20202020-aaaa-4aaa-aaaa-000000000002',
    method: 'Bank Transfer',
    provider: 'Momo',
    amount: 2495000,
    transactionId: 'txn-002',
    paidAt: '2025-07-29T08:30:00Z',
    status: 'paid',
    rawResponse: 'Momo'
  },
];

export const PAYMENT_SEEDS_CONSTANT = {
  tableName: 'payment',
  pgColumns: PAYMENT_DATA_SEED_COLUMNS,
  recordSeeds: PAYMENT_DATA_SEEDS,
};
