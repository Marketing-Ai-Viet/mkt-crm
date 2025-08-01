export const FULFILLMENT_DATA_SEED_COLUMNS = [
  'id',
  'order',
  'trackingNumber',
  'carrier',
  'fulfilledAt',
  'status',
  'notes',
];

export const FULFILLMENT_DATA_SEEDS = [
  {
    id: '20202020-a1b2-4c3d-8e4f-000000000001',
    order: '20202020-aaaa-4aaa-aaaa-000000000001',
    trackingNumber: 'VNPOST123456789',
    carrier: 'VNPost',
    fulfilledAt: '2025-07-28T14:00:00Z',
    status: 'delivered',
    notes: 'Giao thành công tại địa chỉ khách hàng.',
  },
  {
    id: '20202020-a1b2-4c3d-8e4f-000000000002',
    order: '20202020-aaaa-4aaa-aaaa-000000000002',
    trackingNumber: 'GHN987654321',
    carrier: 'Giao Hàng Nhanh',
    fulfilledAt: '2025-07-29T10:00:00Z',
    status: 'shipping',
    notes: 'Đang giao hàng, dự kiến giao 30/07.',
  },
];

export const FULFILLMENT_SEEDS_CONSTANT = {
  tableName: 'fulfillment',
  pgColumns: FULFILLMENT_DATA_SEED_COLUMNS,
  recordSeeds: FULFILLMENT_DATA_SEEDS,
};
