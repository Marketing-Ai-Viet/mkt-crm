import { MktCustomEventName } from 'src/mkt-core/common/common.type';

export type LicenseOperationResult = {
  success: boolean;
  licenseId: string;
  error?: string;
};

export interface MktOrderCustomEventData {
  eventType?: MktCustomEventName;
  orderId?: string;
  workspaceId: string;
  orderData: {
    id: string;
    status: string;
    note?: string;
    licenseHistory?: {
      action: string;
      note?: string;
    };
    trialLicense?: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  timestamp: string;
}

export interface MktOrderCustomEventPayload {
  name: MktCustomEventName;
  workspaceId: string;
  events: MktOrderCustomEventData[];
}
