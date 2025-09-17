type MktPaymentDataSeed = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  status: MKT_PAYMENT_STATUS;
  paymentDate: string;
  description: string;
  orderId: string | null;
  invoiceId: string | null;
  mktPaymentMethodId: string;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export enum MKT_PAYMENT_STATUS {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export const MKT_PAYMENT_DATA_SEED_COLUMNS: (keyof MktPaymentDataSeed)[] = [
  'id',
  'name',
  'amount',
  'currency',
  'status',
  'paymentDate',
  'description',
  'orderId',
  'invoiceId',
  'mktPaymentMethodId',
  'position',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
];

export const MKT_PAYMENT_DATA_SEEDS_IDS = {
  ID_1: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  ID_2: 'f0e9d8c7-b6a5-4f4e-9d3c-2b1a0f9e8d7c',
  ID_3: 'c6b5a4f3-e2d1-4c0b-a9b8-7c6d5e4f3a2b',
  ID_4: 'd5e4f3a2-b1c0-4d9e-8f7a-6b5c4d3e2f1a',
  ID_5: 'e8f7a6b5-c4d3-4e2f-b1a0-f9e8d7c6b5a4',
  ID_6: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5e',
  ID_7: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6f',
  ID_8: '3c4d5e6f-7a8b-4c9d-a0b1-f2a3b4c5d6e7',
  ID_9: '4d5e6f7a-8b9c-4da0-b1c2-a3b4c5d6e7f8',
  ID_10: '5e6f7a8b-9c0d-4eb1-c2d3-b4c5d6e7f8a9',
  ID_11: '6f7a8b9c-0d1e-4fc2-d3e4-c5d6e7f8a9b0',
  ID_12: '7a8b9c0d-1e2f-4ad3-e4f5-d6e7f8a9b0c1',
  ID_13: '8b9c0d1e-2f3a-4be4-f5a6-e7f8a9b0c1d2',
  ID_14: '9c0d1e2f-3a4b-4cf5-a6b7-f8a9b0c1d2e3',
  ID_15: '0d1e2f3a-4b5c-4df6-b7c8-a9b0c1d2e3f4',
};

export const MKT_PAYMENT_DATA_SEEDS: MktPaymentDataSeed[] = [];
