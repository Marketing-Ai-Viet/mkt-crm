export const ORDER_ITEM_DATA_SEED_COLUMNS = [
  'id',
  'order',
  'productVariantId',
  'quantity',
  'unitPrice',
  'productSnapshot',
];

export const ORDER_ITEM_DATA_SEEDS = [
  {
    id: '20202020-bbbb-4bbb-bbbb-000000000001',
    order: '20202020-aaaa-4aaa-aaaa-000000000001',
    productVariantId: '20202020-prod-4001-a001-000000000001',
    quantity: 1,
    unitPrice: 1990000,
    productSnapshot: 'Tai nghe AirPods Pro (Gen 2)'
  }, 
  {
    id: '20202020-bbbb-4bbb-bbbb-000000000002',
    order: '20202020-aaaa-4aaa-aaaa-000000000002',
    productVariantId: '20202020-prod-4001-a001-000000000002',
    quantity: 2,
    unitPrice: 2495000,
    productSnapshot: 'Tai nghe Sony WH-1000XM5'
  },
];

export const ORDER_ITEM_SEEDS_CONSTANT = {
  tableName: 'orderItem',
  pgColumns: ORDER_ITEM_DATA_SEED_COLUMNS,
  recordSeeds: ORDER_ITEM_DATA_SEEDS,
};
