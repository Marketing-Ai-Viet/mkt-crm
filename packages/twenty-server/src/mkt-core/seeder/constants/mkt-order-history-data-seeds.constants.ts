export const MKT_ORDER_HISTORY_DATA_SEED_COLUMNS = [
  'id',
  'name',
  'action',
  'note',
  'oldValue',
  'newValue',
  'fieldName',

  'position',

  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];

export const MKT_ORDER_HISTORY_DATA_SEEDS = [
  {
    id: '45a40bb3-ab46-4b67-96f1-54df92d21576',
    name: 'Order Created',
    action: null,
    note: 'Order was created',
    oldValue: null,
    newValue: 'Order #1',
    fieldName: 'order',
    position: 1,
    createdBySource: 'API',
    createdByWorkspaceMemberId: null,
    createdByName: 'John Doe',
  },
];
