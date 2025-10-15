export const MKT_PAYMENT_HISTORY_DATA_SEED_COLUMNS = [
  'id',
  'name',
  'paymentType',
  'amount',
  'note',

  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];

export const MKT_PAYMENT_HISTORY_DATA_SEEDS = [
  {
    id: '7e78c48b-b437-469d-a726-5f2b6679fef1',
    name: 'Payment History 1',
    paymentType: 'REFUND',
    amount: '100000',
    note: 'Hoàn tiền do khách hàng yêu cầu',
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
  {
    id: '26cd1db7-0a36-4951-b1f5-2d41ed0b5b68',
    name: 'Payment History 2',
    paymentType: 'PAYMENT',
    amount: '100000',
    note: 'Thanh toán thành công cho đơn hàng #12345',
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'Dev Seeder',
  },
];
