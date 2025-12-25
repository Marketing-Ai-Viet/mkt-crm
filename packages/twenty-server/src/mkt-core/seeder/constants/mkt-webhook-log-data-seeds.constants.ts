import { WebhookLogStatus } from 'src/mkt-core/payment/objects/mkt-webhook-log.workspace-entity';

type MktWebhookLogDataSeed = {
  id: string;
  sepayTransactionId: number;
  gateway: string;
  requestBody: object;
  responseStatus: number | null;
  responseBody: object | null;
  processingTimeMs: number | null;
  ipAddress: string | null;
  status: WebhookLogStatus;
  errorMessage: string | null;
  matchedOrderCode: string | null;
  position: number;
  createdBySource: string;
  createdByWorkspaceMemberId: string | null;
  createdByName: string;
};

export const MKT_WEBHOOK_LOG_DATA_SEED_COLUMNS: (keyof MktWebhookLogDataSeed)[] =
  [
    'id',
    'sepayTransactionId',
    'gateway',
    'requestBody',
    'responseStatus',
    'responseBody',
    'processingTimeMs',
    'ipAddress',
    'status',
    'errorMessage',
    'matchedOrderCode',
    'position',
    'createdBySource',
    'createdByWorkspaceMemberId',
    'createdByName',
  ];

export const MKT_WEBHOOK_LOG_DATA_SEEDS_IDS = {
  SAMPLE_SUCCESS: 'wh-log-0001-0000-0000-000000000001',
  SAMPLE_FAILED: 'wh-log-0002-0000-0000-000000000002',
  SAMPLE_PROCESSING: 'wh-log-0003-0000-0000-000000000003',
};

/**
 * Sample webhook log data for development/testing
 * In production, these records are created automatically by the webhook handler
 */
export const MKT_WEBHOOK_LOG_DATA_SEEDS: MktWebhookLogDataSeed[] = [
  {
    id: MKT_WEBHOOK_LOG_DATA_SEEDS_IDS.SAMPLE_SUCCESS,
    sepayTransactionId: 123456789,
    gateway: 'BIDV',
    requestBody: {
      id: 123456789,
      gateway: 'BIDV',
      transferAmount: 500000,
      code: 'DEV20241225001',
      content: 'DEV20241225001 Thanh toan don hang',
      transferType: 'in',
    },
    responseStatus: 200,
    responseBody: { success: true, status: 'MATCHED' },
    processingTimeMs: 150,
    ipAddress: '103.82.195.138',
    status: 'SUCCESS',
    errorMessage: null,
    matchedOrderCode: 'DEV20241225001',
    position: 0,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_WEBHOOK_LOG_DATA_SEEDS_IDS.SAMPLE_FAILED,
    sepayTransactionId: 123456790,
    gateway: 'Vietcombank',
    requestBody: {
      id: 123456790,
      gateway: 'Vietcombank',
      transferAmount: 1000000,
      code: null,
      content: 'Chuyen tien',
      transferType: 'in',
    },
    responseStatus: 200,
    responseBody: { success: true, status: 'UNMATCHED' },
    processingTimeMs: 85,
    ipAddress: '103.82.195.139',
    status: 'SUCCESS',
    errorMessage: null,
    matchedOrderCode: null,
    position: 1,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
  {
    id: MKT_WEBHOOK_LOG_DATA_SEEDS_IDS.SAMPLE_PROCESSING,
    sepayTransactionId: 123456791,
    gateway: 'Techcombank',
    requestBody: {
      id: 123456791,
      gateway: 'Techcombank',
      transferAmount: 750000,
      code: 'DEV20241225002',
      content: 'DEV20241225002 Thanh toan',
      transferType: 'in',
    },
    responseStatus: null,
    responseBody: null,
    processingTimeMs: null,
    ipAddress: '103.82.195.140',
    status: 'PROCESSING',
    errorMessage: null,
    matchedOrderCode: null,
    position: 2,
    createdBySource: 'SYSTEM',
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
  },
];
